"""
GoMufi — Gemini Yapay Zeka (AI) İçerik Üretim Router'ı.
"""
import json
import os
import random
import re
import copy
import io
import logging
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, BackgroundTasks
from pydantic import BaseModel
from google import genai
from google.genai import types
from core.config import settings
from core import ai_pricing
from core import ai_economics
from core.image_search import resolve_image_url
from core import analytics
from core.permissions import ensure_course_access
from auth.dependencies import get_current_teacher_id, get_current_user_info
from connect_db import get_db, AsyncSession, SessionLocal
from sqlalchemy.future import select
from sqlalchemy import delete
from models.ai_usage_log import AIUsageLog
from models.course import Course

logger = logging.getLogger(__name__)


_LIST_ITEM_BREAK_RE = re.compile(r"([.:!?])\s?(\d{1,2}\.\s)")
_SENTENCE_END_RE = re.compile(r"[.!?](?:</?[a-z]*>)*\s")

# Slayt gövde metni kuralları. Model, prompt'a rağmen ansiklopedi paragrafı
# üretebiliyor (ölçüldü: tek blokta 90 kelime) — bu, tahtaya yansıtıldığında
# okunmuyor. Aşağısı sunucu tarafı güvenlik ağı.
_BULLET_MAX = 4              # slayt başına en fazla madde
_BULLET_MIN_MAXCHARS = 120   # yalnız uzun gövde kutuları (başlık/sticky hariç)
_PROSE_MAX_SENTENCES = 4     # bu sınıra kadar akıcı metin geçerli bir slayt formatı
_BR_SPLIT_RE = re.compile(r"(?i)<br\s*/?>")
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
_LEADING_MARKER_RE = re.compile(r"^[•\-\*•]\s*")
_NUMBERED_ITEM_RE = re.compile(r"^\d{1,2}[.)]\s")

# --- Kutuya sığma (geometriden türetilen karakter kapasitesi) ----------------
# Şablonlardaki maxChars değerleri ELLE konmuş ve kutu boyutundan bağımsız:
# ölçüldü, aynı fontSize:60 başlık elemanının 1215px genişindeki sürümü de
# 759px genişindeki sürümü de maxChars:30 taşıyor. Dar olanında 30 karakterlik
# başlık iki satıra sarıyor, kutu yüksekliği (85px) tek satırlık olduğu için
# ikinci satır kırpılıyor — yani AI limite UYSA BİLE metin taşıyor.
# Çözüm: gerçek kapasiteyi genişlik/yükseklik/fontSize'dan hesapla.
_FONT_WIDTH_RATIO = {          # ortalama karakter genişliği / fontSize
    "Fredoka": 0.47,           # ölçüldü: ~13.1px @ fs28, ~29.3px @ fs60
    "Patrick Hand": 0.42,      # el yazısı, daha dar (~10.1px @ fs24)
}
_DEFAULT_WIDTH_RATIO = 0.50
# CSS'te açık line-height YOK (bkz. CanvasElement.tsx style objesi) — tarayıcı
# `normal` kullanır ve bu, fontun kendi metriklerine göre değişir. Ölçüldü:
# Fredoka ~40.6px @ fs28, Patrick Hand ~33.6px @ fs24.
_FONT_LINE_HEIGHT = {
    "Fredoka": 1.45,
    "Patrick Hand": 1.40,
}
_DEFAULT_LINE_HEIGHT = 1.45

# Kelime kaydırma kaybı, satır sayısına göre DEĞİŞİR:
#  * Çok satırlı kutuda her satır sonunda yarım kelime boşa gider — ölçüldü:
#    173 karakterlik metin 6 satırlık kutuya sığmadı (36 kar/satır tahminine
#    karşı gerçekte 28.8 kar/satır). Bu yüzden sert bir katsayı gerekiyor.
#  * Tek satırlık kutuda (başlık/alt başlık) sarma diye bir şey yok: metin ya
#    sığar ya taşar. Buraya çok satırlı katsayıyı uygulamak başlıkları gereksiz
#    yere kesiyordu ("Temel Veri Tipleri: Metin ve" — ölçülen gerçek hata).
_WRAP_WASTE_MULTILINE = 0.8
_WRAP_WASTE_SINGLE_LINE = 0.9
_ELEMENT_PADDING = {"sticky": 16}   # sticky note'ta p-4 (bkz. CanvasElement.tsx)
_TAG_RE = re.compile(r"<[^>]+>")
# Geometri modeli yalnız DÜZ METİN kutularını tarif eder: tek font, tek boyut,
# basit satır sarma. challenge / code_editor / connection_task gibi widget'lar
# kendi iç düzenine sahip ayrı bileşenler (bkz. ChallengeWidget.tsx) — onlarda
# fontSize bile tanımlı değil, tahminle daraltmak gerçek içeriği kırpar.
_GEOMETRY_TYPES = {"text", "sticky"}


def _visible_len(text: str) -> int:
    """Görünen karakter sayısı — <br> gibi işaretleme kotayı yememeli."""
    return len(_TAG_RE.sub("", text or "").replace("&nbsp;", " "))


def _fit_text(el: dict, raw: str, pending: list) -> None:
    """
    Metni elemana yazar; sığmıyorsa KESMEZ, yeniden yazdırılmak üzere kuyruğa alır.

    Kesmek yara bandıydı: cümle sınırında bile kesilse anlam eksik kalıyor ve
    slayt yarım duruyor. Doğrusu metnin sınıra göre ÜRETİLMESİ. Sığmayan
    parçalar toplanıp tek bir ucuz çağrıyla modele yeniden yazdırılır
    (bkz. _shrink_overflowing); kesme yalnızca o da başarısız olursa devreye
    girer.
    """
    text = _enforce_slide_bullets(el, _format_list_breaks(raw))
    el["content"] = text
    limit = _effective_max_chars(el)
    if limit and _visible_len(text) > limit:
        pending.append({"el": el, "limit": limit})


_DEFAULT_CHALLENGE = {
    "title": "Uygulama Görevi",
    "prompt": "Öğrendiklerini kullanarak aşağıdaki görevi tamamla.",
    "submissionType": "code",
    "checkMode": "output",
    "expectedOutput": "",
    "functionName": "cozum",
    "hint": "",
    "xp": 100,
    "samples": [],
    "tests": [],
}
_SUBMISSION_TYPES = {"code", "text", "image", "file"}
_CHECK_MODES = {"output", "tests", "manual"}


def _build_challenge_slide(raw: str) -> dict:
    """
    UYGULA'ya özel "Uygulama Görevi" slaydını kurar (tuval elemanı değil, kendi tipi).

    Görev kod olmak ZORUNDA DEĞİL: metin, ekran görüntüsü veya dosya da
    istenebilir. Kod görevlerinde de doğruluk iki şekilde ölçülebilir —
    ekran çıktısı ("adını yazdır") ya da fonksiyon dönüşü.

    AI, yapılandırmayı `elementContents` içinde "challenge" anahtarıyla JSON
    metni olarak verir — connection_task/production_task ile aynı desen.
    Bozuk/eksik JSON gelirse varsayılanlarla güvenli bir görev döner; slayt
    hiçbir koşulda boş kalmaz.
    """
    cfg = dict(_DEFAULT_CHALLENGE)
    try:
        parsed = json.loads(raw) if raw else {}
        if isinstance(parsed, dict):
            cfg.update({k: v for k, v in parsed.items() if v not in (None, "")})
    except Exception:
        logger.warning("Challenge yapılandırması çözümlenemedi, varsayılan kullanıldı")

    sub_type = str(cfg.get("submissionType") or "code")
    if sub_type not in _SUBMISSION_TYPES:
        sub_type = "code"

    check_mode = str(cfg.get("checkMode") or "output")
    if check_mode not in _CHECK_MODES:
        check_mode = "output"
    # Kod dışı teslimlerde otomatik kontrol anlamsız — öğretmen değerlendirir.
    if sub_type != "code":
        check_mode = "manual"

    fn = str(cfg.get("functionName") or "cozum").strip() or "cozum"
    samples = [
        {"input": str(s.get("input", "")), "output": str(s.get("output", ""))}
        for s in (cfg.get("samples") or []) if isinstance(s, dict)
    ]
    tests = [
        {"id": f"t{i + 1}", "call": str(t.get("call", "")), "expected": str(t.get("expected", ""))}
        for i, t in enumerate(cfg.get("tests") or []) if isinstance(t, dict) and t.get("call")
    ] if check_mode == "tests" else []

    # Testler istendi ama hiçbiri geçerli değilse otomatik kontrol yapılamaz;
    # sessizce "hepsi geçti" görünmesindense öğretmene bırakılır.
    if check_mode == "tests" and not tests:
        check_mode = "manual"

    try:
        xp = int(cfg.get("xp") or 100)
    except (TypeError, ValueError):
        xp = 100

    starter = (
        f"# Kodunu buraya yaz 👇\ndef {fn}():\n    pass\n"
        if check_mode == "tests" else "# Kodunu buraya yaz 👇\n"
    )

    return {
        "id": int(random.random() * 1000000000),
        "type": "challenge",
        "elements": [],
        "challengeConfig": {
            "title": str(cfg.get("title") or "Uygulama Görevi"),
            "prompt": str(cfg.get("prompt") or ""),
            "submissionType": sub_type,
            "checkMode": check_mode,
            "expectedOutput": str(cfg.get("expectedOutput") or ""),
            "functionName": fn,
            "starterCode": starter,
            "hint": str(cfg.get("hint") or ""),
            "xp": xp,
            "samples": samples,
            "tests": tests,
        },
    }


def _clear_unfilled_placeholder(el: dict) -> None:
    """
    AI'nin doldurmadığı metin/sticky elemanından şablon yer tutucusunu siler.

    Şablonlarda tasarım amaçlı örnek metin var ("important note 1", "Header 1",
    "Explanation Long Text 1"). AI o elemanı doldurmazsa bu metin olduğu gibi
    slayta yazılıyordu — ölçüldü, veritabanında "important note 1" içerikli
    sarı notlar var. Boş bir kutu, anlamsız yer tutucudan iyidir: öğretmen
    eksiği görür, öğrenciye saçma metin gitmez.
    """
    if el.get("type") in _GEOMETRY_TYPES:
        el["content"] = ""


def _text_metrics(el: dict):
    """(satır başına karakter, sığan satır sayısı) — kutu geometrisinden."""
    style = el.get("style") or {}
    font_size = style.get("fontSize") or 20
    font = style.get("fontFamily") or ""
    ratio = _FONT_WIDTH_RATIO.get(font, _DEFAULT_WIDTH_RATIO)
    line_height = _FONT_LINE_HEIGHT.get(font, _DEFAULT_LINE_HEIGHT)
    pad = _ELEMENT_PADDING.get(el.get("type"), 0)
    width = max((el.get("width") or 0) - 2 * pad, 1)
    height = max((el.get("height") or 0) - 2 * pad, 1)
    chars_per_line = max(int(width / (font_size * ratio)), 1)
    # 1e-9: kayan nokta gürültüsü tam sığan son satırı düşürmesin (168/33.6 gibi)
    max_lines = max(int(height / (font_size * line_height) + 1e-9), 1)
    return chars_per_line, max_lines


def _effective_max_chars(el: dict) -> int:
    """
    Kutunun gerçek karakter kapasitesi (geometriden).

    Ölçülebildiğinde ŞABLONDAKİ maxChars DEĞİL, bu değer kullanılır. Bildirilen
    değerler güvenilmez olduğu kanıtlandı: aynı fontSize:60 başlık elemanının
    759px ve 1215px genişindeki sürümleri ikisi de maxChars:30 taşıyor. Dar
    olanında 30 karakter taşıyor, geniş olanında ise kutu ~41 karakter aldığı
    halde başlık 30'da kesiliyordu ("Temel Veri Tipleri: Metin ve" — ölçüldü).
    Yani tek bir elle konmuş sayı iki kutuyu birden doğru tarif edemiyor.

    Geometri ölçülemiyorsa (widget tipleri, fontSize yok) bildirilen değere
    düşülür — orada tahminle daraltmak gerçek içeriği kırpardı.
    """
    declared = el.get("maxChars") or 0
    if el.get("type") not in _GEOMETRY_TYPES:
        return declared
    if not el.get("width") or not el.get("height"):
        return declared
    if not (el.get("style") or {}).get("fontSize"):
        return declared  # ölçüm dayanağı yok; tahminle daraltma
    chars_per_line, max_lines = _text_metrics(el)
    waste = _WRAP_WASTE_SINGLE_LINE if max_lines == 1 else _WRAP_WASTE_MULTILINE
    return max(int(chars_per_line * max_lines * waste), 1)


def _enforce_slide_bullets(el: dict, text: str) -> str:
    """
    Gövde metnini slayt formatına oturtur — ama formatı DAYATMADAN.

    Madde listesi evrensel bir kalıp DEĞİL: adımlar/karşılaştırmalar liste
    ister, tanım ve kavram anlatımı ister istemez akıcı metindir. Cümleleri
    koparmak açıklamayı birbirine bağlayan dokuyu siler ve içi boş tek
    satırlar üretir. Formatı içeriğin türüne göre model seçer (bkz. prompt'taki
    slayt formatı kuralı); burası yalnızca UÇ hatayı yakalar:

      * Zaten madde/satır olarak gelmişse  -> normalize et, _BULLET_MAX ile sınırla.
      * _PROSE_MAX_SENTENCES'a kadar akıcı metin -> GEÇERLİ FORMAT, dokunma.
      * Daha uzun paragraf (ansiklopedi hatası) -> maddelere böl ve sınırla.

    Yalnız YAPI düzeltilir, kelimeler değiştirilmez. Numaralı adımlar
    ("1. ...") numarasını korur; sıra bilgisi taşıdıkları için başlarına
    ayrıca • konmaz.
    """
    limit = el.get("maxChars") or 0
    if not text or limit < _BULLET_MIN_MAXCHARS:
        return text

    if _BR_SPLIT_RE.search(text):
        parts = [p for p in _BR_SPLIT_RE.split(text) if p.strip()]
    else:
        parts = [p for p in _SENTENCE_SPLIT_RE.split(text) if p.strip()]
        if len(parts) <= _PROSE_MAX_SENTENCES:
            return text  # kısa akıcı metin: tanım/kavram için doğru format

    lines = []
    for part in parts[:_BULLET_MAX]:
        item = _LEADING_MARKER_RE.sub("", part.strip())
        if not item:
            continue
        lines.append(item if _NUMBERED_ITEM_RE.match(item) else f"• {item}")

    return "<br>".join(lines) if lines else text


def _format_list_breaks(text: str) -> str:
    """
    AI numaralı listeleri ("1. ... 2. ... 3. ...") satır sonu olmadan tek
    paragraf halinde üretiyor (ölçüldü) — bazen madde arasında boşluk bile
    bırakmıyor ("gidin.2."). İçerik ham HTML olarak render edildiği için
    (bkz. frontend CanvasElement.tsx dangerouslySetInnerHTML) düz metindeki
    satır sonları hiçbir işe yaramaz — madde başlarına gerçek <br> etiketi
    eklenmesi gerekir.
    """
    if not text:
        return text
    return _LIST_ITEM_BREAK_RE.sub(r"\1<br><br>\2", text)


def _clip_to_max_chars(el: dict, text: str) -> str:
    """
    AI, prompttaki maxChars kısıtına ölçülen sıklıkta uymuyor ("arada uzun
    çıkartıyor") ve metin şablon kutusunun dışına taşıyor. Bu, tek başına
    prompt talimatına güvenmek yerine sunucu tarafında sert bir güvenlik ağı.

    ÖNEMLİ: kelime sınırında "…" ile kesmek yarım cümle bırakıyordu (ölçüldü,
    kullanıcı şikayeti: "her yere 3 nokta koyuyor, cümleyi kesmemeli"). Bunun
    yerine limit içine sığan SON TAM CÜMLEYE kadar kırpılır — üç nokta YOK,
    her zaman noktalama ile biten tam bir cümle kalır. Limit içinde tek bir
    cümle bile bitmiyorsa (nadir/çok uzun tek cümle) kelime sınırında kırpılır
    (bu durumda da üç nokta eklenmez — eksik ama en azından iddialı değildir).

    Limit, şablonun bildirdiği maxChars DEĞİL, kutunun gerçek kapasitesiyle
    kesişimidir (bkz. _effective_max_chars) — çünkü bildirilen değerler kutu
    boyutundan bağımsız elle konmuş ve tek başına taşmayı önlemiyor. Ölçüm de
    görünen metin üzerinden yapılır; <br> gibi işaretleme kotayı yememeli.
    """
    limit = _effective_max_chars(el)
    if not limit or not text or _visible_len(text) <= limit:
        return text

    # Görünür karakter sayısına göre kes; etiketler sayaca dahil değil.
    window, shown = [], 0
    for token in re.split(r"(<[^>]+>)", text):
        if token.startswith("<") and token.endswith(">"):
            window.append(token)
            continue
        room = limit - shown
        if room <= 0:
            break
        window.append(token[:room])
        shown += min(len(token), room)
    window = "".join(window)

    last_end = None
    for m in _SENTENCE_END_RE.finditer(window):
        last_end = m.end()
    if last_end and last_end >= len(window) * 0.4:
        return window[:last_end].rstrip()

    return window.rsplit(" ", 1)[0].rstrip(" .,;:-")


