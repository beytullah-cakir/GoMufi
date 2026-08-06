"""
Grid yerleşimlerinin sunucu tarafı aynası.

NEDEN VAR: şablonlar, mutlak koordinat (x/y/width/height) AI için güvensiz
olduğu İÇİN vardı. Modelden `x: 340, y: 512` istediğinde model bunu
doğrulayamıyor — çakışıyor mu, taşıyor mu göremiyor. Şablon bu riski üretimi
kısıtlayarak kapatıyordu.

Satır/kolon ağacı ise modelin güvenilir ürettiği bir şey. Yerleşim doğruluğu
artık modelin değil motorun sorumluluğu. Yani grid sadece dar panel sorununu
çözmüyor, ŞABLON ZORUNLULUĞUNU kaldırıyor: model artık hazır bir iskeleti
doldurmak yerine düzeni kendisi kuruyor.

Buradaki yapı `frontend/src/components/lesson-builder/grid.ts` ile birebir aynı
şemayı üretmek zorunda. İkisi ayrı dilde olduğu için tip sistemi bunu
zorlayamıyor; şema değişirse İKİSİ birden değişmeli.
"""

from __future__ import annotations

import random
from typing import Any, Dict, List, Optional

# grid.ts ile aynı sabitler.
GAP = 24
PADDING = 48

_counter = 0


def _uid(prefix: str) -> str:
    global _counter
    _counter += 1
    return f"{prefix}-{random.randrange(36**6):x}-{_counter:x}"


def _cell(weight: float, narrow: Optional[str] = None) -> Dict[str, Any]:
    cell: Dict[str, Any] = {"id": _uid("cell"), "weight": weight, "blocks": []}
    if narrow:
        cell["narrow"] = narrow
    return cell


