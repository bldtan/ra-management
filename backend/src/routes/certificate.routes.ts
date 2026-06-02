import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import * as svc from '../services/certificate.service.js';

const router = Router();
router.use(authenticate);
const writeRoles = requireRole('LEGAL_HEAD', 'RA_STAFF');

const nu = <T extends z.ZodTypeAny>(s: T) =>
  s.nullable().optional().transform((v) => v ?? undefined);

const metadataSchema = z.object({
  documentNumber: nu(z.string()),
  issuedDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  notes: nu(z.string()),
  hasHardcopy: z.boolean().optional(),
  hasOriginal: z.boolean().optional(),
  hardcopyReceivedDate: z.string().nullable().optional(),
  originalReceivedDate: z.string().nullable().optional(),
  hardcopyNotes: nu(z.string()),
});

const classMetadataSchema = metadataSchema.extend({
  classificationNumber: nu(z.string()),
});

// Registration Certificate routes
router.post(
  '/registration/:productRegistrationId',
  writeRoles,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'File required' });
      return;
    }
    const taskId = req.body.taskId as string | undefined;
    const meta = metadataSchema.parse({
      documentNumber: req.body.documentNumber,
      issuedDate: req.body.issuedDate || null,
      expiryDate: req.body.expiryDate || null,
      notes: req.body.notes,
    });
    const result = await svc.uploadCertificate(
      req.params.productRegistrationId,
      taskId ?? null,
      { name: req.file.originalname, path: req.file.path, size: req.file.size },
      meta,
      req.user!.id,
    );
    res.status(201).json(result);
  }),
);

router.get(
  '/registration/:productRegistrationId/history',
  asyncHandler(async (req, res) => {
    res.json(await svc.getCertificateHistory(req.params.productRegistrationId));
  }),
);

router.put(
  '/:certId/metadata',
  writeRoles,
  asyncHandler(async (req, res) => {
    const d = metadataSchema.parse(req.body);
    res.json(await svc.updateCertificateMetadata(req.params.certId, d));
  }),
);

// Classification Result routes
router.post(
  '/classification/:productId',
  writeRoles,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'File required' });
      return;
    }
    const taskId = req.body.taskId as string | undefined;
    const meta = classMetadataSchema.parse({
      documentNumber: req.body.documentNumber,
      classificationNumber: req.body.classificationNumber,
      issuedDate: req.body.issuedDate || null,
      expiryDate: req.body.expiryDate || null,
      notes: req.body.notes,
    });
    const result = await svc.uploadClassification(
      req.params.productId,
      taskId ?? null,
      { name: req.file.originalname, path: req.file.path, size: req.file.size },
      meta,
      req.user!.id,
    );
    res.status(201).json(result);
  }),
);

router.get(
  '/classification/:productId/history',
  asyncHandler(async (req, res) => {
    res.json(await svc.getClassificationHistory(req.params.productId));
  }),
);

router.put(
  '/classification/:classId/metadata',
  writeRoles,
  asyncHandler(async (req, res) => {
    const d = classMetadataSchema.parse(req.body);
    res.json(await svc.updateClassificationMetadata(req.params.classId, d));
  }),
);

export default router;