async def record_ai_usage(
    db: AsyncSession,
    teacher_id: Optional[int],
    action: str,
    model_name: str,
    response: Any,
    details: Optional[str] = None,
    course_id: Optional[int] = None,
    course_title: Optional[str] = None,
    source_chars: int = 0,
    prompt_chars: int = 0,
):
    """Helper function to extract usage metadata from Gemini response and store log in database.

    `source_chars` / `prompt_chars`: öğretmenin yüklediği kaynak PDF'in bu prompt'a
    giren karakter sayısı ve prompt'un toplam karakter sayısı. Kaynak metnin maliyeti
    zaten prompt token'larının içindedir; bu ikisi onu AYRIŞTIRMAK içindir.

    Atıf, sabit bir "karakter/token" katsayısı yerine ÖLÇÜLEN prompt token sayısının
    karakter oranıyla paylaştırılmasıdır — dile göre kendini düzeltir (Türkçe metin
    İngilizceden daha çok token yakar, sabit katsayı bunu kaçırırdı).
    """
    try:
        usage = getattr(response, "usage_metadata", None)
        prompt_tokens = getattr(usage, "prompt_token_count", 0) or 0
        candidates_tokens = getattr(usage, "candidates_token_count", 0) or 0
        # Thinking token'ları çıktı tarifesinden FATURALANIR — loglanmazsa gerçek
        # maliyet 20 kata kadar düşük görünür (ölçülmüş değer).
        thoughts_tokens = getattr(usage, "thoughts_token_count", 0) or 0
        total_tokens = getattr(usage, "total_token_count", 0) or (
            prompt_tokens + candidates_tokens + thoughts_tokens
        )

        # Fiyatlandırma tek kaynaktan: core/ai_pricing.py (bkz. MODEL_RATES_USD_PER_1M)
        entry_cost_usd = ai_pricing.cost_usd(
            model_name, prompt_tokens, candidates_tokens, thoughts_tokens
        )

        # Kaynak PDF payı: ölçülen prompt token'ının karakter oranıyla paylaştırılması.
        source_tokens = 0
        if source_chars > 0 and prompt_chars > 0 and prompt_tokens > 0:
            source_tokens = min(prompt_tokens, round(prompt_tokens * source_chars / prompt_chars))
        # Kaynak yalnızca GİRDİ tarafında; çıktı/thinking token'ı üretmez.
        source_cost_usd = ai_pricing.cost_usd(model_name, source_tokens, 0, 0)

        log_entry = AIUsageLog(
            teacher_id=teacher_id,
            course_id=course_id,
            course_title=course_title,
            action=action,
            model_name=model_name,
            prompt_tokens=prompt_tokens,
            candidates_tokens=candidates_tokens,
            thoughts_tokens=thoughts_tokens,
            total_tokens=total_tokens,
            cost_usd=round(entry_cost_usd, 6),
            details=details,
            source_chars=source_chars,
            source_tokens=source_tokens,
            source_cost_usd=round(source_cost_usd, 6),
        )
        db.add(log_entry)
        await db.commit()

        # Ürün analitiği: AI maliyet olayını PostHog'a da gönder (no-op eğer kapalıysa).
        # Böylece "hangi öğretmen ne kadar AI harcadı" PostHog'da izlenebilir.
        analytics.capture_event(
            distinct_id=teacher_id,
            event="ai_usage",
            properties={
                "action": action,
                "model": model_name,
                "cost_usd": round(entry_cost_usd, 6),
                "prompt_tokens": prompt_tokens,
                "candidates_tokens": candidates_tokens,
                "thoughts_tokens": thoughts_tokens,
                "course_id": course_id,
            },
        )
    except Exception as err:
        logger.warning("AI kullanım logu kaydedilemedi: %s", err)


def _uses_thinking_level(model: str) -> bool:
    """
    Gemini 3.5/3.6 (ve 3.0) ailesi `thinking_budget` parametresini 400 ile REDDEDER;
    onun yerine `thinking_level` (minimal/low/...) ister. 3.1 ailesi ve 2.x hâlâ
    `thinking_budget` kabul eder. (Tümü gerçek çağrılarla doğrulandı — Temmuz 2026.)
    """
    name = (model or "").lower().rsplit("/", 1)[-1]
    return name.startswith("gemini-3") and not name.startswith("gemini-3.1")


def gen_config(
    schema: Any,
    thinking_budget: Optional[int] = None,
    model: Optional[str] = None,
) -> types.GenerateContentConfig:
    """
    Yapılandırılmış (JSON) üretim için GenerateContentConfig kurar.

    thinking_budget:
      None veya -1 -> dinamik (model istediği kadar düşünür — EN PAHALI seçenek)
      0            -> düşünme kapalı (basit/mekanik görevler için; ~25x ucuz, ölçülmüş)
      >0           -> üst sınır (kalite gereken içerik üretiminde maliyeti sınırlar)

    model: hedef model adı — thinking parametresinin doğru biçime (budget/level)
    çevrilmesi için verilmelidir; verilmezse budget biçimi kullanılır.
    """
    kwargs: Dict[str, Any] = {
        "response_mime_type": "application/json",
        "response_schema": schema,
    }
    if thinking_budget is not None and thinking_budget >= 0:
        if _uses_thinking_level(model or ""):
            # 0 -> minimal (kapalıya en yakın), >0 -> low (sınırlı)
            level = "minimal" if thinking_budget == 0 else "low"
            kwargs["thinking_config"] = types.ThinkingConfig(thinking_level=level)
        else:
            kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=thinking_budget)
    return types.GenerateContentConfig(**kwargs)


# Her içerik üretim prompt'unun başına konan sabit platform bağlamı.
#
# NEDEN: Model, konudan bağımsız olarak "ortam kurulumu" reflekslerini getiriyordu
# (ölçüldü: Python kurulumu, IDE indirme/karşılaştırması, PATH ayarı, terminal
# komutları). Bunların hiçbiri GoMufi'de OLMUYOR — öğrenci tarayıcıdaki gömülü
# editörde çalışıyor, kuracak bir şey yok. Yani üretilen dersin bir kısmı
# öğrencinin asla göremeyeceği bir dünyayı anlatıyordu.
#
# Prompt'un EN BAŞINA konur: hem tüm çağrılarda aynı kaldığı için Gemini'nin
# implicit prefix cache'ini bozmaz, hem de müfredat kararları alınmadan önce
# okunur.
PLATFORM_CONTEXT = """Platform Context (ALWAYS TRUE, applies to every topic):
This content will be used inside the GoMufi platform. The student works in a browser, in a code editor embedded in the platform. There is nothing to install, download or configure: no local setup, no IDE installation or comparison, no terminal or command line, no PATH or environment variables, no operating system differences. None of that is ever visible to the student.
Therefore you MUST NOT include these as topics, lessons, modules, slides or tasks: installing a language or runtime, downloading or choosing an IDE/editor, comparing editors, setting PATH or environment variables, running terminal/shell commands, creating or saving files on disk, file extensions and folder structure, or verifying an installation.
The student starts by writing code immediately. Begin the curriculum at the first real concept of the subject itself, and spend the freed lesson time on that subject instead.
"""


def format_templates_summary(cat_list: List[Dict[str, Any]]) -> str:
    """
    Format templates list into compact single-line descriptions to minimize prompt tokens.

    maxChars olarak şablondaki ham değer DEĞİL, kutuya gerçekten sığan kapasite
    yayınlanır (bkz. _effective_max_chars). Ham değerler kutu boyutundan bağımsız
    elle konmuş; AI onlara uysa bile metin taşıyordu. Doğru sayıyı kaynağında
    vermek, sunucunun sonradan kırpmasından iyidir — özellikle başlıklarda,
    çünkü kırpılan bir başlık yarım kalır.
    """
    lines = []
    for t in cat_list:
        # Özel slayt şablonu: tuval elemanı yok, kendi yapılandırması var.
        if t.get("slideType") == "challenge":
            lines.append(
                f"- Template ID: \"{t['id']}\" | Title: \"{t['title']}\" | SPECIAL SLIDE (challenge) | "
                "Elements: [challenge (single JSON element, elementId MUST be \"challenge\")]"
            )
            continue
        els = []
        for el in t.get("elements", []):
            limit = _effective_max_chars(el)
            m_char = f", maxChars:{limit}" if limit else ""
            els.append(f"{el['id']} ({el['type']}{m_char})")
        lines.append(f"- Template ID: \"{t['id']}\" | Title: \"{t['title']}\" | Elements: [{', '.join(els)}]")
    return "\n".join(lines)


# Görsel çözümleme core/image_search.py'a taşındı: eski akış loremflickr'a
# yalnızca URL kuruyor, hiç arama yapmıyordu — eşleşme bulunmayınca rastgele
# foto (pratikte hep kedi) dönüyordu. Yenisi gerçek arama yapar (ücretsiz).

router = APIRouter()


class CustomLessonInput(BaseModel):
    title: str
    topics: List[str]


class GenerateRoadmapRequest(BaseModel):
    topic: str
    difficulty: str
    lessons_count: int
    audience: str
    pdf_content: Optional[str] = None
    custom_lessons: Optional[List[CustomLessonInput]] = None


class GenerateLessonSlidesRequest(BaseModel):
    topic: str
    difficulty: str
    audience: str
    lesson_number: int
    lesson_title: str
    lesson_objective: str
    modules: List[Any]
    pdf_content: Optional[str] = None
    # True: Canvas Builder'daki "AI ile Tekrar Oluştur" — tek bir mevcut modülü yeniden
    # üretir. Maliyet takibinde ilk üretimden AYRI bir kalem olarak loglanır (bkz. ai_economics.py).
    is_regeneration: bool = False
    # Tekrar üretimde HANGİ modülün yeniden yazılacağı (modules listesindeki 0-tabanlı indeks).
    #
    # NEDEN GEREKLİ: ilk üretimde `modules` dersin TÜM modüllerini içerir; model kardeş
    # modülleri görüp kapsamı kendiliğinden ayırır ("değişkenler" 3. modülde, ben 1.
    # modülüm). Tekrar üretimde eskiden tek modül gönderiliyordu — sınır kalmadığı için
    # model ders başlığındaki her şeyi ("Ders 1: Giriş, Değişkenler") o tek modüle
    # dolduruyordu. Artık kardeşler yine gönderilir, bu indeks hangisinin üretileceğini
    # söyler; diğerleri YALNIZCA kapsam sınırı olarak kullanılır.
    target_module_index: Optional[int] = None


# --- GEMINI STRUCTURED OUTPUT SCHEMAS ---

class RoadmapModuleStructure(BaseModel):
    type: str  # e.g. "UNDERSTAND", "APPLY", "CONNECT", "CREATE", "QUIZ", "HOMEWORK"
    topic: str  # Specific sub-topic or task title

class RoadmapLessonStructure(BaseModel):
    lessonNumber: int
    title: str
    objective: str
    modules: List[RoadmapModuleStructure]

class RoadmapStructureResponse(BaseModel):
    courseTitle: str
    lessons: List[RoadmapLessonStructure]


class SuggestLessonModulesRequest(BaseModel):
    lesson_title: str
    course_topic: str
    difficulty: str
    audience: str
    pdf_content: Optional[str] = None


class SuggestLessonModulesResponse(BaseModel):
    objective: str
    modules: List[RoadmapModuleStructure]


class SuggestLessonTitleRequest(BaseModel):
    course_topic: str
    difficulty: str
    audience: str
    lesson_number: int
    existing_lessons: List[str]
    pdf_content: Optional[str] = None


class SuggestLessonTitleResponse(BaseModel):
    titles: List[str]


class SuggestLevelDetailsRequest(BaseModel):
    course_topic: str
    difficulty: str
    audience: str
    lesson_title: str
    module_type: str
    sibling_modules: List[Dict[str, str]]
    pdf_content: Optional[str] = None


class SuggestLevelDetailsResponse(BaseModel):
    title: str
    topic: str


class SuggestedLessonPlanItem(BaseModel):
    lesson_number: int
    title: str
    topics: List[str]


class SuggestCurriculumParametersResponse(BaseModel):
    suggested_lessons: List[SuggestedLessonPlanItem]
    suggested_lessons_count: int


class SuggestRawTopicsResponse(BaseModel):
    suggested_topics: List[str]


class DistributeTopicsRequest(BaseModel):
    topics: List[str]
    lesson_duration: int
    lessons_count: int


class ExpandTopicsRequest(BaseModel):
    topics: List[str]
    course_topic: str
    difficulty: str
    audience: str
    target_count: Optional[int] = None


class ExpandTopicsResponse(BaseModel):
    expanded_topics: List[str]


class ElementContentPair(BaseModel):
    elementId: str
    content: str


class AILevelSlide(BaseModel):
    selectedTemplateId: str
    elementContents: List[ElementContentPair]

class AILevelContent(BaseModel):
    lessonNumber: int
    moduleIndex: int
    slides: List[AILevelSlide]

class AILevelContentsResponse(BaseModel):
    levelContents: List[AILevelContent]


class QuizOption(BaseModel):
    text: str
    isCorrect: bool

class QuizQuestion(BaseModel):
    questionText: str
    options: List[QuizOption]

class HomeworkData(BaseModel):
    title: str
    instructions: str
    submissionType: str
    points: int
    starterCode: str

class LessonSlidesResponse(BaseModel):
    modules_content: List[AILevelContent]
    quiz_map: List[QuizQuestion]
    homework_map: HomeworkData


class ShrunkText(BaseModel):
    id: str
    text: str


class ShrinkTextsResponse(BaseModel):
    items: List[ShrunkText]


async def _shrink_overflowing(client, pending: list, db=None, teacher_id=None, course_topic: str = "") -> None:
    """
    Kutusuna sığmayan metinleri modele YENİDEN YAZDIRIR (kesmez).

    Neden ayrı bir çağrı: kesme, cümle sınırında bile yapılsa anlamı eksiltiyor
    ve slayt yarım duruyor. Kısaltma bir yazma işi — sunucu kelimeleri atarak
    bunu yapamaz, ancak model yapabilir.

    Maliyet: ders üretimi başına EN FAZLA bir ek çağrı ve yalnızca gerçekten
    taşma varsa. Ucuz model + thinking kapalı kullanılır; bu bir yaratıcılık
    değil, yeniden yazma işi.

    Son çare: model yine sığdıramazsa ilgili metin kesilir — yani davranış
    hiçbir koşulda eskisinden kötü olmaz.
    """
    if not pending:
        return

    payload = [
        {"id": str(i), "maxChars": p["limit"], "text": p["el"].get("content") or ""}
        for i, p in enumerate(pending)
    ]
    prompt = f"""Role: You are a Turkish slide copy editor. Türkçe yaz.
Each item below is slide text that is TOO LONG for its box. Rewrite each one so it FITS.

STRICT RULES:
- The visible length (ignoring <br> tags) MUST be <= that item's maxChars. Count before answering.
- NEVER cut mid-sentence and NEVER use "…" or "...". Every item must end as a complete sentence or a complete bullet.
- Keep the meaning and the concrete details: commands, function names, error names, numbers, option labels. These are the value of the text.
- Keep the SAME format: if the text uses "• ...<br>• ..." bullets, return bullets; if it is flowing prose, return prose.
- To save space, DROP a whole bullet or a whole sentence rather than making every sentence vague. Fewer complete, specific statements beat many watered-down ones.
- Return the same `id` for each item.

Course topic: {course_topic}

Items:
{json.dumps(payload, ensure_ascii=False, indent=1)}
"""
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL_LITE,
            contents=prompt,
            config=gen_config(ShrinkTextsResponse, thinking_budget=0, model=settings.GEMINI_MODEL_LITE),
        )
        if db is not None:
            await record_ai_usage(
                db, teacher_id, "shrink_slide_texts", settings.GEMINI_MODEL_LITE, response,
                details=f"Kurs: '{course_topic}' | Sığdırılan metin: {len(payload)}",
            )
        rewritten = {
            str(item.get("id")): item.get("text") or ""
            for item in (json.loads(response.text.strip()).get("items") or [])
        }
    except Exception as err:
        logger.warning("Slayt metni sığdırma çağrısı başarısız: %s", err)
        rewritten = {}

    for i, p in enumerate(pending):
        el, limit = p["el"], p["limit"]
        new_text = _enforce_slide_bullets(el, rewritten.get(str(i), ""))
        if new_text and _visible_len(new_text) <= limit:
            el["content"] = new_text
        else:
            # Model sığdıramadı — son çare olarak kes (eski davranış).
            el["content"] = _clip_to_max_chars(el, el.get("content") or "")


# --- ÖĞRETMENİN YÜKLEDİĞİ KAYNAK PDF ------------------------------------------

# Bir derse gönderilecek kaynak metin bütçesi (karakter).
_PDF_LESSON_BUDGET = 30000
# Puanlama için metnin bölündüğü parça boyutu.
_PDF_CHUNK = 1500
# Atlanan bölümlerin işareti. Modelin iki uzak parçayı bitişik metin sanmaması için.
_PDF_GAP = "\n[...]\n"

# Ders/modül başlıklarında geçen ama kaynakta ayırt edici olmayan kelimeler.
# Bunlar elenmezse "Ders 5: Döngülere Giriş" başlığındaki "ders" ve "giriş"
# kitabın her sayfasında geçtiği için puanlama anlamsızlaşır.
_PDF_STOPWORDS = {
    "ders", "dersi", "konu", "konusu", "konular", "modül", "bölüm", "ünite",
    "giriş", "temel", "genel", "nedir", "hakkında", "kullanımı", "kullanma",
    "için", "ile", "veya", "gibi", "olan", "olarak", "daha", "sonra", "önce",
    "pratiği", "uygulama", "alıştırma", "örnek", "örnekler", "anlatımı",
    "öğrenci", "öğrencinin", "tanır", "kavrar", "yapar",
}


def _unescape_newlines(text: str) -> str:
    r"""Modelin kaçırdığı `\n` dizilerini gerçek satır sonuna çevirir.

    Ölçülen hata: ödev yönergesi ekranda `...oluşturun.\n\n1. kitaplar adında...`
    şeklinde, ters bölü ve n harfi GÖRÜNEREK çıkıyordu. Model JSON'a satır sonunu
    çift kaçışla (`\\n`) yazınca ayrıştırma sonrası elde iki karakter kalıyor.

    YALNIZCA düz metin alanlarında kullanılır. Kod alanlarına UYGULANMAZ:
    Python kaynağında `print("a\nb")` içindeki `\n` gerçekten iki karakterdir ve
    dönüştürülürse kod bozulur.
    """
    if not text:
        return text
    return text.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\t", "\t")


def _pdf_keywords(focus: str) -> set:
    words = re.findall(r"\w+", focus.casefold(), flags=re.UNICODE)
    return {w for w in words if len(w) >= 4 and w not in _PDF_STOPWORDS}


def _select_pdf_excerpt(pdf_text: str, focus: str, budget: int = _PDF_LESSON_BUDGET) -> str:
    """
    Kaynak PDF'ten BU DERSE ait bölümü seçer.

    Eskiden `pdf_content[:30000]` yapılıyordu. 200 sayfalık bir kitabın ilk ~12
    sayfası HER derse gidiyordu: 6. dersin slaytları 1. bölümün metnini görüyor,
    kendi bölümünü hiç görmüyordu. Model de doğal olarak kaynağı yok sayıp kendi
    genel bilgisinden üretiyordu.

    Artık metin parçalara bölünür, ders başlığı/hedefi/modül konularıyla kelime
    örtüşmesine göre puanlanır; en ilgili parçalar KİTAPTAKİ SIRAYLA birleştirilir
    (atlanan yerler `[...]` ile işaretlenir, model kopukluğu görsün diye).
    """
    text = (pdf_text or "").strip()
    if len(text) <= budget:
        return text

    keys = _pdf_keywords(focus)
    if not keys:
        return text[:budget]

    # Puanlama SIKLIK değil KAPSAM temellidir: kaç FARKLI anahtar kelime geçiyor.
    #
    # Neden: ölçülen hata — "string, integer, float, complex, bool" dersinde ham
    # sıklık, bu terimleri onlarca kez tekrarlayan tip-dönüşüm listesi sayfasını
    # seçiyor, terimlerin TANIMLANDIĞI sayfayı eliyordu. Tanım sayfası az tekrarla
    # çok terim içerir; liste sayfası çok tekrarla az terim. Kapsam bunu ayırır.
    # Sıklık yalnızca eşitlik bozucu olarak kalır.
    chunks = [text[i:i + _PDF_CHUNK] for i in range(0, len(text), _PDF_CHUNK)]
    scored = []
    for i, ch in enumerate(chunks):
        low = ch.casefold()
        gecen = {k: low.count(k) for k in keys if k in low}
        scored.append((len(gecen), sum(gecen.values()), i, ch))

    if not any(kapsam for kapsam, _, _, _ in scored):
        return text[:budget]  # kaynakta bu dersle ilgili hiçbir iz yok

    scored.sort(key=lambda t: (-t[0], -t[1], t[2]))
    chosen: list = []
    used = 0
    for kapsam, _yogunluk, i, ch in scored:
        if kapsam == 0:
            break  # ilgisiz parçalarla bütçeyi doldurma
        # Ayırıcı payı da düşülür, yoksa `[...]` eklendikten sonra bütçe aşılıyor.
        maliyet = len(ch) + len(_PDF_GAP)
        if used + maliyet > budget:
            continue
        chosen.append((i, ch))
        used += maliyet

    if not chosen:
        return text[:budget]

    chosen.sort()
    out: list = []
    prev = None
    for i, ch in chosen:
        if prev is not None and i != prev + 1:
            out.append(_PDF_GAP)
        out.append(ch)
        prev = i
    return "".join(out)


