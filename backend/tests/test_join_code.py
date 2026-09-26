"""
Tek katılım yolu: öğrenci her zaman bir ŞUBEYE katılır.

Eskiden kurs koduyla katılan öğrenci hiçbir şubeye düşmüyordu (şubeye göre
yoklama, duyuru ve not defterinde görünmüyordu) ve şube kodları tarayıcıda
Math.random() ile üretiliyor, çakışma kontrol edilmiyordu.
"""
import json

import pytest

pytestmark = pytest.mark.db

TEACHER = 999001
ECE, CAN, DENIZ = 999011, 999012, 999013
ONE_CLASS, TWO_CLASSES, NO_CLASS = 999021, 999022, 999023


@pytest.fixture
def seeded(db_query):
    courses = (ONE_CLASS, TWO_CLASSES, NO_CLASS)

    def cleanup():
        db_query("DELETE FROM enrollments WHERE course_id IN (%s, %s, %s)", courses, fetch=False)
        db_query("DELETE FROM courses WHERE teacher_id = %s", (TEACHER,), fetch=False)
        db_query("DELETE FROM students WHERE id IN (%s, %s, %s)", (ECE, CAN, DENIZ), fetch=False)
        db_query("DELETE FROM teachers WHERE id = %s", (TEACHER,), fetch=False)

    cleanup()
    db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, 'Selin', 'Hoca', 'jc@test.local')",
             (TEACHER,), fetch=False)
    for sid in (ECE, CAN, DENIZ):
        db_query("INSERT INTO students (id, first_name, last_name, email, xp) VALUES (%s, 'Ö', 'T', %s, 0)",
                 (sid, f"jc{sid}@test.local"), fetch=False)
    one = [{"id": "c_1", "name": "7-A", "student_ids": [], "code": "JCONE1"}]
    two = [{"id": "c_a", "name": "8-A", "student_ids": [], "code": "JCTWOA"},
           {"id": "c_b", "name": "8-B", "student_ids": [], "code": "JCONE1"}]          # çakışan kod
    for cid, code, classes in ((ONE_CLASS, "JCCRS1", one), (TWO_CLASSES, "JCCRS2", two), (NO_CLASS, "JCCRS3", [])):
        db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes, enrollment_code, progress) "
                 "VALUES (%s, %s, %s, '[]', '[]', %s, %s, 0)", (cid, TEACHER, f"Kurs {cid}", json.dumps(classes), code),
                 fetch=False)
    # Eski düzende kurs koduyla katılmış, şubesiz öğrenci
    db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (DENIZ, NO_CLASS), fetch=False)
    yield
    cleanup()


def classes_of(db_query, course_id):
    return json.loads(json.dumps(db_query("SELECT classes FROM courses WHERE id = %s", (course_id,))[0][0]))


def test_ogretmen_listesi_eski_kurslari_duzeltir(auth_as, seeded, db_query):
    courses = {c["id"]: c for c in auth_as(TEACHER, "teacher").get("/teacher/content").json()}
    # Şubesiz kursa "Genel" şubesi açıldı, şubesiz öğrenci içine alındı.
    genel = courses[NO_CLASS]["classes"]
    assert len(genel) == 1 and genel[0]["name"] == "Genel" and genel[0]["student_ids"] == [DENIZ]
    # Çakışan kodlardan biri yenilendi; tüm kodlar tekil.
    codes = [c["code"] for course in courses.values() for c in course["classes"]]
    assert len(codes) == len(set(codes)) == 4
    assert courses[ONE_CLASS]["classes"][0]["code"] == "JCONE1"          # önce gelen korunur


def test_sube_koduyla_katilim_ve_sube_degistirme(auth_as, seeded, db_query):
    auth_as(TEACHER, "teacher").get("/teacher/content")
    b_code = next(c["code"] for c in classes_of(db_query, TWO_CLASSES) if c["id"] == "c_b")

    ece = auth_as(ECE, "student")
    r = ece.post("/class/join", json={"code": "jctwoa"})              # büyük/küçük harf fark etmez
    assert r.status_code == 200 and r.json()["class_name"] == "8-A"
    r = ece.post("/class/join", json={"code": b_code})
    assert r.json()["class_name"] == "8-B"
    classes = {c["id"]: c["student_ids"] for c in classes_of(db_query, TWO_CLASSES)}
    assert classes == {"c_a": [], "c_b": [ECE]}                        # tek şubede
    assert db_query("SELECT count(*) FROM enrollments WHERE student_id = %s AND course_id = %s",
                    (ECE, TWO_CLASSES))[0][0] == 1


def test_eski_kurs_kodu(auth_as, seeded, db_query):
    can = auth_as(CAN, "student")
    # Tek şubeli kurs: kurs kodu o şubeye götürür.
    r = can.post("/enroll-by-code", json={"code": "JCCRS1"})
    assert r.status_code == 200 and r.json()["class_name"] == "7-A"
    assert classes_of(db_query, ONE_CLASS)[0]["student_ids"] == [CAN]
    # Çok şubeli kurs: hangi şube olduğu bilinemez, şube kodu istenir.
    r = can.post("/class/join", json={"code": "JCCRS2"})
    assert r.status_code == 404 and "şube" in r.json()["detail"]
    assert can.post("/class/join", json={"code": "YOKYOK"}).status_code == 404
    assert auth_as(TEACHER, "teacher").post("/class/join", json={"code": "JCONE1"}).status_code == 403


def test_yeni_kurs_ve_yeni_sube_sunucuda_kod_alir(auth_as, seeded, db_query):
    teacher = auth_as(TEACHER, "teacher")
    created = teacher.post("/create_course", json={
        "title": "Yeni", "category": "coding", "curriculum": [{"id": "s1", "title": "Giriş"}]}).json()
    assert len(created["classes"]) == 1 and created["classes"][0]["name"] == "Genel" and len(created["classes"][0]["code"]) == 6
    updated = teacher.put(f"/update_course/{created['id']}", json={
        "classes": created["classes"] + [{"id": "c_new", "name": "B", "student_ids": []}]}).json()
    codes = [c["code"] for c in updated["classes"]]
    assert len(codes) == 2 and all(len(c) == 6 for c in codes) and len(set(codes)) == 2


def test_ogrenci_sube_kodlarini_goremez(auth_as, seeded, db_query):
    auth_as(ECE, "student").post("/class/join", json={"code": "JCONE1"})
    course = auth_as(ECE, "student").get(f"/courses/{ONE_CLASS}").json()
    assert course["enrollment_code"] is None and all("code" not in c for c in course["classes"])
