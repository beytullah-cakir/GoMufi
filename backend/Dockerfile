FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source
COPY . .

# Copy static assets from sibling directory (slide_templates.json etc)
# These will be mounted as volumes in development

# Build TypeScript
RUN npm run build

# Create static uploads directory
RUN mkdir -p static/uploads/images

EXPOSE 8000

CMD ["npm", "start"]
