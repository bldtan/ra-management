import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { badRequest } from '../lib/http.js';
import * as svc from '../services/import.service.js';

const router = Router();
router.use(authenticate);
const writeRoles = requireRole('LEGAL_HEAD', 'RA_STAFF');

// In-memory upload for Excel parsing — no need to persist import files to disk.
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const typeSchema = z.enum(['NEW_PRODUCTS', 'LEGACY_PRODUCTS']);

// Step 1 — upload + preview (no DB writes).
router.post(
  '/preview',
  writeRoles,
  memUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No file uploaded');
    const importType = typeSchema.parse(req.body.importType);
    const rows = svc.buildPreview(req.file.buffer, importType);
    res.json({ fileName: req.file.originalname, rows });
  }),
);

// Step 2 — confirm import with the (possibly edited) row selection.
router.post(
  '/confirm',
  writeRoles,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        importType: typeSchema,
        fileName: z.string(),
        rows: z.array(z.any()),
      })
      .parse(req.body);
    res.json(
      await svc.confirmImport(
        body.rows as svc.PreviewRow[],
        body.importType,
        req.user!.id,
        body.fileName,
      ),
    );
  }),
);

// Template downloads
router.get(
  '/template/new-products',
  asyncHandler(async (_req, res) => {
    const headers = [
      'Manufacturer Product Code',
      'Product Name EN',
      'Product Name VN',
      'Manufacturer',
      'Manufacturing Plant',
      'Country of Origin',
      'License Holder',
      'Risk Class',
      'Product Type',
      'Commercial Status',
      'ERP Product Code',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'New Products');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="RA_Import_NewProducts.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  }),
);

router.get(
  '/template/legacy-products',
  asyncHandler(async (_req, res) => {
    const headers = [
      'Manufacturer Product Code',
      'Product Name EN',
      'Product Name VN',
      'Manufacturer',
      'Manufacturing Plant',
      'Country of Origin',
      'License Holder',
      'Risk Class',
      'Product Type',
      'Commercial Status',
      'ERP Product Code',
      'Số ĐKLH',
      'Classification Number',
      'Ownership Type',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Legacy Products');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="RA_Import_LegacyProducts.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  }),
);

export default router;
