"""
Öğrenme olaylarını kavram sözlüğüne bağlama — "öğrenci NEREDE zorlanıyor"un cevabı.

Bir olay dört katmanda kavrama bağlanır (kabadan inceye):
  1. Düğüm: olayın geçtiği modülün kavramları (yol haritasındaki etiketler).
  2. Ölçüt: düşen ölçütün kendi kavramı — "Kodda for kullanıldı" -> for_dongusu.
  3. Hata türü: çalışma hatasının işaret ettiği kavram — IndexError -> liste_indeksleme.
  4. YZ koçu: koçun hatayı analiz ederken seçtiği kavram ve yanılgı etiketi.

Bu modül yalnızca 2 ve 3'ü bilir (saf eşleme tabloları). 1 kursun
müfredatından, 4 koçun cevabından gelir; birleştirme learning_analytics'te.

Eşleme tablolarındaki kimlikler sözlükte YOKSA kullanılmaz: sözlük dile ait
ve öğretmen tarafından düzenlenebiliyor; silinmiş bir kavrama kanıt yazmak
haritada hayalet bir sütun açardı (bkz. `known` parametreleri).
"""
from __future__ import annotations

import re
from typing import Dict, Iterable, Optional, Tuple

# Zorunlu yapı (Birleştir'in `requiredConstructs`, `code` türü ölçüt) -> kavram.
CONSTRUCT_CONCEPTS: Dict[str, Dict[str, str]] = {
    "python": {
        "for": "for_dongusu",
        "while": "while_dongusu",
        "range": "range_kullanimi",
        "break": "dongu_kontrol",
        "continue": "dongu_kontrol",
        "if": "if_kosulu",
        "elif": "elif_else",
        "else": "elif_else",
        "and": "mantiksal_operatorler",
        "or": "mantiksal_operatorler",
        "not": "mantiksal_operatorler",
        "==": "karsilastirma_operatorleri",
        "!=": "karsilastirma_operatorleri",
        "def": "fonksiyon_tanimlama",
        "return": "fonksiyon_return",
        "input": "kullanicidan_girdi",
        "print": "ekrana_yazdirma",
        "int": "tip_donusumu",
        "float": "tip_donusumu",
        "str": "tip_donusumu",
        "append": "liste_guncelleme",
        "remove": "liste_guncelleme",
        "pop": "liste_guncelleme",
        "insert": "liste_guncelleme",
        "split": "string_metotlari",
        "strip": "string_metotlari",
        "upper": "string_metotlari",
        "lower": "string_metotlari",
        "replace": "string_metotlari",
        "keys": "sozluk_kullanimi",
        "values": "sozluk_kullanimi",
        "items": "sozluk_kullanimi",
        "dict": "sozluk_kullanimi",
        "tuple": "demet_ve_kume",
        "set": "demet_ve_kume",
        "try": "hata_yakalama",
        "except": "hata_yakalama",
        "open": "dosya_okuma_yazma",
        "import": "modul_ice_aktarma",
        "%": "aritmetik_operatorler",
        "//": "aritmetik_operatorler",
        "**": "aritmetik_operatorler",
    },
}

# Satırın ilk anahtar kelimesi -> kavram. Sözdizimi ve girinti hatalarında
# hata türü tek başına bir şey söylemiyor ("invalid syntax"); hatanın
# olduğu satır ise söylüyor: `for i in range(5)` satırında eksik iki nokta
# for döngüsünün yazımıyla ilgili.
LINE_KEYWORD_CONCEPTS: Dict[str, Dict[str, str]] = {
    "python": {
        "for": "for_dongusu",
        "while": "while_dongusu",
        "if": "if_kosulu",
        "elif": "elif_else",
        "else": "elif_else",
        "def": "fonksiyon_tanimlama",
        "return": "fonksiyon_return",
        "try": "hata_yakalama",
        "except": "hata_yakalama",
        "import": "modul_ice_aktarma",
        "from": "modul_ice_aktarma",
        "print": "ekrana_yazdirma",
        "with": "dosya_okuma_yazma",
    },
}

_ERROR_LINE_RE = re.compile(r'File "([^"]+)", line (\d+)')
_ERROR_TYPE_RE = re.compile(r"^([A-Za-z_][\w.]*(?:Error|Exception|Interrupt|Exit))\s*:?\s*(.*)$")


def construct_concept(construct: str, language: str = "python",
                      known: Optional[Iterable[str]] = None) -> Optional[str]:
    concept = CONSTRUCT_CONCEPTS.get(language, {}).get((construct or "").strip())
    return concept if concept and (known is None or concept in set(known)) else None


