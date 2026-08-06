import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const config = {
  SECRET_KEY: optional('SECRET_KEY', 'gomufi-dev-secret-key-change-in-prod'),
  ALGORITHM: 'HS256',
  ACCESS_TOKEN_EXPIRE_MINUTES: parseInt(optional('ACCESS_TOKEN_EXPIRE_MINUTES', '1440')),
  REFRESH_TOKEN_EXPIRE_DAYS: parseInt(optional('REFRESH_TOKEN_EXPIRE_DAYS', '7')),

  ADMIN_EMAIL: optional('ADMIN_EMAIL', 'admin@gomufi.com'),
  ADMIN_PASSWORD: optional('ADMIN_PASSWORD', 'admin123'),

  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET'),

  IYZICO_API_KEY: optional('IYZICO_API_KEY'),
  IYZICO_SECRET_KEY: optional('IYZICO_SECRET_KEY'),
  IYZICO_BASE_URL: optional('IYZICO_BASE_URL', 'https://sandbox-api.iyzipay.com'),

  MY_API_KEY: optional('MY_API_KEY'), // Gemini AI API key

  JITSI_APP_ID: optional('JITSI_APP_ID', 'gomufi'),
  JITSI_APP_SECRET: optional('JITSI_APP_SECRET'),
  JITSI_API_KEY: optional('JITSI_API_KEY'),
  JITSI_DOMAIN: optional('JITSI_DOMAIN', '8x8.vc'),

  DATABASE_URL: optional('DATABASE_URL'),

  // ─── Upstash Redis (HTTP/REST) ──────────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: optional('UPSTASH_REDIS_REST_URL'),
  UPSTASH_REDIS_REST_TOKEN: optional('UPSTASH_REDIS_REST_TOKEN'),

  BACKEND_URL: (
    process.env['RENDER_EXTERNAL_URL'] ??
    process.env['BACKEND_URL'] ??
    'http://localhost:8000'
  ),

  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:5173'),

  get IS_PRODUCTION(): boolean {
    return (
      !!this.FRONTEND_URL &&
      !this.FRONTEND_URL.includes('localhost') &&
      this.FRONTEND_URL.startsWith('https')
    );
  },

  PORT: parseInt(optional('PORT', '8000')),
};
