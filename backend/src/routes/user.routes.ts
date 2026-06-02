import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as svc from '../services/user.service.js';

const router = Router();
router.use(authenticate);

// Dropdown list — available to any authenticated staff/head.
router.get(
  '/selectable',
  asyncHandler(async (_req, res) => {
    res.json(await svc.selectable());
  }),
);

// Everything below is Legal Head only (Settings module).
router.use(requireRole('LEGAL_HEAD'));

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await svc.list());
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const d = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(1),
        role: z.enum(['LEGAL_HEAD', 'RA_STAFF', 'VIEWER']),
      })
      .parse(req.body);
    res.status(201).json(await svc.create(d));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const d = z
      .object({
        fullName: z.string().optional(),
        role: z.enum(['LEGAL_HEAD', 'RA_STAFF', 'VIEWER']).optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(6).optional(),
      })
      .parse(req.body);
    res.json(await svc.update(req.params.id, d));
  }),
);

router.post(
  '/:id/deactivate',
  asyncHandler(async (req, res) => {
    res.json(await svc.deactivate(req.params.id));
  }),
);

router.get(
  '/:id/permissions',
  asyncHandler(async (req, res) => {
    res.json(await svc.getViewerPermissions(req.params.id));
  }),
);

router.put(
  '/:id/permissions',
  asyncHandler(async (req, res) => {
    const d = z
      .array(
        z.object({
          manufacturerId: z.string(),
          canViewProducts: z.boolean(),
          canViewDocuments: z.boolean(),
          canDownloadDocuments: z.boolean(),
          canViewKpi: z.boolean(),
        }),
      )
      .parse(req.body);
    res.json(await svc.setViewerPermissions(req.params.id, d));
  }),
);

export default router;

// Note: These routes are appended outside the requireRole('LEGAL_HEAD') block above.
// They rely on the router.use(requireRole('LEGAL_HEAD')) already set above.
router.get(
  '/:id/viewer-permissions/:manufacturerId/doc-types',
  asyncHandler(async (req, res) => {
    res.json(await svc.getViewerDocTypePermissions(req.params.id, req.params.manufacturerId));
  }),
);

router.put(
  '/:id/viewer-permissions/:manufacturerId/doc-types',
  asyncHandler(async (req, res) => {
    const d = z
      .array(z.object({ documentType: z.string(), canView: z.boolean() }))
      .parse(req.body);
    res.json(await svc.setViewerDocTypePermissions(req.params.id, req.params.manufacturerId, d));
  }),
);
