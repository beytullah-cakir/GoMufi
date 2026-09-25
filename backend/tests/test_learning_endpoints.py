"""
Öğrenme analitiği uçları — gerçek veritabanıyla uçtan uca.

Senaryo: bir Python kursunda "Döngüler" modülünde bir Uygula görevi ve bir
ödev var. Öğrenci görevi önce çözemiyor (def kullanmamış, NameError), sonra
çözüyor; kodun bir kısmını yapıştırıyor; quiz'de bir soruyu yanlış yapıyor.
Öğretmen analiz uçlarından bunların hepsini doğru öğrenciye, doğru göreve ve
doğru kavrama bağlanmış olarak görmeli; başka hiç kimse görmemeli.
"""
import json

import pytest

pytestmark = pytest.mark.db

TEACHER, OTHER_TEACHER = 998801, 998802
STUDENT, OUTSIDER = 998811, 998812
COURSE = 998821
QUIZ = 998831
NODE = "sec_ana_998"
TASK_SLIDE, HOMEWORK_SLIDE = 99880001, 99880002
TASK_KEY = f"challenge:{TASK_SLIDE}"
STARTER = "# Kodunu buraya yaz\n"
PASTED = "def sayac(n):\n    for i in range(1, n + 1):\n        print(i)\n\nsayac(5)\n"

CURRICULUM = [{
    "id": NODE, "title": "Döngüler", "theme": "cyan", "lessonTopic": "Döngüler",
    "conceptLanguage": "python", "conceptIds": ["for_dongusu", "range_kullanimi"],
    "primaryConceptId": "for_dongusu", "outcomes": ["for ile tekrar yapabilir"],
}]
SLIDES = [
    {"id": TASK_SLIDE, "type": "challenge", "elements": [], "challengeConfig": {
        "title": "Sayaç", "prompt": "1'den 5'e kadar yazdır.", "starterCode": STARTER,
        "files": [{"name": "gorev.py", "content": STARTER, "entry": True}],
    }},
    {"id": HOMEWORK_SLIDE, "type": "homework", "elements": [], "homeworkConfig": {"title": "Döngü Ödevi"}},
]


@pytest.fixture
def seeded(db_query):
    def cleanup():
        db_query("DELETE FROM enrollments WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM ai_usage_logs WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM quizzes WHERE id = %s", (QUIZ,), fetch=False)
        db_query("DELETE FROM courses WHERE id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM students WHERE id IN (%s, %s)", (STUDENT, OUTSIDER), fetch=False)
        db_query("DELETE FROM teachers WHERE id IN (%s, %s)", (TEACHER, OTHER_TEACHER), fetch=False)

    cleanup()
    for tid in (TEACHER, OTHER_TEACHER):
        db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, 'Test', 'Öğretmen', %s)",
                 (tid, f"t{tid}@test.local"), fetch=False)
    for sid, name in ((STUDENT, "Deniz"), (OUTSIDER, "Yabancı")):
        db_query("INSERT INTO students (id, first_name, last_name, email) VALUES (%s, %s, 'Test', %s)",
                 (sid, name, f"s{sid}@test.local"), fetch=False)
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes) VALUES (%s, %s, 'Python Test', %s, '[]')",
             (COURSE, TEACHER, json.dumps(CURRICULUM)), fetch=False)
    db_query("INSERT INTO lesson_contents (course_id, node_id, title, slides) VALUES (%s, %s, 'Döngüler', %s)",
             (COURSE, NODE, json.dumps(SLIDES)), fetch=False)
    db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (STUDENT, COURSE), fetch=False)
    db_query("INSERT INTO quizzes (id, course_id, topic, question_text, correct_answer) "
             "VALUES (%s, %s, 'Döngüler', 'range(3) kaç sayı üretir?', '3')", (QUIZ, COURSE), fetch=False)
    import learning_store
    learning_store._CONTEXT_CACHE.pop(COURSE, None)
    yield
    cleanup()


def _trace(error):
    return f'Traceback (most recent call last):\n  File "gorev.py", line 2\n    print(sayi)\n{error}'


