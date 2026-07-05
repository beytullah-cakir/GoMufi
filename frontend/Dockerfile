
FROM node:22-alpine

WORKDIR /app

# Bağımlılıkları önce kopyala — katman cache'ini etkin kullan
COPY package*.json ./

# npm ci: package-lock.json'a bağlı, tekrarlanabilir, daha hızlı
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
