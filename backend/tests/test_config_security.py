"""Güvenlik ayarlarının doğrulanması.

Regresyon: SECRET_KEY'in kaynak kodda 'gomufi-dev-secret-key-change-in-prod'
varsayılanı vardı (herkes istediği rolde JWT üretebilirdi) ve ADMIN_PASSWORD
'admin123'e düşüyordu (env tanımsızsa tam admin devralma).
"""
import os
import subprocess
import sys
import pathlib

import pytest

BACKEND_DIR = str(pathlib.Path(__file__).resolve().parent.parent)


def _import_config_with(**env):
    """core.config'i verilen ortamla ayrı bir süreçte import etmeyi dener."""
    return subprocess.run(
        [sys.executable, "-c", "import core.config"],
        env=dict(os.environ, **env),
        capture_output=True, text=True, cwd=BACKEND_DIR,
    )


@pytest.mark.parametrize("label,env", [
    ("SECRET_KEY yok", {"SECRET_KEY": ""}),
    ("eski varsayılan SECRET_KEY", {"SECRET_KEY": "gomufi-dev-secret-key-change-in-prod"}),
    ("çok kısa SECRET_KEY", {"SECRET_KEY": "short"}),
])
def test_zayif_secret_key_ile_acilmaz(label, env):
    result = _import_config_with(**env)
    assert result.returncode != 0, f"{label}: uygulama açılmamalıydı"
    assert "RuntimeError" in result.stderr


def test_production_zayif_admin_parolasi_ile_acilmaz():
    result = _import_config_with(ADMIN_PASSWORD="admin123", FRONTEND_URL="https://gomufi.com")
    assert result.returncode != 0
    assert "ADMIN_PASSWORD" in result.stderr


def test_gecerli_ayarlarla_uygulama_acilir():
    result = subprocess.run(
        [sys.executable, "-c", "import main_fastapi"],
        capture_output=True, text=True, cwd=BACKEND_DIR,
    )
    assert result.returncode == 0, result.stderr[-2000:]


def test_admin_env_tanimsizsa_giris_tamamen_kapali():
    """Varsayılan bir admin hesabına ASLA düşülmemeli."""
    result = subprocess.run(
        [sys.executable, "-c",
         "from core.config import settings;"
         "from core.security import is_admin_credentials as f;"
         "assert not settings.ADMIN_LOGIN_ENABLED;"
         "assert not f('admin@gomufi.com', 'admin123');"
         "assert not f('', '');"
         "print('ok')"],
        env=dict(os.environ, ADMIN_EMAIL="", ADMIN_PASSWORD=""),
        capture_output=True, text=True, cwd=BACKEND_DIR,
    )
    assert "ok" in result.stdout, result.stderr[-2000:]


def test_yanlis_admin_bilgileri_reddedilir():
    from core.config import settings
    from core.security import is_admin_credentials

    if not settings.ADMIN_LOGIN_ENABLED:
        pytest.skip("admin girişi bu ortamda kapalı")

    assert not is_admin_credentials(settings.ADMIN_EMAIL, "yanlis-parola")
    assert not is_admin_credentials("baskasi@example.com", settings.ADMIN_PASSWORD)
    assert is_admin_credentials(settings.ADMIN_EMAIL, settings.ADMIN_PASSWORD)


def test_bos_hash_ile_parola_dogrulamasi_patlamaz():
    """OAuth ile kaydolan kullanıcıların password alanı boş — 500 yerine False dönmeli."""
    from core.security import verify_password

    assert verify_password("herhangi", "") is False
    assert verify_password("herhangi", None) is False
    assert verify_password("herhangi", "hash-degil") is False
