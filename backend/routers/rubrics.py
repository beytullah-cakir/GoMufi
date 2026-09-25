"""
Dereceli puanlama anahtarı kütüphanesi: öğretmen ölçütleri ve seviyeleri bir
kez tanımlar, her ödevde ve Üret projesinde yeniden kullanır.

  GET    /rubrics
  POST   /rubrics          {title, criteria}
  DELETE /rubrics/{id}

Slayta eklenen anahtar kütüphanedekinin KOPYASIDIR: kütüphanede sonradan
yapılan değişiklik, daha önce o anahtarla verilmiş notların anlamını değiştirmez.
"""
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import homework_rules
from auth.dependencies import get_current_teacher_id
from connect_db import get_db
from models.teaching import RubricTemplate

router = APIRouter(prefix="/rubrics", tags=["rubrics"])

MAX_TEMPLATES = 50


class RubricIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    criteria: List[Any]


def _out(row: RubricTemplate):
    return {"id": row.id, "title": row.title, "criteria": row.criteria or [],
            "created_at": row.created_at.isoformat() if row.created_at else None}


@router.get("")
async def list_rubrics(teacher_id: int = Depends(get_current_teacher_id), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(RubricTemplate).where(RubricTemplate.teacher_id == teacher_id).order_by(RubricTemplate.created_at.desc())
    )).scalars().all()
    return {"rubrics": [_out(r) for r in rows]}


@router.post("")
async def save_rubric(
    body: RubricIn,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    rubric = homework_rules.normalize_rubric({"criteria": body.criteria})
    if not rubric:
        raise HTTPException(status_code=400, detail="Anahtarda en az bir ölçüt ve her ölçütte en az iki seviye olmalı.")
    count = len((await db.execute(select(RubricTemplate.id).where(RubricTemplate.teacher_id == teacher_id))).all())
    if count >= MAX_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"En fazla {MAX_TEMPLATES} anahtar saklanabilir.")
    row = RubricTemplate(teacher_id=teacher_id, title=body.title.strip(), criteria=rubric["criteria"])
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"rubric": _out(row)}


@router.delete("/{rubric_id}")
async def delete_rubric(
    rubric_id: int,
    teacher_id: int = Depends(get_current_teacher_id),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(
        select(RubricTemplate).where(RubricTemplate.id == rubric_id, RubricTemplate.teacher_id == teacher_id)
    )).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}
