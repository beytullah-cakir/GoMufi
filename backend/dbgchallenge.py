import json
from routers.ai import _build_challenge_slide, format_templates_summary

print("=== 1) AI'nin urettigi normal JSON ===")
raw = json.dumps({
    "title": "Asal Sayı Bulucu", "prompt": "Sayının asal olup olmadığını döndürün.",
    "functionName": "asal_mi", "hint": "1 asal değildir.", "xp": 150,
    "samples": [{"input": "7", "output": "True"}],
    "tests": [{"call": "asal_mi(7)", "expected": "True"},
              {"call": "asal_mi(1)", "expected": "False"}],
}, ensure_ascii=False)
s = _build_challenge_slide(raw)
print("slide.type:", s["type"], "| elements:", s["elements"])
print(json.dumps(s["challengeConfig"], ensure_ascii=False, indent=1))

print("\n=== 2) Bozuk JSON -> guvenli varsayilan ===")
s2 = _build_challenge_slide("{bozuk json")
print("type:", s2["type"], "| fn:", s2["challengeConfig"]["functionName"],
      "| xp:", s2["challengeConfig"]["xp"], "| tests:", s2["challengeConfig"]["tests"])

print("\n=== 3) Prompt'ta sablon nasil gorunuyor ===")
tpl = json.load(open('/app/slide_templates.json', encoding='utf-8'))
uygula = [{"id": t["id"], "title": t["title"], "description": t.get("description"),
           "slideType": t.get("slideType"),
           "elements": [{"id": e.get("id"), "type": e.get("type"), "maxChars": e.get("maxChars"),
                         "style": e.get("style"), "width": e.get("width"), "height": e.get("height")}
                        for e in t.get("elements", [])]}
          for t in tpl if t.get("category") == "UYGULA"]
print(format_templates_summary(uygula))
