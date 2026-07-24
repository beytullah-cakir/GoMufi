"""AI maliyet optimizasyonu politikası.

Regresyon: gemini-2.5-flash'ta thinking varsayılan AÇIKTIR ve çıktı tarifesinden
faturalanır. Ölçüm: 25 token'lık başlık listesi cevabı için 763 thinking token
harcanıyordu — gerçek maliyetin %96'sı panelde görünmüyordu.

Politika:
- Basit liste/başlık görevleri -> GEMINI_MODEL_LITE + thinking_budget=0
- İçerik üretimi (slayt, iskelet, ödev değerlendirme) -> GEMINI_MODEL + sınırlı bütçe
- generate_lesson_slides prompt'unda değişken ders bloğu EN SONDA (implicit cache öneki)
"""
import inspect
import re

import pytest

import routers.ai as ai
from routers.ai import gen_config


def test_gen_config_budget_sifir_thinking_kapatir():
    cfg = gen_config(dict, thinking_budget=0)
    assert cfg.thinking_config is not None
    assert cfg.thinking_config.thinking_budget == 0


def test_gen_config_sinirli_butce():
    cfg = gen_config(dict, thinking_budget=1024)
    assert cfg.thinking_config.thinking_budget == 1024


@pytest.mark.parametrize("budget", [None, -1])
def test_gen_config_dinamik_modda_thinking_config_yok(budget):
    cfg = gen_config(dict, thinking_budget=budget)
    assert cfg.thinking_config is None


@pytest.mark.parametrize("model,budget,expected_level", [
    # Regresyon: Gemini 3.5/3.6 ailesi thinking_budget'ı 400 INVALID_ARGUMENT ile
    # reddediyor — thinking_level'a çevrilmeli (canlı çağrılarla doğrulandı)
    ("gemini-3.5-flash-lite", 0, "minimal"),
    ("gemini-3.5-flash", 1024, "low"),
    ("gemini-3.6-flash", 0, "minimal"),
])
def test_gen_config_gemini3_ailesinde_level_kullanir(model, budget, expected_level):
    cfg = gen_config(dict, thinking_budget=budget, model=model)
    # SDK string'i enum'a çevirir (örn. 'minimal' -> ThinkingLevel.MINIMAL)
    assert str(cfg.thinking_config.thinking_level.value).lower() == expected_level
    assert cfg.thinking_config.thinking_budget is None


@pytest.mark.parametrize("model", ["gemini-3.1-flash-lite", "gemini-2.5-flash"])
def test_gen_config_budget_ailesinde_budget_kalir(model):
    """3.1 ailesi ve 2.x thinking_budget kabul eder — çeviri YAPILMAMALI."""
    cfg = gen_config(dict, thinking_budget=0, model=model)
    assert cfg.thinking_config.thinking_budget == 0


def test_varsayilan_modeller_emekli_degil():
    """Regresyon: gemini-2.5-flash-lite Google tarafından kapatıldı (404, Temmuz 2026)."""
    from core.config import settings

    retired = {"gemini-2.5-flash-lite", "gemini-2.0-flash-lite"}
    assert settings.GEMINI_MODEL_LITE not in retired
    assert settings.GEMINI_MODEL not in retired
    assert settings.GEMINI_MODEL_CONTENT not in retired


def test_lite_content_modelinde_thinking_kapali():
    """
    Ölçüm: 3.1-flash-lite'a bütçe verilince 829 gereksiz thinking token harcıyor.
    İçerik modeli bir lite model iken GEMINI_THINKING_BUDGET_CONTENT=0 kalmalı.
    """
    from core.config import settings

    if "lite" in settings.GEMINI_MODEL_CONTENT:
        assert settings.GEMINI_THINKING_BUDGET_CONTENT == 0


def test_hicbir_cagri_thinking_politikasiz_degil():
    """
    ai.py'deki her generate_content çağrısı gen_config üzerinden gitmeli —
    çıplak GenerateContentConfig, thinking'i varsayılan (sınırsız) bırakır.
    """
    src = inspect.getsource(ai)
    call_count = src.count("client.models.generate_content(")
    gen_config_count = src.count("config=gen_config(")
    assert call_count == gen_config_count, (
        f"{call_count} çağrıdan yalnızca {gen_config_count} tanesi gen_config kullanıyor — "
        "yeni eklenen çağrı thinking politikasını atlamış olabilir"
    )


