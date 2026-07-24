"""Iyzico ödeme callback'inin sepet doğrulaması.

Regresyon: /payment/callback/{course_ids}/{student_id} URL'deki değerlere göre
kayıt yapıyordu. Geçerli bir ödeme token'ı ele geçiren biri, istediği öğrenciyi
istediği kursa bedava kaydettirebiliyordu.
"""
import uuid

import pytest

from routers.payment import parse_basket


def _basket(student_id):
    """initialize_checkout'un ürettiği formatın aynısı."""
    return f"B{student_id}_{str(uuid.uuid4())[:8]}"


def test_gercek_sepet_cozulur():
    student_id, course_ids = parse_basket({
        "basketId": _basket(77),
        "itemTransactions": [{"itemId": "C5"}, {"itemId": "C9"}],
    })
    assert student_id == 77
    assert sorted(course_ids) == [5, 9]


def test_kimlik_yalnizca_iyzico_sonucundan_gelir():
    """URL'de ne yazarsa yazsın parse_basket yalnızca doğrulanmış sonuca bakar."""
    student_id, course_ids = parse_basket({
        "basketId": "B999_deadbeef",
        "itemTransactions": [{"itemId": "C1"}],
    })
    assert (student_id, course_ids) == (999, [1])


@pytest.mark.parametrize("label,payload", [
    ("bozuk basketId", {"basketId": "hacked", "itemTransactions": [{"itemId": "C1"}]}),
    ("enjeksiyon denemesi", {"basketId": "B1; DROP TABLE", "itemTransactions": [{"itemId": "C1"}]}),
    ("boş itemTransactions", {"basketId": "B1_abcdef12", "itemTransactions": []}),
    ("itemId formatı yanlış", {"basketId": "B1_abcdef12", "itemTransactions": [{"itemId": "hacked"}]}),
    ("alanlar yok", {}),
])
def test_gecersiz_sepetler_reddedilir(label, payload):
    student_id, course_ids = parse_basket(payload)
    assert student_id is None or not course_ids, f"{label} kabul edilmemeliydi"


def test_callback_token_olmadan_reddedilir(client):
    resp = client.post("/payment/callback/1,2/5", data={})
    assert resp.status_code == 400
