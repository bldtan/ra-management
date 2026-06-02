import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate } from '../middleware/auth.js';
import * as svc from '../services/notification.service.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    res.json({
      items: await svc.listForUser(req.user!.id, limit),
      unread: await svc.unreadCount(req.user!.id),
    });
  }),
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    res.json(await svc.markRead(req.params.id, req.user!.id));
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    res.json(await svc.markAllRead(req.user!.id));
  }),
);

export default router;
