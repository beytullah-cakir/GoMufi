"""VS Code bağlantı onayı: VS Code'da görünen kod yazılmadan onay verilemez (oltalama)."""
import pytest

import routers.device_auth as device_auth

STATE = "s" * 48


class FakeRedis:
    def __init__(self):
        self.data = {}

    async def hset(self, key, mapping):
        self.data[key] = dict(mapping)

    async def expire(self, key, ttl):
        return True

    async def hgetall(self, key):
        return self.data.get(key, {})

    async def delete(self, key):
        self.data.pop(key, None)


@pytest.fixture
def fake(monkeypatch):
    store = FakeRedis()

    async def get():
        return store
    monkeypatch.setattr(device_auth, "_auth_store", get)
    return store


def test_kod_eklentiyle_ayni_hesaplanir():
    # vscode-extension/src/auth.ts → pairingCode ile aynı sonuç (Node'da doğrulandı).
    assert device_auth.pairing_code("x" * 40) == "7T9YCDW5"


def test_kodsuz_ya_da_yanlis_kodla_onay_yok(auth_as, fake):
    student = auth_as(4242, "student")
    assert student.post("/auth/device-approve", json={"state": STATE}).status_code == 422
    wrong = student.post("/auth/device-approve", json={"state": STATE, "code": "AAAA-AAAA"})
    assert wrong.status_code == 400 and not fake.data


def test_dogru_kodla_onay_ve_tek_kullanim(auth_as, fake, client):
    code = device_auth.pairing_code(STATE)
    student = auth_as(4242, "student")
    ok = student.post("/auth/device-approve", json={"state": STATE, "code": f"{code[:4].lower()}-{code[4:]}"})
    assert ok.status_code == 200
    client.cookies.clear()
    first = client.get(f"/auth/device-poll?state={STATE}")
    assert first.status_code == 200 and first.json()["user_id"] == "4242"
    assert client.get(f"/auth/device-poll?state={STATE}").status_code == 404
