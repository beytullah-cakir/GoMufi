FROM python:3.10

WORKDIR /app

COPY requirements.txt . 

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Portu 8000'den Railway'in atadığı $PORT değişkenine çekiyoruz
CMD ["sh", "-c", "uvicorn main_fastapi:app --host 0.0.0.0 --port ${PORT:-8000}"]

