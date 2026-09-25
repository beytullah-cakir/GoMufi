"""
Kod kökeni: bir görev dosyasındaki her karakterin NEREDEN geldiği.

Eklenti (ve tarayıcı editörü) her düzenlemeyi kaynağıyla birlikte gönderir:
elle yazma, dışarıdan yapıştırma, VS Code içinden yapıştırma, toplu ekleme
(otomatik tamamlama / YZ önerisi kabulü böyle görünür), editör dışı değişiklik.
Burada kayıt baştan oynatılır ve son metnin her parçası kaynağıyla etiketlenir.

NEDEN KARAKTER DÜZEYİNDE: "öğrenci 40 satır yapıştırdı" tek başına bir şey
söylemez — sonra hepsini silip kendisi yazmış olabilir. Önemli olan SON koddaki
payı: teslim edilen kodun ne kadarı öğrencinin elinden çıktı.

Bu modül veritabanını bilmez; durum sözlüğü alır, yeni durum döner. Böylece
oynatma kuralları birim testle doğrulanabiliyor.

Bu bir KANIT katmanıdır, hüküm değil: telefondan bakıp elle yazılan YZ çıktısı
"elle yazma" görünür, öğrencinin kendi eski kodunu yapıştırması "yapıştırma"
görünür. Arayüz "YZ kullandı" demez, olguları gösterir.
"""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Tuple

# İstemcinin gönderdiği tür kodu -> kaynak adı.
KIND_SOURCES = {
    "t": "typed",            # elle yazma (tek karakter, girinti, otomatik parantez)
    "a": "autocomplete",     # kısa tamamlama: tek satır, birkaç kelime
    "p": "paste_external",   # dışarıdan yapıştırma (tarayıcı, sohbet, başka program)
    "c": "paste_internal",   # VS Code içinden kopyalanıp yapıştırılan
    "l": "lesson",           # platformun gönderdiği ders materyalinden kopyalanan
    "b": "bulk",             # yapıştırma olmadan tek seferde çok satır
    "e": "external",         # dosya editör dışında değişti
}
# Kaynağı eklenen metinden değil, çevresinden/silinenden miras alan türler.
INHERITING_KINDS = {"f", "u", "r"}   # biçimlendirme, geri al, yinele

STARTER = "starter"
UNKNOWN = "unknown"

# Öğrencinin kendi emeği sayılan kaynaklar.
OWN_SOURCES = ("typed", "autocomplete")

MAX_RECENT_DELETES = 20
MAX_DELETE_MEMORY_CHARS = 5000
ACTIVE_GAP_MS = 60_000       # bundan uzun sessizlik "aktif çalışma" sayılmaz
TYPING_WINDOW_MS = 60_000    # yazma hızı tepe değeri bu pencerede ölçülür


def empty_state() -> Dict[str, Any]:
    return {
        "text": "",
        "segments": [],
        "totals": {},
        "recent_deletes": [],
        "recent_typed": [],
        "last_op_ms": None,
    }


# --- parça (segment) işlemleri ------------------------------------------------

def _merge(segments: Iterable[List[Any]]) -> List[List[Any]]:
    out: List[List[Any]] = []
    for src, length in segments:
        if length <= 0:
            continue
        if out and out[-1][0] == src:
            out[-1][1] += length
        else:
            out.append([src, length])
    return out


def _split(segments: List[List[Any]], at: int) -> Tuple[List[List[Any]], List[List[Any]]]:
    """Parça listesini `at` konumundan ikiye böler."""
    left: List[List[Any]] = []
    right: List[List[Any]] = []
    pos = 0
    for src, length in segments:
        end = pos + length
        if end <= at:
            left.append([src, length])
        elif pos >= at:
            right.append([src, length])
        else:
            left.append([src, at - pos])
            right.append([src, end - at])
        pos = end
    return left, right


def slice_segments(segments: List[List[Any]], start: int, end: int) -> List[List[Any]]:
    _, rest = _split(segments, start)
    mid, _ = _split(rest, end - start)
    return mid


def _dominant(segments: List[List[Any]]) -> Optional[str]:
    best: Dict[str, int] = {}
    for src, length in segments:
        best[src] = best.get(src, 0) + length
    return max(best, key=best.get) if best else None


def _neighbor_source(segments: List[List[Any]], offset: int) -> str:
    left, right = _split(segments, offset)
    if left:
        return left[-1][0]
    if right:
        return right[0][0]
    return "typed"