def _student_session(auth_as):
    client = auth_as(STUDENT, "student")
    events = [
        {"type": "check", "task_key": TASK_KEY, "outcome": "fail", "attempt": 1, "client": "lab",
         "code": "for i in range(5): print(i)", "checks": [
             {"id": "construct:0", "kind": "code", "value": "def", "status": "fail", "label": "Kodda def kullanıldı"},
         ]},
        {"type": "check", "task_key": TASK_KEY, "outcome": "error", "attempt": 2, "client": "lab",
         "stderr": _trace("NameError: name 'sayi' is not defined"), "code": "print(sayi)"},
        {"type": "check", "task_key": TASK_KEY, "outcome": "pass", "attempt": 3, "client": "lab",
         "code": "def f():\n    for i in range(1, 6): print(i)\nf()", "checks": [
             {"id": "construct:0", "kind": "code", "value": "def", "status": "pass", "label": "Kodda def kullanıldı"},
         ]},
        {"type": "hint_opened", "task_key": TASK_KEY},
        {"type": "quiz_answer", "node_id": NODE, "question_id": QUIZ, "correct": False, "answer": "4"},
        {"type": "module_completed", "node_id": NODE},
        # Geçersizler: kursa ait olmayan görev, bilinmeyen tür, müfredatta olmayan düğüm.
        {"type": "check", "task_key": "challenge:1", "outcome": "pass"},
        {"type": "solved", "task_key": TASK_KEY},
        {"type": "module_completed", "node_id": "yok"},
    ]
    resp = client.post("/analytics/events", json={"course_id": COURSE, "events": events})
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_olaylar_dogrulanir_ve_kaydedilir(auth_as, db_query, seeded):
    result = _student_session(auth_as)
    assert result == {"accepted": 6, "rejected": 3}

    rows = db_query(
        "SELECT event_type, outcome, error_type, node_id, stage FROM learning_events "
        "WHERE course_id = %s ORDER BY id", (COURSE,))
    assert [r[0] for r in rows] == ["check", "check", "check", "hint_opened", "quiz_answer", "module_completed"]
    assert rows[1][2] == "NameError"                   # hata türü sunucuda türetildi
    assert rows[0][3] == NODE and rows[0][4] == "UYGULA"  # düğüm ve aşama slayttan geldi

    progress = db_query(
        "SELECT attempts, first_try_pass, solved_at IS NOT NULL, hints_opened FROM task_progress "
        "WHERE course_id = %s AND task_key = %s", (COURSE, TASK_KEY))
    assert progress == [(3, False, True, 1)]


def test_kavramlara_dogru_kanit_yazilir(auth_as, db_query, seeded):
    _student_session(auth_as)
    mastery = dict(db_query(
        "SELECT concept_id, failures FROM concept_mastery WHERE course_id = %s AND student_id = %s",
        (COURSE, STUDENT)))
    assert mastery["fonksiyon_tanimlama"] >= 1   # düşen "def" ölçütü
    assert mastery["degisken_atama"] >= 1        # NameError
    assert "for_dongusu" in mastery              # modülün birincil kavramı


def test_ogrenci_olmayan_ve_kayitsiz_ogrenci_gonderemez(auth_as, seeded):
    body = {"course_id": COURSE, "events": [{"type": "hint_opened", "task_key": TASK_KEY}]}
    assert auth_as(TEACHER, "teacher").post("/analytics/events", json=body).status_code == 403
    assert auth_as(OUTSIDER, "student").post("/analytics/events", json=body).status_code == 403


def test_yazim_kaydi_kod_kokenini_hesaplar(auth_as, seeded):
    client = auth_as(STUDENT, "student")
    body = {
        "course_id": COURSE, "task_key": TASK_KEY, "client": "vscode", "ext_version": "0.5.0",
        "ai_extensions": ["GitHub.copilot"],
        "chunks": [{
            "file": "gorev.py", "session": "s1", "seq": 0, "started_at_ms": 1_000,
            "base_text": STARTER,
            "ops": [
                [0, len(STARTER), 0, "x = 1\n", "t"],
                [900, len(STARTER) + 6, 0, PASTED, "p"],
                [1000, 0, 0, "", "zz"],   # bilinmeyen tür atılır
            ],
        }],
    }
    assert client.post("/analytics/edits", json=body).json() == {"applied": 1}
    # Aynı paket tekrar gelirse (ağ yeniden denemesi) iki kez uygulanmaz.
    assert client.post("/analytics/edits", json=body).json() == {"applied": 0}

    teacher = auth_as(TEACHER, "teacher")
    history = teacher.get(f"/analytics/courses/{COURSE}/students/{STUDENT}/code/{TASK_KEY}").json()
    prov = history["provenance"]
    assert prov["composition"]["starter"] > 0
    assert prov["composition"]["typed"] == len("x=1")
    assert prov["share"]["paste_external"] > 0.7
    assert "paste_heavy" in [f["code"] for f in prov["flags"]]
    assert prov["ai_extensions"] == ["GitHub.copilot"]
    assert history["final"]["gorev.py"].endswith(PASTED)
    assert len(history["files"]["gorev.py"]) == 1


