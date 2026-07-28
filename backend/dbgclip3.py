from routers.ai import _clip_to_max_chars, _effective_max_chars

TITLE_WIDE = {"type":"text","width":1215,"height":85,"style":{"fontSize":60,"fontFamily":"Fredoka"},"maxChars":30}
BODY_NARROW = {"type":"text","width":482,"height":260,"style":{"fontSize":28,"fontFamily":"Fredoka"},"maxChars":190}

t = "Temel Veri Tipleri: Metin ve Boole"
print(f"BASLIK ({len(t)} kar, etkin {_effective_max_chars(TITLE_WIDE)}):")
print("  ->", repr(_clip_to_max_chars(TITLE_WIDE, t)))
print()

b = ('print() fonksiyonu, kodunuzdan metin veya değişken değerlerini ekrana göstermek için '
     'kullanılır. Parantez içine yazdığınız her şey tırnak işaretleri ("") arasında olmalıdır.')
print(f"GOVDE ({len(b)} kar, etkin {_effective_max_chars(BODY_NARROW)}):")
print("  ->", repr(_clip_to_max_chars(BODY_NARROW, b)))
