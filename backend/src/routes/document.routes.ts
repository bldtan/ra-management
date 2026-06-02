import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import * as svc from '../services/document.service.js';
import * as userSvc from '../services/user.service.js';

const router = Router();
router.use(authenticate);
const writeRoles = requireRole('LEGAL_HEAD', 'RA_STAFF');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    let allowed: string[] | null = null;
    if (req.user!.role === 'VIEWER') {
      allowed = await userSvc.viewerAllowedManufacturerIds(req.user!.id);
    }
    res.json(
      await svc.list({
        documentType: req.query.documentType as string,
        status: req.query.status as string,
        manufacturerId: req.query.manufacturerId as string,
        source: req.query.source as string,
        hardcopyStatus: req.query.hardcopyStatus as string,
        originalStatus: req.query.originalStatus as string,
        versionFilter: req.query.versionFilter as string,
        search: req.query.search as string,
        allowedManufacturerIds: allowed,
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
  taskId: z.string().optional(),
  documentType: z.string().min(1),
  documentNumber: z.string().optional(),
  appliesTo: z.enum(['ENTIRE_CASE', 'SPECIFIC_PRODUCTS']).optional(),
  productIds: z.array(z.string()).optional(),
  issuedDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  status: z.enum(['MISSING', 'COLLECTED', 'ACCEPTED', 'NEED_UPDATE', 'EXPIRED']).optional(),
  hasHardcopy: z.boolean().optional(),
  hasOriginal: z.boolean().optional(),
  hardcopyReceivedDate: z.string().nullable().optional(),
  originalReceivedDate: z.string().nullable().optional(),
  hardcopyNotes: z.string().optional(),
  notes: z.string().optional(),
});

router.post(
  '/',
  writeRoles,
  upload.array('files', 20),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse({
      ...req.body,
      productIds: req.body.productIds ? JSON.parse(req.body.productIds) : undefined,
      hasHardcopy: req.body.hasHardcopy === 'true',
      hasOriginal: req.body.hasOriginal === 'true',
    });
    const files = (req.files as Express.Multer.File[]) ?? [];
    const created = [];
    if (files.length === 0) {
      created.push(
        await svc.create({
          ...body,
          documentType: body.documentType as never,
          uploadedById: req.user!.id,
        }),
      );
    } else {
      for (const f of files) {
        created.push(
          await svc.create({
            ...body,
            documentType: body.documentType as never,
            fileName: f.originalname,
            filePath: f.path,
            fileSize: f.size,
            uploadedById: req.user!.id,
          }),
        );
      }
    }
    res.status(201).json(created);
  }),
);

const updateSchema = z.object({
  documentType: z.enum(['APPLICATION_LETTER','LETTER_OF_AUTHORIZATION','WARRANTY_CONFIRMATION','CERTIFICATE_OF_FREE_SALE','ISO_13485','VIETNAMESE_TECHNICAL_DOCUMENT','CATALOGUE','PRODUCT_STANDARD_DOC','IFU_ENGLISH','IFU_VIETNAMESE','VIETNAMESE_LABEL','CSDT_DOSSIER','CE_MDR_FDA','OTHER_DOCUMENTS']).optional(),
  documentNumber: z.string().nullable().optional(),
  issuedDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  status: z.enum(['MISSING', 'COLLECTED', 'ACCEPTED', 'NEED_UPDATE', 'EXPIRED']).optional(),
  hasHardcopy: z.boolean().optional(),
  hasOriginal: z.boolean().optional(),
  hardcopyReceivedDate: z.string().nullable().optional(),
  originalReceivedDate: z.string().nullable().optional(),
  hardcopyNotes: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.put(
  '/:id',
  writeRoles,
  asyncHandler(async (req, res) => {
    const d = updateSchema.parse(req.body);
    res.json(await svc.update(req.params.id, d));
  }),
);

router.delete(
  '/:id',
  writeRoles,
  asyncHandler(async (req, res) => {
    res.json(await svc.remove(req.params.id));
  }),
);

export default router;