def test_yazim_kaydi_yalnizca_kurs_gorevine(auth_as, seeded):
    client = auth_as(STUDENT, "student")
    body = {"course_id": COURSE, "task_key": "challenge:1", "chunks": []}
    assert client.post("/analytics/edits", json=body).status_code == 404


def test_ogretmen_analiz_uclari(auth_as, seeded):
    _student_session(auth_as)
    teacher = auth_as(TEACHER, "teacher")

    overview = teacher.get(f"/analytics/courses/{COURSE}/overview").json()
    assert overview["student_count"] == 1
    assert overview["course"]["tagged_nodes"] == 1
    labels = {c["concept_id"] for c in overview["concepts"]}
    assert "fonksiyon_tanimlama" in labels

    matrix = teacher.get(f"/analytics/courses/{COURSE}/concepts").json()
    assert [c["concept_id"] for c in matrix["concepts"]][:2] == ["for_dongusu", "range_kullanimi"]
    assert matrix["students"][0]["student"].startswith("Deniz")

    tasks = teacher.get(f"/analytics/courses/{COURSE}/tasks").json()["tasks"]
    assert tasks[0]["task_key"] == TASK_KEY and tasks[0]["solved"] == 1
    assert tasks[0]["top_failures"][0] == {"label": "Kodda def kullanıldı", "students": 1}
    assert tasks[0]["top_errors"][0]["label"] == "NameError"

    detail = teacher.get(f"/analytics/courses/{COURSE}/tasks/{TASK_KEY}").json()
    assert detail["students"][0]["attempts"] == 3 and detail["students"][0]["solved"]

    profile = teacher.get(f"/analytics/courses/{COURSE}/students/{STUDENT}").json()
    assert profile["tasks"][0]["task"] == "Sayaç"
    assert profile["timeline"][0]["type"] == "module_completed"
    failing = next(t for t in profile["timeline"] if t["outcome"] == "fail" and t["type"] == "check")
    assert failing["failed"] == ["Kodda def kullanıldı"]

    code = teacher.get(f"/analytics/courses/{COURSE}/events/{failing['event_id']}/code").json()
    assert code["code"].startswith("for i in range")


def test_baskasi_analizi_goremez(auth_as, seeded):
    for path in ("overview", "concepts", "tasks", "homework", f"students/{STUDENT}"):
        assert auth_as(OTHER_TEACHER, "teacher").get(f"/analytics/courses/{COURSE}/{path}").status_code == 404
        assert auth_as(STUDENT, "student").get(f"/analytics/courses/{COURSE}/{path}").status_code == 403


def test_teslim_ve_not_olay_olarak_islenir(auth_as, db_query, seeded):
    student = auth_as(STUDENT, "student")
    resp = student.post(
        f"/courses/{COURSE}/homework/{HOMEWORK_SLIDE}/submit",
        files={"file": ("cevap.py", b"for i in range(3): print(i)", "text/plain")},
    )
    assert resp.status_code == 200, resp.text
    sub_id = db_query("SELECT id FROM homework_submissions WHERE course_id = %s AND student_id = %s",
                      (COURSE, STUDENT))[0][0]

    teacher = auth_as(TEACHER, "teacher")
    graded = teacher.put(f"/courses/{COURSE}/homework/submissions/{sub_id}/grade",
                         json={"grade": 35, "feedback": "Döngü sınırına bak."})
    assert graded.status_code == 200, graded.text

    types = [r[0] for r in db_query(
        "SELECT event_type FROM learning_events WHERE course_id = %s ORDER BY id", (COURSE,))]
    assert types == ["submitted", "homework_graded"]

    homework = teacher.get(f"/analytics/courses/{COURSE}/homework").json()["homeworks"][0]
    assert homework["title"] == "Döngü Ödevi"
    assert homework["submitted"] == 1 and homework["graded"] == 1
    assert homework["avg_grade"] == 35 and homework["grade_distribution"] == {"0-49": 1}
    assert homework["missing"] == []