def _pdf_source_block(pdf_text: str, focus: str, budget: int = _PDF_LESSON_BUDGET) -> str:
    """Kaynak metni, modelin kendi bilgisini EZECEK bir talimat bloğuyla sarar.

    Eski hâli tek satırlık bir "Base the slide contents ... strictly on the PDF"
    cümlesiydi; prompt'un geri kalanı büyük harfli STRICT/INVALID OUTPUT kurallarıyla
    doluyken bu cümle ağırlıksız kalıyor ve model kaynağın örneklerini kendi
    genel ders kitabı örnekleriyle değiştiriyordu (ölçülen davranış).
    """
    excerpt = _select_pdf_excerpt(pdf_text, focus, budget)
    if not excerpt:
        return ""
    return f"""

=== SOURCE MATERIAL — THE TEACHER'S OWN UPLOADED DOCUMENT (HIGHEST AUTHORITY) ===
The teacher uploaded their own course material. For this lesson it OUTRANKS your own
knowledge of the subject. Obey in this order:
1. USE THE SOURCE'S OWN EXAMPLES. Where the source demonstrates something with a specific
   function, variable, constant, number, file name, dataset or scenario, reproduce THAT
   EXACT ONE on the slides. Replacing it with a generic textbook example of your own
   (a `topla(a, b)`, a `PI = 3.14`, a `selam_ver("Ali")` that the source never mentions)
   is INVALID OUTPUT — a teacher who uploads material expects to see THEIR examples.
2. USE THE SOURCE'S OWN TERMINOLOGY, notation and naming style, including its Turkish
   wording for technical terms and its capitalisation of constants.
3. THE SOURCE DECIDES SCOPE AND DEPTH: teach what this part of the source teaches, as
   deeply as it teaches it. Do not add topics the source deliberately leaves out.
4. EVERY code example, number, identifier and scenario on the slides MUST be traceable to
   the source above — either copied from it or a minimal, obvious adaptation of one of its
   examples. Do not put your own standard teaching example next to the source's; replace
   yours with theirs.
5. THE SOURCE ALSO DECIDES THE SLIDE COUNT, AND THIS OVERRIDES THE MINIMUMS STATED
   EARLIER IN THIS PROMPT. Expand the lesson from the SOURCE'S own sections and examples,
   never from your standard curriculum for this topic. If the source does not carry enough
   material for the usual number of slides, produce FEWER slides. Padding a lesson with
   invented examples to reach a slide count is INVALID OUTPUT.
6. Fall back to your own knowledge ONLY where the source is genuinely silent, and never
   state anything that contradicts it.
`[...]` marks text omitted between excerpts — never present the two sides as continuous.

--- BEGIN SOURCE MATERIAL ---
{excerpt}
--- END SOURCE MATERIAL ---
"""


