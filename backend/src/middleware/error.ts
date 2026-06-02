import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../lib/http.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  if (err instanceof ZodError) {
    const first = err.errors[0];
    return res.status(400).json({
      error: first ? `${first.path.join('.')}: ${first.message}` : 'Validation error',
      code: 'VALIDATION_ERROR',
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A record with this unique value already exists', code: 'DUPLICATE' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found', code: 'NOT_FOUND' });
    }
  }
  console.error('[error]', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  return res.status(500).json({ error: message, code: 'INTERNAL' });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
}
