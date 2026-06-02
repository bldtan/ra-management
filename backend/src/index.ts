import './lib/env.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './lib/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { scheduleDailyJob } from './jobs/daily-job.js';

import authRoutes from './routes/auth.routes.js';
import manufacturerRoutes from './routes/manufacturer.routes.js';
import plantRoutes from './routes/plant.routes.js';
import productRoutes from './routes/product.routes.js';
import taskRoutes from './routes/task.routes.js';
import documentRoutes from './routes/document.routes.js';
import fileRoutes from './routes/file.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import importRoutes from './routes/import.routes.js';
import kpiRoutes from './routes/kpi.routes.js';
import userRoutes from './routes/user.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();

// CORS: allow localhost (dev) + optional FRONTEND_URL env var (server deployment)
const allowedOrigins = [
  `http://localhost:${env.FRONTEND_PORT}`,
  'http://localhost:5174',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.get('/api/v1/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

const api = express.Router();
api.use('/auth', authRoutes);
api.use('/manufacturers', manufacturerRoutes);
api.use('/plants', plantRoutes);
api.use('/products', productRoutes);
api.use('/tasks', taskRoutes);
api.use('/documents', documentRoutes);
api.use('/files', fileRoutes);
api.use('/certificates', certificateRoutes);
api.use('/import', importRoutes);
api.use('/kpi', kpiRoutes);
api.use('/users', userRoutes);
api.use('/notifications', notificationRoutes);
api.use('/dashboard', dashboardRoutes);
app.use('/api/v1', api);

app.use(notFoundHandler);
app.use(errorHandler);

// Listen on all interfaces (0.0.0.0) so server deployments work
app.listen(env.BACKEND_PORT, '0.0.0.0', () => {
  console.log(`[server] RA Management API on http://0.0.0.0:${env.BACKEND_PORT}`);
  scheduleDailyJob();
});