@router.post("/courses/generate_roadmap")
async def generate_roadmap_api(
    req: GenerateRoadmapRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    TEMPLATES_PATH = "slide_templates.json"
    try:
        # Load templates
        templates = []
        if os.path.exists(TEMPLATES_PATH):
            with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
                templates = json.load(f)
                
        # Group templates by category
        templates_by_category = {
            "ANLA": [],
            "UYGULA": [],
            "BİRLEŞTİR": [],
            "ÜRET": []
        }
        for t in templates:
            cat = t.get("category", "").upper()
            if cat in templates_by_category:
                elements_info = []
                for el in t.get("elements", []):
                    if el.get("type") in ["text", "code", "sticky", "challenge", "code_editor", "connection_task", "production_task", "image"]:
                        elements_info.append({
                            "id": el.get("id"),
                            "type": el.get("type"),
                            "placeholder": el.get("content"),
                            "maxChars": el.get("maxChars")
                        })
                templates_by_category[cat].append({
                    "id": t.get("id"),
                    "title": t.get("title"),
                    "description": t.get("description"),
                    # Özel slayt üreten şablonlar (tuval elemanı yerine kendi bileşeni olanlar)
                    "slideType": t.get("slideType"),
                    "elements": elements_info
                })
                
        client = genai.Client(api_key=settings.MY_API_KEY)

        # Bu uç `pdf_content` alıyordu ama hiç kullanmıyordu: öğretmenin yüklediği
        # kaynak sessizce yok sayılıyordu. Diğer uçlarla aynı yetki bloğuna bağlandı.
        pdf_context = _pdf_source_block(req.pdf_content or "", req.topic) if req.pdf_content else ""

        # --- PHASE 1: GENERATE ROADMAP STRUCTURE ---
        prompt_step1 = f"""
{PLATFORM_CONTEXT}
Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is only to design the structure of a learning roadmap (lessons and modules sequence).

Goal: Given the course topic, difficulty, desired lesson count, and target audience, generate the sequence of lessons and modules.
{pdf_context}

Requirements:
- The roadmap consists of lessons.
- Each lesson contains a list of modules representing levels.
- Modules are selected from: UNDERSTAND, APPLY, CONNECT, CREATE, QUIZ, HOMEWORK.
- **FLEXIBLE PEDAGOGICAL FLOW & MODULE RULES**:
  - A lesson can cover 1 or MULTIPLE sub-topics.
  - For EACH distinct sub-topic taught in the lesson, generate a pair of `UNDERSTAND` (Anla - Konu Teorisi) followed immediately by `APPLY` (Uygula - Kodlama Pratiği).
  - Therefore, a lesson CAN contain MULTIPLE `UNDERSTAND` and `APPLY` pairs if there are multiple sub-topics in that lesson (e.g., `UNDERSTAND(Konu 1) -> APPLY(Konu 1) -> UNDERSTAND(Konu 2) -> APPLY(Konu 2)...`). Do NOT limit a lesson to only one pair if multiple concepts are taught!
  - After all sub-topic theory & practice pairs in the lesson, you MUST include:
    1. At least one `CONNECT` module (Birleştir - Öğrenilen Kavramları Birleştirme Görevi / Bulmaca)
    2. At least one `CREATE` module (Üret - Mini Proje / Üretim Görevi)
    3. Exactly one `QUIZ` or `HOMEWORK` module (Değerlendirme Testi veya Ödev)
  - Summary of lesson module sequence: `[(UNDERSTAND -> APPLY)* (1 or more pairs)] -> CONNECT -> CREATE -> QUIZ (or HOMEWORK)`.
- **CRITICAL TITLE LENGTH CONSTRAINT (STRICT RULE)**: Every lesson title (`title`) and module topic string (`topic`) MUST be concise and MUST NOT exceed 30 characters in total length (e.g., 'Python Kurulumu', 'Değişken Tanımlama', 'Koşullu İfadeler'). Never generate verbose or long titles exceeding 30 characters.
- Each module in the lessons modules list MUST have a specific, distinct `"topic"` string explaining what specific sub-topic or task this module covers. This is critical for generating unique slide contents later.
- Return ONLY valid JSON matching the structure below. No markdown formatting, no text before or after the JSON.

Expected JSON Structure:
{{
  "courseTitle": "...",
  "lessons": [
    {{
      "lessonNumber": 1,
      "title": "Lesson title (Türkçe)",
      "objective": "Lesson learning objective (Türkçe)",
      "modules": [
        {{ "type": "UNDERSTAND", "topic": "1. Konu Anlatımı Başlığı (Türkçe)" }},
        {{ "type": "APPLY", "topic": "1. Konu Kodlama Pratiği Görevi (Türkçe)" }},
        {{ "type": "UNDERSTAND", "topic": "2. Konu Anlatımı Başlığı (Varsa) (Türkçe)" }},
        {{ "type": "APPLY", "topic": "2. Konu Kodlama Pratiği Görevi (Varsa) (Türkçe)" }},
        {{ "type": "CONNECT", "topic": "Öğrenilen Tüm Kavramları Birleştirme Görevi (Türkçe)" }},
        {{ "type": "CREATE", "topic": "Mini Proje Üretim Görevi (Türkçe)" }},
        {{ "type": "QUIZ", "topic": "Ders Değerlendirme Testi (Türkçe)" }}
      ]
    }}
  ]
}}

Input:
Topic: {req.topic}
Difficulty: {req.difficulty}
Lessons Count: {req.lessons_count}
Audience: {req.audience}
"""
        response_step1 = client.models.generate_content(
            model=settings.GEMINI_MODEL_CONTENT,
            contents=prompt_step1,
            config=gen_config(RoadmapStructureResponse, thinking_budget=settings.GEMINI_THINKING_BUDGET_CONTENT, model=settings.GEMINI_MODEL_CONTENT),
        )
        await record_ai_usage(db, teacher_id, "generate_roadmap_structure", settings.GEMINI_MODEL_CONTENT, response_step1, source_chars=len(pdf_context), prompt_chars=len(prompt_step1))
        
        roadmap_structure = json.loads(response_step1.text.strip())
        
        # --- PHASE 2: GENERATE SLIDES CONTENT FOR ALL MODULES ---
        prompt_step2 = f"""
{PLATFORM_CONTEXT}
Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is to write detailed educational slide contents for the UNDERSTAND, APPLY, CONNECT, and CREATE modules in the provided curriculum.

Course:
Topic: {req.topic}
Difficulty: {req.difficulty}
Audience: {req.audience}
{pdf_context}

Curriculum Structure to populate:
{json.dumps(roadmap_structure, ensure_ascii=False, indent=2)}

Available Templates for each category:
- UNDERSTAND (ANLA) templates:
{format_templates_summary(templates_by_category["ANLA"])}

- APPLY (UYGULA) templates:
{format_templates_summary(templates_by_category["UYGULA"])}

- CONNECT (BİRLEŞTİR) templates:
{format_templates_summary(templates_by_category["BİRLEŞTİR"])}

- CREATE (ÜRET) templates:
{format_templates_summary(templates_by_category["ÜRET"])}

Requirements:
- For each module in the curriculum of type UNDERSTAND, APPLY, CONNECT, and CREATE, you MUST generate slide contents.
- For each module, choose the most suitable template from the available templates of its category.
- UNIVERSAL PEDAGOGICAL RULE FOR ALL TOPICS (STRICT CONSTRAINT):
  * For UNDERSTAND (ANLA): THE SLIDE COUNT IS DERIVED FROM THE CONTENT, IT IS NOT A FIXED NUMBER. Build it with this two-step expansion, which applies to EVERY subject:
    STEP 1 — split the module's `topic` into the sub-topics it names.
    STEP 2 — for EACH sub-topic, list its MEMBERS: the individually named things a student must be able to tell apart afterwards. A sub-topic with one member stays one slide; a sub-topic with four members becomes FOUR slides, one per member, each with its own example and its own gotcha.
    The slide count is the sum of STEP 2. Produce AT LEAST 3 slides; 4 to 10 is the normal range. If your expansion yields more than 10, keep the 10 most essential — but NEVER merge two members onto one slide just to fit.
  * ALLOCATE UNEQUALLY — THIS IS THE MOST COMMON FAILURE: sub-topics are NOT equal in weight, so they MUST NOT receive equal slide counts. A module named "print(), Değişken, Veri Tipi" has a light sub-topic (`print()` — one slide) and a heavy one (`Veri Tipi` — `str`, `int`, `float`, `bool` are four members, so four slides). Spending one slide on each of the three sub-topics is INVALID output: it compresses the heaviest part of the module into the same space as the lightest. Before writing, always ask which sub-topic contains the most named members, and give that one the most slides.
  * THIS RULE IS SUBJECT-INDEPENDENT. "Members" are whatever the field names individually: `str`/`int`/`float`/`bool`; each verb tense; each type of chemical bond; each organ of a system; each branch of government; each solid's volume formula; each period of a historical era. In every case N named members means N slides, NEVER N bullets on one slide. A slide that merely lists names with a one-line gloss each is a table of contents, not teaching.
  * A slide is CHEAP; student attention is not. When in doubt between one dense slide and two clear ones, ALWAYS produce two.
  * Crucially, EVERY single concept, formula, syntax, method, command, tool, function, or technique that will be required or practiced in the subsequent APPLY module MUST be explicitly taught, explained, and demonstrated with a concrete example (code block, text example, or formula breakdown) in these UNDERSTAND slides. Never explain theory without showing a concrete working example.
  * For APPLY (UYGULA): Generate 1 to 2 slides with task instructions or challenges. The student MUST ONLY be asked to apply or solve what was explicitly demonstrated and taught in the immediately preceding UNDERSTAND slides. It is STRICTLY FORBIDDEN to introduce or ask for any new concept, syntax, method, function, or formula in APPLY that was not explicitly shown in UNDERSTAND.
- For CONNECT (BİRLEŞTİR): This module MUST NOT teach new theory, MUST NOT use daily life analogies, and MUST NOT provide concept definitions. Its ONLY goal is to make the student combine and use two or more previously learned concepts together in a single coding challenge. 
  * In the Connection Task template, the `connection_task` element content MUST be a JSON-serialized string formatted exactly like this to populate the connection task widget:
    {{"previousTopic": "Name of previous topic (e.g. Değişken Tanımlama)", "currentTopic": "Name of current topic (e.g. Koşullu İfadeler)", "taskText": "Detailed connection coding challenge instructions asking the student to combine both topics."}}
- For CREATE (ÜRET): This module is for building a small mini-project.
  * In the Produce Task template, the `production_task` element content MUST be a JSON-serialized string formatted exactly like this to populate the production task widget:
    {{"projectTitle": "Title of the project (e.g. Hesap Makinesi)", "taskText": "Detailed instructions on what to build", "expectedOutput": "Example console output showing what the running code should display", "estimatedTime": "Estimated completion time (e.g. 15 Dakika)", "hints": "Useful coding hint or tip"}}
  * Note: The JSON string for `connection_task` or `production_task` must be escaped properly so that it is a valid JSON string inside the outer JSON response. Escape double quotes with `\"` and use `\n` for line breaks. Do not write raw newlines inside the string values.
- UYGULAMA GÖREVİ (CHALLENGE) SPECIAL SLIDE — APPLY ONLY: One UYGULA template is marked `SPECIAL SLIDE (challenge)`. It is not a canvas layout; it renders a full task screen (brief + answer area + optional automatic check). Its PURPOSE is to make the student APPLY what the preceding UNDERSTAND module just taught. PREFER it for APPLY modules.
  * Its `elementContents` MUST contain EXACTLY ONE entry with `elementId` set to the literal string "challenge", and `content` set to a JSON-serialized string with this shape:
    {{"title": "Kısa görev başlığı", "prompt": "Ne yapılacağı, 1-2 cümle", "submissionType": "code", "checkMode": "output", "expectedOutput": "Merhaba Dünya!", "functionName": "", "tests": [], "hint": "Tek cümlelik ipucu", "xp": 100, "samples": [{{"input": "7", "output": "True"}}]}}
  * `submissionType` — HOW the student answers. Choose from what the task actually needs:
    - "code"  : student writes Python (default for programming topics)
    - "text"  : a written answer (explain, compare, interpret)
    - "image" : a screenshot (show your result / your drawing)
    - "file"  : any uploaded file
    Non-programming subjects (history, biology, language...) almost always want "text" or "image", NOT "code".
  * `checkMode` — only meaningful when submissionType is "code". Choose the one that matches the task:
    - "output" : the task is about what gets PRINTED. Set `expectedOutput` to the exact expected stdout. USE THIS for simple tasks like "print your name" — do NOT force a function where none is needed.
    - "tests"  : the task is to write a FUNCTION with a return value. Set `functionName` and 3 to 5 `tests`, covering at least one edge case (0, 1, empty, negative).
    - "manual" : open-ended; the teacher grades it. Leave expectedOutput and tests empty.
  * `tests` are executed for real: `call` is evaluated in Python after the student's code runs and compared AS TEXT to `expected`. `call` MUST be a valid Python expression using `functionName`, and `expected` MUST be exactly what Python's `str()` returns ("True", "False", "12", "[1, 2]"). `expectedOutput` is compared to real stdout the same way. NEVER write an expected value you have not actually reasoned out — a wrong expectation marks a correct student answer as wrong.
  * The task MUST only require concepts already taught in the preceding UNDERSTAND module.
  * Escape the JSON properly so it is a valid JSON string inside the outer response. Do NOT emit any other elementContents entry for this template.
- CRITICAL IMAGE REQUIREMENT: Your templates contain "image" elements. For EVERY "image" element, you MUST populate the "content" field in "elementContents" with a descriptive English search query (3-5 words) representing the visual content for that specific slide (e.g., "ancient roman soldier armor" for a history slide, "python coding mathematical operator" for a programming slide, "cell division biology microscope" for a biology slide). DO NOT leave "image" elements empty or unpopulated.
- STICKY NOTE RULE — A STICKY NOTE IS A GOTCHA, NOT A SUMMARY (STRICT): Elements of type `sticky` are the small coloured notes on the slide. They are the single most wasted space in a generated slide, so they have their own hard rule. Each sticky note MUST carry information that is NOWHERE ELSE on the slide. Write ONE of these, and nothing else:
  * The single most common mistake a beginner makes with this exact topic, stated as the mistake ("Tırnak koymayı unutmak en sık hatadır."), or
  * A non-obvious technical detail that the body text did NOT state ("Tırnak içindeki ifade, dize (string) olarak kabul edilir."), or
  * A concrete gotcha: an error message they will hit, an edge case, a version/platform difference, a keyboard shortcut.
  * ABSOLUTELY FORBIDDEN in a sticky note: restating or summarising the body text; generic encouragement or advice with no content ("Farklı IDE'leri deneyin.", "Bol bol pratik yapın.", "Kod yazmak eğlencelidir."); vague benefit claims ("IDE'ler verimliliği artırır.", "Python kolaydır."); repeating the slide title.
  * TEST BEFORE YOU WRITE IT: if a student who has NOT seen this lesson could still write your sticky note, it is filler — delete it and write the gotcha instead. If two sticky notes exist on one slide, they MUST contain two DIFFERENT facts; never two phrasings of the same point.
- CRITICAL SLIDE FORMAT RULE — CHOOSE THE FORMAT THAT FITS THE CONTENT (STRICT): Slide body text is projected on a classroom wall and read at a glance while the teacher speaks, so a dense encyclopedia paragraph is invalid output. But bullets are NOT a universal template either: chopping a definition into disconnected fragments destroys the explanation and produces empty one-liners. For every long-form text element (any element whose `maxChars` is 120 or more) you MUST pick the format from the NATURE of the content:
  * USE BULLETS when the content is genuinely discrete or ordered: installation and setup steps, a comparison of tools or options, a list of features, commands or shortcuts, do's and don'ts, an ordered procedure. These items do not connect into a sentence, so a list is the honest shape for them.
  * USE SHORT FLOWING PROSE — 2 to 4 sentences, NO bullet markers at all — when the content is a definition, a concept explanation, a "what is X" or "why does X exist" idea, or reasoning where each sentence builds on the one before it. This connective tissue is what makes the concept understandable; bullets delete it. You MAY optionally end with ONE single bullet stating the key takeaway, and nothing more.
  * NEVER write more than 4 sentences of prose. If the explanation genuinely needs more, split it across two slides instead.
  * DO NOT default to one shape. Decide per element, after looking at what the content actually is. A lesson where every single slide has the same shape is a failure — steps must look like steps, and a definition must read like an explanation.
  * ONE idea per slide. If the content covers two ideas, split it across two slides instead of packing one slide.
  * When you use bullets: AT MOST 4 bullets in a single text element.
  * EVERY BULLET AND EVERY PROSE SENTENCE MUST BE SPECIFIC — this outranks being short, and it applies to BOTH formats. Each one MUST contain at least one concrete anchor: an exact command, a keyword or function name, a file name or extension, a menu/checkbox label, a number, a key combination, or an exact error name. A bullet with no such anchor is INVALID OUTPUT.
  * BANNED — generic benefit sentences. These are all INVALID because the student cannot act on them and learns nothing: "Kod yazmayı hızlandırır", "Hata ayıklamayı kolaylaştırır", "Kod tamamlama özelliği sunar", "Proje yönetimini basitleştirir", "Verimliliği artırır", "Kullanımı kolaydır". Replace each with the concrete mechanism instead: "Ctrl+Space fonksiyon adını tamamlar", "Kırmızı alt çizgi hatalı satırı işaretler", "F5 ile satır satır çalıştırıp değişkeni izlersiniz".
  * SELF-TEST every bullet before writing it, both questions must pass: (1) Could someone who has NEVER seen this topic write this exact sentence from general knowledge? If yes it is filler — rewrite it with the specific command/name/number. (2) Can the student DO something after reading it? If no, rewrite it.
  * Length is a CEILING, NOT A GOAL: at most 12 words per bullet (prose sentences may be longer, but stay within the 2-4 sentence limit). Use all 12 words if that is what specificity costs. NEVER delete the concrete detail to make a bullet shorter — a specific 12-word bullet is always better than a vague 5-word one. Empty short bullets are exactly as bad as a dense paragraph; they are the same failure.
  * Cut ceremony, never content: drop "bulunmaktadır", "olarak adlandırılmaktadır", "-dır" chains, and restatements of the slide title. Keep the technical term, the command, the number.
  * WHEN USING BULLETS, format the element content EXACTLY as: `• first bullet<br>• second bullet<br>• third bullet` — the literal `•` character, separated by the HTML tag `<br>`. Do NOT use `-` or `*` as bullet markers, and do NOT emit `<ul>` or `<li>` tags. WHEN USING PROSE, write plain sentences with NO `•` marker and NO `<br>` between them.
  * Ordered step-by-step instructions are the ONE exception: keep them numbered (`1. ...<br>2. ...`) and still obey the 4-item and 12-word limits.
  * Concrete examples and syntax still belong on the slide, in whichever format you chose.
  * A server-side safety net only catches the extreme failure: a paragraph longer than 4 sentences is force-split into bullets and everything past the 4th is DISCARDED. Prose of 2-4 sentences is left exactly as you wrote it, so you are responsible for choosing the right format yourself.
- For each element you populate in `elementContents`, you MUST strictly respect the `maxChars` limit defined in the template. The number of characters of your generated text (including spaces) for that element ID MUST NOT exceed its `maxChars` value to prevent UI text overflow. This is a critical visual layout constraint. If a server-side safety net has to cut your text short because it exceeded `maxChars`, it will cut at the last complete sentence that fits — any unfinished trailing sentence is discarded entirely and never shown. So NEVER pad content with an extra clause or sentence that might not fit. When you are close to the limit, drop a WHOLE bullet rather than watering down the ones you keep — three specific bullets beat four vague ones. NEVER sacrifice a concrete detail (a command, a name, a number, an option label) just to save characters; that turns a useful slide into filler, which is a worse failure than being one bullet short.
- Populate `elementContents` mapping the template element IDs to your generated educational contents in Turkish.
- Return ONLY valid JSON matching the structure below. No markdown formatting, no text before or after the JSON.

Expected JSON Structure:
{{
  "levelContents": [
    {{
      "lessonNumber": 1,
      "moduleIndex": 0, // 0-based index of the module inside the lesson's modules list
      "slides": [
        {{
          "selectedTemplateId": "template_id_here",
          "elementContents": [
             {{ "elementId": "element_id_1", "content": "Generated text explanation in Turkish" }},
             {{ "elementId": "element_id_2", "content": "Generated python code or note in Turkish..." }}
          ]
        }}
      ]
    }}
  ]
}}
"""
        response_step2 = client.models.generate_content(
            model=settings.GEMINI_MODEL_CONTENT,
            contents=prompt_step2,
            config=gen_config(AILevelContentsResponse, thinking_budget=settings.GEMINI_THINKING_BUDGET_CONTENT, model=settings.GEMINI_MODEL_CONTENT),
        )
        await record_ai_usage(db, teacher_id, "generate_roadmap_content", settings.GEMINI_MODEL_CONTENT, response_step2, source_chars=len(pdf_context), prompt_chars=len(prompt_step2))
        
        slide_contents_data = json.loads(response_step2.text.strip())
        level_contents_list = slide_contents_data.get("levelContents", [])
        
        # --- PHASE 3: MAP AND CONSTRUCT THE VISUAL CURRICULUM AND NOTES ---
        generated_lessons = roadmap_structure.get("lessons", [])
        
        curriculum = []
        notes = []
        # Kutusuna sığmayan metinler: kesilmez, en sonda tek çağrıyla yeniden yazdırılır.
        pending_shrink: list = []
        overall_idx = 1
        
        theme_map = {
          "UNDERSTAND": "purple",
          "APPLY": "cyan",
          "CONNECT": "green",
          "CREATE": "yellow",
          "QUIZ": "quiz",
          "HOMEWORK": "homework"
        }
        
        all_templates_map = {
            "UNDERSTAND": templates_by_category["ANLA"],
            "APPLY": templates_by_category["UYGULA"],
            "CONNECT": templates_by_category["BİRLEŞTİR"],
            "CREATE": templates_by_category["ÜRET"]
        }
        
        for l_idx, les in enumerate(generated_lessons):
            lesson_num = les.get("lessonNumber") or (l_idx + 1)
            modules = les.get("modules", [])
            for m_idx, mod in enumerate(modules):
                mod_type = mod.get("type", "UNDERSTAND").upper()
                mapped_theme = theme_map.get(mod_type, "purple")
                
                level_id = f"sec_ai_{int(random.random() * 1000000000)}"
                
                raw_topic = (mod.get("topic") or "").strip()
                clean_topic = re.sub(r"^(?:Ders\s+\d+[:\s\-]*|\d+[\.\)\s\-]*)", "", raw_topic, flags=re.IGNORECASE).strip()
                if not clean_topic:
                    clean_topic = (les.get("title") or "Ders Konusu").strip()
                    clean_topic = re.sub(r"^(?:Ders\s+\d+[:\s\-]*|\d+[\.\)\s\-]*)", "", clean_topic, flags=re.IGNORECASE).strip()
                
                final_node_title = clean_topic[:30] if mod_type not in ["QUIZ", "HOMEWORK"] else ("Konu Testi" if mod_type == "QUIZ" else "Ödev Görevi")
                
                node = {
                  "id": level_id,
                  "title": final_node_title,
                  "theme": mapped_theme,
                  "lectures": []
                }
                
                if m_idx == 0:
                  node["lessonTopic"] = les.get("title") or f"Ders Konusu {lesson_num}"
                  node["lessonNumber"] = lesson_num
                  
                curriculum.append(node)
                overall_idx += 1
                
                # Check if we should build slide content for this module type
                if mod_type in ["UNDERSTAND", "APPLY", "CONNECT", "CREATE"]:
                    # Find matching generated slide contents
                    matched_content = next((
                        lc for lc in level_contents_list 
                        if str(lc.get("lessonNumber")) == str(lesson_num) and str(lc.get("moduleIndex")) == str(m_idx)
                    ), None)
                    if not matched_content:
                        matched_content = next((
                            lc for lc in level_contents_list 
                            if str(lc.get("lessonNumber")) == str(lesson_num) and lc.get("moduleType", "").upper() == mod_type
                        ), None)
                    
                    
                    cat_templates = all_templates_map.get(mod_type, [])
                    
                    slides_to_add = []
                    ai_slides = []
                    if matched_content:
                        ai_slides = matched_content.get("slides") or []
                    
                    # Fallback if empty but templates exist (create at least 1 placeholder slide)
                    if not ai_slides and cat_templates:
                        ai_slides = [{"selectedTemplateId": cat_templates[0]["id"], "elementContents": {}}]
                        
                    if isinstance(ai_slides, dict):
                        ai_slides = [ai_slides]
                    elif not isinstance(ai_slides, list):
                        ai_slides = []
                        
                    for ai_slide in ai_slides:
                        sel_template_id = ai_slide.get("selectedTemplateId")
                        raw_contents = ai_slide.get("elementContents") or []
                        elem_contents = {}
                        if isinstance(raw_contents, list):
                            for pair in raw_contents:
                                if isinstance(pair, dict) and "elementId" in pair:
                                    elem_contents[pair["elementId"]] = pair.get("content") or ""
                        elif isinstance(raw_contents, dict):
                            elem_contents = raw_contents
                        
                        # Find original template elements
                        selected_t = next((t for t in templates if t.get("id") == sel_template_id), None)
                        # Fallback to category template if not found
                        if not selected_t and cat_templates:
                            selected_t = next((t for t in templates if t.get("id") == cat_templates[0]["id"]), None)
                            
                        if selected_t and selected_t.get("slideType") == "challenge":
                            # Ozel slayt: tuval elemani yok, kendi yapilandirmasi var.
                            slides_to_add.append(_build_challenge_slide(elem_contents.get("challenge", "")))
                        elif selected_t:
                            copied_elements = []
                            for el in selected_t.get("elements", []):
                                 el_copy = copy.deepcopy(el)
                                 el_id = el_copy.get("id")
                                 el_type = el_copy.get("type")
                                 
                                 # Pre-evaluate value if present
                                 val = elem_contents.get(el_id) if el_id in elem_contents else ""
                                 
                                 if el_type == "image":
                                     # Determine query - fallback to module topic or lesson title if empty
                                     query = val if val else (mod.get("topic") or les.get("title") or "coding")
                                     is_fb = not bool(val)
                                     img_url = await resolve_image_url(query, is_fallback=is_fb, context=req.topic)
                                     el_copy["content"] = img_url
                                     el_copy["imageUrl"] = img_url
                                     el_copy["src"] = img_url
                                 elif el_id in elem_contents:
                                     if el_type == "connection_task":
                                         import json as pyjson
                                         try:
                                             parsed = pyjson.loads(val)
                                             el_copy["content"] = parsed.get("taskText") or val
                                             if "extra" not in el_copy or not el_copy["extra"]:
                                                 el_copy["extra"] = {}
                                             el_copy["extra"]["previousTopic"] = parsed.get("previousTopic") or "Önceki Konu"
                                             el_copy["extra"]["currentTopic"] = parsed.get("currentTopic") or "Şimdiki Konu"
                                         except Exception:
                                             el_copy["content"] = val
                                     elif el_type == "production_task":
                                         import json as pyjson
                                         try:
                                             parsed = pyjson.loads(val)
                                             el_copy["content"] = parsed.get("taskText") or val
                                             if "extra" not in el_copy or not el_copy["extra"]:
                                                 el_copy["extra"] = {}
                                             el_copy["extra"]["projectTitle"] = parsed.get("projectTitle") or "Proje Başlığı"
                                             el_copy["extra"]["expectedOutput"] = parsed.get("expectedOutput") or ""
                                             el_copy["extra"]["estimatedTime"] = parsed.get("estimatedTime") or "10 Dakika"
                                             el_copy["extra"]["hints"] = parsed.get("hints") or ""
                                         except Exception:
                                             el_copy["content"] = val
                                     else:
                                         _fit_text(el_copy, val, pending_shrink)
                                 else:
                                     _clear_unfilled_placeholder(el_copy)

                                 copied_elements.append(el_copy)
                                
                            slide = {
                                "id": int(random.random() * 1000000000),
                                "elements": copied_elements,
                                "background": selected_t.get("background", "default")
                            }
                            slides_to_add.append(slide)
                            
                    if slides_to_add:
                        note = {
                            "id": level_id,
                            "noteTitle": node["title"],
                            "slides": slides_to_add
                        }
                        notes.append(note)

        await _shrink_overflowing(client, pending_shrink, db, teacher_id, req.topic)

        return {"success": True, "curriculum": curriculum, "notes": notes, "roadmap": roadmap_structure}
        
    except Exception as e:
        print(f"Error generating roadmap: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/suggest_raw_topics")
async def suggest_raw_topics_api(
    topic: str = Form(...),
    difficulty: str = Form(...),
    audience: str = Form(...),
    pdf_file: Optional[UploadFile] = File(None),
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    try:
        pdf_text = ""
        if pdf_file:
            pdf_bytes = await pdf_file.read()
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(pdf_bytes))
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        pdf_text += text + "\n"
            except Exception as e:
                print(f"Error parsing PDF: {e}")
                raise HTTPException(status_code=400, detail=f"PDF dosyası okunurken bir hata oluştu: {str(e)}")

            # Taranmış (görüntü tabanlı) PDF'lerde extract_text() boş döner. Eskiden bu
            # sessizce geçiliyordu: öğretmen kaynağını yüklediğini sanıyor, AI ise
            # kaynağı hiç görmeden genel bilgiden ders üretiyordu. Artık açıkça söyle.
            if len(pdf_text.strip()) < 100:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "PDF'ten okunabilir metin çıkarılamadı. Dosya büyük olasılıkla "
                        "taranmış sayfa görüntülerinden oluşuyor (metin katmanı yok). "
                        "Metin tabanlı bir PDF yükleyin ya da içeriği kopyalayıp "
                        "hedef kitle alanına yapıştırın."
                    ),
                )

        client = genai.Client(api_key=settings.MY_API_KEY)
        
        pdf_context = ""
        if pdf_text:
            pdf_context = f"\n\nSource Material (PDF Content):\n{pdf_text[:40000]}\n\nInstruction: Base your curriculum topic suggestions strictly on the provided Source Material PDF above."

        prompt = f"""
{PLATFORM_CONTEXT}
Role: You are an expert computer science curriculum architect and educational planner. Türkçe cevap ver.
Your task is to analyze the course topic, difficulty, audience, and optional PDF content, and suggest:
- A flat sequence of substantive, practical coding topics (subject headings) that must be covered in this course (typically between 5 and 15 topics).
- **Strictly Ban Trivial/Fluff Headings**: Do not generate separate topics for history (e.g., Python history, versions 2.x vs 3.x), compiler/interpreter definitions, syntax trivia (like comment `#` character), or individual data types (like string, integer, float as separate topics).
- **Strictly Ban Setup/Environment Headings** (see Platform Context above): Do not generate topics such as installing the language, downloading or choosing an IDE, comparing editors, PATH or environment variables, terminal/command line usage, or verifying an installation. On this platform none of that exists — the student is already in a working code editor. The very first topic must be a real concept of the subject.
- **Cluster Into Substantive Headings**: Group minor details and syntax trivia together into comprehensive, high-density practical headers (each representing a significant coding outcome and at least 20-30 minutes of real teaching time).
  - *Incorrect (Do NOT suggest)*: ["Python Tarihçesi", "Python Kurulumu", "print() kullanımı", "Yorum satırları"]
  - *Correct (Instead suggest)*: ["Python Kurulumu, İlk Programı Çalıştırma (print, yorumlar)"]
  - *Incorrect (Do NOT suggest)*: ["Değişken Nedir", "string veri tipi", "integer veri tipi", "float veri tipi", "tip dönüşümleri"]
  - *Correct (Instead suggest)*: ["Değişkenler, Temel Veri Tipleri (str, int, float, bool) ve Tip Dönüşümleri (casting)"]
  - *Incorrect (Do NOT suggest)*: ["Aritmetik Operatörler", "String Birleştirme", "len() metodu"]
  - *Correct (Instead suggest)*: ["Temel Aritmetik ve String Operatörleri (len(), birleştirme)"]

{pdf_context}

Course Parameters:
Course Topic: {topic}
Difficulty: {difficulty}
Target Audience: {audience}

Return ONLY valid JSON matching the structure below. No markdown formatting.

Expected JSON Structure:
{{
  "suggested_topics": [
    "Python Kurulumu, İlk Programı Çalıştırma (print, yorumlar)",
    "Değişkenler, Temel Veri Tipleri (str, int, float, bool) ve Tip Dönüşümleri (casting)",
    "Temel Aritmetik ve String Operatörleri (len(), birleştirme)"
  ]
}}
"""
        # Basit liste üretimi: ucuz model + thinking kapalı (kalite gerektiren
        # slayt içeriği DEĞİL, sadece konu başlığı listesi)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL_LITE,
            contents=prompt,
            config=gen_config(SuggestRawTopicsResponse, thinking_budget=0, model=settings.GEMINI_MODEL_LITE),
        )
        await record_ai_usage(db, teacher_id, "suggest_raw_topics", settings.GEMINI_MODEL_LITE, response, source_chars=len(pdf_context), prompt_chars=len(prompt))
        data = json.loads(response.text.strip())
        return {
            "success": True,
            "suggested_topics": data.get("suggested_topics", []),
            "pdf_text": pdf_text,
            # Arayüz kaynağın gerçekten okunduğunu gösterebilsin diye.
            "pdf_chars": len(pdf_text),
        }
    except Exception as e:
        print(f"Error suggesting raw topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/distribute_topics_into_lessons")
