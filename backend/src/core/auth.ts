import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Request, Response } from 'express';

export interface JwtPayload {
  sub: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export function createAccessToken(userId: string, role: string): string {
  return jwt.sign(
    { sub: userId, role, type: 'access' },
    config.SECRET_KEY,
    { expiresIn: `${config.ACCESS_TOKEN_EXPIRE_MINUTES}m` }
  );
}

export function createRefreshToken(userId: string, role: string): string {
  return jwt.sign(
    { sub: userId, role, type: 'refresh' },
    config.SECRET_KEY,
    { expiresIn: `${config.REFRESH_TOKEN_EXPIRE_DAYS}d` }
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.SECRET_KEY) as JwtPayload;
}

export function getTokenFromRequest(req: Request): string | null {
  // 1. HTTP-only cookie
  const cookieToken = req.cookies?.access_token;
  if (cookieToken) return cookieToken;

  // 2. Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return authHeader;
  }

  // 3. Query parameter (?token=...)
  if (req.query?.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: config.IS_PRODUCTION,
    sameSite: config.IS_PRODUCTION ? 'none' : 'lax',
    maxAge: config.ACCESS_TOKEN_EXPIRE_MINUTES * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: config.IS_PRODUCTION,
    sameSite: config.IS_PRODUCTION ? 'none' : 'lax',
    path: '/',
  });
}
