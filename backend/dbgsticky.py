from routers.ai import _enforce_slide_bullets, _clip_to_max_chars, _format_list_breaks

def pipeline(el, val):
    return _clip_to_max_chars(el, _enforce_slide_bullets(el, _format_list_breaks(val)))

STICKY = {"maxChars": 92}
# Kullanicinin "iyi" ornegi + gotcha ornekleri bozulmadan gecmeli
cases = [
    "Tırnak içindeki ifade, dize (string) olarak kabul edilir.",
    "Tırnak koymayı unutmak en sık yapılan hatadır. IndentationError alırsınız.",
    "'Add Python to PATH' işaretlenmezse terminal python komutunu bulamaz.",
]
for c in cases:
    out = pipeline(STICKY, c)
    print(f"len={len(out):3d} ok={out == c} -> {out!r}")
