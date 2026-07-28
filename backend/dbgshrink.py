import asyncio, json
from routers.ai import _fit_text, _shrink_overflowing, _effective_max_chars, _visible_len

TITLE = {"type":"text","width":759,"height":85,"style":{"fontSize":60,"fontFamily":"Fredoka"},"maxChars":30}
BODY  = {"type":"text","width":482,"height":260,"style":{"fontSize":28,"fontFamily":"Fredoka"},"maxChars":190}

class FakeResp:
    def __init__(self, text): self.text = text; self.usage_metadata = None
class FakeModels:
    def __init__(self, payload): self.payload = payload; self.called = 0
    def generate_content(self, **kw):
        self.called += 1
        return FakeResp(json.dumps(self.payload, ensure_ascii=False))
class FakeClient:
    def __init__(self, payload): self.models = FakeModels(payload)

async def main():
    # 1) Tasmayan metin kuyruga girmemeli
    pending = []
    el_ok = dict(BODY); _fit_text(el_ok, "Kısa ve tam bir cümle.", pending)
    print("1) tasmayan -> kuyruk bos:", pending == [], "| icerik korundu:", el_ok["content"])

    # 2) Tasan metin KESILMEDEN kuyruga girmeli
    pending = []
    el1 = dict(TITLE); el2 = dict(BODY)
    uzun_baslik = "Python Kurulumu ve IDE Seçimi Rehberi"
    uzun_govde = ("print() fonksiyonu, kodunuzdan metin veya değişken değerlerini ekrana "
                  "göstermek için kullanılır. Parantez içine yazdığınız her şey tırnak "
                  'işaretleri ("") arasında olmalıdır. Bu çok önemlidir.')
    _fit_text(el1, uzun_baslik, pending)
    _fit_text(el2, uzun_govde, pending)
    print(f"2) kuyruk={len(pending)} | baslik TAM mi: {el1['content'] == uzun_baslik}")

    # 3) Model sigdirinca yeniden yazilan metin kullanilmali
    client = FakeClient({"items":[
        {"id":"0","text":"Python ve IDE Kurulumu"},
        {"id":"1","text":"print() fonksiyonu değerleri ekrana yazdırır. Metinler tırnak içinde olmalıdır."},
    ]})
    await _shrink_overflowing(client, pending, db=None, teacher_id=None, course_topic="Python")
    for el in (el1, el2):
        lim = _effective_max_chars(el)
        print(f"   sigdi mi: {_visible_len(el['content']) <= lim} (limit {lim}) -> {el['content']!r}")

    # 4) Model basarisiz olursa son care kesme (eski davranis) devrede kalmali
    pending2 = []
    el3 = dict(TITLE); _fit_text(el3, uzun_baslik, pending2)
    class Boom:
        class models:
            @staticmethod
            def generate_content(**kw): raise RuntimeError("API down")
    await _shrink_overflowing(Boom(), pending2, db=None, teacher_id=None, course_topic="Python")
    lim = _effective_max_chars(el3)
    print(f"4) cagri patlayinca -> {el3['content']!r} (limit {lim}, sigdi: {_visible_len(el3['content']) <= lim})")

    # 5) Bos kuyrukta hic cagri yapilmamali
    c = FakeClient({"items":[]})
    await _shrink_overflowing(c, [], db=None, teacher_id=None, course_topic="X")
    print("5) bos kuyrukta cagri sayisi:", c.models.called)

asyncio.run(main())