# --- Faz 4-6: öğrenci listesi, YZ yorumu, tekrar görevi, açıklama, canlı pano -----

from types import SimpleNamespace


class FakeGemini:
    """Gemini yerine: sabit bir JSON döner, kaç kez çağrıldığını sayar."""

    def __init__(self, payload):
        self.payload = payload
        self.calls = 0

    def install(self, monkeypatch):
        import learning_insights

        def generate_content(**_kwargs):
            self.calls += 1
            return SimpleNamespace(text=json.dumps(self.payload, ensure_ascii=False), usage_metadata=None)

        monkeypatch.setattr(learning_insights.genai, "Client",
                            lambda **_k: SimpleNamespace(models=SimpleNamespace(generate_content=generate_content)))
        return self


def _paste_task_code(auth_as):
    """Görevi büyük ölçüde yapıştırmayla çözen öğrencinin yazım kaydı."""
    auth_as(STUDENT, "student").post("/analytics/edits", json={
        "course_id": COURSE, "task_key": TASK_KEY, "client": "vscode",
        "chunks": [{"file": "gorev.py", "session": "s9", "seq": 0, "started_at_ms": 5_000,
                    "base_text": STARTER, "ops": [[0, len(STARTER), 0, PASTED, "p"]]}],
    })


def test_ogrenci_listesi_ve_kavram_kaniti(auth_as, seeded):
    _student_session(auth_as)
    teacher = auth_as(TEACHER, "teacher")
    rows = teacher.get(f"/analytics/courses/{COURSE}/students").json()["students"]
    assert rows[0]["student_id"] == STUDENT
    assert rows[0]["tasks_solved"] == 1 and rows[0]["homework_total"] == 1

    cell = teacher.get(f"/analytics/courses/{COURSE}/students/{STUDENT}/concepts/degisken_atama").json()
    assert cell["label"] and cell["evidence"][0]["error_type"] == "NameError"


def test_yz_yorumu_dogrulanir_ve_onbelleklenir(auth_as, monkeypatch, seeded):
    _student_session(auth_as)
    fake = FakeGemini({
        "summary": "Sınıf fonksiyon tanımlamada zorlanıyor.",
        "findings": [
            {"title": "def eksik", "detail": "Görevde def kullanılmadı.",
             "concept_id": "fonksiyon_tanimlama", "students": ["Deniz Test", "Hayalet Öğrenci"]},
            {"title": "Uydurma", "detail": "x", "concept_id": "olmayan_kavram", "students": []},
        ],
        "actions": [
            {"kind": "practice_task", "title": "Tekrar görevi", "detail": "d",
             "concept_id": "fonksiyon_tanimlama", "students": []},
            {"kind": "ceza_ver", "title": "Geçersiz tür", "detail": "d"},
        ],
    }).install(monkeypatch)
    teacher = auth_as(TEACHER, "teacher")

    assert teacher.get(f"/analytics/courses/{COURSE}/insights").json()["insight"] is None
    first = teacher.post(f"/analytics/courses/{COURSE}/insights", json={}).json()
    insight = first["insight"]
    assert first["cached"] is False and not first["stale"]
    assert insight["findings"][0]["students"] == [{"name": "Deniz Test", "student_id": STUDENT}]
    assert insight["findings"][1]["concept_id"] == ""          # uydurma kavram atıldı
    assert [a["kind"] for a in insight["actions"]] == ["practice_task"]

    # Aynı veriyle ikinci istek modeli çağırmaz.
    again = teacher.post(f"/analytics/courses/{COURSE}/insights", json={}).json()
    assert again["cached"] is True and fake.calls == 1
    # Öğrenci yorumu ayrı kaydedilir.
    student = teacher.post(f"/analytics/courses/{COURSE}/insights", json={"student_id": STUDENT}).json()
    assert student["insight"]["summary"] and fake.calls == 2
    assert auth_as(STUDENT, "student").post(f"/analytics/courses/{COURSE}/insights", json={}).status_code == 403


