"""
Kalıcı dosya deposu: yüklemeler veritabanında (Render'ın diski her deploy'da siliniyordu).
Ders görseli herkese açık; mesaj eki yalnızca konuşmanın taraflarına.
"""
import pytest

pytestmark = pytest.mark.db

TEACHER, STUDENT, OTHER = 999401, 999411, 999412
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


@pytest.fixture
def seeded(db_query):
    def cleanup():
        db_query("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE teacher_id = %s)",
                 (TEACHER,), fetch=False)
        db_query("DELETE FROM conversations WHERE teacher_id = %s", (TEACHER,), fetch=False)
        db_query("DELETE FROM stored_files WHERE owner_id IN (%s, %s, %s)", (TEACHER, STUDENT, OTHER), fetch=False)
        db_query("DELETE FROM students WHERE id IN (%s, %s)", (STUDENT, OTHER), fetch=False)
        db_query("DELETE FROM teachers WHERE id = %s", (TEACHER,), fetch=False)

    cleanup()
    db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, 'Selin', 'Hoca', 'fs@test.local')",
             (TEACHER,), fetch=False)
    for sid in (STUDENT, OTHER):
        db_query("INSERT INTO students (id, first_name, last_name, email, xp) VALUES (%s, 'Ö', 'T', %s, 0)",
                 (sid, f"fs{sid}@test.local"), fetch=False)
    yield
    cleanup()


def path_of(url):
    return url[url.index("/files/"):]


def test_ders_gorseli_veritabaninda_ve_herkese_acik(auth_as, client, seeded, db_query):
    r = auth_as(TEACHER, "teacher").post("/builder/upload-image", files={"file": ("kapak.png", PNG, "image/png")})
    assert r.status_code == 200
    url = r.json()["imageUrl"]
    assert "/files/" in url and url.endswith(".png")
    assert db_query("SELECT size FROM stored_files WHERE owner_id = %s", (TEACHER,))[0][0] == len(PNG)

    client.cookies.clear()
    got = client.get(path_of(url))
    assert got.status_code == 200 and got.content == PNG and got.headers["content-type"] == "image/png"
    assert got.headers["x-content-type-options"] == "nosniff"


def test_mesaj_eki_yalnizca_konusmanin_taraflarina(auth_as, client, seeded, db_query):
    up = auth_as(STUDENT, "student").post("/builder/upload-chat-file",
                                          files={"file": ("odev.pdf", b"%PDF-1.4 test", "application/pdf")})
    assert up.status_code == 200
    url = up.json()["url"]
    path = path_of(url)

    client.cookies.clear()
    assert client.get(path).status_code == 401                              # kimliksiz
    assert auth_as(STUDENT, "student").get(path).status_code == 200          # yükleyen
    assert auth_as(TEACHER, "teacher").get(path).status_code == 403          # henüz paylaşılmadı

    conv = db_query("INSERT INTO conversations (teacher_id, member_role, member_id, student_id, teacher_unread, "
                    "member_unread, teacher_archived, member_archived) VALUES (%s, 'student', %s, %s, 0, 0, false, false) "
                    "RETURNING id", (TEACHER, STUDENT, STUDENT))[0][0]
    db_query("INSERT INTO messages (conversation_id, sender_role, sender_id, body, kind, file_url, file_name) "
             "VALUES (%s, 'student', %s, '', 'file', %s, 'odev.pdf')", (conv, STUDENT, url), fetch=False)
    assert auth_as(TEACHER, "teacher").get(path).status_code == 200          # konuşmanın öğretmeni
    assert auth_as(OTHER, "student").get(path).status_code == 403            # başka öğrenci
    assert auth_as(1, "admin").get(path).status_code in (200, 401)           # admin (giriş açıksa)


def test_sablonlar_veritabaninda(auth_as, db_query):
    templates = auth_as(TEACHER, "teacher").get("/builder/templates").json()
    assert len(templates) >= 1 and {"id", "title", "elements"} <= set(templates[0])
    assert db_query("SELECT count(*) FROM slide_templates")[0][0] == len(templates)