def _row(weight: float, cells: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {"id": _uid("row"), "weight": weight, "cells": cells}


# Modelin seçebileceği düzenler. gridPresets.ts'teki listeyle aynı anahtarlar —
# öğretmen builder'da aynı isimleri görüyor, AI'ın seçtiği düzen orada da
# tanınabilir olsun.
#
# Her düzen, kolon sayısını ve ağırlıklarını verir. Model yalnızca ANAHTAR
# seçiyor; ağırlıkları kendisi uydurmuyor, çünkü uydurduğu anda yerleşim
# doğruluğu yine modele geçerdi.
LAYOUTS = {
    "single": lambda: [_row(1, [_cell(1)])],
    "two-equal": lambda: [_row(1, [_cell(1), _cell(1)])],
    "two-wide-left": lambda: [_row(1, [_cell(7), _cell(5)])],
    "two-wide-right": lambda: [_row(1, [_cell(5), _cell(7)])],
    "three-equal": lambda: [_row(1, [_cell(1), _cell(1), _cell(1)])],
    "four-grid": lambda: [
        _row(1, [_cell(1), _cell(1)]),
        _row(1, [_cell(1), _cell(1)]),
    ],
    "four-rows": lambda: [
        _row(1, [_cell(1)]), _row(1, [_cell(1)]),
        _row(1, [_cell(1)]), _row(1, [_cell(1)]),
    ],
    "header-two": lambda: [_row(1, [_cell(1)]), _row(4, [_cell(1), _cell(1)])],
    "header-three": lambda: [_row(1, [_cell(1)]), _row(4, [_cell(1), _cell(1), _cell(1)])],
    "code-right-stack": lambda: [_row(1, [_cell(5), _cell(7)])],
    "code-left-stack": lambda: [_row(1, [_cell(7), _cell(5)])],
    # Alttaki ipucu şeridi dar modda düşer: panelde yer darken önce süs gider.
    "header-code-note": lambda: [
        _row(1, [_cell(1)]),
        _row(5, [_cell(1)]),
        _row(1, [_cell(1, narrow="hide")]),
    ],
}

DEFAULT_LAYOUT = "two-wide-left"

# Modelin blok için seçebileceği türler. Tuval elemanı tipleriyle aynı olmalı.
BLOCK_TYPES = {"text", "code", "code_editor", "sticky", "image"}

# Blok türüne göre varsayılan stil. Öğretmenin elle kurduğu slaytlarla aynı
# görünsün diye builder'daki varsayılanlarla eşleştirildi.
_STYLE = {
    "text": {"fontSize": 24, "fontFamily": "Fredoka", "textAlign": "left", "verticalAlign": "top"},
    "code": {"fontSize": 14, "fontFamily": "Fira Code", "textAlign": "left"},
    "code_editor": {"fontSize": 14, "fontFamily": "Fira Code", "textAlign": "left"},
    "sticky": {"fontSize": 18, "fontFamily": "Patrick Hand", "backgroundColor": "#fef3c7", "textAlign": "left"},
    "image": {},
}


def layout_menu() -> str:
    """
    Prompt'a gömülecek düzen listesi.

    Her düzen, satır başına kolon ağırlıkları ve hücre numaralarıyla anlatılır.
    Yalnızca kolon SAYISINI vermek yetmiyordu: model çok satırlı bir düzende
    (ör. başlık + 2 kolon) hücre numaralarını yanlış sayıyor ve bloklar yanlış
    yere düşüyordu. Numaraları açıkça yazmak bu belirsizliği kapatıyor.
    """
    lines = []
    for key, rows_fn in LAYOUTS.items():
        rows = rows_fn()
        index = 0
        parts = []
        for row in rows:
            cells = []
            for cell in row["cells"]:
                tag = f"#{index}(w{cell['weight']:g}"
                if cell.get("narrow") == "hide":
                    tag += ",dar-modda-gizli"
                tag += ")"
                cells.append(tag)
                index += 1
            parts.append(" | ".join(cells))
        lines.append(f"- {key}: " + "  //  ".join(parts))
    return "\n".join(lines)


def build_grid_slide(
    layout_key: str,
    blocks: List[Dict[str, Any]],
    background: str = "default",
) -> Dict[str, Any]:
    """
    Modelin verdiği düzen anahtarı + blok listesinden slayt sözlüğü kurar.

    `blocks` her elemanı: {"cell": <int>, "type": <str>, "content": <str>,
                           "weight": <float, ops.>}

    `cell` düzendeki hücrenin SIRA NUMARASI (soldan sağa, üstten alta). Model
    hücre id'si üretmiyor — id'leri burada biz üretiyoruz ki modelin uydurduğu
    bir id yerleşimle eşleşmeme riski hiç doğmasın.

    Sığmayan `cell` numaraları son hücreye kırpılır: modelin 3 kolonluk düzene
    4. bloğu koyması, o bloğun tamamen kaybolmasından iyidir.
    """
    rows_fn = LAYOUTS.get(layout_key) or LAYOUTS[DEFAULT_LAYOUT]
    rows = rows_fn()

    # Hücreleri düz sıraya diz: modelin gördüğü numaralandırma bu.
    flat_cells = [cell for row in rows for cell in row["cells"]]
    if not flat_cells:
        return {"id": int(random.random() * 1_000_000_000), "elements": [], "connections": []}

    elements: List[Dict[str, Any]] = []
    for block in blocks or []:
        if not isinstance(block, dict):
            continue
        btype = str(block.get("type") or "text")
        if btype not in BLOCK_TYPES:
            btype = "text"

        content = block.get("content")
        content = "" if content is None else str(content)
        if not content.strip() and btype != "image":
            # Boş blok yuvayı işgal eder ve slaytta açıklanamayan bir delik bırakır.
            continue

        try:
            index = int(block.get("cell", 0))
        except (TypeError, ValueError):
            index = 0
        index = max(0, min(index, len(flat_cells) - 1))

        block_id = _uid("blk")
        try:
            weight = float(block.get("weight", 1) or 1)
        except (TypeError, ValueError):
            weight = 1.0
        flat_cells[index]["blocks"].append({"id": block_id, "weight": max(0.25, weight)})

        element: Dict[str, Any] = {
            "id": block_id,
            "type": btype,
            # Konum motordan gelecek; buradaki değerler yalnızca şema doldurur.
            "x": 0, "y": 0, "width": 100, "height": 100,
            "rotation": 0,
            "content": content,
            "style": dict(_STYLE.get(btype, {})),
        }
        if btype == "image":
            element["imageUrl"] = content
            element["src"] = content
        if btype in ("code", "code_editor"):
            element["codeConfig"] = {"language": block.get("language") or "python", "runnable": True}

        elements.append(element)

    # Tamamen boş kalan hücreler yerleşimde yer kaplamaya devam eder ve slaytta
    # açıklanamayan boşluk olarak görünür — onları düzenden düşürüyoruz.
    for row in rows:
        row["cells"] = [c for c in row["cells"] if c["blocks"]]
    rows = [r for r in rows if r["cells"]]

    if not rows:
        return {"id": int(random.random() * 1_000_000_000), "elements": [], "connections": []}

    return {
        "id": int(random.random() * 1_000_000_000),
        "layout": {"rows": rows, "gap": GAP, "padding": PADDING},
        "elements": elements,
        "connections": [],
        "background": background,
    }
