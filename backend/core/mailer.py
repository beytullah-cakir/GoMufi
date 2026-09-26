"""
E-posta gönderimi: şifre sıfırlama, veli raporu, duyuru, ödev hatırlatma.

Sağlayıcı ortam değişkeniyle seçilir (bkz. core/config.py):
  RESEND_API_KEY  → Resend HTTP API
  SMTP_HOST       → SMTP (STARTTLS; 465 portunda doğrudan SSL)
  ikisi de yok    → gönderilmez, loga yazılır ve `outbox`'a eklenir (lokal geliştirme, testler)

`send_email` hiçbir zaman hata fırlatmaz: e-posta ulaşmadı diye öğretmenin
kaydettiği yoklama ya da yayınladığı duyuru geri alınmamalı.
"""
import asyncio
import html
import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from typing import List, Optional, Sequence, Tuple

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

OUTBOX_LIMIT = 200


@dataclass
class Mail:
    to: str
    subject: str
    text: str
    html: str


# Sağlayıcı yokken "gönderilen" e-postalar — lokal geliştirmede ve testlerde okunur.
outbox: List[Mail] = []


def provider() -> str:
    if settings.RESEND_API_KEY:
        return "resend"
    if settings.SMTP_HOST:
        return "smtp"
    return "log"


def render(title: str, paragraphs: Sequence[str], button: Optional[Tuple[str, str]] = None) -> Tuple[str, str]:
    """Düz metin ve HTML gövde üretir. Paragraflar kullanıcı girdisi içerebilir; HTML'de kaçırılır."""
    text_parts = [title, ""] + list(paragraphs)
    if button:
        text_parts += ["", f"{button[0]}: {button[1]}"]
    text_parts += ["", "— GoMufi"]

    body = "".join(
        f'<p style="margin:0 0 14px;line-height:1.6;white-space:pre-line">{html.escape(p)}</p>' for p in paragraphs
    )
    if button:
        label, url = button
        body += (
            f'<p style="margin:24px 0"><a href="{html.escape(url, quote=True)}" '
            'style="background:#0284c7;color:#fff;padding:12px 22px;border-radius:12px;'
            f'text-decoration:none;font-weight:700;display:inline-block">{html.escape(label)}</a></p>'
            '<p style="margin:0 0 14px;font-size:12px;color:#64748b">Düğme çalışmazsa bu adresi tarayıcına yapıştır:<br>'
            f'{html.escape(url)}</p>'
        )
    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">'
        f'<h2 style="margin:0 0 18px;font-size:20px">{html.escape(title)}</h2>{body}'
        '<p style="margin:28px 0 0;font-size:12px;color:#94a3b8">GoMufi</p></div>'
    )
    return "\n".join(text_parts), html_body


def _send_smtp(mail: Mail) -> None:
    msg = EmailMessage()
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = mail.to
    msg["Subject"] = mail.subject
    msg.set_content(mail.text)
    msg.add_alternative(mail.html, subtype="html")
    context = ssl.create_default_context()
    if settings.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=15) as smtp:
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls(context=context)
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)


async def send_email(to: str, subject: str, text: str, html_body: str) -> bool:
    """Tek alıcıya gönderir; başarılıysa True. Hata fırlatmaz."""
    to = (to or "").strip()
    if not to or "@" not in to:
        return False
    mail = Mail(to=to, subject=subject, text=text, html=html_body)
    kind = provider()
    try:
        if kind == "resend":
            async with httpx.AsyncClient(timeout=15) as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                    json={"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "text": text, "html": html_body},
                )
                res.raise_for_status()
        elif kind == "smtp":
            await asyncio.to_thread(_send_smtp, mail)
        else:
            outbox.append(mail)
            del outbox[:-OUTBOX_LIMIT]
            # Gövdede şifre sıfırlama linki olabilir; canlı ortam loguna yazılmaz.
            logger.info("E-posta sağlayıcısı yok; gönderilmedi → %s | %s%s", _masked(to), subject,
                        "" if settings.IS_PRODUCTION else f"\n{text}")
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("E-posta gönderilemedi (%s → %s): %s", kind, _masked(to), exc)
        return False


def _masked(address: str) -> str:
    """Canlı ortam loglarında e-posta adresi açık yazılmaz (KVKK): ece.yilmaz@okul.k12.tr → e***@okul.k12.tr"""
    if not settings.IS_PRODUCTION or "@" not in address:
        return address
    local, domain = address.split("@", 1)
    return f"{local[:1]}***@{domain}"


async def send_many(recipients: Sequence[str], subject: str, text: str, html_body: str) -> int:
    """Her alıcıya ayrı e-posta (adresler birbirini görmesin). Gönderilen sayısını döner."""
    sent = 0
    for to in dict.fromkeys(r.strip().lower() for r in recipients if r):
        if await send_email(to, subject, text, html_body):
            sent += 1
    return sent
