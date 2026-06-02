import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as svc from '../services/task.service.js';

const router = Router();
router.use(authenticate);
const writeRoles = requireRole('LEGAL_HEAD', 'RA_STAFF');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(
      await svc.list({
        status: req.query.status as string,
        priority: req.query.priority as string,
        manufacturerId: req.query.manufacturerId as string,
        licenseHolderId: req.query.licenseHolderId as string,
        ownershipType: req.query.ownershipType as string,
        search: req.query.search as string,
      }),
    );
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await svc.getById(req.params.id));
  }),
);

const createSchema = z.object({
  taskType: z.enum(['NEW_REGISTRATION', 'RENEWAL', 'CHANGE_NOTIFICATION', 'REVOCATION']),
  title: z.string().min(1),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional(),
  responsibleId: z.string().optional(),
  supervisorId: z.string().optional(),
  observerIds: z.array(z.string()).optional(),
  productRegistrationId: z.string().nullable().optional().transform((v) => v ?? undefined),
  targetDeadline: z.string().nullable().optional().transform((v) => v ?? undefined),
  remarks: z.string().optional(),
});

router.post(
  '/',
  writeRoles,
  asyncHandler(async (req, res) => {
    res.status(201).json(await svc.create(createSchema.parse(req.body)));
  }),
);

router.put(
  '/:id/general',
  writeRoles,
  asyncHandler(async (req, res) => {
    res.json(await svc.updateGeneral(req.params.id, createSchema.partial().parse(req.body)));
  }),
);

const caseSchema = z.object({
  caseNotes: z.string().optional(),
});

router.put(
  '/:id/case',
  writeRoles,
  asyncHandler(async (req, res) => {
    res.json(await svc.updateCase(req.params.id, caseSchema.parse(req.body)));
  }),
);

const submissionSchema = z.object({
  submissionDate: z.string().nullable().optional(),
  applicationNo: z.string().optional(),
  registrationNo: z.string().optional(),
  registrationExpiry: z.string().nullable().optional(),
  classificationNumber: z.string().optional(),
  approvalDate: z.string().nullable().optional(),
  completionNotes: z.string().optional(),
});

router.put(
  '/:id/submission',
  writeRoles,
  asyncHandler(async (req, res) => {
    res.json(await svc.updateSubmission(req.params.id, submissionSchema.parse(req.body)));
  }),
);

router.post(
  '/:id/status',
  writeRoles,
  asyncHandler(async (req, res) => {
    const { status, note } = z
      .object({
        status: z.enum([
          'NEW',
          'DOC_COLLECTION',
          'DOSSIER_PREP',
          'SUBMITTED',
          'REWORK_REQUIRED',
          'RESUBMITTED',
          'COMPLETED',
          'CANCELLED',
        ]),
        note: z.string().optional(),
      })
      .parse(req.body);
    res.json(await svc.changeStatus(req.params.id, status, req.user!, note));
  }),
);

router.post(
  '/:id/comments',
  writeRoles,
  asyncHandler(async (req, res) => {
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
    res.status(201).json(await svc.addComment(req.params.id, req.user!.id, content));
  }),
);

router.put(
  '/:id/products',
  writeRoles,
  asyncHandler(async (req, res) => {
    const { productIds } = z.object({ productIds: z.array(z.string()) }).parse(req.body);
    res.json(await svc.updateProducts(req.params.id, productIds));
  }),
);

router.put(
  '/comments/:commentId',
  writeRoles,
  asyncHandler(async (req, res) => {
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
    res.json(await svc.updateComment(req.params.commentId, req.user!.id, content));
  }),
);

router.delete(
  '/comments/:commentId',
  writeRoles,
  asyncHandler(async (req, res) => {
    res.json(await svc.deleteComment(req.params.commentId, req.user!));
  }),
);

export default router;
