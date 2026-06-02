import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as svc from '../services/plant.service.js';

const router = Router();
router.use(authenticate);
const writeRoles = requireRole('LEGAL_HEAD', 'RA_STAFF');

const schema = z.object({
  manufacturerId: z.string().min(1),
  plantName: z.string().min(1),
  country: z.string().optional(),
  address: z.string().optional(),
  iso13485CertNo: z.string().optional(),
  iso13485Expiry: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await svc.list(req.query.manufacturerId as string | undefined));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await svc.getById(req.params.id));
  }),
);

router.post(
  '/',
  writeRoles,
  asyncHandler(async (req, res) => {
    res.status(201).json(await svc.create(schema.parse(req.body)));
  }),
);

router.put(
  '/:id',
  writeRoles,
  asyncHandler(async (req, res) => {
    res.json(await svc.update(req.params.id, schema.partial().parse(req.body)));
  }),
);

router.delete(
  '/:id',
  requireRole('LEGAL_HEAD'),
  asyncHandler(async (req, res) => {
    res.json(await svc.remove(req.params.id));
  }),
);

export default router;
