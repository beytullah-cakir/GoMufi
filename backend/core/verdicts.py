"""
YZ ölçüt kararlarının sunucu imzası.

NEDEN: öğrencinin kodu kendi bilgisayarında (VS Code) çalışıyor; "görev geçti"
olayını da istemci gönderiyor. Çıktı ölçütlerini sunucu yeniden çalıştıramaz,
ama YZ ölçütlerinin kararını sunucu VERİYOR. Geçen her YZ kararı için bir imza
döner; "geçti" olayı, görevin her YZ ölçütü için bu kodla alınmış geçerli bir
imza taşımıyorsa sunucu olayı "geçti" saymaz. Böylece öğrenci isteği elle
kurup YZ ölçütlü bir görevi hiç çözmeden "çözüldü" yapamaz.

Sınır (bilerek kabul edilen): yalnızca çıktı ölçütlü görevlerde çıktıyı
istemci bildiriyor; bunu doğrulamanın tek yolu kodu sunucuda çalıştırmak.
"""
import hashlib
import hmac
from typing import Iterable, List, Optional

from core.config import settings

# İstemci olaydaki kodu bu uzunlukta kırpıyor (learningEvents.ts MAX_CODE);
# imza da aynı uzunluktaki kod üzerinden alınır ki iki taraf aynı metni görsün.
CODE_LIMIT = 8 * 1024


def _digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", "replace")).hexdigest()


def criterion_ref(criterion: str, arbitrate: Optional[str] = None) -> str:
    """Ölçütün kararlı kimliği: YZ ölçütü metni ya da tahkim edilen beklenen çıktı."""
    return f"arb:{_digest(arbitrate)}" if arbitrate is not None else f"ai:{_digest(criterion)}"


def requirement_ref(requirement: str) -> str:
    return f"req:{_digest(requirement)}"


def clean_requirements(raw: Iterable[str], limit: int = 10) -> List[str]:
    return [str(r).strip()[:500] for r in raw or [] if r and str(r).strip()][:limit]


def required_refs(slide: dict) -> List[str]:
    """Bu görevin "geçti" sayılması için imzası gereken YZ kararları."""
    refs = [criterion_ref(c) for c in slide.get("ai_criteria") or []]
    if slide.get("type") == "produce" and slide.get("submission_type") in (None, "code"):
        refs += [requirement_ref(r) for r in clean_requirements(slide.get("requirements") or [])]
    return refs


def sign(student_id: int, task_key: str, ref: str, code: str) -> str:
    msg = f"{student_id}|{task_key}|{ref}|{_digest((code or '')[:CODE_LIMIT])}"
    return hmac.new(settings.SECRET_KEY.encode(), msg.encode(), hashlib.sha256).hexdigest()[:40]


def has_valid(tokens: Iterable[str], student_id: int, task_key: str, ref: str, code: str) -> bool:
    expected = sign(student_id, task_key, ref, code)
    return any(hmac.compare_digest(expected, t or "") for t in tokens)
