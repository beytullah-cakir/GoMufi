import { Request, Response, NextFunction } from 'express';
import { getTokenFromRequest, verifyToken, JwtPayload } from '../core/auth';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ detail: 'Not authenticated' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ detail: 'Token expired' });
    } else {
      res.status(401).json({ detail: 'Invalid token' });
    }
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ detail: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ detail: `Role ${req.user.role} is not authorized. Required: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}