def parse_error(stderr: str) -> Tuple[Optional[str], Optional[int], str, str]:
    """(hata türü, satır, mesaj, hatalı satırın metni) — Python izinden.

    Son `File ... line N` kaydı öğrencinin dosyasındaki yeri gösterir (koşum
    betikleri kendi satırlarını zaten eliyor). Zaman aşımı ayrı bir türdür.
    """
    text = (stderr or "").strip()
    if not text:
        return None, None, "", ""
    if "10 saniyede bitmedi" in text or "Timeout" in text.split("\n")[-1]:
        return "Timeout", None, text.split("\n")[-1], ""

    lines = text.split("\n")
    line_no: Optional[int] = None
    code_line = ""
    for i, raw in enumerate(lines):
        match = _ERROR_LINE_RE.search(raw)
        if match:
            line_no = int(match.group(2))
            nxt = lines[i + 1] if i + 1 < len(lines) else ""
            code_line = nxt.strip() if nxt.startswith("    ") else ""

    error_type: Optional[str] = None
    message = ""
    for raw in reversed(lines):
        match = _ERROR_TYPE_RE.match(raw.strip())
        if match:
            error_type = match.group(1).split(".")[-1]
            message = match.group(2)
            break
    return error_type, line_no, message, code_line


def _line_keyword_concept(code_line: str, language: str) -> Optional[str]:
    match = re.match(r"\s*([A-Za-z_]+)", code_line or "")
    if not match:
        return None
    return LINE_KEYWORD_CONCEPTS.get(language, {}).get(match.group(1))


def error_concept(stderr: str, language: str = "python",
                  known: Optional[Iterable[str]] = None) -> Tuple[Optional[str], Optional[int], Optional[str]]:
    """(hata türü, satır, kavram). Kavram bulunamazsa None — uydurmaktansa boş."""
    error_type, line_no, message, code_line = parse_error(stderr)
    if not error_type or language != "python":
        return error_type, line_no, None

    msg = message.lower()
    concept: Optional[str] = None
    if error_type in ("SyntaxError", "IndentationError", "TabError"):
        if "'=' " in msg or "maybe you meant '=='" in msg:
            concept = "karsilastirma_operatorleri"
        else:
            concept = _line_keyword_concept(code_line, language)
            if not concept and error_type in ("IndentationError", "TabError"):
                concept = "if_kosulu"   # girintinin bloğu belirlemesi burada öğretiliyor
    elif error_type == "NameError":
        concept = "degisken_atama"
    elif error_type == "UnboundLocalError":
        concept = "fonksiyon_tanimlama"
    elif error_type == "TypeError":
        if "concatenate" in msg or ("unsupported operand" in msg and "str" in msg) \
                or ("not supported between instances of" in msg and "str" in msg):
            concept = "tip_donusumu"
        elif "positional argument" in msg or "required" in msg and "argument" in msg:
            concept = "fonksiyon_parametre"
        elif "not callable" in msg:
            concept = "fonksiyon_tanimlama"
        elif "not iterable" in msg:
            concept = "for_dongusu"
    elif error_type == "ValueError":
        if "invalid literal" in msg or "could not convert" in msg:
            concept = "tip_donusumu"
    elif error_type == "IndexError":
        concept = "string_indeksleme" if "string" in msg else "liste_indeksleme"
    elif error_type == "KeyError":
        concept = "sozluk_kullanimi"
    elif error_type == "ZeroDivisionError":
        concept = "aritmetik_operatorler"
    elif error_type == "EOFError":
        concept = "kullanicidan_girdi"
    elif error_type == "AttributeError":
        if "'str' object" in msg:
            concept = "string_metotlari"
        elif "'list' object" in msg:
            concept = "liste_guncelleme"
        elif "'dict' object" in msg:
            concept = "sozluk_kullanimi"
    elif error_type in ("FileNotFoundError", "PermissionError", "UnsupportedOperation"):
        concept = "dosya_okuma_yazma"
    elif error_type in ("ModuleNotFoundError", "ImportError"):
        concept = "modul_ice_aktarma"
    elif error_type == "RecursionError":
        concept = "fonksiyon_tanimlama"
    elif error_type == "Timeout":
        concept = "while_dongusu"   # sonsuz döngü en sık sebep

    if concept and known is not None and concept not in set(known):
        concept = None
    return error_type, line_no, concept
