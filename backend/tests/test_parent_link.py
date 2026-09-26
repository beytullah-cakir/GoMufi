"""Veli ↔ öğrenci bağlama: kod deneme yanılmayla bulunamaz, yanıtlar ayırt ettirmez."""
import re

import pytest

pytestmark = pytest.mark.db

PARENT, OTHER_PARENT, STUDENT = 997101, 997102, 997111
CODE = "ST-ABCDEFGH23"


@pytest.fixture
def seeded(db_query):
    def cleanup():
        db_query("DELETE FROM login_attempts WHERE email LIKE 'veli-bagla:99710%%'", fetch=False)
        db_query("DELETE FROM students WHERE id = %s", (STUDENT,), fetch=False)
        db_query("DELETE FROM parents WHERE id IN (%s, %s)", (PARENT, OTHER_PARENT), fetch=False)
    cleanup()
    for pid in (PARENT, OTHER_PARENT):
        db_query("INSERT INTO parents (id, first_name, last_name, email) VALUES (%s, 'Veli', 'Test', %s)",
                 (pid, f"veli{pid}@test.local"), fetch=False)
    db_query("INSERT INTO students (id, first_name, last_name, email, student_code) VALUES (%s, 'Ece', 'K', %s, %s)",
             (STUDENT, f"s{STUDENT}@test.local", CODE), fetch=False)
    yield
    cleanup()


def link(client, code):
    return client.post("/profile/link-student", json={"student_code": code})


def test_yeni_kodlar_uzun_ve_tahmin_edilemez():
    from models.student import new_student_code
    codes = {new_student_code() for _ in range(200)}
    assert len(codes) == 200
    assert all(re.fullmatch(r"ST-[A-HJ-NP-Z2-9]{10}", c) for c in codes)


def test_dogru_kod_baglar_yanlis_ve_bagli_ayni_yaniti_verir(auth_as, seeded, db_query):
    other = auth_as(OTHER_PARENT, "parent")
    wrong = link(other, "ST-ZZZZZZZZZZ")
    assert wrong.status_code == 400

    parent = auth_as(PARENT, "parent")
    assert link(parent, CODE.lower()).status_code == 200
    assert db_query("SELECT parent_id FROM students WHERE id = %s", (STUDENT,))[0][0] == PARENT

    # Başka veliye bağlı çocuk: geçersiz kodla AYNI yanıt (kod geçerli mi anlaşılmaz).
    taken = link(auth_as(OTHER_PARENT, "parent"), CODE)
    assert taken.status_code == 400 and taken.json() == wrong.json()


def test_deneme_yanilma_saatte_sinirli(auth_as, seeded):
    parent = auth_as(PARENT, "parent")
    for i in range(10):
        assert link(parent, f"ST-YANLIS{i:04d}").status_code == 400
    blocked = link(parent, CODE)                                   # doğru kod bile artık denenemez
    assert blocked.status_code == 429
