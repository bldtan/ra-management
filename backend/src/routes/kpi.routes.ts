import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as svc from '../services/kpi.service.js';

const router = Router();
router.use(authenticate);

router.get(
  '/personal',
  asyncHandler(async (req, res) => {
    res.json(
      await svc.personalKpi(req.user!.id, req.query.from as string, req.query.to as string),
    );
  }),
);

router.get(
  '/team',
  requireRole('LEGAL_HEAD'),
  asyncHandler(async (req, res) => {
    res.json(await svc.teamKpi(req.query.from as string, req.query.to as string));
  }),
);

export default router;
