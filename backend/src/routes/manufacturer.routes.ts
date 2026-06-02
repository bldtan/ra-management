import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as svc from '../services/manufacturer.service.js';

const router = Router();
router.use(authenticate);

const writeRoles = requireRole('LEGAL_HEAD', 'RA_STAFF');

const schema = z.object({
  name: z.string().min(1),
  shortName: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  duplicateCheckNotes: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await svc.list({ search: req.query.search as string, status: req.query.status as string }));
  }),
);

router.get(
  '/duplicates',
  asyncHandler(async (req, res) => {
    res.json(await svc.findDuplicates(String(req.query.name ?? ''), req.query.excludeId as string));
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
