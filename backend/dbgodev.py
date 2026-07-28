"""Odev degerlendirme ucunu gercek veritabanina karsi sinar.

Var olan bir gonderiyi bulur, not verir, kalici oldugunu ve hem ogretmen
listesinde hem ogrenci ucunda gorundugunu dogrular. Sonunda ESKI HALINE DONER.
"""
import asyncio, logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
from sqlalchemy import select, text
from connect_db import SessionLocal
from models.homework_submission import HomeworkSubmission
from models.course import Course
from routers.courses import (
    GradeHomeworkRequest, grade_homework_submission,
    get_all_homework_submissions, get_my_homework_submission,
)


async def main():
    async with SessionLocal() as db:
        sub = (await db.execute(
            select(HomeworkSubmission).order_by(HomeworkSubmission.id.desc()).limit(1)
        )).scalars().first()

        gecici = False
        if not sub:
            # Test icin gecici gonderi olustur; sonunda silinir.
            from models.student import Student
            kurs = (await db.execute(select(Course).limit(1))).scalars().first()
            ogr = (await db.execute(select(Student).limit(1))).scalars().first()
            if not kurs or not ogr:
                print("!! Test icin en az bir kurs ve bir ogrenci gerekli.")
                return
            sub = HomeworkSubmission(
                course_id=kurs.id, node_id="test-node", student_id=ogr.id,
                file_name="odev.py", file_data="cHJpbnQoIk1lcmhhYmEiKQ==",
                file_mime="text/x-python", student_note="Deneme teslimi",
            )
            db.add(sub)
            await db.commit()
            await db.refresh(sub)
            gecici = True
            print(f"(test icin gecici gonderi olusturuldu: #{sub.id})")

        course = (await db.execute(
            select(Course).where(Course.id == sub.course_id)
        )).scalars().first()
        ogretmen = str(course.teacher_id)
        onceki = (sub.grade, sub.feedback, sub.graded_at, sub.graded_by, sub.graded_source)
        print(f"gonderi #{sub.id} | kurs {sub.course_id} | ogrenci {sub.student_id} "
              f"| hoca {ogretmen}")
        print(f"onceki durum: grade={onceki[0]} graded_at={onceki[2]}")

        # 1) Not ver
        r = await grade_homework_submission(
            course_id=sub.course_id, submission_id=sub.id,
            payload=GradeHomeworkRequest(grade=88, feedback="Döngü doğru, değişken adları geliştirilebilir."),
            user={"sub": ogretmen, "role": "teacher"}, db=db,
        )
        print(f"\n1) KAYIT: {r['submission']}")

        # 2) Ogretmen listesinde gorunuyor mu
        liste = await get_all_homework_submissions(
            course_id=sub.course_id, user={"sub": ogretmen, "role": "teacher"}, db=db,
        )
        satir = next(s for s in liste["submissions"] if s["id"] == sub.id)
        print(f"\n2) OGRETMEN LISTESI: grade={satir['grade']} "
              f"graded_at={'var' if satir['graded_at'] else 'YOK'} "
              f"kaynak={satir['graded_source']}")
        print(f"   geri bildirim: {satir['feedback']!r}")

        # 3) Ogrenci kendi odevinde goruyor mu
        ogr = await get_my_homework_submission(
            course_id=sub.course_id, node_id=sub.node_id,
            user={"sub": str(sub.student_id), "role": "student"}, db=db,
        )
        s = ogr["submission"]
        print(f"\n3) OGRENCI GORUNUMU: grade={s.get('grade')} feedback={s.get('feedback')!r}")
        print(f"   graded_by sizdi mi? {'EVET (SORUN)' if 'graded_by' in s else 'hayir ✓'}")

        # 4) Baska hocanin kursuna not verilemiyor mu
        from fastapi import HTTPException
        try:
            await grade_homework_submission(
                course_id=sub.course_id, submission_id=sub.id,
                payload=GradeHomeworkRequest(grade=100),
                user={"sub": str(int(ogretmen) + 9999), "role": "teacher"}, db=db,
            )
            print("\n4) YETKI: SORUN — yabanci hoca not verebildi!")
        except HTTPException as e:
            print(f"\n4) YETKI: yabanci hoca engellendi ({e.status_code}) ✓")

        # Temizlik
        if gecici:
            await db.execute(text("DELETE FROM homework_submissions WHERE id=:i"), {"i": sub.id})
            await db.commit()
            print("\n-- gecici gonderi silindi --")
        else:
            await db.execute(text(
                "UPDATE homework_submissions SET grade=:g, feedback=:f, graded_at=:t, "
                "graded_by=:b, graded_source=:s WHERE id=:i"
            ), {"g": onceki[0], "f": onceki[1], "t": onceki[2], "b": onceki[3],
                "s": onceki[4], "i": sub.id})
            await db.commit()
            print("\n-- eski haline dondurüldu --")

asyncio.run(main())
