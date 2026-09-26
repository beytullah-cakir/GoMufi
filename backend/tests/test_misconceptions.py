"""
"Öğrenci neyi anlamadı?" — ANLA aşamasının kör noktası kapandı mı?

Senaryo: "input() metin döndürür" konusunda bir çoktan seçmeli slayt sorusu;
yanlış şıklardan biri "input'un sayı döndürdüğünü sanıyor" yanılgısını temsil ediyor.
Bir QUIZ oyunu sorusu ve bir kavram eşleştirme oyunu da var.
"""
import json

import pytest

pytestmark = pytest.mark.db

TEACHER = 999101
ECE, CAN, DENIZ = 999111, 999112, 999113
COURSE = 999131
NODE_ANLA, NODE_QUIZ = "mc_anla", "mc_quiz"
MCQ_SLIDE, GAME_SLIDE, QUIZ_SLIDE = 99910001, 99910002, 99910003
SAYI = "input()'un sayı döndürdüğünü sanıyor"
LISTE = "input()'un liste döndürdüğünü sanıyor"

CURRICULUM = [
    {"id": NODE_ANLA, "title": "Girdi · ANLA", "theme": "purple", "conceptLanguage": "python",
     "conceptIds": ["tip_donusumu"], "primaryConceptId": "tip_donusumu"},
    {"id": NODE_QUIZ, "title": "Girdi · QUIZ", "theme": "quiz"},
]
MCQ = {"id": "el_q1", "type": "multiple_choice", "content": "x = input() — x'in türü nedir?", "extra": {
    "options": [
        {"id": "A", "text": "str", "isCorrect": True},
        {"id": "B", "text": "int", "isCorrect": False, "misconception": SAYI},
        {"id": "C", "text": "list", "isCorrect": False, "misconception": LISTE},
    ]}}
SLIDES = {
    NODE_ANLA: [
        {"id": MCQ_SLIDE, "type": "content", "elements": [MCQ]},
        {"id": GAME_SLIDE, "type": "game", "gameType": "dragdrop", "elements": []},
    ],
    NODE_QUIZ: [
        {"id": QUIZ_SLIDE, "type": "game", "gameType": "matching", "elements": [], "gameConfig": {"questions": [
            {"id": "q-1-555", "text": "int('5') + 1 = ?", "options": [
                {"id": "1", "text": "6", "isCorrect": True},
                {"id": "2", "text": "51", "isCorrect": False, "misconception": "int()'in metni sayıya çevirdiğini bilmiyor"},
            ]},
        ]}},
    ],
}
CLASSES = [{"id": "c_a", "name": "A", "student_ids": [ECE, CAN, DENIZ], "code": "MCA001", "schedule": []}]


@pytest.fixture
def seeded(db_query):
    students = (ECE, CAN, DENIZ)

    def cleanup():
        db_query("DELETE FROM learning_events WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM task_progress WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM concept_mastery WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM teacher_actions WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM lesson_contents WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM enrollments WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM courses WHERE id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM students WHERE id IN (%s, %s, %s)", students, fetch=False)
        db_query("DELETE FROM teachers WHERE id = %s", (TEACHER,), fetch=False)

    cleanup()
    db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, 'Selin', 'Hoca', 'mc@test.local')",
             (TEACHER,), fetch=False)
    for sid, name in ((ECE, "Ece"), (CAN, "Can"), (DENIZ, "Deniz")):
        db_query("INSERT INTO students (id, first_name, last_name, email, xp) VALUES (%s, %s, 'T', %s, 0)",
                 (sid, name, f"mc{sid}@test.local"), fetch=False)
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes, progress) "
             "VALUES (%s, %s, 'Python', %s, '[]', %s, 0)",
             (COURSE, TEACHER, json.dumps(CURRICULUM), json.dumps(CLASSES)), fetch=False)
    for node, slides in SLIDES.items():
        db_query("INSERT INTO lesson_contents (course_id, node_id, title, slides) VALUES (%s, %s, %s, %s)",
                 (COURSE, node, node, json.dumps(slides)), fetch=False)
    for sid in students:
        db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (sid, COURSE), fetch=False)
    import learning_store
    learning_store._CONTEXT_CACHE.pop(COURSE, None)
    yield
    cleanup()


def send(client, *events):
    r = client.post("/analytics/events", json={"course_id": COURSE, "events": list(events)})
    assert r.status_code == 200, r.text
    return r.json()


def mcq(selected, slide=MCQ_SLIDE, element="el_q1"):
    return {"type": "slide_answer", "slide_id": str(slide), "element_id": element, "selected": selected}