async def distribute_topics_into_lessons_api(
    req: DistributeTopicsRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    try:
        client = genai.Client(api_key=settings.MY_API_KEY)
        
        prompt = f"""
{PLATFORM_CONTEXT}
Role: You are an expert computer science curriculum architect and instructional designer. Türkçe cevap ver.
Your task is to take a flat list of course sub-topics, the duration of each lesson in minutes, and the target lesson count, and distribute these topics logically across lessons.

Input Parameters:
Topics to distribute: {req.topics}
Lesson Duration: {req.lesson_duration} minutes per lesson.
Target Lessons Count: {req.lessons_count if req.lessons_count > 0 else 'AI to determine optimal count based on duration and topic list (typically between 3 and 12).'}

Critical Pedagogical & Weight-Balancing Requirements:
1. **Analyze Topic Complexity/Weight**: 
   - Simple introductory sub-topics (e.g., printing, comments, variables, simple data types, type conversion) should be grouped together logically.
   - Substantive/complex topics (e.g., loops, functions, OOP, databases, external libraries like `pygame`, web frameworks like `flask`) are heavy and require dedicated lessons.
2. **Teachable Content Ceiling & Full Utilization (Crucial)**:
   - Ensure each lesson is fully and realistically utilized according to the requested duration. A 60-minute lesson should cover a rich set of topics, ideally **2 to 3 substantive topic headings** (or 3 to 5 if they are smaller).
   - Do NOT leave a lesson with only a single simple/minor topic heading (like only "installation and print") if there are other basic topics that can logically be combined into it (like "variables and data types"). Group them together.
   - However, do NOT assign more than 3 to 5 topic headings to a single lesson (6 or more is unteachable in 60 minutes).
   - If the user requested a target lesson count that is larger than the number of clustered lessons, do NOT create placeholder "review/lab/project/recap" lessons (e.g. do not suggest generic review topics like "Önceki Derslerin Gözden Geçirilmesi"). Instead, split the input topics into finer-grained, more detailed sub-topics and distribute them evenly across the requested lessons so that each lesson has unique, progressive content.
3. **Prevent Cramming of Advanced Concepts**:
   - Under no circumstances should massive distinct frameworks (like `pygame` and `flask`) be combined in a single lesson, especially not alongside control flows (like loops).
   - If the list includes advanced frameworks/libraries, give them their own dedicated lessons.
4. **No Information Loss**: All input topics must be mapped to at least one lesson. Do not skip or omit any of them.
5. **Lesson Titles**: Provide a concise title for each lesson reflecting its consolidated focus (e.g., "Ders 1: Giriş, print() ve Temel Veri Tipleri", "Ders 2: Kontrol Yapıları ve Döngüler", etc.).
6. Return ONLY valid JSON matching the structure below. No markdown formatting.

Expected JSON Structure:
{{
  "suggested_lessons": [
    {{
      "lesson_number": 1,
      "title": "Suggested Lesson 1 Title",
      "topics": [
        "Topic A",
        "Topic B"
      ]
    }}
  ],
  "suggested_lessons_count": 1
}}
"""
        # Mekanik dağıtım görevi: ucuz model + thinking kapalı
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL_LITE,
            contents=prompt,
            config=gen_config(SuggestCurriculumParametersResponse, thinking_budget=0, model=settings.GEMINI_MODEL_LITE),
        )
        await record_ai_usage(db, teacher_id, "distribute_topics", settings.GEMINI_MODEL_LITE, response)
        data = json.loads(response.text.strip())
        return {
            "success": True, 
            "suggested_lessons": data.get("suggested_lessons", []), 
            "suggested_lessons_count": data.get("suggested_lessons_count", 6)
        }
    except Exception as e:
        print(f"Error distributing topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/expand_topics")
async def expand_topics_api(
    req: ExpandTopicsRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    try:
        client = genai.Client(api_key=settings.MY_API_KEY)
        
        target_count_val = req.target_count if req.target_count and req.target_count > 0 else None
        count_instruction = ""
        if target_count_val:
            count_instruction = f"\nRequirement: You MUST generate exactly {target_count_val} total sub-topic strings in the final 'expanded_topics' array."
        else:
            count_instruction = "\nRequirement: Suggest around 3 to 5 sub-topics per high-level topic."
            
        prompt = f"""
{PLATFORM_CONTEXT}
Role: You are an expert computer science curriculum architect and educational planner. Türkçe cevap ver.
Your task is to take a list of course topic headings, analyze them in the context of the course '{req.course_topic}', and expand them into a more detailed, high-density sequence of practical sub-topics.
Specifically:
1. Identify high-level, short, or broad topic headings (for example, "Flask", "OOP", "Database", "Python Giriş", "CSS").
2. Subdivide these high-level headings into separate, detailed, progressive sub-topics. For example:
   - "Flask" should be expanded into sub-topics like: "Flask Kurulumu ve İlk Uygulama", "Flask Yönlendirme (Routing) ve Dinamik URL'ler", "Jinja2 Şablon Yapısı (Templates)", "Flask Form Yönetimi ve POST/GET İstekleri", "Flask ile Veritabanı Entegrasyonu (SQLAlchemy)".
   - "Python Giriş" should be expanded into: "Python Kurulumu ve Temel print/yorumlar", "Değişken Tanımlama ve Temel Veri Tipleri", "Tip Dönüşümleri (Casting)".
3. If a topic is already highly specific and detailed, keep it as is.
4. Do NOT output generic review, recap, or exam topics.
5. Preserve the overall logical learning sequence.
{count_instruction}

Input Parameters:
Course Topic Context: {req.course_topic}
Difficulty Level: {req.difficulty}
Target Audience: {req.audience}
Current Topics to Expand: {req.topics}

Return ONLY valid JSON matching the structure below. No markdown formatting.

Expected JSON Structure:
{{
  "expanded_topics": [
    "Expanded topic 1",
    "Expanded topic 2",
    "..."
  ]
}}
"""
        # Konu listesi genişletme: ucuz model + thinking kapalı
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL_LITE,
            contents=prompt,
            config=gen_config(ExpandTopicsResponse, thinking_budget=0, model=settings.GEMINI_MODEL_LITE),
        )
        await record_ai_usage(db, teacher_id, "expand_topics", settings.GEMINI_MODEL_LITE, response, details=f"Kurs: '{req.course_topic}' | Konu Genişletme")
        data = json.loads(response.text.strip())
        return {
            "success": True, 
            "expanded_topics": data.get("expanded_topics", [])
        }
    except Exception as e:
        print(f"Error expanding topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/generate_roadmap_structure")
async def generate_roadmap_structure_api(
    req: GenerateRoadmapRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    try:
        client = genai.Client(api_key=settings.MY_API_KEY)
        
        pdf_context = ""
        if req.pdf_content:
            pdf_context = f"\n\nSource Material (PDF Content):\n{req.pdf_content[:40000]}\n\nInstruction: Base the curriculum topics, order, and explanations strictly on the provided Source Material PDF above."

        custom_lessons_instruction = ""
        if req.custom_lessons:
            custom_lessons_instruction = f"\n\nTarget Lessons Structure:\nThe teacher has requested to create exactly {len(req.custom_lessons)} lessons, with these exact titles and sub-topics in this order:\n"
            for i, l in enumerate(req.custom_lessons):
                custom_lessons_instruction += f"- Lesson {i+1}: \"{l.title}\"\n  Topics to cover in this lesson:\n"
                for t in l.topics:
                    custom_lessons_instruction += f"    * {t}\n"
            custom_lessons_instruction += "\nInstruction: You MUST structure the curriculum lessons list to match this exact list of lessons. For each lesson, generate the appropriate pedagogical modules sequence (UNDERSTAND, APPLY, etc.) covering the specific sub-topics listed for that lesson."

        lessons_count_instruction = f"Lessons Count: {req.lessons_count}" if req.lessons_count > 0 else "Lessons Count: [AI, please determine the optimal number of lessons (typically between 3 and 12) based on the depth of the course topic or the length of the PDF content. Design a complete, self-contained curriculum with that optimal number of lessons.]"

        prompt = f"""
{PLATFORM_CONTEXT}
Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is only to design the structure of a learning roadmap (lessons and modules sequence).
{pdf_context}
{custom_lessons_instruction}

Goal: Given the course topic, difficulty, desired lesson count, target audience, and target lessons list, generate the sequence of lessons and modules.

Requirements:
- The roadmap consists of lessons.
- Each lesson contains a list of modules representing levels.
- Modules are selected from: UNDERSTAND, APPLY, CONNECT, CREATE, QUIZ, HOMEWORK.
- **FLEXIBLE PEDAGOGICAL FLOW & MODULE RULES**:
  - A lesson can cover 1 or MULTIPLE sub-topics.
  - For EACH distinct sub-topic taught in the lesson, generate a pair of `UNDERSTAND` (Anla - Konu Teorisi) followed immediately by `APPLY` (Uygula - Kodlama Pratiği).
  - Therefore, a lesson CAN contain MULTIPLE `UNDERSTAND` and `APPLY` pairs if there are multiple sub-topics in that lesson (e.g., `UNDERSTAND(Konu 1) -> APPLY(Konu 1) -> UNDERSTAND(Konu 2) -> APPLY(Konu 2)...`). Do NOT limit a lesson to only one pair if multiple concepts are taught!
  - After all sub-topic theory & practice pairs in the lesson, you MUST include:
    1. At least one `CONNECT` module (Birleştir - Öğrenilen Kavramları Birleştirme Görevi / Bulmaca)
    2. At least one `CREATE` module (Üret - Mini Proje / Üretim Görevi)
    3. Exactly one `QUIZ` or `HOMEWORK` module (Değerlendirme Testi veya Ödev)
  - Summary of lesson module sequence: `[(UNDERSTAND -> APPLY)* (1 or more pairs)] -> CONNECT -> CREATE -> QUIZ (or HOMEWORK)`.
- **CRITICAL TITLE LENGTH CONSTRAINT (STRICT RULE)**: Every lesson title (`title`) and module topic string (`topic`) MUST be concise and MUST NOT exceed 30 characters in total length (e.g., 'Python Kurulumu', 'Değişken Tanımlama', 'Koşullu İfadeler'). Never generate verbose or long titles exceeding 30 characters.
- Each module in the lessons modules list MUST have a specific, distinct `"topic"` string explaining what specific sub-topic or task this module covers. This is critical for generating unique slide contents later.
- Return ONLY valid JSON matching the structure below. No markdown formatting, no text before or after the JSON.

Expected JSON Structure:
{{
  "courseTitle": "...",
  "lessons": [
    {{
      "lessonNumber": 1,
      "title": "Lesson title (Türkçe)",
      "objective": "Lesson learning objective (Türkçe)",
      "modules": [
        {{ "type": "UNDERSTAND", "topic": "1. Konu Anlatımı Başlığı (Türkçe)" }},
        {{ "type": "APPLY", "topic": "1. Konu Kodlama Pratiği Görevi (Türkçe)" }},
        {{ "type": "UNDERSTAND", "topic": "2. Konu Anlatımı Başlığı (Varsa) (Türkçe)" }},
        {{ "type": "APPLY", "topic": "2. Konu Kodlama Pratiği Görevi (Varsa) (Türkçe)" }},
        {{ "type": "CONNECT", "topic": "Öğrenilen Tüm Kavramları Birleştirme Görevi (Türkçe)" }},
        {{ "type": "CREATE", "topic": "Mini Proje Üretim Görevi (Türkçe)" }},
        {{ "type": "QUIZ", "topic": "Ders Değerlendirme Testi (Türkçe)" }}
      ]
    }}
  ]
}}

Input:
Topic: {req.topic}
Difficulty: {req.difficulty}
{lessons_count_instruction}
Audience: {req.audience}
"""
        # Kurs iskeleti kaliteyi belirler: ana model + SINIRLI thinking bütçesi.
        # Sınırsız bütçe, çıktı tarifesinden faturalanan binlerce görünmez token demek.
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL_CONTENT,
            contents=prompt,
            config=gen_config(RoadmapStructureResponse, thinking_budget=settings.GEMINI_THINKING_BUDGET_CONTENT, model=settings.GEMINI_MODEL_CONTENT),
        )
        await record_ai_usage(db, teacher_id, "generate_roadmap_structure", settings.GEMINI_MODEL_CONTENT, response, details=f"Kurs: '{req.topic}' ({req.lessons_count} Ders İskeleti)", source_chars=len(pdf_context), prompt_chars=len(prompt))
        
        data = json.loads(response.text.strip())
        return {"success": True, "roadmap": data}
    except Exception as e:
        print(f"Error planning roadmap structure: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/suggest_lesson_modules")
async def suggest_lesson_modules_api(
    req: SuggestLessonModulesRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    try:
        client = genai.Client(api_key=settings.MY_API_KEY)
        
        pdf_context = ""
        if req.pdf_content:
            pdf_context = f"\n\nSource Material (PDF Content):\n{req.pdf_content[:30000]}\n\nInstruction: Base the lesson objective and modular topic titles strictly on the provided Source Material PDF above."
            
        prompt = f"""
{PLATFORM_CONTEXT}
Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is to design the sub-modules (levels) for a single lesson in a learning roadmap.
{pdf_context}

Course Context:
Main Course Topic: {req.course_topic}
Course Difficulty: {req.difficulty}
Target Audience: {req.audience}

Lesson to design:
Lesson Title: {req.lesson_title}

Requirements:
- Plan the modules sequence for this lesson.
- Modules are selected from: UNDERSTAND, APPLY, CONNECT, CREATE, QUIZ, HOMEWORK.
- **FLEXIBLE PEDAGOGICAL FLOW & MODULE RULES**:
  - A lesson can cover 1 or MULTIPLE sub-topics.
  - For EACH distinct sub-topic taught in the lesson, generate a pair of `UNDERSTAND` (Anla - Konu Teorisi) followed immediately by `APPLY` (Uygula - Kodlama Pratiği).
  - Therefore, a lesson CAN contain MULTIPLE `UNDERSTAND` and `APPLY` pairs if there are multiple sub-topics in that lesson (e.g., `UNDERSTAND(Konu 1) -> APPLY(Konu 1) -> UNDERSTAND(Konu 2) -> APPLY(Konu 2)...`). Do NOT limit a lesson to only one pair if multiple concepts are taught!
  - After all sub-topic theory & practice pairs in the lesson, you MUST include:
    1. At least one `CONNECT` module (Birleştir - Öğrenilen Kavramları Birleştirme Görevi / Bulmaca)
    2. At least one `CREATE` module (Üret - Mini Proje / Üretim Görevi)
    3. Exactly one `QUIZ` or `HOMEWORK` module (Değerlendirme Testi veya Ödev)
  - Summary of lesson module sequence: `[(UNDERSTAND -> APPLY)* (1 or more pairs)] -> CONNECT -> CREATE -> QUIZ (or HOMEWORK)`.
- YOU MUST NEVER OMIT CONNECT OR CREATE MODULES!
- Each module in the modules list MUST have a specific, distinct `"topic"` string explaining what specific sub-topic or task this module covers. This is critical for generating unique slide contents later.
- Return ONLY valid JSON matching the structure below. No markdown formatting, no text before or after the JSON.

Expected JSON Structure:
{{
  "objective": "Lesson learning objective (Türkçe)",
  "modules": [
    {{ "type": "UNDERSTAND", "topic": "1. Konu Anlatımı Başlığı (Türkçe)" }},
    {{ "type": "APPLY", "topic": "1. Konu Kodlama Pratiği Görevi (Türkçe)" }},
    {{ "type": "UNDERSTAND", "topic": "2. Konu Anlatımı Başlığı (Varsa) (Türkçe)" }},
    {{ "type": "APPLY", "topic": "2. Konu Kodlama Pratiği Görevi (Varsa) (Türkçe)" }},
    {{ "type": "CONNECT", "topic": "Öğrenilen Tüm Kavramları Birleştirme Görevi (Türkçe)" }},
    {{ "type": "CREATE", "topic": "Mini Proje Üretim Görevi (Türkçe)" }},
    {{ "type": "QUIZ", "topic": "Ders Değerlendirme Testi (Türkçe)" }}
  ]
}}
"""
        # Modül listesi önerisi (kısa yapısal çıktı): ucuz model + thinking kapalı
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL_LITE,
            contents=prompt,
            config=gen_config(SuggestLessonModulesResponse, thinking_budget=0, model=settings.GEMINI_MODEL_LITE),
        )
        await record_ai_usage(db, teacher_id, "suggest_lesson_modules", settings.GEMINI_MODEL_LITE, response, details=f"Kurs: '{req.course_topic}' | Ders: '{req.lesson_title}'", source_chars=len(pdf_context), prompt_chars=len(prompt))
        
        data = json.loads(response.text.strip())
        return {"success": True, "objective": data.get("objective"), "modules": data.get("modules", [])}
    except Exception as e:
        print(f"Error suggesting lesson modules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/suggest_lesson_title")
async def suggest_lesson_title_api(
    req: SuggestLessonTitleRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    try:
        client = genai.Client(api_key=settings.MY_API_KEY)
        
        # Calculate preceding and succeeding lessons for clear contextual instruction
        preceding = req.existing_lessons[req.lesson_number - 2] if req.lesson_number > 1 and len(req.existing_lessons) >= req.lesson_number - 1 else None
        succeeding = req.existing_lessons[req.lesson_number] if len(req.existing_lessons) > req.lesson_number else None
        
        pdf_context = ""
        if req.pdf_content:
            pdf_context = f"\n\nSource Material (PDF Content):\n{req.pdf_content[:30000]}\n\nInstruction: Base the title suggestions strictly on the provided Source Material PDF content above."

        prompt = f"""
{PLATFORM_CONTEXT}
Role: You are an expert instructional designer and computer science curriculum planner. Türkçe cevap ver.
Your task is to suggest 5 alternative relevant lesson titles for lesson number {req.lesson_number} in a course curriculum.
{pdf_context}

Course Context:
Main Course Topic: {req.course_topic}
Course Difficulty: {req.difficulty}
Target Audience: {req.audience}

Curriculum Context:
Full Current Lesson Titles Sequence: {json.dumps(req.existing_lessons, ensure_ascii=False)}
Lesson Number to suggest: {req.lesson_number}
Preceding Lesson Title: {f'"{preceding}"' if preceding else "Yok (İlk Ders)"}
Succeeding Lesson Title: {f'"{succeeding}"' if succeeding else "Yok (Son Ders)"}

Requirements:
1. Suggest exactly 5 distinct, highly logical alternative lesson titles (in Turkish) for lesson number {req.lesson_number}.
2. Crucially check the surrounding titles: the suggested title MUST bridge the gap between the preceding lesson ("{preceding or ''}") and the succeeding lesson ("{succeeding or ''}").
3. For example:
   - If preceding is "Değişkenler" (variables) and succeeding is "Döngüler" (loops), the most standard and logical bridge topic in programming is "Koşullu İfadeler / Karar Yapıları (if-else, karşılaştırma operatörleri)".
   - Do NOT jump directly to advanced topics, and do NOT repeat concepts already covered in preceding/succeeding lessons.
4. Return ONLY valid JSON matching the structure below. No markdown formatting.

Expected JSON Structure:
{{
  "titles": [
    "Alternative Title 1",
    "Alternative Title 2",
    "Alternative Title 3",
    "Alternative Title 4",
    "Alternative Title 5"
  ]
}}
"""
        # 3 başlık önerisi (önemsiz görev): ucuz model + thinking kapalı
        # Ölçüm: thinking açıkken 25 token'lık cevap için 763 thinking token harcanıyordu.
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL_LITE,
            contents=prompt,
            config=gen_config(SuggestLessonTitleResponse, thinking_budget=0, model=settings.GEMINI_MODEL_LITE),
        )
        await record_ai_usage(db, teacher_id, "suggest_lesson_title", settings.GEMINI_MODEL_LITE, response, details=f"Kurs: '{req.course_topic}' | Ders {req.lesson_number} Başlık Önerisi", source_chars=len(pdf_context), prompt_chars=len(prompt))
        data = json.loads(response.text.strip())
        return {"success": True, "titles": data.get("titles", [])}
    except Exception as e:
        print(f"Error suggesting lesson title: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/suggest_level_details")
