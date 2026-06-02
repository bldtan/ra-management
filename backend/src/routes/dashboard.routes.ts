import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate } from '../middleware/auth.js';
import * as svc from '../services/dashboard.service.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await svc.summary(req.user!.id));
  }),
);

export default router;
