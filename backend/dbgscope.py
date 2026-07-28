import json
from routers.ai import GenerateLessonSlidesRequest

# Kullanicinin anlattigi gercek senaryo: Ders 1 "Giris, Degiskenler"
mods = [
    {"type": "UNDERSTAND", "topic": "Python'a giris ve print komutu"},
    {"type": "APPLY",      "topic": "print ile ekrana yazdirma pratigi"},
    {"type": "UNDERSTAND", "topic": "Degiskenler ve veri tipleri"},
    {"type": "APPLY",      "topic": "Degisken tanimlama pratigi"},
    {"type": "CONNECT",    "topic": "Temelleri birlestir"},
]
req = GenerateLessonSlidesRequest(
    topic="Sifirdan Python Kursu", difficulty="Orta", audience="Karma",
    lesson_number=1, lesson_title="Ders 1: Giris, Degiskenler",
    lesson_objective="Ogrenci temel yazdirma ve degiskenleri ogrenir.",
    modules=mods, is_regeneration=True, target_module_index=0,
)

# Prompt insasindaki mantigin aynisi
idx = req.target_module_index
regen_target_idx = idx if (req.is_regeneration and idx is not None and 0 <= idx < len(req.modules)) else None
print("regen_target_idx:", regen_target_idx)

target = req.modules[regen_target_idx]
others = [f"  - moduleIndex {i} ({m.get('type')}): {m.get('topic')}"
          for i, m in enumerate(req.modules) if i != regen_target_idx]
print("\nHEDEF:", target)
print("\nKAPSAM SINIRI (uretilmeyecekler):")
print("\n".join(others))

modules_to_build = ([(regen_target_idx, req.modules[regen_target_idx])]
                    if regen_target_idx is not None else list(enumerate(req.modules)))
print("\nnot uretilecek modul sayisi:", len(modules_to_build), "->", modules_to_build[0][1]["topic"])

# Normal uretim yolu bozulmamali
req2 = req.model_copy(update={"is_regeneration": False, "target_module_index": None})
idx2 = req2.target_module_index
rt2 = idx2 if (req2.is_regeneration and idx2 is not None and 0 <= idx2 < len(req2.modules)) else None
mtb2 = ([(rt2, req2.modules[rt2])] if rt2 is not None else list(enumerate(req2.modules)))
print("normal uretimde modul sayisi:", len(mtb2), "(5 olmali)")
