"""
Kod bloğu dillerinin sunucu tarafı aynası.

Buradaki kimlikler `frontend/src/components/lesson-builder/codeLanguages.ts`
ile birebir aynı olmak ZORUNDA: aynı kimlik hem AI'ın seçtiği dil, hem
öğretmenin panelde gördüğü seçenek, hem de bloğun VS Code'da hangi uzantıyla
açılacağı. Kimlik tutmazsa AI'ın ürettiği "Bash" bloğu builder'da Python
görünür. Liste değişirse İKİSİ birden değişmeli.

Burada AI'ın karar vermek için ihtiyaç duyduğu alanlar var: kimlik, etiket,
dosya uzantısı, kabuk mu. Prism dilbilgisi frontend'in işi.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Optional, Tuple

# (id, etiket, uzantı, kabuk mu) — sıra promptta göründüğü sıradır.
CODE_LANGUAGES: Tuple[Tuple[str, str, str, bool], ...] = (
    ("python", "Python", "py", False),
    ("javascript", "JavaScript", "js", False),
    ("typescript", "TypeScript", "ts", False),
    ("java", "Java", "java", False),
    ("csharp", "C#", "cs", False),
    ("cpp", "C++", "cpp", False),
    ("c", "C", "c", False),
    ("html", "HTML", "html", False),
    ("css", "CSS", "css", False),
    ("jsx", "React (JSX)", "jsx", False),
    ("tsx", "React (TSX)", "tsx", False),
    ("php", "PHP", "php", False),
    ("go", "Go", "go", False),
    ("rust", "Rust", "rs", False),
    ("ruby", "Ruby", "rb", False),
    ("kotlin", "Kotlin", "kt", False),
    ("swift", "Swift", "swift", False),
    ("dart", "Dart", "dart", False),
    ("sql", "SQL", "sql", False),
    ("json", "JSON", "json", False),
    ("yaml", "YAML", "yaml", False),
    ("markdown", "Markdown", "md", False),
    ("docker", "Dockerfile", "Dockerfile", False),
    ("bash", "Terminal (Bash/zsh, macOS-Linux ve genel komutlar)", "sh", True),
    ("powershell", "Terminal (PowerShell, Windows)", "ps1", True),
    ("cmd", "Terminal (CMD, Windows)", "bat", True),
)

LANGUAGE_IDS = {lang_id for lang_id, _, _, _ in CODE_LANGUAGES}
SHELL_LANGUAGE_IDS = {lang_id for lang_id, _, _, shell in CODE_LANGUAGES if shell}
EXTENSIONS = {lang_id: ext for lang_id, _, ext, _ in CODE_LANGUAGES}

DEFAULT_LANGUAGE = "python"

# AI'ın yazdığı serbest metni kayıt defterindeki kimliğe çeken takma adlar.
# Model "Python 3", "sh", "shell", "Bash" gibi yazıyor; bunları düşürmek yerine
# eşliyoruz — düşürüldüğünde blok sessizce Python olurdu.
_ALIASES = {
    "py": "python", "python3": "python", "python 3": "python",
    "js": "javascript", "node": "javascript", "nodejs": "javascript",
    "ts": "typescript",
    "c#": "csharp", "cs": "csharp", "dotnet": "csharp",
    "c++": "cpp",
    "react": "jsx",
    "golang": "go",
    "rb": "ruby",
    "kt": "kotlin",
    "yml": "yaml",
    "md": "markdown",
    "dockerfile": "docker",
    "sh": "bash", "shell": "bash", "zsh": "bash", "console": "bash",
    "terminal": "bash", "cli": "bash", "command": "bash", "commandline": "bash",
    "ps": "powershell", "ps1": "powershell", "pwsh": "powershell",
    "bat": "cmd", "batch": "cmd", "dos": "cmd",
}


def normalize_language(value: Any) -> str:
    """Modelin verdiği dil adını kayıt defterindeki kimliğe indirger."""
    if not isinstance(value, str):
        return DEFAULT_LANGUAGE
    key = value.strip().lower()
    if key in LANGUAGE_IDS:
        return key
    return _ALIASES.get(key, DEFAULT_LANGUAGE)


def normalize_mode(value: Any, language: str) -> Optional[str]:
    """
    Görünüm kipi. Dilin kendi varsayılanıyla aynıysa None döner — böylece
    kayıtta gereksiz bir kilit kalmaz ve dil değişince görünüm onu izler
    (panelin `mode: undefined` davranışıyla aynı).
    """
    mode = value.strip().lower() if isinstance(value, str) else ""
    if mode not in ("editor", "terminal"):
        return None
    return None if (mode == "terminal") == (language in SHELL_LANGUAGE_IDS) else mode


def build_code_config(block: Dict[str, Any]) -> Dict[str, Any]:
    """Bir grid bloğundan kod widget'ının `codeConfig` sözlüğünü kurar."""
    language = normalize_language(block.get("language"))
    return {
        "language": language,
        "mode": normalize_mode(block.get("mode"), language),
        "runnable": True,
    }


def describe_code_languages() -> str:
    """Prompt'a gömülen tek satırlık dil menüsü."""
    return ", ".join(
        f"`{lang_id}` ({label})" if shell else f"`{lang_id}`"
        for lang_id, label, _, shell in CODE_LANGUAGES
    )


def language_ext(language: Any) -> str:
    """Dilin dosya uzantısı — görev dosyasının adı bundan türetilir."""
    return EXTENSIONS.get(normalize_language(language), "py")


def safe_file_name(raw: Any) -> Optional[str]:
    """
    Görev dosyası adını güvenli hale getirir.

    Bu ad öğrencinin makinesinde DİSKE YAZILIYOR ve modelin ürettiği serbest
    metinden geliyor. Yol bileşeni atılır, beyaz liste dışındaki karakterler
    silinir; geriye bir şey kalmazsa dosya reddedilir (adı biz uydurursak
    `import odev` yazan görev kendi dosyasını bulamaz). Eklenti aynı temizliği
    bir kez daha yapıyor — orası son savunma hattı, burası ise bozuk adın
    derse hiç girmemesi için.
    """
    if not isinstance(raw, str):
        return None
    base = re.split(r"[\/]", raw)[-1]
    clean = re.sub(r"[^A-Za-z0-9._-]", "", base).lstrip(".")
    return clean[:64] or None