def test_basit_gorevler_lite_modelde():
    """Önemsiz liste/başlık görevleri pahalı modele geri kaymamalı."""
    src = inspect.getsource(ai)
    for action in ("suggest_raw_topics", "distribute_topics", "expand_topics",
                   "suggest_lesson_modules", "suggest_lesson_title", "suggest_level_details"):
        record_line = next(
            (ln for ln in src.splitlines() if f'"{action}"' in ln and "record_ai_usage" in ln), None,
        )
        assert record_line is not None, f"{action} için record_ai_usage bulunamadı"
        assert "GEMINI_MODEL_LITE" in record_line, f"{action} lite modelde değil"


def test_icerik_uretimi_content_modelinde():
    """
    Slayt/iskelet üretimi GEMINI_MODEL_CONTENT üzerinden gider (kullanıcı kararı,
    A/B ölçümü sonrası: %67 tasarruf). Ödev değerlendirmesi ise kalite için
    GEMINI_MODEL'de KALMALI — ince kod hatalarını yakalama gücü oradan geliyor.
    """
    src = inspect.getsource(ai)
    for action in ("generate_lesson_slides", "generate_roadmap_structure"):
        record_line = next(
            (ln for ln in src.splitlines() if f'"{action}"' in ln and "record_ai_usage" in ln), None,
        )
        assert record_line is not None
        assert "GEMINI_MODEL_CONTENT" in record_line, f"{action} içerik modelinde değil"

    # record_ai_usage çağrısı çok satırlı — model argümanını taşıyan satırı ara
    eval_line = next(
        (ln for ln in src.splitlines() if '"evaluate_homework", settings.' in ln), None,
    )
    assert eval_line is not None
    assert "settings.GEMINI_MODEL," in eval_line and "CONTENT" not in eval_line and "LITE" not in eval_line, (
        "ödev değerlendirmesi ucuz modele kaydırılmış — kalite kararına aykırı"
    )


def test_slides_promptunda_ders_blogu_en_sonda():
    """
    Implicit cache regresyonu: 'Lesson to populate' bloğu şablonlardan/kurallardan
    ÖNCE gelirse çağrılar arası ortak önek bozulur ve ~%75 girdi indirimi kaybolur.
    """
    src = inspect.getsource(ai.generate_lesson_slides_api)

    # Yorumlara takılmamak için yalnızca prompt f-string literal'ini incele
    match = re.search(r'prompt = f"""(.*?)"""', src, re.DOTALL)
    assert match, "prompt f-string bulunamadı"
    prompt_src = match.group(1)

    templates_pos = prompt_src.find("Available Templates for each category")
    requirements_pos = prompt_src.find("UNIVERSAL PEDAGOGICAL RULE")
    pdf_pos = prompt_src.find("{pdf_context}")
    lesson_pos = prompt_src.find("Lesson to populate")

    assert -1 not in (templates_pos, requirements_pos, lesson_pos, pdf_pos)
    assert templates_pos < lesson_pos, "şablonlar ders bloğundan önce olmalı"
    assert requirements_pos < lesson_pos, "kurallar ders bloğundan önce olmalı"
    assert pdf_pos < lesson_pos, "PDF (kurs başına sabit) ders bloğundan önce olmalı"

    # Ders bazında değişen alanlar sabit öneğe sızmamalı — önek cache'i bozulur
    prompt_head = prompt_src[:lesson_pos]
    for varying in ("req.lesson_title", "req.lesson_number", "req.lesson_objective", "req.modules"):
        assert varying not in prompt_head, (
            f"{varying} prompt'un sabit önek kısmına sızmış — implicit cache indirimi kaybolur"
        )


def test_record_ai_usage_thinking_tokenlarini_okuyor():
    src = inspect.getsource(ai.record_ai_usage)
    assert "thoughts_token_count" in src, "thinking token'ları loglanmıyor — maliyet eksik raporlanır"
    assert "thoughts_tokens" in src
