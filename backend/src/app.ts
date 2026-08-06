import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { config } from './config';

// Routers
import studentAuthRouter from './routers/student-auth.router';
import teacherAuthRouter from './routers/teacher-auth.router';
import oauthRouter from './routers/oauth.router';
import profileRouter from './routers/profile.router';
import coursesRouter from './routers/courses.router';
import builderRouter from './routers/builder.router';
import paymentRouter from './routers/payment.router';
import quizRouter from './routers/quiz.router';
import jitsiRouter from './routers/jitsi.router';
import adminRouter from './routers/admin.router';
import aiRouter from './routers/ai.router';
import utilsRouter from './routers/utils.router';

const app = express();

// ─── Trust Proxy (Render / Railway) ──────────────────────────────────────────
app.set('trust proxy', 1);

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Session (for OAuth CSRF state) ──────────────────────────────────────────
app.use(
  session({
    secret: config.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    name: 'gomufi_session',
    cookie: {
      httpOnly: true,
      secure: config.IS_PRODUCTION,
      sameSite: config.IS_PRODUCTION ? 'none' : 'lax',
      maxAge: 3600 * 1000,
    },
  })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://www.gomufi.com',
  'https://gomufi.com',
  'https://go-mufi.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://0.0.0.0:5173',
];

if (config.FRONTEND_URL && !allowedOrigins.includes(config.FRONTEND_URL)) {
  allowedOrigins.push(config.FRONTEND_URL);
}
const renderUrl = process.env['RENDER_EXTERNAL_URL'];
if (renderUrl && !allowedOrigins.includes(renderUrl)) {
  allowedOrigins.push(renderUrl);
}

console.info(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow local network IPs
      if (/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      // Allow all Vercel deployments (*.vercel.app)
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// ─── Static files ─────────────────────────────────────────────────────────────
app.use('/static', express.static('static'));

// ─── Routers ──────────────────────────────────────────────────────────────────
app.use('/', studentAuthRouter);
app.use('/', teacherAuthRouter);
app.use('/', oauthRouter);
app.use('/profile', profileRouter);
app.use('/', coursesRouter);
app.use('/', builderRouter);
app.use('/', paymentRouter);
app.use('/', quizRouter);
app.use('/', jitsiRouter);
app.use('/admin', adminRouter);
app.use('/', aiRouter);
app.use('/', utilsRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ detail: 'Not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  const status = err.status ?? err.statusCode ?? 500;
  const detail = err.message ?? 'Internal server error';
  res.status(status).json({ detail });
});

export default app;