async def suggest_level_details_api(
    req: SuggestLevelDetailsRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    try:
        client = genai.Client(api_key=settings.MY_API_KEY)
        
        pdf_context = ""
        if req.pdf_content:
            pdf_context = f"\n\nSource Material (PDF Content):\n{req.pdf_content[:30000]}\n\nInstruction: Base the module title and topic suggestions strictly on the provided Source Material PDF content above."

        prompt = f"""
{PLATFORM_CONTEXT}
Role: You are an expert instructional designer. Türkçe cevap ver.
Your task is to suggest the title and detailed topic content for a specific module (level) inside a lesson.
{pdf_context}

Course Context:
Main Course Topic: {req.course_topic}
Difficulty: {req.difficulty}
Audience: {req.audience}

Lesson Context:
Lesson Title: {req.lesson_title}

Module Context:
Type of module: {req.module_type} (UNDERSTAND = theory, APPLY = practice challenge, CONNECT = combine concepts, CREATE = mini project, QUIZ = topic quiz, HOMEWORK = homework assignment)
Other modules already planned in this lesson: {json.dumps(req.sibling_modules, ensure_ascii=False)}

Requirements:
- Suggest a short display title (CRITICAL: MUST NOT exceed 30 characters) and a detailed description/topic (1-2 sentences) of what should be taught/practiced in this module.
- It must be relevant to both the lesson title and the pedagogical module type.
- Avoid repeating topics that are already covered by sibling modules.
- Return ONLY valid JSON matching the structure below. No markdown formatting.

Expected JSON Structure:
{{
  "title": "Short title (Türkçe)",
  "topic": "Detailed description / coding task prompt (Türkçe)"
}}
"""
        # Tek modül başlık+konu önerisi: ucuz model + thinking kapalı
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL_LITE,
            contents=prompt,
            config=gen_config(SuggestLevelDetailsResponse, thinking_budget=0, model=settings.GEMINI_MODEL_LITE),
        )
        await record_ai_usage(db, teacher_id, "suggest_level_details", settings.GEMINI_MODEL_LITE, response, details=f"Kurs: '{req.course_topic}' | Ders: '{req.lesson_title}' | Modül: {req.module_type}", source_chars=len(pdf_context), prompt_chars=len(prompt))
        data = json.loads(response.text.strip())
        return {"success": True, "title": data.get("title"), "topic": data.get("topic")}
    except Exception as e:
        print(f"Error suggesting level details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/generate_lesson_slides")
async def generate_lesson_slides_api(
    req: GenerateLessonSlidesRequest,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    TEMPLATES_PATH = "slide_templates.json"
    
    try:
        # Load templates
        templates = []
        if os.path.exists(TEMPLATES_PATH):
            with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
                templates = json.load(f)
                
        # Group templates by category
        templates_by_category = {
            "ANLA": [],
            "UYGULA": [],
            "BİRLEŞTİR": [],
            "ÜRET": []
        }
        for t in templates:
            cat = t.get("category", "").upper()
            if cat in templates_by_category:
                elements_info = []
                for el in t.get("elements", []):
                    if el.get("type") in ["text", "code", "sticky", "challenge", "code_editor", "connection_task", "production_task", "image"]:
                        elements_info.append({
                            "id": el.get("id"),
                            "type": el.get("type"),
                            "placeholder": el.get("content"),
                            "maxChars": el.get("maxChars")
                        })
                templates_by_category[cat].append({
                    "id": t.get("id"),
                    "title": t.get("title"),
                    "description": t.get("description"),
                    # Özel slayt üreten şablonlar (tuval elemanı yerine kendi bileşeni olanlar)
                    "slideType": t.get("slideType"),
                    "elements": elements_info
                })
                
        client = genai.Client(api_key=settings.MY_API_KEY)
        
        # Kaynak metnin TAMAMI değil, bu derse ait bölümü gönderilir (bkz. _select_pdf_excerpt).
        pdf_context = ""
        if req.pdf_content:
            focus = " ".join(
                [req.lesson_title or "", req.lesson_objective or ""]
                + [str(m.get("topic") or "") for m in req.modules if isinstance(m, dict)]
            )
            pdf_context = _pdf_source_block(req.pdf_content, focus)

        # Tek modül yeniden üretimi: kardeş modüller listede kalır ama YALNIZCA kapsam
        # sınırı olarak. Sınır verilmezse model, ders başlığındaki tüm konuları
        # ("Ders 1: Giriş, Değişkenler") tek modüle dolduruyor — ölçülen hata buydu.
        idx = req.target_module_index
        regen_target_idx = (
            idx if (req.is_regeneration and idx is not None and 0 <= idx < len(req.modules))
            else None
        )
        regeneration_scope = ""
        if regen_target_idx is not None:
            target = req.modules[regen_target_idx]
            others = [
                f"  - moduleIndex {i} ({m.get('type')}): {m.get('topic')}"
                for i, m in enumerate(req.modules) if i != regen_target_idx
            ]
            others_block = "\n".join(others) or "  (none)"
            regeneration_scope = f"""
REGENERATION — SINGLE MODULE ONLY (STRICT SCOPE):
You are REWRITING exactly ONE module of this lesson. Output `modules_content` MUST contain EXACTLY ONE entry, with moduleIndex {regen_target_idx} and type {target.get('type')}.
Target module topic: {target.get('topic')}

The other modules of this lesson already exist and are being taught separately. They are listed ONLY so you know where your scope ENDS:
{others_block}

HARD RULES:
- Cover ONLY the target module's topic. Do NOT teach, define, demonstrate or practise any concept that belongs to one of the other modules listed above — those are somebody else's slides.
- The Lesson Title may name several topics at once (e.g. "Giriş, Değişkenler"). That is the whole LESSON, not your module. Ignore the parts of the title that belong to the other modules.
- Do NOT try to cover the lesson objective end to end. Your module is one step of it.
- Do NOT emit quiz_map or homework_map unless the target module type is QUIZ or HOMEWORK.
"""

        # PROMPT SIRALAMASI BİLİNÇLİDİR — DEĞİŞTİRMEDEN ÖNCE OKUYUN:
        # Bir kursun dersleri arka arkaya üretilirken bu prompt'un başındaki her şey
        # (rol, kurallar, şablonlar, JSON şeması, kurs bağlamı, PDF) çağrılar arasında
        # AYNI kalır; yalnızca en sondaki "Lesson to populate" bloğu değişir.
        # Gemini implicit caching ortak ÖNEKİ otomatik olarak ~%75 indirimli faturalar —
        # değişken kısım araya girerse önek bozulur ve indirim tamamen kaybolur.
        prompt = f"""
{PLATFORM_CONTEXT}
Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is to write detailed educational slide, quiz, and homework contents for the UNDERSTAND, APPLY, CONNECT, and CREATE modules in the provided single lesson (given at the END of this prompt).

Available Templates for each category:
- UNDERSTAND (ANLA) templates:
{format_templates_summary(templates_by_category["ANLA"])}

- APPLY (UYGULA) templates:
{format_templates_summary(templates_by_category["UYGULA"])}

- CONNECT (BİRLEŞTİR) templates:
{format_templates_summary(templates_by_category["BİRLEŞTİR"])}

- CREATE (ÜRET) templates:
{format_templates_summary(templates_by_category["ÜRET"])}

Requirements:
- For each module in the lesson of type UNDERSTAND, APPLY, CONNECT, and CREATE, you MUST generate slide contents.
- For each module, choose the most suitable template from the available templates of its category.
- UNIVERSAL PEDAGOGICAL RULE FOR ALL TOPICS (STRICT CONSTRAINT):
  * For UNDERSTAND (ANLA): THE SLIDE COUNT IS DERIVED FROM THE CONTENT, IT IS NOT A FIXED NUMBER. Build it with this two-step expansion, which applies to EVERY subject:
    STEP 1 — split the module's `topic` into the sub-topics it names.
    STEP 2 — for EACH sub-topic, list its MEMBERS: the individually named things a student must be able to tell apart afterwards. A sub-topic with one member stays one slide; a sub-topic with four members becomes FOUR slides, one per member, each with its own example and its own gotcha.
    The slide count is the sum of STEP 2. Produce AT LEAST 3 slides; 4 to 10 is the normal range. If your expansion yields more than 10, keep the 10 most essential — but NEVER merge two members onto one slide just to fit.
  * ALLOCATE UNEQUALLY — THIS IS THE MOST COMMON FAILURE: sub-topics are NOT equal in weight, so they MUST NOT receive equal slide counts. A module named "print(), Değişken, Veri Tipi" has a light sub-topic (`print()` — one slide) and a heavy one (`Veri Tipi` — `str`, `int`, `float`, `bool` are four members, so four slides). Spending one slide on each of the three sub-topics is INVALID output: it compresses the heaviest part of the module into the same space as the lightest. Before writing, always ask which sub-topic contains the most named members, and give that one the most slides.
  * THIS RULE IS SUBJECT-INDEPENDENT. "Members" are whatever the field names individually: `str`/`int`/`float`/`bool`; each verb tense; each type of chemical bond; each organ of a system; each branch of government; each solid's volume formula; each period of a historical era. In every case N named members means N slides, NEVER N bullets on one slide. A slide that merely lists names with a one-line gloss each is a table of contents, not teaching.
  * A slide is CHEAP; student attention is not. When in doubt between one dense slide and two clear ones, ALWAYS produce two.
  * Crucially, EVERY single concept, formula, syntax, method, command, tool, function, or technique that will be required or practiced in the subsequent APPLY module MUST be explicitly taught, explained, and demonstrated with a concrete example (code block, text example, or formula breakdown) in these UNDERSTAND slides. Never explain theory without showing a concrete working example.
  * For APPLY (UYGULA): Generate 1 to 2 slides with task instructions or challenges. The student MUST ONLY be asked to apply or solve what was explicitly demonstrated and taught in the immediately preceding UNDERSTAND slides. It is STRICTLY FORBIDDEN to introduce or ask for any new concept, syntax, method, function, or formula in APPLY that was not explicitly shown in UNDERSTAND.
- For CONNECT (BİRLEŞTİR): This module MUST NOT teach new theory, MUST NOT use daily life analogies, and MUST NOT provide concept definitions. Its ONLY goal is to make the student combine and use two or more previously learned concepts together in a single coding challenge. 
  * In the Connection Task template, the `connection_task` element content MUST be a JSON-serialized string formatted exactly like this to populate the connection task widget:
    {{"previousTopic": "Name of previous topic (e.g. Değişken Tanımlama)", "currentTopic": "Name of current topic (e.g. Koşullu İfadeler)", "taskText": "Detailed connection coding challenge instructions asking the student to combine both topics."}}
- For CREATE (ÜRET): This module is for building a small mini-project.
  * In the Produce Task template, the `production_task` element content MUST be a JSON-serialized string formatted exactly like this to populate the production task widget:
    {{"projectTitle": "Title of the project (e.g. Hesap Makinesi)", "taskText": "Detailed instructions on what to build", "expectedOutput": "Example console output showing what the running code should display", "estimatedTime": "Estimated completion time (e.g. 15 Dakika)", "hints": "Useful coding hint or tip"}}
  * Note: The JSON string for `connection_task` or `production_task` must be escaped properly so that it is a valid JSON string inside the outer JSON response. Escape double quotes with `\"` and use `\n` for line breaks. Do not write raw newlines inside the string values.
- For QUIZ: generate 3 multiple-choice questions about the lesson topic. Each question must have 1 correct option and 3 incorrect options.
- For HOMEWORK: generate 1 practical homework task. Decide if the student should submit code, text, image, or file.
  * For programming topics, use "code" submissionType. For conceptual tasks, use "text".
  * For "code" type: provide a small starterCode template.
- UYGULAMA GÖREVİ (CHALLENGE) SPECIAL SLIDE — APPLY ONLY: One UYGULA template is marked `SPECIAL SLIDE (challenge)`. It is not a canvas layout; it renders a full task screen (brief + answer area + optional automatic check). Its PURPOSE is to make the student APPLY what the preceding UNDERSTAND module just taught. PREFER it for APPLY modules.
  * Its `elementContents` MUST contain EXACTLY ONE entry with `elementId` set to the literal string "challenge", and `content` set to a JSON-serialized string with this shape:
    {{"title": "Kısa görev başlığı", "prompt": "Ne yapılacağı, 1-2 cümle", "submissionType": "code", "checkMode": "output", "expectedOutput": "Merhaba Dünya!", "functionName": "", "tests": [], "hint": "Tek cümlelik ipucu", "xp": 100, "samples": [{{"input": "7", "output": "True"}}]}}
  * `submissionType` — HOW the student answers. Choose from what the task actually needs:
    - "code"  : student writes Python (default for programming topics)
    - "text"  : a written answer (explain, compare, interpret)
    - "image" : a screenshot (show your result / your drawing)
    - "file"  : any uploaded file
    Non-programming subjects (history, biology, language...) almost always want "text" or "image", NOT "code".
  * `checkMode` — only meaningful when submissionType is "code". Choose the one that matches the task:
    - "output" : the task is about what gets PRINTED. Set `expectedOutput` to the exact expected stdout. USE THIS for simple tasks like "print your name" — do NOT force a function where none is needed.
    - "tests"  : the task is to write a FUNCTION with a return value. Set `functionName` and 3 to 5 `tests`, covering at least one edge case (0, 1, empty, negative).
    - "manual" : open-ended; the teacher grades it. Leave expectedOutput and tests empty.
  * `tests` are executed for real: `call` is evaluated in Python after the student's code runs and compared AS TEXT to `expected`. `call` MUST be a valid Python expression using `functionName`, and `expected` MUST be exactly what Python's `str()` returns ("True", "False", "12", "[1, 2]"). `expectedOutput` is compared to real stdout the same way. NEVER write an expected value you have not actually reasoned out — a wrong expectation marks a correct student answer as wrong.
  * The task MUST only require concepts already taught in the preceding UNDERSTAND module.
  * Escape the JSON properly so it is a valid JSON string inside the outer response. Do NOT emit any other elementContents entry for this template.
- CRITICAL IMAGE REQUIREMENT: Your templates contain "image" elements. For EVERY "image" element, you MUST populate the "content" field in "elementContents" with a descriptive English search query (3-5 words) representing the visual content for that specific slide (e.g., "ancient roman soldier armor" for a history slide, "python coding mathematical operator" for a programming slide, "cell division biology microscope" for a biology slide). DO NOT leave "image" elements empty or unpopulated.
- STICKY NOTE RULE — A STICKY NOTE IS A GOTCHA, NOT A SUMMARY (STRICT): Elements of type `sticky` are the small coloured notes on the slide. They are the single most wasted space in a generated slide, so they have their own hard rule. Each sticky note MUST carry information that is NOWHERE ELSE on the slide. Write ONE of these, and nothing else:
  * The single most common mistake a beginner makes with this exact topic, stated as the mistake ("Tırnak koymayı unutmak en sık hatadır."), or
  * A non-obvious technical detail that the body text did NOT state ("Tırnak içindeki ifade, dize (string) olarak kabul edilir."), or
  * A concrete gotcha: an error message they will hit, an edge case, a version/platform difference, a keyboard shortcut.
  * ABSOLUTELY FORBIDDEN in a sticky note: restating or summarising the body text; generic encouragement or advice with no content ("Farklı IDE'leri deneyin.", "Bol bol pratik yapın.", "Kod yazmak eğlencelidir."); vague benefit claims ("IDE'ler verimliliği artırır.", "Python kolaydır."); repeating the slide title.
  * TEST BEFORE YOU WRITE IT: if a student who has NOT seen this lesson could still write your sticky note, it is filler — delete it and write the gotcha instead. If two sticky notes exist on one slide, they MUST contain two DIFFERENT facts; never two phrasings of the same point.
- CRITICAL SLIDE FORMAT RULE — CHOOSE THE FORMAT THAT FITS THE CONTENT (STRICT): Slide body text is projected on a classroom wall and read at a glance while the teacher speaks, so a dense encyclopedia paragraph is invalid output. But bullets are NOT a universal template either: chopping a definition into disconnected fragments destroys the explanation and produces empty one-liners. For every long-form text element (any element whose `maxChars` is 120 or more) you MUST pick the format from the NATURE of the content:
  * USE BULLETS when the content is genuinely discrete or ordered: installation and setup steps, a comparison of tools or options, a list of features, commands or shortcuts, do's and don'ts, an ordered procedure. These items do not connect into a sentence, so a list is the honest shape for them.
  * USE SHORT FLOWING PROSE — 2 to 4 sentences, NO bullet markers at all — when the content is a definition, a concept explanation, a "what is X" or "why does X exist" idea, or reasoning where each sentence builds on the one before it. This connective tissue is what makes the concept understandable; bullets delete it. You MAY optionally end with ONE single bullet stating the key takeaway, and nothing more.
  * NEVER write more than 4 sentences of prose. If the explanation genuinely needs more, split it across two slides instead.
  * DO NOT default to one shape. Decide per element, after looking at what the content actually is. A lesson where every single slide has the same shape is a failure — steps must look like steps, and a definition must read like an explanation.
  * ONE idea per slide. If the content covers two ideas, split it across two slides instead of packing one slide.
  * When you use bullets: AT MOST 4 bullets in a single text element.
  * EVERY BULLET AND EVERY PROSE SENTENCE MUST BE SPECIFIC — this outranks being short, and it applies to BOTH formats. Each one MUST contain at least one concrete anchor: an exact command, a keyword or function name, a file name or extension, a menu/checkbox label, a number, a key combination, or an exact error name. A bullet with no such anchor is INVALID OUTPUT.
  * BANNED — generic benefit sentences. These are all INVALID because the student cannot act on them and learns nothing: "Kod yazmayı hızlandırır", "Hata ayıklamayı kolaylaştırır", "Kod tamamlama özelliği sunar", "Proje yönetimini basitleştirir", "Verimliliği artırır", "Kullanımı kolaydır". Replace each with the concrete mechanism instead: "Ctrl+Space fonksiyon adını tamamlar", "Kırmızı alt çizgi hatalı satırı işaretler", "F5 ile satır satır çalıştırıp değişkeni izlersiniz".
  * SELF-TEST every bullet before writing it, both questions must pass: (1) Could someone who has NEVER seen this topic write this exact sentence from general knowledge? If yes it is filler — rewrite it with the specific command/name/number. (2) Can the student DO something after reading it? If no, rewrite it.
  * Length is a CEILING, NOT A GOAL: at most 12 words per bullet (prose sentences may be longer, but stay within the 2-4 sentence limit). Use all 12 words if that is what specificity costs. NEVER delete the concrete detail to make a bullet shorter — a specific 12-word bullet is always better than a vague 5-word one. Empty short bullets are exactly as bad as a dense paragraph; they are the same failure.
  * Cut ceremony, never content: drop "bulunmaktadır", "olarak adlandırılmaktadır", "-dır" chains, and restatements of the slide title. Keep the technical term, the command, the number.
  * WHEN USING BULLETS, format the element content EXACTLY as: `• first bullet<br>• second bullet<br>• third bullet` — the literal `•` character, separated by the HTML tag `<br>`. Do NOT use `-` or `*` as bullet markers, and do NOT emit `<ul>` or `<li>` tags. WHEN USING PROSE, write plain sentences with NO `•` marker and NO `<br>` between them.
  * Ordered step-by-step instructions are the ONE exception: keep them numbered (`1. ...<br>2. ...`) and still obey the 4-item and 12-word limits.
  * Concrete examples and syntax still belong on the slide, in whichever format you chose.
  * A server-side safety net only catches the extreme failure: a paragraph longer than 4 sentences is force-split into bullets and everything past the 4th is DISCARDED. Prose of 2-4 sentences is left exactly as you wrote it, so you are responsible for choosing the right format yourself.
- For each element you populate in `elementContents`, you MUST strictly respect the `maxChars` limit defined in the template. The number of characters of your generated text (including spaces) for that element ID MUST NOT exceed its `maxChars` value to prevent UI text overflow. This is a critical visual layout constraint. If a server-side safety net has to cut your text short because it exceeded `maxChars`, it will cut at the last complete sentence that fits — any unfinished trailing sentence is discarded entirely and never shown. So NEVER pad content with an extra clause or sentence that might not fit. When you are close to the limit, drop a WHOLE bullet rather than watering down the ones you keep — three specific bullets beat four vague ones. NEVER sacrifice a concrete detail (a command, a name, a number, an option label) just to save characters; that turns a useful slide into filler, which is a worse failure than being one bullet short.
- Populate `elementContents` mapping the template element IDs to your generated educational contents in Turkish.
- Return ONLY valid JSON matching the structure below. No markdown formatting, no text before or after the JSON.

Expected JSON Structure:
{{
  "modules_content": [
    {{
      "lessonNumber": 0, // MUST be the Lesson Number given at the end of this prompt
      "moduleIndex": 0, // 0-based index of the module in the lesson's modules list
      "slides": [
        {{
          "selectedTemplateId": "template_id_here",
          "elementContents": [
             {{ "elementId": "element_id_1", "content": "Generated text explanation in Turkish" }},
             {{ "elementId": "element_id_2", "content": "Generated python code or note..." }}
          ]
        }}
      ]
    }}
  ],
  "quiz_map": [
    {{
      "questionText": "Question text in Turkish?",
      "options": [
        {{ "text": "Correct Option text in Turkish", "isCorrect": true }},
        {{ "text": "Incorrect Option text in Turkish", "isCorrect": false }},
        {{ "text": "Another Incorrect Option", "isCorrect": false }},
        {{ "text": "Another Incorrect Option", "isCorrect": false }}
      ]
    }}
  ],
  "homework_map": {{
    "title": "Homework Title in Turkish",
    "instructions": "Step-by-step homework instructions/questions in Turkish",
    "submissionType": "code",
    "points": 100,
    "starterCode": "# Write starter code or comment template here in Turkish"
  }}
}}

Course context:
Topic: {req.topic}
Difficulty: {req.difficulty}
Audience: {req.audience}
{pdf_context}

Lesson to populate:
Lesson Number: {req.lesson_number}
Lesson Title: {req.lesson_title}
Lesson Objective: {req.lesson_objective}
Modules list: {json.dumps(req.modules, ensure_ascii=False)}
{regeneration_scope}"""
        # İçerik üretimi kalite yoludur: ana model + SINIRLI thinking bütçesi
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL_CONTENT,
            contents=prompt,
            config=gen_config(LessonSlidesResponse, thinking_budget=settings.GEMINI_THINKING_BUDGET_CONTENT, model=settings.GEMINI_MODEL_CONTENT),
        )
        if req.is_regeneration:
            # Canvas Builder'dan tek modül yeniden üretimi — ayrı bir maliyet kalemi (ai_economics.py)
            regen_topic = (req.modules[0].get("topic") if req.modules else "") or req.lesson_title
            await record_ai_usage(db, teacher_id, "regenerate_lesson_module", settings.GEMINI_MODEL_CONTENT, response, details=f"Kurs: '{req.topic}' | Ders {req.lesson_number}: '{req.lesson_title}' | Modül: '{regen_topic}'", source_chars=len(pdf_context), prompt_chars=len(prompt))
        else:
            await record_ai_usage(db, teacher_id, "generate_lesson_slides", settings.GEMINI_MODEL_CONTENT, response, details=f"Kurs: '{req.topic}' | Ders {req.lesson_number}: '{req.lesson_title}' | Modül Sayısı: {len(req.modules)}", source_chars=len(pdf_context), prompt_chars=len(prompt))
        
        slide_contents_data = json.loads(response.text.strip())
        modules_content = slide_contents_data.get("modules_content") or []
        
        # Build slides and notes
        theme_map = {
          "UNDERSTAND": "purple",
          "APPLY": "cyan",
          "CONNECT": "green",
          "CREATE": "yellow",
          "QUIZ": "quiz",
          "HOMEWORK": "homework"
        }
        
        all_templates_map = {
            "UNDERSTAND": templates_by_category["ANLA"],
            "APPLY": templates_by_category["UYGULA"],
            "CONNECT": templates_by_category["BİRLEŞTİR"],
            "CREATE": templates_by_category["ÜRET"]
        }
        
        generated_modules = []
        generated_notes = []
        # Kutusuna sığmayan metinler: kesilmez, en sonda tek çağrıyla yeniden yazdırılır.
        pending_shrink: list = []

        # Tekrar üretimde kardeş modüller prompt'a YALNIZCA kapsam sınırı olarak girer;
        # slayt/not yalnızca hedef modül için üretilir (frontend notes[0] bekliyor).
        modules_to_build = (
            [(regen_target_idx, req.modules[regen_target_idx])]
            if regen_target_idx is not None
            else list(enumerate(req.modules))
        )

        for m_idx, mod in modules_to_build:
            mod_type = mod.get("type", "UNDERSTAND").upper()
            mapped_theme = theme_map.get(mod_type, "purple")
            level_id = f"sec_ai_{int(random.random() * 1000000000)}"
            
            node = {
              "id": level_id,
              "title": mod.get("topic") or "" if mod_type not in ["QUIZ", "HOMEWORK"] else ("Konu Testi" if mod_type == "QUIZ" else "Ödev Görevi"),
              "theme": mapped_theme,
              "lectures": []
            }
            
            if m_idx == 0:
              node["lessonTopic"] = req.lesson_title
              node["lessonNumber"] = req.lesson_number
              
            generated_modules.append(node)
            
            if mod_type in ["UNDERSTAND", "APPLY", "CONNECT", "CREATE"]:
                # Find matching generated slides by moduleIndex
                matched = next((
                    mc for mc in modules_content 
                    if str(mc.get("moduleIndex")) == str(m_idx)
                ), None)
                
                ai_slides = []
                if matched:
                    ai_slides = matched.get("slides") or []
                    
                cat_templates = all_templates_map.get(mod_type, [])
                
                # Fallback if empty but templates exist
                if not ai_slides and cat_templates:
                    ai_slides = [{"selectedTemplateId": cat_templates[0]["id"], "elementContents": {}}]
                    
                if isinstance(ai_slides, dict):
                    ai_slides = [ai_slides]
                elif not isinstance(ai_slides, list):
                    ai_slides = []
                    
                slides_to_add = []
                for ai_slide in ai_slides:
                    sel_template_id = ai_slide.get("selectedTemplateId")
                    raw_contents = ai_slide.get("elementContents") or []
                    elem_contents = {}
                    if isinstance(raw_contents, list):
                        for pair in raw_contents:
                            if isinstance(pair, dict) and "elementId" in pair:
                                elem_contents[pair["elementId"]] = pair.get("content") or ""
                    elif isinstance(raw_contents, dict):
                        elem_contents = raw_contents
                    
                    # Find original template elements
                    selected_t = next((t for t in templates if t.get("id") == sel_template_id), None)
                    # Fallback to category template if not found
                    if not selected_t and cat_templates:
                        selected_t = next((t for t in templates if t.get("id") == cat_templates[0]["id"]), None)
                        
                    if selected_t and selected_t.get("slideType") == "challenge":
                        # Ozel slayt: tuval elemani yok, kendi yapilandirmasi var.
                        slides_to_add.append(_build_challenge_slide(elem_contents.get("challenge", "")))
                    elif selected_t:
                        copied_elements = []
                        for el in selected_t.get("elements", []):
                            el_copy = copy.deepcopy(el)
                            el_id = el_copy.get("id")
                            el_type = el_copy.get("type")
                            
                            # Pre-evaluate value if present
                            val = elem_contents.get(el_id) if el_id in elem_contents else ""
                            
                            if el_type == "image":
                                # Determine query - fallback to module topic or lesson title if empty
                                query = val if val else (mod.get("topic") or req.lesson_title or "coding")
                                is_fb = not bool(val)
                                img_url = await resolve_image_url(query, is_fallback=is_fb, context=req.topic)
                                el_copy["content"] = img_url
                                el_copy["imageUrl"] = img_url
                                el_copy["src"] = img_url
                            elif el_id in elem_contents:
                                if el_type == "connection_task":
                                    import json as pyjson
                                    try:
                                        parsed = pyjson.loads(val)
                                        el_copy["content"] = parsed.get("taskText") or val
                                        if "extra" not in el_copy or not el_copy["extra"]:
                                            el_copy["extra"] = {}
                                        el_copy["extra"]["previousTopic"] = parsed.get("previousTopic") or "Önceki Konu"
                                        el_copy["extra"]["currentTopic"] = parsed.get("currentTopic") or "Şimdiki Konu"
                                    except Exception:
                                        el_copy["content"] = val
                                elif el_type == "production_task":
                                    import json as pyjson
                                    try:
                                        parsed = pyjson.loads(val)
                                        el_copy["content"] = parsed.get("taskText") or val
                                        if "extra" not in el_copy or not el_copy["extra"]:
                                            el_copy["extra"] = {}
                                        el_copy["extra"]["projectTitle"] = parsed.get("projectTitle") or "Proje Başlığı"
                                        el_copy["extra"]["expectedOutput"] = parsed.get("expectedOutput") or ""
                                        el_copy["extra"]["estimatedTime"] = parsed.get("estimatedTime") or "10 Dakika"
                                        el_copy["extra"]["hints"] = parsed.get("hints") or ""
                                    except Exception:
                                        el_copy["content"] = val
                                else:
                                    _fit_text(el_copy, val, pending_shrink)
                            else:
                                _clear_unfilled_placeholder(el_copy)

                            copied_elements.append(el_copy)
                            
                        slide = {
                            "id": int(random.random() * 1000000000),
                            "elements": copied_elements,
                            "background": selected_t.get("background", "default")
                        }
                        slides_to_add.append(slide)
                        
                if slides_to_add:
                    note = {
                        "id": level_id,
                        "noteTitle": "",
                        "slides": slides_to_add
                    }
                    generated_notes.append(note)
            
            elif mod_type == "QUIZ":
                quiz_questions = slide_contents_data.get("quiz_map") or []
                questions_list = []
                
                if quiz_questions:
                    for idx, qq in enumerate(quiz_questions):
                        options_list = []
                        for opt_idx, opt in enumerate(qq.get("options", [])):
                            options_list.append({
                                "id": str(opt_idx + 1),
                                "text": opt.get("text", ""),
                                "isCorrect": opt.get("isCorrect", False)
                            })
                        questions_list.append({
                            "id": f"q-{idx + 1}-{int(random.random() * 100000)}",
                            "text": qq.get("questionText", "Soru"),
                            "options": options_list
                        })
                
                # Fallback if empty
                if not questions_list:
                    questions_list = [{
                        "id": "mock-q-1",
                        "text": f"{req.lesson_title} Konu Değerlendirme Sorusu",
                        "options": [
                            { "id": "1", "text": "Doğru Seçenek", "isCorrect": True },
                            { "id": "2", "text": "Yanlış Seçenek 1", "isCorrect": False },
                            { "id": "3", "text": "Yanlış Seçenek 2", "isCorrect": False },
                            { "id": "4", "text": "Yanlış Seçenek 3", "isCorrect": False }
                        ]
                    }]
                
                quiz_slide = {
                    "id": int(random.random() * 1000000000),
                    "type": "game",
                    "gameType": "matching",
                    "gameConfig": {
                        "timeLimit": 60,
                        "questions": questions_list
                    },
                    "elements": []
                }
                
                note = {
                    "id": level_id,
                    "noteTitle": "",
                    "slides": [quiz_slide]
                }
                generated_notes.append(note)
            
            elif mod_type == "HOMEWORK":
                hw_data = slide_contents_data.get("homework_map") or {}
                hw_title = hw_data.get("title") or f"{req.lesson_title} Ödev Görevi"
                # Yönerge düz metindir; kaçmış `\n` dizileri gerçek satır sonuna çevrilir.
                # starterCode'a UYGULANMAZ — orada `\n` geçerli Python olabilir.
                hw_instructions = _unescape_newlines(
                    hw_data.get("instructions") or "Lütfen bu konuyla ilgili ödevinizi tamamlayıp yükleyin."
                )
                hw_sub_type = hw_data.get("submissionType") or "text"
                hw_points = hw_data.get("points") or 100
                hw_starter = hw_data.get("starterCode") or "# Kodunuzu buraya yazın\n"
                
                homework_slide = {
                    "id": int(random.random() * 1000000000),
                    "type": "homework",
                    "background": "default",
                    "homeworkConfig": {
                        "title": hw_title,
                        "instructions": hw_instructions,
                        "submissionType": hw_sub_type,
                        "points": hw_points,
                        "starterCode": hw_starter
                    },
                    "elements": []
                }
                
                note = {
                    "id": level_id,
                    "noteTitle": "",
                    "slides": [homework_slide]
                }
                generated_notes.append(note)

        await _shrink_overflowing(client, pending_shrink, db, teacher_id, req.topic)

        return {"success": True, "modules": generated_modules, "notes": generated_notes}
    except Exception as e:
        print(f"Error generating lesson slides: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ai/metrics")
