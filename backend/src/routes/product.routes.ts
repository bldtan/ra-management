import { Router } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as svc from '../services/product.service.js';
import * as regSvc from '../services/product-registration.service.js';

const router = Router();
router.use(authenticate);
const writeRoles = requireRole('LEGAL_HEAD', 'RA_STAFF');

const nullToUndef = <T extends z.ZodTypeAny>(s: T) =>
  s.nullable().optional().transform((v) => v ?? undefined);

const PRODUCT_TYPES = ['MEDICAL_DEVICE', 'BIOCIDE', 'COSMETIC', 'SPARE_PARTS_ACCESSORIES', 'GENERAL_GOODS'] as const;
const COMMERCIAL_STATUSES = ['ACTIVE', 'INACTIVE_LICENSE_PENDING', 'INACTIVE_LICENSE_REVOKED'] as const;

const productSchema = z.object({
  manufacturerProductCode: z.string().min(1),
  productNameEn: z.string().min(1),
  productNameVn: z.string().min(1),
  manufacturerId: z.string().min(1),
  riskClass: nullToUndef(z.enum(['A', 'B', 'C', 'D', 'NA', 'PENDING'])),
  productType: z.enum(PRODUCT_TYPES).nullable().optional(),
  commercialStatus: z.enum(COMMERCIAL_STATUSES).nullable().optional(),
  erpProductCode: nullToUndef(z.string()),
  plantIds: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  licenseHolderIds: z.array(z.string()).optional(),
});

const registrationSchema = z.object({
  licenseHolderId: z.string().min(1),
  ownershipType: z.enum(['VMED_OWNED', 'MONITORED']),
  registrationNo: nullToUndef(z.string()),
  registrationExpiry: nullToUndef(z.string()),
  approvalDate: nullToUndef(z.string()),
  applicationNo: nullToUndef(z.string()),
  classificationNumber: nullToUndef(z.string()),
  commercialStatus: z.enum(['ACTIVE', 'INACTIVE_LICENSE_PENDING', 'INACTIVE_LICENSE_REVOKED']).optional(),
  workflowStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'REGISTERED', 'EXPIRED']).optional(),
  notes: nullToUndef(z.string()),
});

router.get(
  '/export',
  requireRole('LEGAL_HEAD', 'RA_STAFF'),
  asyncHandler(async (req, res) => {
    const rows = await svc.exportData({
      manufacturerId: req.query.manufacturerId as string,
      licenseHolderId: req.query.licenseHolderId as string,
      riskClass: req.query.riskClass as string,
      commercialStatus: req.query.commercialStatus as string,
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="products_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(
      await svc.list({
        search: req.query.search as string,
        manufacturerId: req.query.manufacturerId as string,
        riskClass: req.query.riskClass as string,
        licenseHolderId: req.query.licenseHolderId as string,
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

router.get(
  '/:id/duplicate-template',
  asyncHandler(async (req, res) => {
    res.json(await svc.duplicateTemplate(req.params.id));
  }),
);

router.get(
  '/:id/registrations',
  asyncHandler(async (req, res) => {
    res.json(await svc.getRegistrations(req.params.id));
  }),
);

router.post(
  '/',
  writeRoles,
  asyncHandler(async (req, res) => {
    const d = productSchema.parse(req.body);
    res.status(201).json(await svc.create({
      ...d,
      productType: d.productType ?? undefined,
      commercialStatus: d.commercialStatus ?? undefined,
    }));
  }),
);

router.put(
  '/:id',
  writeRoles,
  asyncHandler(async (req, res) => {
    const d = productSchema.partial().parse(req.body);
    res.json(await svc.update(req.params.id, d));
  }),
);

router.delete(
  '/:id',
  requireRole('LEGAL_HEAD'),
  asyncHandler(async (req, res) => {
    res.json(await svc.remove(req.params.id));
  }),
);

// ProductRegistration sub-routes
router.post(
  '/:id/registrations',
  writeRoles,
  asyncHandler(async (req, res) => {
    const d = registrationSchema.parse(req.body);
    res.status(201).json(await regSvc.create({ productId: req.params.id, ...d }));
  }),
);

router.put(
  '/registrations/:regId',
  writeRoles,
  asyncHandler(async (req, res) => {
    const d = registrationSchema.partial().parse(req.body);
    res.json(await regSvc.update(req.params.regId, d));
  }),
);

router.delete(
  '/registrations/:regId',
  requireRole('LEGAL_HEAD'),
  asyncHandler(async (req, res) => {
    res.json(await regSvc.remove(req.params.regId));
  }),
);

export default router;
