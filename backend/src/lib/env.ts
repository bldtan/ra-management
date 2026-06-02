import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load root .env first, then backend/.env (backend overrides if present).
const rootEnv = path.resolve(process.cwd(), '..', '.env');
const localEnv = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnv)) dotenv.config({ path: rootEnv });
if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv, override: true });

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET', 'ra-management-jwt-secret-change-in-production'),
  JWT_EXPIRES_IN: required('JWT_EXPIRES_IN', '24h'),
  BACKEND_PORT: parseInt(required('BACKEND_PORT', '3101'), 10),
  FRONTEND_PORT: parseInt(required('FRONTEND_PORT', '5174'), 10),
  UPLOAD_MAX_SIZE_MB: parseInt(required('UPLOAD_MAX_SIZE_MB', '100'), 10),
  UPLOAD_DIR: required('UPLOAD_DIR', './uploads'),
  NODE_ENV: required('NODE_ENV', 'development'),
};