def _bump(totals: Dict[str, Any], key: str, amount: float) -> None:
    totals[key] = totals.get(key, 0) + amount


# --- oynatma ------------------------------------------------------------------

def _restore_from_deletes(state: Dict[str, Any], inserted: str) -> Optional[List[List[Any]]]:
    """Geri al / yinele: yakın zamanda silinen bir parçayı kaynağıyla geri getirir.

    Bu olmadan açık bir kapı kalırdı: öğrenci yapıştırdığı kodu siler, geri al
    der ve kod "elle yazılmış" görünürdü.
    """
    for item in reversed(state["recent_deletes"]):
        if item["text"] == inserted:
            return [list(s) for s in item["segments"]]
    for item in reversed(state["recent_deletes"]):
        at = item["text"].find(inserted)
        if at >= 0:
            return slice_segments(item["segments"], at, at + len(inserted))
    return None


def apply_op(state: Dict[str, Any], op: List[Any], ts_ms: float) -> None:
    """Tek düzenlemeyi uygular: [t, offset, silinen_uzunluk, eklenen_metin, tür, (kaynak dosya)]."""
    try:
        offset = int(op[1])
        delete_len = int(op[2])
        inserted = str(op[3] or "")
        kind = str(op[4] or "t")
    except (IndexError, TypeError, ValueError):
        return

    text: str = state["text"]
    segments: List[List[Any]] = state["segments"]
    totals: Dict[str, Any] = state["totals"]

    # İstemci ile sunucu arasında küçük bir kayma olabilir; sınırları kırp,
    # kaydı reddetme — bir düzenlemeyi kaybetmek bütün oynatmayı bozmaktan iyidir.
    offset = max(0, min(offset, len(text)))
    delete_len = max(0, min(delete_len, len(text) - offset))

    left, rest = _split(segments, offset)
    deleted_segments, right = _split(rest, delete_len)
    deleted_text = text[offset:offset + delete_len]

    if delete_len:
        _bump(totals, "deleted", delete_len)
        if delete_len <= MAX_DELETE_MEMORY_CHARS:
            state["recent_deletes"].append({"text": deleted_text, "segments": _merge(deleted_segments)})
            state["recent_deletes"] = state["recent_deletes"][-MAX_RECENT_DELETES:]

    new_segments: List[List[Any]] = []
    if inserted:
        if kind == "f":
            # Biçimlendirme metnin sahibini değiştirmez: silinenin baskın kaynağı kalır.
            src = _dominant(deleted_segments) or _neighbor_source(segments, offset)
            new_segments = [[src, len(inserted)]]
            _bump(totals, "formatted", len(inserted))
        elif kind in ("u", "r"):
            restored = _restore_from_deletes(state, inserted)
            new_segments = restored if restored else [[UNKNOWN, len(inserted)]]
            _bump(totals, "undo_redo", len(inserted))
        else:
            src = KIND_SOURCES.get(kind, UNKNOWN)
            new_segments = [[src, len(inserted)]]
            _bump(totals, src, len(inserted))
            if src == "paste_external":
                totals["max_paste"] = max(totals.get("max_paste", 0), len(inserted))
                if len(inserted.strip()) >= 80:
                    totals["last_big_paste_ms"] = ts_ms
                _bump(totals, "paste_events", 1)
            if src == "typed":
                _record_typing(state, ts_ms, len(inserted))

    state["text"] = text[:offset] + inserted + text[offset + delete_len:]
    state["segments"] = _merge([*left, *new_segments, *right])

    last = state.get("last_op_ms")
    if last is not None and 0 <= ts_ms - last <= ACTIVE_GAP_MS:
        _bump(totals, "active_ms", ts_ms - last)
    state["last_op_ms"] = ts_ms if last is None else max(last, ts_ms)


def _record_typing(state: Dict[str, Any], ts_ms: float, chars: int) -> None:
    window = [[t, n] for t, n in state["recent_typed"] if ts_ms - t <= TYPING_WINDOW_MS]
    window.append([ts_ms, chars])
    state["recent_typed"] = window
    per_minute = sum(n for _, n in window)
    totals = state["totals"]
    # Pencere dolmadan ölçülen hız yanıltıcı: 3 karakterlik ilk vuruş
    # "dakikada 180" gibi görünmesin diye en az 30 sn'lik yazı gerekiyor.
    if ts_ms - window[0][0] >= TYPING_WINDOW_MS / 2:
        totals["max_cpm"] = max(totals.get("max_cpm", 0), per_minute)


