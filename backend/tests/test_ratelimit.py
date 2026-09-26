"""Öğrencinin YZ uçlarında hız sınırı: döngüyle sınırsız fatura çıkarılamaz."""
import asyncio

import pytest
from fastapi import HTTPException

from core import ratelimit


@pytest.fixture(autouse=True)
def temiz():
    ratelimit.reset()
    yield
    ratelimit.reset()


def test_dakika_siniri():
    async def run():
        for _ in range(3):
            await ratelimit.check("test", "u1", per_minute=3)
        with pytest.raises(HTTPException) as exc:
            await ratelimit.check("test", "u1", per_minute=3)
        assert exc.value.status_code == 429
        await ratelimit.check("test", "u2", per_minute=3)        # başka kullanıcı etkilenmez
    asyncio.run(run())


def test_gun_siniri():
    async def run():
        for _ in range(2):
            await ratelimit.check("gun", "u1", per_minute=100, per_day=2)
        with pytest.raises(HTTPException) as exc:
            await ratelimit.check("gun", "u1", per_minute=100, per_day=2)
        assert "Bugünlük" in exc.value.detail
    asyncio.run(run())


def test_ogrenci_yz_ucu_sinirli(auth_as):
    student = auth_as(4242, "student")
    codes = [student.post("/ai/challenge-coach", json={}).status_code for _ in range(ratelimit.STUDENT_AI_PER_MINUTE + 1)]
    assert codes[-1] == 429 and 429 not in codes[:-1]
