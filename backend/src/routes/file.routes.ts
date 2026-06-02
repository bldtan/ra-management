import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate } from '../middleware/auth.js';
import { uploadDir } from '../middleware/upload.js';
import { prisma } from '../lib/prisma.js';
import { notFound, forbidden } from '../lib/http.js';

const router = Router();
router.use(authenticate);

async function resolveFile(documentId: string, source: string): Promise<{
  filePath: string;
  fileName: string;
  mfgId: string | null;
}> {
  if (source === 'registration') {
    const cert = await prisma.registrationCertificateHistory.findUnique({
      where: { id: documentId },
      include: {
        productRegistration: {
          include: { product: { select: { manufacturerId: true } } },
        },
      },
    });
    if (!cert) throw notFound('Certificate not found');
    return {
      filePath: cert.filePath,
      fileName: cert.fileName,
      mfgId: cert.productRegistration.product.manufacturerId,
    };
  }

  if (source === 'classification') {
    const cls = await prisma.classificationResultHistory.findUnique({
      where: { id: documentId },
      include: { product: { select: { manufacturerId: true } } },
    });
    if (!cls) throw notFound('Classification not found');
    return {
      filePath: cls.filePath,
      fileName: cls.fileName,
      mfgId: cls.product.manufacturerId,
    };
  }

  // Default: task document
  const doc = await prisma.registrationDocument.findUnique({
    where: { id: documentId },
    include: {
      task: {
        include: {
          productRegistration: {
            include: { product: { select: { manufacturerId: true } } },
          },
        },
      },
    },
  });
  if (!doc) throw notFound('Document not found');
  return {
    filePath: doc.filePath ?? '',
    fileName: doc.fileName ?? documentId,
    mfgId: doc.task?.productRegistration?.product.manufacturerId ?? null,
  };
}

async function checkViewerPermission(userId: string, mfgId: string | null, requireDownload = false) {
  if (!mfgId) throw forbidden('Not permitted');
  const perm = await prisma.viewerManufacturerPermission.findUnique({
    where: { userId_manufacturerId: { userId, manufacturerId: mfgId } },
  });
  if (!perm?.canViewDocuments) throw forbidden('View not permitted');
  if (requireDownload && !perm.canDownloadDocuments) throw forbidden('Download not permitted');
}

router.get(
  '/preview/:documentId',
  asyncHandler(async (req, res) => {
    const source = (req.query.source as string) || 'task';
    const { filePath, fileName, mfgId } = await resolveFile(req.params.documentId, source);

    if (req.user!.role === 'VIEWER') {
      await checkViewerPermission(req.user!.id, mfgId, false);
    }

    const absPath = path.isAbsolute(filePath) ? filePath : path.join(uploadDir, filePath);
    if (!fs.existsSync(absPath)) throw notFound('File not found on disk');

    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(absPath);
  }),
);

router.get(
  '/download/:documentId',
  asyncHandler(async (req, res) => {
    const source = (req.query.source as string) || 'task';
    const { filePath, fileName, mfgId } = await resolveFile(req.params.documentId, source);

    if (req.user!.role === 'VIEWER') {
      await checkViewerPermission(req.user!.id, mfgId, true);
    }

    const absPath = path.isAbsolute(filePath) ? filePath : path.join(uploadDir, filePath);
    if (!fs.existsSync(absPath)) throw notFound('File not found on disk');

    res.download(absPath, fileName);
  }),
);

// Legacy direct filename route (backward compat)
router.get(
  '/:filename',
  asyncHandler(async (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) throw notFound('File not found');

    if (req.user!.role === 'VIEWER') {
      const doc = await prisma.registrationDocument.findFirst({
        where: { filePath: filename },
        include: {
          task: {
            include: {
              productRegistration: {
                include: { product: { select: { manufacturerId: true } } },
              },
            },
          },
        },
      });
      const mfgId = doc?.task?.productRegistration?.product.manufacturerId ?? null;
      await checkViewerPermission(req.user!.id, mfgId, true);
    }

    const doc = await prisma.registrationDocument.findFirst({ where: { filePath: filename } });
    res.download(filePath, doc?.fileName ?? filename);
  }),
);

export default router;