@router.get("/courses/metrics")
async def get_ai_metrics_api(
    db: AsyncSession = Depends(get_db),
    user_info: dict = Depends(get_current_user_info)
):
    """
    Eğitmen veya Admin paneli için Yapay Zeka (AI) kullanım metriklerini ve harcama özetini döndürür.

    Eğitmenler YALNIZCA kendi kullanımlarını görür; platform geneli sadece admin'e açıktır.
    """
    role = user_info.get("role")
    if role not in ["admin", "teacher", "instructor"]:
        raise HTTPException(status_code=403, detail="Erişim yetkiniz bulunmamaktadır.")

    stmt = select(AIUsageLog).order_by(AIUsageLog.created_at.desc())
    if role != "admin":
        stmt = stmt.where(AIUsageLog.teacher_id == int(user_info["sub"]))

    result = await db.execute(stmt)
    logs = result.scalars().all()

    total_requests = len(logs)
    total_prompt_tokens = sum(l.prompt_tokens or 0 for l in logs)
    total_candidates_tokens = sum(l.candidates_tokens or 0 for l in logs)
    # Thinking token'ları Google tarafından çıktı tarifesinden faturalanır —
    # panelde gösterilmezse gerçek fatura ile metrik arasında 20 kata varan fark oluşur.
    total_thoughts_tokens = sum(getattr(l, "thoughts_tokens", 0) or 0 for l in logs)
    total_tokens = total_prompt_tokens + total_candidates_tokens + total_thoughts_tokens

    # Maliyet, her kaydın KENDİ model adına göre core/ai_pricing.py üzerinden hesaplanır.
    # Böylece farklı modellerle yapılmış çağrılar karışmaz ve kaydedilen değerle
    # panelde gösterilen değer aynı tabloyu kullanır.
    usd_to_tl_rate = ai_pricing.USD_TO_TRY

    by_action = {}
    by_model = {}
    by_course = {}

    total_cost_usd = 0.0

    # Birim ekonomisi için: her ders-üretim çağrısının maliyeti ve modül sayısı
    lesson_entries = []
    # İşlem kategorisi kırılımı için hafif log satırları
    op_rows = []

    for l in logs:
        p_tok = l.prompt_tokens or 0
        c_tok = l.candidates_tokens or 0
        th_tok = getattr(l, "thoughts_tokens", 0) or 0
        t_tok = p_tok + c_tok + th_tok if (p_tok or c_tok) else (l.total_tokens or 0)
        c_usd = (
            ai_pricing.cost_usd(l.model_name, p_tok, c_tok, th_tok)
            if (p_tok or c_tok)
            else (l.cost_usd or 0.0)
        )
        total_cost_usd += c_usd

        if l.action in ai_economics.LESSON_GEN_ACTIONS:
            lesson_entries.append({
                "cost_usd": c_usd,
                "modules": ai_economics.parse_module_count(l.details),
            })

        op_rows.append({
            "action": l.action,
            "model": l.model_name,
            "cost_usd": c_usd,
            "created_at": l.created_at,
            # Kaynak PDF payı — kolonlar eklenmeden önceki kayıtlarda 0/None.
            "source_chars": getattr(l, "source_chars", 0) or 0,
            "source_tokens": getattr(l, "source_tokens", 0) or 0,
            "source_cost_usd": getattr(l, "source_cost_usd", 0.0) or 0.0,
        })

        act = l.action or "diğer"
        if act not in by_action:
            by_action[act] = {"count": 0, "tokens": 0, "cost_usd": 0.0}
        by_action[act]["count"] += 1
        by_action[act]["tokens"] += t_tok
        by_action[act]["cost_usd"] += c_usd

        mdl = l.model_name or "bilinmiyor"
        if mdl not in by_model:
            by_model[mdl] = {"count": 0, "tokens": 0, "cost_usd": 0.0}
        by_model[mdl]["count"] += 1
        by_model[mdl]["tokens"] += t_tok
        by_model[mdl]["cost_usd"] += c_usd

        # Course grouping
        c_name = getattr(l, "course_title", None)
        if not c_name and l.details:
            match = re.search(r"Kurs:\s*'([^']+)'", l.details) or re.search(r"Kurs:\s*([^|]+)", l.details)
            if match:
                c_name = match.group(1).strip()
        
        if not c_name:
            c_name = "Genel / Bağımsız İşlemler"

        if c_name not in by_course:
            by_course[c_name] = {
                "course_title": c_name,
                "course_id": getattr(l, "course_id", None),
                "total_calls": 0,
                "prompt_tokens": 0,
                "candidates_tokens": 0,
                "total_tokens": 0,
                "cost_usd": 0.0,
                "cost_tl": 0.0,
                "steps": []
            }

        by_course[c_name]["total_calls"] += 1
        by_course[c_name]["prompt_tokens"] += p_tok
        by_course[c_name]["candidates_tokens"] += c_tok
        by_course[c_name]["total_tokens"] += t_tok
        by_course[c_name]["cost_usd"] += c_usd

        by_course[c_name]["steps"].append({
            "id": l.id,
            "action": l.action,
            "model_name": l.model_name,
            "prompt_tokens": p_tok,
            "candidates_tokens": c_tok,
            "total_tokens": t_tok,
            "cost_usd": round(c_usd, 6),
            "details": getattr(l, "details", None),
            "created_at": l.created_at.isoformat() if l.created_at else None
        })

    # Format course summaries
    courses_summary = []
    for c_info in by_course.values():
        c_info["cost_tl"] = round(c_info["cost_usd"] * usd_to_tl_rate, 2)
        c_info["cost_usd"] = round(c_info["cost_usd"], 6)
        courses_summary.append(c_info)

    courses_summary.sort(key=lambda x: x["cost_usd"], reverse=True)

    recent_logs = [
        {
            "id": l.id,
            "teacher_id": l.teacher_id,
            "action": l.action,
            "model_name": l.model_name,
            "prompt_tokens": l.prompt_tokens or 0,
            "candidates_tokens": l.candidates_tokens or 0,
            "thoughts_tokens": getattr(l, "thoughts_tokens", 0) or 0,
            "total_tokens": (l.prompt_tokens or 0) + (l.candidates_tokens or 0) + (getattr(l, "thoughts_tokens", 0) or 0) if (l.prompt_tokens or l.candidates_tokens) else (l.total_tokens or 0),
            # Özet ile aynı tarife tablosu kullanılır ki satır toplamı üstteki toplamla tutsun
            "cost_usd": round(
                ai_pricing.cost_usd(l.model_name, l.prompt_tokens or 0, l.candidates_tokens or 0, getattr(l, "thoughts_tokens", 0) or 0)
                if (l.prompt_tokens or l.candidates_tokens)
                else (l.cost_usd or 0.0),
                6,
            ),
            "details": getattr(l, "details", None),
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs[:100]
    ]

    total_cost_tl = ai_pricing.to_try(total_cost_usd)

    # Birim ekonomisi: ders / modül / kurs başına ortalamalar + modül tipi tahmini
    unit_economics = ai_economics.compute_unit_economics(
        lesson_entries,
        [c["cost_usd"] for c in courses_summary],
        usd_to_tl_rate,
    )

    # İşlem kategorisi bazlı maliyet tablosu (birim / ders başı / öğretmen aylık)
    operation_breakdown = ai_economics.compute_operation_breakdown(
        op_rows,
        unit_economics["lessons_generated"],
        usd_to_tl_rate,
        settings.LESSONS_PER_TEACHER_MONTH,
    )

    # Yüklenen kaynak PDF'in maliyetteki payı (toplama EK DEĞİL, içinden ayrıştırma)
    source_breakdown = ai_economics.compute_source_material_breakdown(
        op_rows,
        unit_economics["lessons_generated"],
        usd_to_tl_rate,
    )

    return {
        "success": True,
        "metrics": {
            "total_requests": total_requests,
            "total_prompt_tokens": total_prompt_tokens,
            "total_candidates_tokens": total_candidates_tokens,
            "total_thoughts_tokens": total_thoughts_tokens,
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_cost_usd, 4),
            "total_cost_tl": round(total_cost_tl, 2),
            "usd_to_tl_rate": usd_to_tl_rate,
            "by_action": by_action,
            "by_model": by_model,
            "by_course": courses_summary,
            "unit_economics": unit_economics,
            "operation_breakdown": operation_breakdown,
            "source_material": source_breakdown,
            "recent_logs": recent_logs
        }
    }