def test_yanlis_sik_yanilgiyi_tasir_dogruluk_sunucuda(auth_as, seeded, db_query):
    # İstemci "correct: true" dese de sunucu kendi hesaplar.
    ece = auth_as(ECE, "student")
    assert send(ece, {**mcq(["B"]), "correct": True})["accepted"] == 1
    row = db_query("SELECT outcome, details FROM learning_events WHERE course_id=%s AND student_id=%s", (COURSE, ECE))
    assert row[0][0] == "fail" and row[0][1]["misconception"] == SAYI and row[0][1]["selected_text"] == ["int"]
    # Yanılgı öğrencinin kavram kaydına da düştü.
    mastery = db_query("SELECT last_misconception FROM concept_mastery WHERE course_id=%s AND student_id=%s", (COURSE, ECE))
    assert mastery and mastery[0][0] == SAYI

    # Kursta olmayan soru ya da şık kabul edilmez.
    assert send(ece, mcq(["B"], element="yok"), mcq(["Z"]))["accepted"] == 0


def test_neyi_anlamadilar_listesi_ve_soru_istatistigi(auth_as, seeded):
    send(auth_as(ECE, "student"), mcq(["B"]), mcq(["A"]))               # önce yanlış, sonra doğru
    send(auth_as(CAN, "student"), mcq(["B"]))
    send(auth_as(DENIZ, "student"), mcq(["A"]))
    send(auth_as(CAN, "student"), {"type": "slide_answer", "slide_id": str(QUIZ_SLIDE), "element_id": "q-1-555",
                                   "selected": ["2"]})
    send(auth_as(DENIZ, "student"), {"type": "slide_answer", "slide_id": str(GAME_SLIDE), "answer": "Kavram eşleştirme",
                                     "items": [{"item": "değişken", "chosen": "fonksiyon", "expected": "değer tutan kutu"},
                                               {"item": "döngü", "chosen": "tekrar", "expected": "tekrar", "correct": True}]})

    data = auth_as(TEACHER, "teacher").get(f"/analytics/courses/{COURSE}/misconceptions").json()
    top = data["misconceptions"][0]
    assert top["label"] == SAYI and top["student_count"] == 2
    assert {s["name"] for s in top["students"]} == {"Ece T", "Can T"}
    assert top["sources"] == {"soru": 2} and top["modules"] == ["Girdi · ANLA"]
    labels = {m["label"] for m in data["misconceptions"]}
    assert "int()'in metni sayıya çevirdiğini bilmiyor" in labels
    assert "“değişken” ile “fonksiyon” karıştırılıyor" in labels
    assert LISTE not in labels                                           # kimse seçmedi

    q = next(q for q in data["questions"] if q["element_id"] == "el_q1")
    # İlk deneme sayılır: Ece'nin ikinci (doğru) cevabı doğru oranını şişirmez.
    assert q["answered"] == 3 and q["first_try_correct"] == 1
    assert q["wrong_choices"] == [{"text": "int", "misconception": SAYI, "students": 2}]

    only_ece = auth_as(TEACHER, "teacher").get(f"/analytics/courses/{COURSE}/misconceptions",
                                               params={"class_id": "c_a"}).json()
    assert only_ece["misconceptions"][0]["student_count"] == 2
    assert auth_as(ECE, "student").get(f"/analytics/courses/{COURSE}/misconceptions").status_code == 403


def test_tekrar_gorevi_yalnizca_secilen_ogrencilere(auth_as, seeded):
    teacher = auth_as(TEACHER, "teacher")
    task = {"challengeConfig": {"title": "input ve int", "prompt": "Girdiyi sayıya çevir.",
                                "starterCode": "x = input()\n", "files": [{"name": "gorev.py", "content": "x = input()\n", "entry": True}]}}
    r = teacher.post(f"/analytics/courses/{COURSE}/practice-task/apply",
                     json={"node_id": NODE_ANLA, "slide": task, "student_ids": [ECE, CAN, 424242]})
    assert r.status_code == 200 and r.json()["assigned_to"] == [ECE, CAN]
    slide_id = r.json()["slide_id"]

    def sees(sid):
        courses = auth_as(sid, "student").get("/my-content").json()
        note = next(n for n in courses[0]["notes"] if n["id"] == NODE_ANLA)
        one = auth_as(sid, "student").get(f"/courses/{COURSE}").json()
        note2 = next(n for n in one["notes"] if n["id"] == NODE_ANLA)
        a = any(s["id"] == slide_id for s in note["slides"])
        assert a == any(s["id"] == slide_id for s in note2["slides"])
        return a

    assert sees(ECE) and sees(CAN) and not sees(DENIZ)
    # Öğrenciye giden kursta katılım kodları yok.
    course = auth_as(DENIZ, "student").get("/my-content").json()[0]
    assert course["enrollment_code"] is None and all("code" not in c for c in course["classes"])
    teacher = auth_as(TEACHER, "teacher")
    assert teacher.post(f"/analytics/courses/{COURSE}/practice-task/apply",
                        json={"node_id": NODE_ANLA, "slide": task, "student_ids": [424242]}).status_code == 400
