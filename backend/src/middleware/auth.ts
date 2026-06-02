import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import { unauthorized, forbidden } from '../lib/http.js';
import type { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface JwtPayload {
  sub: string;
  role: Role;
}

export function signToken(userId: string, role: Role): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: userId, role } as JwtPayload, env.JWT_SECRET, options);
}

// Verifies JWT cookie, loads user, refreshes cookie expiry on every call.
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.ra_token;
    if (!token) return next(unauthorized('Not authenticated'));

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      return next(unauthorized('Invalid or expired session'));
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) return next(unauthorized('Account inactive'));

    req.user = { id: user.id, email: user.email, role: user.role, fullName: user.fullName };

    // Refresh cookie on every authenticated request (sliding 24h).
    res.cookie('ra_token', signToken(user.id, user.role), {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    next();
  } catch (e) {
    next(e);
  }
}

// Role guard — use on every protected route. Pass one or more allowed roles.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden('Insufficient role'));
    next();
  };
}
