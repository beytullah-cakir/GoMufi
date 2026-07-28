import json
from routers.ai import _effective_max_chars, _text_metrics, _clip_to_max_chars, _visible_len

data = json.load(open('/app/slide_templates.json', encoding='utf-8'))
seen = set()
print(f"{'tip':9s} {'w':>5s} {'h':>4s} {'fs':>3s} {'font':13s} {'bildirilen':>10s} {'gercek':>7s}  {'sat/kar':>7s} {'satir':>5s}")
for t in data:
    for el in t['elements']:
        if not el.get('maxChars'): continue
        st = el.get('style') or {}
        key = (el['type'], el.get('width'), el.get('height'), st.get('fontSize'), st.get('fontFamily'), el['maxChars'])
        if key in seen: continue
        seen.add(key)
        cpl, lines = _text_metrics(el)
        eff = _effective_max_chars(el)
        flag = "  <-- DARALDI" if eff < el['maxChars'] else ""
        print(f"{el['type']:9s} {el.get('width'):5.0f} {el.get('height'):4.0f} {str(st.get('fontSize')):>3s} {str(st.get('fontFamily')):13s} {el['maxChars']:10d} {eff:7d}  {cpl:7d} {lines:5d}{flag}")

print()
print("=== Gercek hata vakalari ===")
TITLE_NARROW = {"type":"text","width":759,"height":85,"style":{"fontSize":60,"fontFamily":"Fredoka"},"maxChars":30}
STICKY = {"type":"sticky","width":200,"height":200,"style":{"fontSize":24,"fontFamily":"Patrick Hand"},"maxChars":92}

t1 = "Python Kurulumu ve IDE Seçimi:"
print(f"baslik  ({len(t1)} kar, limit {_effective_max_chars(TITLE_NARROW)}) -> {_clip_to_max_chars(TITLE_NARROW, t1)!r}")

s1 = "PATH'e eklemeyi unutmak, sık karşılaşılan bir hatadır. Manuel olarak ayarlamak gerekebilir."
print(f"sticky  ({len(s1)} kar, limit {_effective_max_chars(STICKY)}) -> {_clip_to_max_chars(STICKY, s1)!r}")

print()
print("=== <br> isaretlemesi kotayi yemiyor ===")
BODY = {"type":"text","width":742,"height":528,"style":{"fontSize":28,"fontFamily":"Fredoka"},"maxChars":666}
b = "• Bir<br>• Iki<br>• Uc"
print("gorunur uzunluk:", _visible_len(b), "ham uzunluk:", len(b))
