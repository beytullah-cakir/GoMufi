"""WebSocket kimlik doğrulaması.

Regresyon: /ws/{user_id} eskiden token istemiyordu — herkes istediği user_id ile
bağlanıp o kullanıcının kişisel mesajlarını alabiliyor ve tüm sisteme yayın yapabiliyordu.
"""
import pytest
from starlette.websockets import WebSocketDisconnect

from core.security import create_access_token

WS_POLICY_VIOLATION = 1008


@pytest.mark.parametrize("path", ["/ws", "/ws/999", "/ws/admin:1"])
def test_kimliksiz_baglanti_reddedilir(client, path):
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(path) as ws:
            ws.send_json({"type": "ping"})
            ws.receive_json()
    assert exc.value.code == WS_POLICY_VIOLATION


def test_gecersiz_token_reddedilir(client):
    client.cookies.set("access_token", "bu.gecerli.bir.jwt.degil")
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/ws") as ws:
            ws.receive_json()
    assert exc.value.code == WS_POLICY_VIOLATION


def test_refresh_token_ile_baglanilamaz(client):
    """Sadece type='access' olan token kabul edilmeli."""
    from core.security import create_refresh_token

    client.cookies.set("access_token", create_refresh_token("42"))
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/ws") as ws:
            ws.receive_json()
    assert exc.value.code == WS_POLICY_VIOLATION


def test_gecerli_token_ile_baglanilir(client):
    client.cookies.set("access_token", create_access_token("42", role="student"))
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}


def test_sender_id_istemciden_degil_tokendan_gelir(client):
    """Yoldaki user_id ve istemcinin gönderdiği sender_id yok sayılmalı."""
    client.cookies.set("access_token", create_access_token("42", role="student"))
    with client.websocket_connect("/ws/admin:1") as ws:
        ws.send_json({"type": "probe", "sender_id": "admin:1"})
        assert ws.receive_json()["sender_id"] == "student:42"