def _common_affix(a: str, b: str) -> Tuple[int, int]:
    prefix = 0
    limit = min(len(a), len(b))
    while prefix < limit and a[prefix] == b[prefix]:
        prefix += 1
    suffix = 0
    while suffix < limit - prefix and a[len(a) - 1 - suffix] == b[len(b) - 1 - suffix]:
        suffix += 1
    return prefix, suffix


def _normalize_eol(text: str) -> str:
    return text.replace("\r\n", "\n")


def apply_chunk(
    state: Dict[str, Any], chunk: Dict[str, Any], starter_texts: Iterable[str] = (),
) -> Dict[str, Any]:
    """Bir yazım paketini uygular; durumu yerinde günceller ve döner.

    Paket oturumun ilki ise `base_text` taşır: dosyanın o anki tam metni.
      * Sunucu henüz bu dosyayı hiç görmediyse: metin başlangıç koduyla aynıysa
        "başlangıç", değilse "bilinmiyor" (kayıt başlamadan önce yazılmış).
      * Gördüyse ve metin farklıysa: arada editör dışında bir değişiklik olmuş
        (eklenti kapalıyken başka bir editörde yazma, dosyaya yazan bir araç).
        Yalnızca DEĞİŞEN kısım "dış değişiklik" sayılır.
    """
    base = chunk.get("base_text")
    if base is not None:
        base = _normalize_eol(str(base))
        current = state["text"]
        if not current and not state["segments"]:
            starters = {_normalize_eol(s) for s in starter_texts}
            src = STARTER if base in starters else UNKNOWN
            state["text"] = base
            state["segments"] = _merge([[src, len(base)]])
        elif base != current:
            prefix, suffix = _common_affix(current, base)
            removed_end = len(current) - suffix
            added = base[prefix:len(base) - suffix]
            left, rest = _split(state["segments"], prefix)
            _, right = _split(rest, removed_end - prefix)
            state["text"] = base
            state["segments"] = _merge([*left, ["external", len(added)], *right])
            _bump(state["totals"], "external", len(added))
            _bump(state["totals"], "gaps", 1)

    started = float(chunk.get("started_at_ms") or 0)
    for op in chunk.get("ops") or []:
        if not isinstance(op, (list, tuple)) or len(op) < 5:
            continue
        try:
            ts = started + float(op[0])
        except (TypeError, ValueError):
            ts = started
        apply_op(state, list(op), ts)
    return state


# --- özet ---------------------------------------------------------------------

def composition(state: Dict[str, Any]) -> Dict[str, int]:
    """Son metnin kaynaklara göre dağılımı — BOŞLUKSUZ karakter sayısıyla.

    Boşluk sayılmıyor: girinti ve boş satırlar kodun sahipliği hakkında bir
    şey söylemez, ama sayılsalardı elle yazılan her satırın başındaki dört
    boşluk payı şişirirdi.
    """
    text = state["text"]
    counts: Dict[str, int] = {}
    pos = 0
    for src, length in state["segments"]:
        chunk = text[pos:pos + length]
        visible = sum(1 for ch in chunk if not ch.isspace())
        if visible:
            counts[src] = counts.get(src, 0) + visible
        pos += length
    return counts


def shares(comp: Dict[str, int]) -> Tuple[int, Dict[str, float]]:
    """Payları ÖĞRENCİNİN EKLEDİĞİ kod üzerinden hesaplar — başlangıç kodu hariç.

    Başlangıç kodu kimsenin emeği değil; paydada kalsaydı "kodun %57'si
    yapıştırıldı" diyen bir rapor, aslında öğrencinin eklediği her şeyin
    yapıştırıldığı bir durumu yumuşatırdı.
    """
    authored = {src: n for src, n in comp.items() if src != STARTER}
    total = sum(authored.values())
    return total, ({src: round(n / total, 3) for src, n in authored.items()} if total else {})


def summarize(state: Dict[str, Any]) -> Dict[str, Any]:
    comp = composition(state)
    total, share = shares(comp)
    totals = state.get("totals") or {}
    return {
        "chars": total,
        "starter_chars": comp.get(STARTER, 0),
        "composition": comp,
        "share": share,
        "own_share": round(sum(share.get(s, 0) for s in OWN_SOURCES), 3),
        "activity": {
            "typed": int(totals.get("typed", 0)),
            "autocomplete": int(totals.get("autocomplete", 0)),
            "paste_external": int(totals.get("paste_external", 0)),
            "paste_internal": int(totals.get("paste_internal", 0)),
            "lesson": int(totals.get("lesson", 0)),
            "bulk": int(totals.get("bulk", 0)),
            "external": int(totals.get("external", 0)),
            "deleted": int(totals.get("deleted", 0)),
            "undo_redo": int(totals.get("undo_redo", 0)),
            "paste_events": int(totals.get("paste_events", 0)),
            "max_paste": int(totals.get("max_paste", 0)),
            "gaps": int(totals.get("gaps", 0)),
            "active_minutes": round(float(totals.get("active_ms", 0)) / 60000, 1),
            "max_cpm": int(totals.get("max_cpm", 0)),
        },
    }