@router.delete("/ai/metrics")
@router.delete("/courses/metrics")
async def clear_ai_metrics_api(
    db: AsyncSession = Depends(get_db),
    user_info: dict = Depends(get_current_user_info)
):
    """
    Yapay Zeka (AI) metrik ve kullanım loglarını sıfırlar / siler.

    Admin tüm kayıtları, eğitmen ise yalnızca kendi kayıtlarını silebilir —
    bir eğitmenin tüm platformun log geçmişini silmesi engellenir.
    """
    role = user_info.get("role")
    if role not in ["admin", "teacher", "instructor"]:
        raise HTTPException(status_code=403, detail="Erişim yetkiniz bulunmamaktadır.")

    stmt = delete(AIUsageLog)
    if role != "admin":
        stmt = stmt.where(AIUsageLog.teacher_id == int(user_info["sub"]))

    await db.execute(stmt)
    await db.commit()

    return {
        "success": True,
        "message": (
            "Tüm yapay zeka metrik verileri sıfırlandı."
            if role == "admin"
            else "Size ait yapay zeka metrik verileri sıfırlandı."
        ),
    }


def get_module_type_from_theme_py(theme: str) -> str:
    if not theme:
        return "UNDERSTAND"
    t = theme.lower()
    if t == "purple": return "UNDERSTAND"
    if t == "cyan": return "APPLY"
    if t == "green": return "CONNECT"
    if t == "yellow": return "CREATE"
    if t == "quiz": return "QUIZ"
    if t == "homework": return "HOMEWORK"
    return "UNDERSTAND"


class StartBackgroundGenerationRequest(BaseModel):
    topic: str
    difficulty: str = "Beginner"
    audience: str = "Hiç kodlama deneyimi olmayan öğrenciler."
    chapters: List[Dict[str, Any]]
    pdf_content: Optional[str] = None


async def run_background_slide_generation(
    course_id: int,
    teacher_id: int,
    topic: str,
    difficulty: str,
    audience: str,
    chapters: List[Dict[str, Any]],
    pdf_content: Optional[str] = None
):
    """
    Background worker that runs slide generation lesson-by-lesson asynchronously on FastAPI server.
    Updates DB after each completed lesson. Survives browser refresh and disconnects.
    """
    async with SessionLocal() as db:
        try:
            res = await db.execute(select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id))
            course = res.scalars().first()
            if not course:
                return

            curriculum = list(course.curriculum or [])
            all_notes = list(course.notes or [])
            total_chapters = len(chapters)
            overall_idx = 1

            for i, chapter in enumerate(chapters):
                status_item = {
                    "type": "ai_generation_status",
                    "status": "processing",
                    "current": i + 1,
                    "total": total_chapters,
                    "message": f"Ders {i + 1}/{total_chapters}: '{chapter.get('topic')}' slaytları hazırlanıyor..."
                }

                curriculum = [c for c in curriculum if c.get("type") != "ai_generation_status"]
                curriculum.append(status_item)

                course.curriculum = list(curriculum)
                db.add(course)
                await db.commit()

                modules_input = [
                    {"type": get_module_type_from_theme_py(lvl.get("theme")), "topic": lvl.get("title")}
                    for lvl in chapter.get("levels", [])
                ]
                objective = chapter.get("levels", [{}])[0].get("aiLessonObjective") or f"Bu derste {chapter.get('topic')} konusu öğrenilecektir."

                req_obj = GenerateLessonSlidesRequest(
                    topic=topic,
                    difficulty=difficulty,
                    audience=audience,
                    lesson_number=chapter.get("number", i + 1),
                    lesson_title=chapter.get("topic", f"Ders {i+1}"),
                    lesson_objective=objective,
                    modules=modules_input,
                    pdf_content=pdf_content
                )

                slide_res = await generate_lesson_slides_api(req_obj, teacher_id=teacher_id, db=db)
                returned_modules = slide_res.get("modules", [])
                returned_notes = slide_res.get("notes", [])

                orig_levels = chapter.get("levels", [])
                for n_idx, node in enumerate(returned_modules):
                    orig_level = orig_levels[n_idx] if n_idx < len(orig_levels) else {}
                    real_title = orig_level.get("title") or orig_level.get("aiModuleTopic") or node.get("topic") or node.get("title")
                    
                    clean_t = re.sub(r"^(?:Ders\s+\d+[:\s\-]*|\d+[\.\)\s\-]*)", "", str(real_title), flags=re.IGNORECASE).strip()
                    node["title"] = clean_t[:30] if clean_t else f"Modül {overall_idx}"
                    overall_idx += 1
                    node.pop("isAIDraft", None)
                    node.pop("isAILoading", None)

                for note in returned_notes:
                    matched_node = next((nm for nm in returned_modules if nm.get("id") == note.get("id")), None)
                    if matched_node:
                        note["noteTitle"] = matched_node.get("title")

                all_notes.extend(returned_notes)

                chapter_level_ids = [l.get("id") for l in orig_levels]
                clean_curr = [c for c in curriculum if c.get("type") != "ai_generation_status"]
                
                first_idx = next((idx for idx, s in enumerate(clean_curr) if s.get("id") in chapter_level_ids), -1)
                if first_idx != -1:
                    clean_curr[first_idx:first_idx + len(chapter_level_ids)] = returned_modules
                
                curriculum = clean_curr

                course.curriculum = list(curriculum)
                course.notes = list(all_notes)
                db.add(course)
                await db.commit()

            status_item = {
                "type": "ai_generation_status",
                "status": "completed",
                "current": total_chapters,
                "total": total_chapters,
                "message": "Tüm ders slaytları başarıyla oluşturuldu!"
            }
            curriculum = [c for c in curriculum if c.get("type") != "ai_generation_status"]
            curriculum.append(status_item)

            course.curriculum = list(curriculum)
            course.notes = list(all_notes)
            db.add(course)
            await db.commit()

        except Exception as e:
            print(f"Error in background slide generation: {e}")
            try:
                res = await db.execute(select(Course).where(Course.id == course_id))
                course = res.scalars().first()
                if course:
                    curr = list(course.curriculum or [])
                    curr = [c for c in curr if c.get("type") != "ai_generation_status"]
                    curr.append({
                        "type": "ai_generation_status",
                        "status": "failed",
                        "message": f"Slayt üretilirken hata oluştu: {str(e)}"
                    })
                    course.curriculum = curr
                    db.add(course)
                    await db.commit()
            except Exception:
                pass


@router.post("/courses/{course_id}/start_background_generation")
async def start_background_generation_api(
    course_id: int,
    req: StartBackgroundGenerationRequest,
    background_tasks: BackgroundTasks,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Course).where(Course.id == course_id, Course.teacher_id == teacher_id))
    course = res.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")

    curriculum = list(course.curriculum or [])
    curriculum = [c for c in curriculum if c.get("type") != "ai_generation_status"]
    curriculum.append({
        "type": "ai_generation_status",
        "status": "processing",
        "current": 0,
        "total": len(req.chapters),
        "message": "Arka planda AI slayt üretimi başlatılıyor..."
    })

    course.curriculum = curriculum
    db.add(course)
    await db.commit()

    background_tasks.add_task(
        run_background_slide_generation,
        course_id=course_id,
        teacher_id=teacher_id,
        topic=req.topic,
        difficulty=req.difficulty,
        audience=req.audience,
        chapters=req.chapters,
        pdf_content=req.pdf_content
    )

    return {
        "success": True,
        "message": "Arka planda slayt üretimi başlatıldı."
    }


# ─────────────────────────────────────────────────────────────────────────────
# ÖDEV DEĞERLENDİRME
#
# Bu uç, daha önce tarayıcıda çalışan ve VITE_GEMINI_API_KEY'i istemci bundle'ına
# gömen homeworkAIService.ts mantığının backend karşılığıdır. Gemini anahtarı artık
# yalnızca sunucuda durur ve her çağrı ai_usage_logs'a kaydedilir.
# ─────────────────────────────────────────────────────────────────────────────

HOMEWORK_SYSTEM_PROMPT = """Sen bir eğitim değerlendirme asistanısın.
Görevin: Bir öğrencinin ödevini eğitmenin sorusuna göre değerlendirmek.

KURALLAR:
- Türkçe yaz.
- Sadece hatalı ve eksik kısımları odak noktası al (doğru yapılanları veya strengths listesini yazma).
- weaknesses listesi 0 ile 5 madde arasında olsun.
- Her hata/eksiklik için mutlaka 'explanation' ve kod tabanlı ödevlerde 'improvedCode' sağla. Öğrenci kodu iyileştirilebilecek durumdaysa 'studentCode' alanını da doldur.
- overallScore 0-100 arasında olmalı. Puan verirken adil ve yapıcı ol.
- summary 2-3 cümlelik genel değerlendirme özeti olsun.
- Eğer içerik soruyla alakasızsa weaknesses'e ekle."""

# Frontend'deki homeworkAIService.ts ile aynı uzantı listeleri
HOMEWORK_TEXT_EXTENSIONS = {
    ".txt", ".md", ".py", ".js", ".ts", ".java", ".c", ".cpp", ".cs",
    ".json", ".xml", ".csv", ".html", ".css",
}
HOMEWORK_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
HOMEWORK_MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


class AIWeaknessResponse(BaseModel):
    explanation: str
    studentCode: Optional[str] = None
    improvedCode: Optional[str] = None


class HomeworkEvaluationResponse(BaseModel):
    overallScore: int
    summary: str
    weaknesses: List[AIWeaknessResponse]


def _homework_parts(
    question: str,
    submission_type: str,
    text_answer: Optional[str],
    file_bytes: Optional[bytes],
    file_name: Optional[str],
    file_mime: Optional[str],
) -> List[Any]:
    """Teslim türüne göre Gemini'ye gönderilecek parçaları hazırlar."""
    question_block = f"EĞİTMENİN SORUSU:\n{question}"
    header = f"{HOMEWORK_SYSTEM_PROMPT}\n\n{question_block}"

    if submission_type == "text":
        return [types.Part.from_text(
            text=f"{header}\n\nÖĞRENCİNİN METİN CEVABI:\n{text_answer or ''}"
        )]

    if submission_type == "code":
        return [types.Part.from_text(
            text=(
                f"{header}\n\nÖĞRENCİNİN KOD CEVABI (kaynak kod):\n```\n{text_answer or ''}\n```\n\n"
                "Kod kalitesi, doğruluğu, okunabilirliği ve soruyla uyumunu değerlendir. "
                "Varsa sözdizimi hatalarını belirt."
            )
        )]

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Bu teslim türü için dosya gereklidir.")

    ext = ("." + file_name.rsplit(".", 1)[-1].lower()) if file_name and "." in file_name else ""
    mime = file_mime or "application/octet-stream"

    if submission_type == "image":
        return [
            types.Part.from_text(text=(
                f"{header}\n\nÖĞRENCİNİN CEVABI: Aşağıdaki görseli değerlendir. "
                "Görselin soruyla ilgisini, içeriğini ve kalitesini değerlendir."
            )),
            types.Part.from_bytes(data=file_bytes, mime_type=mime),
        ]

    # submission_type == "file"
    if ext in HOMEWORK_TEXT_EXTENSIONS:
        try:
            content = file_bytes.decode("utf-8", errors="replace")
        except Exception:
            content = ""
        return [types.Part.from_text(
            text=f"{header}\n\nÖĞRENCİNİN DOSYA CEVABI ({file_name}):\n{content}"
        )]

    if ext in HOMEWORK_IMAGE_EXTENSIONS:
        return [
            types.Part.from_text(text=f"{header}\n\nÖĞRENCİNİN DOSYA CEVABI: Aşağıdaki görseli değerlendir."),
            types.Part.from_bytes(data=file_bytes, mime_type=mime),
        ]

    if ext == ".pdf":
        return [
            types.Part.from_text(text=f"{header}\n\nÖĞRENCİNİN DOSYA CEVABI (PDF): Aşağıdaki PDF'i değerlendir."),
            types.Part.from_bytes(data=file_bytes, mime_type="application/pdf"),
        ]

    return [types.Part.from_text(text=(
        f"{header}\n\nÖĞRENCİNİN CEVABI: Öğrenci \"{file_name}\" adlı bir dosya yükledi "
        "(içerik okunamıyor). Bu bilgiyle mümkün olan değerlendirmeyi yap."
    ))]


@router.post("/ai/evaluate-homework")
async def evaluate_homework_api(
    question: str = Form(...),
    submission_type: str = Form(...),
    text_answer: Optional[str] = Form(None),
    course_id: Optional[int] = Form(None),
    node_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user_info: dict = Depends(get_current_user_info),
    db: AsyncSession = Depends(get_db),
):
    """Öğrenci ödevini Gemini ile değerlendirir ve kullanımı loglar."""
    if submission_type not in ("text", "code", "image", "file"):
        raise HTTPException(status_code=400, detail=f"Desteklenmeyen teslim türü: {submission_type}")

    role = user_info.get("role")
    course_title = None

    if course_id is not None:
        # Kursa erişimi olmayan kimse başkasının ödevini değerlendiremez
        course = await ensure_course_access(db, course_id, user_info)
        course_title = course.title
    elif role not in ("teacher", "instructor", "admin"):
        # course_id yalnızca eğitmen önizlemesinde boş bırakılabilir
        raise HTTPException(status_code=400, detail="course_id zorunludur.")

    if (submission_type in ("text", "code")) and not (text_answer or "").strip():
        raise HTTPException(status_code=400, detail="Cevap metni boş olamaz.")

    file_bytes = None
    if file is not None:
        file_bytes = await file.read()
        if len(file_bytes) > HOMEWORK_MAX_FILE_BYTES:
            raise HTTPException(status_code=413, detail="Dosya boyutu 10 MB'ı aşamaz.")

    parts = _homework_parts(
        question=question,
        submission_type=submission_type,
        text_answer=text_answer,
        file_bytes=file_bytes,
        file_name=file.filename if file else None,
        file_mime=file.content_type if file else None,
    )

    try:
        client = genai.Client(api_key=settings.MY_API_KEY)
        # Değerlendirme kalitesi önemli (kod hatalarını yakalamalı) ama öğrenciler bu
        # ucu sık tetikler — sınırlı thinking bütçesi kalite/maliyet dengesini kurar.
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[types.Content(role="user", parts=parts)],
            config=gen_config(HomeworkEvaluationResponse, thinking_budget=settings.GEMINI_THINKING_BUDGET, model=settings.GEMINI_MODEL),
        )
    except Exception as e:
        logger.exception("Ödev değerlendirme çağrısı başarısız: %s", e)
        raise HTTPException(status_code=502, detail="Değerlendirme servisi şu anda yanıt vermiyor.")

    teacher_id = int(user_info["sub"]) if role in ("teacher", "instructor", "admin") else None
    await record_ai_usage(
        db, teacher_id, "evaluate_homework", settings.GEMINI_MODEL, response,
        details=f"Ödev Değerlendirme ({submission_type})" + (f" | Ders: {node_id}" if node_id else ""),
        course_id=course_id,
        course_title=course_title,
    )

    raw_text = (response.text or "").strip()
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        logger.error("Ödev değerlendirmesi JSON olarak çözülemedi: %r", raw_text[:500])
        raise HTTPException(status_code=502, detail="Değerlendirme yanıtı çözümlenemedi.")

    weaknesses = parsed.get("weaknesses")
    return {
        "overallScore": max(0, min(100, int(parsed.get("overallScore") or 0))),
        "summary": parsed.get("summary") or "",
        "weaknesses": weaknesses if isinstance(weaknesses, list) else [],
        "rawResponse": raw_text,
    }


