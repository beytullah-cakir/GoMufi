FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Root olarak çalışmıyoruz: uygulamada bir açık bulunsa bile saldırgan
# konteynerin tamamını ele geçiremesin.
RUN useradd --create-home --uid 10001 gomufi && chown -R gomufi /app
USER gomufi

# Render.com $PORT env variable'ını atıyor (varsayılan: 10000)
EXPOSE ${PORT:-10000}

# Migration başarısız olsa bile sunucu açılır (eski davranış korunuyor: kısmi
# bir şema hatası bütün siteyi kapatmasın) ama hata loga AÇIKÇA yazılır.
CMD ["sh", "-c", "alembic upgrade head || echo 'UYARI: alembic migration BAŞARISIZ — şemayı kontrol et' >&2; exec uvicorn main_fastapi:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers"]