# Eşikler bilinçli olarak temkinli: yanlış işaretlenen bir öğrenci, gözden
# kaçan bir yapıştırmadan daha çok zarar görür.
MIN_CHARS_FOR_FLAGS = 40
HEAVY_PASTE_SHARE = 0.5
HEAVY_BULK_SHARE = 0.4
EXTERNAL_SHARE = 0.2
SUPERHUMAN_CPM = 700


def flags(summary: Dict[str, Any], ai_extensions: Iterable[str] = ()) -> List[Dict[str, str]]:
    """Öğretmene gösterilecek olgular. Her biri bir etiket ve açıklama; hüküm yok."""
    out: List[Dict[str, str]] = []
    if summary["chars"] < MIN_CHARS_FOR_FLAGS:
        return out
    share = summary["share"]
    activity = summary["activity"]
    ai = [a for a in ai_extensions if a]

    pasted = share.get("paste_external", 0)
    if pasted >= HEAVY_PASTE_SHARE:
        out.append({
            "code": "paste_heavy",
            "label": f"Kodun %{round(pasted * 100)}'i dışarıdan yapıştırıldı",
            "detail": f"En büyük yapıştırma {activity['max_paste']} karakter.",
        })
    bulk = share.get("bulk", 0)
    if bulk >= HEAVY_BULK_SHARE:
        detail = "Tek seferde çok satır eklendi (otomatik tamamlama önerisi kabulü böyle görünür)."
        if ai:
            detail += f" VS Code'da etkin YZ eklentisi: {', '.join(ai)}."
        out.append({
            "code": "bulk_heavy",
            "label": f"Kodun %{round(bulk * 100)}'i toplu eklemeyle geldi",
            "detail": detail,
        })
    external = share.get("external", 0)
    if external >= EXTERNAL_SHARE:
        out.append({
            "code": "external_change",
            "label": f"Kodun %{round(external * 100)}'i editör dışında değişti",
            "detail": "Dosya GoMufi eklentisinin görmediği bir yerden değiştirilmiş.",
        })
    if activity["max_cpm"] >= SUPERHUMAN_CPM:
        out.append({
            "code": "fast_typing",
            "label": f"Dakikada {activity['max_cpm']} karakter yazma hızı",
            "detail": "Elle yazma için olağan dışı yüksek.",
        })
    return out


FOREIGN_SOURCES = ("paste_external", "bulk", "external")


def foreign_lines(state: Dict[str, Any], limit: int = 2, min_length: int = 8) -> List[Dict[str, Any]]:
    """Son kodda öğrencinin elinden ÇIKMAMIŞ satırlar ("Kodunu açıkla" sorusu için).

    Bir satır, görünür karakterlerinin en az %60'ı dışarıdan yapıştırma, toplu
    ekleme ya da editör dışı değişiklikten geliyorsa "yabancı" sayılır. En
    uzun (en çok şey yapan) satırlar seçilir, kod içindeki sırasıyla döner.
    Yorum ve çok kısa satırlar sorulmaz — "bu satır ne yapıyor" diye sorulacak
    bir şey yok.
    """
    text = state["text"]
    sources: List[str] = []
    for src, length in state["segments"]:
        sources.extend([src] * length)

    candidates = []
    pos = 0
    for number, line in enumerate(text.split("\n"), start=1):
        visible = [sources[pos + i] for i, ch in enumerate(line) if not ch.isspace() and pos + i < len(sources)]
        pos += len(line) + 1
        stripped = line.strip()
        if len(stripped) < min_length or stripped.startswith(("#", "//")) or not visible:
            continue
        foreign = sum(1 for s in visible if s in FOREIGN_SOURCES)
        if foreign / len(visible) >= 0.6:
            candidates.append({"line_no": number, "code": stripped[:200]})

    chosen = sorted(candidates, key=lambda c: -len(c["code"]))[:limit]
    return sorted(chosen, key=lambda c: c["line_no"])
