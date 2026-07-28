"""Tam odev dongusu: ogrenci teslim -> ogretmen gorur -> not verir -> ogrenci gorur.

Gercek veritabanina karsi calisir, sonunda olusturdugu kaydi siler.
"""
import asyncio, io, logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from fastapi import UploadFile
from sqlalchemy import select, text
from connect_db import SessionLocal
from models.course import Course
from models.enrollment import Enrollment
from routers.courses import (
    GradeHomeworkRequest, submit_homework, grade_homework_submission,
    get_all_homework_submissions, get_my_homework_submission,
)

NODE = "akis-testi"


async def main():
    async with SessionLocal() as db:
        # Gercekten kayitli bir ogrenci-kurs cifti bul
        kayit = (await db.execute(select(Enrollment).limit(1))).scalars().first()
        if not kayit:
            print("!! Hic kurs kaydi (enrollment) yok — once bir ogrenci kursa katilmali.")
            return
        kurs = (await db.execute(
            select(Course).where(Course.id == kayit.course_id))).scalars().first()
        ogrenci, hoca = str(kayit.student_id), str(kurs.teacher_id)
        print(f"kurs {kurs.id} | ogrenci {ogrenci} | hoca {hoca}\n")

        # 1) Ogrenci teslim eder
        await submit_homework(
            course_id=kurs.id, node_id=NODE,
            file=UploadFile(filename="cevap.py", file=io.BytesIO(b"print('Merhaba')")),
            student_note=None, user={"sub": ogrenci, "role": "student"}, db=db,
        )
        print("1) OGRENCI TESLIM ETTI")

        # 2) Ogretmen goruyor mu
        liste = await get_all_homework_submissions(
            course_id=kurs.id, user={"sub": hoca, "role": "teacher"}, db=db)
        satir = next((s for s in liste["submissions"] if s["node_id"] == NODE), None)
        print(f"2) OGRETMEN LISTESINDE: {'VAR ✓' if satir else 'YOK ✗'} "
              f"| durum: {'bekliyor' if satir and not satir['graded_at'] else '?'}")
        if not satir:
            return

        # 3) Ogretmen not verir
        await grade_homework_submission(
            course_id=kurs.id, submission_id=satir["id"],
            payload=GradeHomeworkRequest(grade=92, feedback="Doğru çalışıyor, tebrikler."),
            user={"sub": hoca, "role": "teacher"}, db=db)
        print("3) OGRETMEN NOT VERDI: 92")

        # 4) Ogrenci notu goruyor mu
        gor = await get_my_homework_submission(
            course_id=kurs.id, node_id=NODE,
            user={"sub": ogrenci, "role": "student"}, db=db)
        s = gor["submission"]
        print(f"4) OGRENCI GORUYOR: not={s['grade']} geri_bildirim={s['feedback']!r}")

        # 5) Ogrenci cevabini gunceller -> not silinmeli
        await submit_homework(
            course_id=kurs.id, node_id=NODE,
            file=UploadFile(filename="cevap.py", file=io.BytesIO(b"print('Duzeltildi')")),
            student_note=None, user={"sub": ogrenci, "role": "student"}, db=db)
        gor2 = await get_my_homework_submission(
            course_id=kurs.id, node_id=NODE,
            user={"sub": ogrenci, "role": "student"}, db=db)
        s2 = gor2["submission"]
        temiz = s2["grade"] is None and s2["graded_at"] is None
        print(f"5) YENIDEN TESLIM SONRASI: not={s2['grade']} "
              f"-> eski deger. {'silindi ✓' if temiz else 'DURUYOR ✗'}")

        liste2 = await get_all_homework_submissions(
            course_id=kurs.id, user={"sub": hoca, "role": "teacher"}, db=db)
        satir2 = next(s for s in liste2["submissions"] if s["node_id"] == NODE)
        print(f"   ogretmen listesinde tekrar: "
              f"{'bekliyor ✓' if not satir2['graded_at'] else 'DEGERLENDIRILDI ✗'}")

        await db.execute(text("DELETE FROM homework_submissions WHERE node_id=:n"), {"n": NODE})
        await db.commit()
        print("\n-- test kaydi silindi --")

asyncio.run(main())