def test_tekrar_gorevi_uretilir_ve_module_eklenir(auth_as, db_query, monkeypatch, seeded):
    FakeGemini({
        "title": "Sayıları Say", "prompt": "1'den 3'e kadar yazdır.", "checkMode": "output",
        "criteria": [{"kind": "exact", "value": "1\n2\n3"}], "hint": "range sonu dahil değil.",
    }).install(monkeypatch)
    teacher = auth_as(TEACHER, "teacher")
    draft = teacher.post(f"/analytics/courses/{COURSE}/practice-task", json={"concept_id": "range_kullanimi"}).json()
    assert draft["slide"]["type"] == "challenge"
    assert draft["slide"]["challengeConfig"]["criteria"][0]["kind"] == "exact"
    assert draft["nodes"][0]["node_id"] == NODE

    applied = teacher.post(f"/analytics/courses/{COURSE}/practice-task/apply",
                           json={"node_id": NODE, "slide": draft["slide"]})
    assert applied.status_code == 200
    slides = db_query("SELECT slides FROM lesson_contents WHERE course_id = %s AND node_id = %s", (COURSE, NODE))[0][0]
    assert slides[-1]["challengeConfig"]["title"] == "Sayıları Say"

    missing = teacher.post(f"/analytics/courses/{COURSE}/practice-task/apply",
                           json={"node_id": "yok", "slide": draft["slide"]})
    assert missing.status_code == 404


def test_kodunu_acikla_akisi(auth_as, db_query, monkeypatch, seeded):
    student = auth_as(STUDENT, "student")
    start = {"course_id": COURSE, "task_key": TASK_KEY}
    # Yazım kaydı yokken sorulmaz.
    assert student.post("/analytics/explain/start", json=start).json() == {"required": False}

    _paste_task_code(auth_as)
    asked = student.post("/analytics/explain/start", json=start).json()
    assert asked["required"] is True
    assert {line["code"] for line in asked["lines"]} <= {s.strip() for s in PASTED.splitlines()}

    FakeGemini({"verdicts": [{"line_no": l["line_no"], "understood": True, "feedback": "Doğru."}
                             for l in asked["lines"]]}).install(monkeypatch)
    answers = [{**l, "answer": "1'den n'e kadar sayıları sırayla yazdırır"} for l in asked["lines"]]
    result = student.post("/analytics/explain/answer", json={**start, "answers": answers}).json()
    assert result["understood"] is True

    assert db_query("SELECT outcome FROM learning_events WHERE course_id = %s AND event_type = 'explain'",
                    (COURSE,)) == [("pass",)]
    # Bir kez açıklayan öğrenciye tekrar sorulmaz.
    assert student.post("/analytics/explain/start", json=start).json()["required"] is False


def test_bos_aciklama_modele_gitmeden_gecmez(auth_as, monkeypatch, seeded):
    fake = FakeGemini({"verdicts": []}).install(monkeypatch)
    result = auth_as(STUDENT, "student").post("/analytics/explain/answer", json={
        "course_id": COURSE, "task_key": TASK_KEY,
        "answers": [{"line_no": 2, "code": "for i in range(3):", "answer": "  "}],
    }).json()
    assert result["understood"] is False and fake.calls == 0


def test_canli_pano_yalnizca_ogretmene_bildirir(auth_as, monkeypatch, seeded):
    from core.ws_manager import manager
    sent = []

    async def capture(message):
        sent.append(message)

    monkeypatch.setattr(manager, "publish", capture)
    auth_as(STUDENT, "student").post("/analytics/events", json={"course_id": COURSE, "events": [
        {"type": "check", "task_key": TASK_KEY, "outcome": "fail", "attempt": 1},
        {"type": "module_completed", "node_id": NODE},   # görev olayı değil: bildirim yok
    ]})
    assert sent and all(m["type"] == "task_event" and m["taskKey"] == TASK_KEY for m in sent)
    assert {m["target_user"] for m in sent} == {f"teacher:{TEACHER}", f"instructor:{TEACHER}"}
