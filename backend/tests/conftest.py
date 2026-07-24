"""
Ortak test fixture'ları.

Testler gerçek uygulamayı (main_fastapi.app) TestClient ile çalıştırır.
Dış servislere (Gemini, Iyzico) gerçek çağrı YAPILMAZ — canlı doğrulama isteyen
testler `live` işaretiyle ayrılmıştır ve varsayılan olarak atlanır.
"""
import os
import sys
import pathlib

import pytest

# backend/ dizinini import yoluna ekle (testler backend/tests/ altında)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import connect_db  # noqa: E402
from sqlalchemy.pool import NullPool  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402


def pytest_configure(config):
    config.addinivalue_line("markers", "live: dış servise gerçek çağrı yapar (varsayılan atlanır)")
    config.addinivalue_line("markers", "db: çalışan bir veritabanı gerektirir")


def pytest_collection_modifyitems(config, items):
    """`live` testleri yalnızca --live verildiğinde çalıştır."""
    if config.getoption("--live"):
        return
    skip = pytest.mark.skip(reason="dış servise gerçek çağrı yapar; --live ile çalıştırın")
    for item in items:
        if "live" in item.keywords:
            item.add_marker(skip)


def pytest_addoption(parser):
    parser.addoption(
        "--live", action="store_true", default=False,
        help="Gemini gibi dış servislere gerçek çağrı yapan testleri de çalıştır",
    )


@pytest.fixture(scope="session", autouse=True)
def _disable_db_pooling():
    """
    TestClient her isteği yeni bir event loop'ta çalıştırdığı için havuzlanmış
    asyncpg bağlantıları ölü loop'a takılır. Testlerde havuzu tamamen kapatıyoruz.
    get_db, SessionLocal'i çağrı anında modül global'inden okuduğu için bu yeterli.
    """
    connect_db.engine = create_async_engine(
        connect_db.engine.url.render_as_string(hide_password=False),
        poolclass=NullPool,
        connect_args={"statement_cache_size": 0},
    )
    connect_db.SessionLocal = sessionmaker(
        bind=connect_db.engine, class_=AsyncSession, expire_on_commit=False
    )
    yield


@pytest.fixture(scope="session")
def app():
    import main_fastapi
    return main_fastapi.app


@pytest.fixture
def client(app):
    """Lifespan çalıştırmayan TestClient — açılıştaki DB migration'ları tetiklenmez."""
    from starlette.testclient import TestClient
    with_client = TestClient(app)
    yield with_client
    with_client.cookies.clear()


@pytest.fixture
def auth_as(client):
    """Verilen rol/ID ile giriş yapmış bir istemci döner."""
    from core.security import create_access_token

    def _login(user_id, role):
        client.cookies.clear()
        client.cookies.set("access_token", create_access_token(str(user_id), role=role))
        return client

    return _login


@pytest.fixture(scope="session")
def dsn():
    """Senkron psycopg2 DSN — async engine ile loop çakışmasını önlemek için."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL tanımlı değil")
    return url.replace("postgresql+asyncpg://", "postgresql://")


@pytest.fixture
def db_query(dsn):
    """Basit senkron SQL yardımcısı: db_query("select 1") -> [(1,)]"""
    import psycopg2

    def _q(sql, params=None, fetch=True):
        try:
            with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
                cur.execute(sql, params or ())
                return cur.fetchall() if fetch else None
        except psycopg2.OperationalError as e:
            pytest.skip(f"veritabanına bağlanılamadı: {e}")

    return _q
