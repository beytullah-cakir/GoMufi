import { Router } from 'express';
import { Issuer, generators, Client } from 'openid-client';
import prisma from '../db/prisma';
import { config } from '../config';
import { createAccessToken, setAuthCookie, clearAuthCookie } from '../core/auth';
import { redis, isRedisConfigured } from '../core/redis';

const router = Router();

const OAUTH_STATE_TTL = 600; // 10 dakika

// ─── OAuth State Yardımcıları (Redis veya Bellek) ────────────────────────────

async function saveOAuthState(state: string, data: { nonce: string; role: string }): Promise<void> {
  if (isRedisConfigured) {
    await redis.set(`oauth:state:${state}`, JSON.stringify(data), { ex: OAUTH_STATE_TTL });
  } else {
    // Redis yoksa bellek fallback (tek instance için geçerli)
    oauthStateStore.set(state, { ...data, createdAt: Date.now() });
  }
}

async function getOAuthState(state: string): Promise<{ nonce: string; role: string } | null> {
  if (isRedisConfigured) {
    const raw = await redis.get<any>(`oauth:state:${state}`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
  const entry = oauthStateStore.get(state);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > OAUTH_STATE_TTL * 1000) {
    oauthStateStore.delete(state);
    return null;
  }
  return { nonce: entry.nonce, role: entry.role };
}

async function deleteOAuthState(state: string): Promise<void> {
  if (isRedisConfigured) {
    await redis.del(`oauth:state:${state}`);
  } else {
    oauthStateStore.delete(state);
  }
}

// Bellek fallback store (Redis yoksa)
const oauthStateStore = new Map<string, { nonce: string; role: string; createdAt: number }>();

// ─── Google OAuth Client ──────────────────────────────────────────────────────

let googleClient: Client | null = null;

async function getGoogleClient(): Promise<Client> {
  if (!googleClient) {
    const issuer = await Issuer.discover('https://accounts.google.com');
    googleClient = new issuer.Client({
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      redirect_uris: [],
      response_types: ['code'],
    });
  }
  return googleClient;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get(['/auth/google/login', '/login'], async (req, res) => {
  try {
    const role = req.query.role as string;
    if (!['student', 'teacher', 'parent'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const state = generators.state();
    const nonce = generators.nonce();

    // State'i Redis'e kaydet (TTL: 10 dakika)
    await saveOAuthState(state, { nonce, role });

    const redirect_uri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    const client = await getGoogleClient();

    const authUrl = client.authorizationUrl({
      redirect_uri,
      scope: 'openid email profile',
      state,
      nonce,
    });

    res.redirect(authUrl);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to initiate login' });
  }
});

router.get(['/auth/google/callback', '/callback'], async (req, res) => {
  try {
    const incomingState = req.query.state as string;

    // State'i Redis'ten al ve doğrula
    const stateData = await getOAuthState(incomingState);
    if (!stateData) {
      return res.status(400).json({ detail: 'OAuth State mismatch veya süresi dolmuş — CSRF koruması' });
    }

    const { nonce: oauth_nonce, role: oauth_role } = stateData;

    const redirect_uri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    const client = await getGoogleClient();

    const params = client.callbackParams(req);
    const tokenSet = await client.callback(redirect_uri, params, {
      state: incomingState,
      nonce: oauth_nonce,
    });

    const userinfo = tokenSet.claims();
    const email = userinfo.email as string;
    const name = userinfo.name as string;
    const given_name = userinfo.given_name as string;
    const family_name = userinfo.family_name as string;

    let isIncomplete = false;
    let userIdStr = '';

    if (oauth_role === 'student') {
      let student = await prisma.student.findUnique({ where: { email } });
      if (!student) {
        student = await prisma.student.create({
          data: {
            email,
            nickname: name,
            first_name: given_name || name,
            last_name: family_name || '',
          }
        });
        isIncomplete = true;
      } else {
        if (student.grade_level === 'Unknown' || student.education_level === 'Unknown') {
          isIncomplete = true;
        }
      }
      userIdStr = student.id.toString();
    } else if (oauth_role === 'teacher') {
      let teacher = await prisma.teacher.findUnique({ where: { email } });
      if (!teacher) {
        teacher = await prisma.teacher.create({
          data: {
            email,
            first_name: given_name || name,
            last_name: family_name || '',
          }
        });
        isIncomplete = true;
      }
      userIdStr = teacher.id.toString();
    } else if (oauth_role === 'parent') {
      let parent = await prisma.parent.findUnique({ where: { email } });
      if (!parent) {
        parent = await prisma.parent.create({
          data: {
            email,
            first_name: given_name || name,
            last_name: family_name || '',
          }
        });
      }
      userIdStr = parent.id.toString();
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const token = createAccessToken(userIdStr, oauth_role);
    setAuthCookie(res, token);

    // State'i Redis'ten temizle
    await deleteOAuthState(incomingState);

    if (isIncomplete && oauth_role !== 'parent') {
      res.redirect(`${config.FRONTEND_URL}/complete-profile?token=${token}`);
    } else if (oauth_role === 'teacher') {
      res.redirect(`${config.FRONTEND_URL}/instructor?token=${token}`);
    } else if (oauth_role === 'student') {
      res.redirect(`${config.FRONTEND_URL}/student?token=${token}`);
    } else if (oauth_role === 'parent') {
      res.redirect(`${config.FRONTEND_URL}/parent?token=${token}`);
    }

  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Failed to handle callback' });
  }
});

router.post(['/auth/logout', '/logout'], (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Successfully logged out' });
});

export default router;

