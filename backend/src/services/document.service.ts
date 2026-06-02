import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/http.js';
import type { Prisma, DocumentType, DocumentStatus } from '@prisma/client';

const docInclude = {
  task: { select: { id: true, taskCode: true } },
  uploadedBy: { select: { id: true, fullName: true } },
  productLinks: { include: { product: { select: { id: true, manufacturerProductCode: true } } } },
} satisfies Prisma.RegistrationDocumentInclude;

export async function list(params: {
  documentType?: string;
  status?: string;
  manufacturerId?: string;
  source?: string; // task | registration | classification | all
  hardcopyStatus?: string; // has | missing
  originalStatus?: string; // has | missing
  versionFilter?: string; // current | all
  search?: string;
  allowedManufacturerIds?: string[] | null;
}) {
  const source = params.source ?? 'all';
  const results: Record<string, unknown>[] = [];

  // Source 1: RegistrationDocument (task docs)
  if (source === 'all' || source === 'task') {
    const where: Prisma.RegistrationDocumentWhereInput = {};
    if (params.documentType) where.documentType = params.documentType as DocumentType;
    if (params.status) where.status = params.status as DocumentStatus;
    if (params.hardcopyStatus === 'has') where.hasHardcopy = true;
    if (params.hardcopyStatus === 'missing') where.hasHardcopy = false;
    if (params.originalStatus === 'has') where.hasOriginal = true;
    if (params.originalStatus === 'missing') where.hasOriginal = false;
    if (params.search) {
      where.OR = [
        { documentNumber: { contains: params.search, mode: 'insensitive' } },
        { notes: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const docs = await prisma.registrationDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        ...docInclude,
        task: {
          select: {
            id: true,
            taskCode: true,
            productRegistration: {
              select: {
                product: { select: { manufacturerId: true, manufacturer: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
    });

    for (const d of docs) {
      const mfgId = d.task?.productRegistration?.product?.manufacturerId;
      if (params.manufacturerId && mfgId !== params.manufacturerId) continue;
      if (params.allowedManufacturerIds && (!mfgId || !params.allowedManufacturerIds.includes(mfgId))) continue;
      results.push({ ...d, _source: 'task', _version: 'N/A' });
    }
  }

  // Source 2: RegistrationCertificateHistory
  if (source === 'all' || source === 'registration') {
    const certWhere: Prisma.RegistrationCertificateHistoryWhereInput = {};
    if (params.status) certWhere.status = params.status as DocumentStatus;
    if (params.hardcopyStatus === 'has') certWhere.hasHardcopy = true;
    if (params.hardcopyStatus === 'missing') certWhere.hasHardcopy = false;
    if (params.originalStatus === 'has') certWhere.hasOriginal = true;
    if (params.originalStatus === 'missing') certWhere.hasOriginal = false;
    if (params.versionFilter === 'current') certWhere.isCurrent = true;
    if (params.search) {
      certWhere.OR = [
        { documentNumber: { contains: params.search, mode: 'insensitive' } },
        { notes: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const certs = await prisma.registrationCertificateHistory.findMany({
      where: certWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
        task: { select: { id: true, taskCode: true } },
        productRegistration: {
          select: {
            id: true,
            registrationNo: true,
            licenseHolder: { select: { id: true, name: true } },
            product: {
              select: {
                id: true,
                manufacturerProductCode: true,
                manufacturerId: true,
                manufacturer: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    for (const c of certs) {
      const mfgId = c.productRegistration.product.manufacturerId;
      if (params.manufacturerId && mfgId !== params.manufacturerId) continue;
      if (params.allowedManufacturerIds && !params.allowedManufacturerIds.includes(mfgId)) continue;
      results.push({
        ...c,
        documentType: 'REGISTRATION_CERTIFICATE',
        _source: 'registration',
        _version: c.isCurrent ? 'Current' : 'Historical',
        scope: `Registration ${c.productRegistration.registrationNo ?? c.productRegistration.id}`,
      });
    }
  }

  // Source 3: ClassificationResultHistory
  if (source === 'all' || source === 'classification') {
    const clsWhere: Prisma.ClassificationResultHistoryWhereInput = {};
    if (params.status) clsWhere.status = params.status as DocumentStatus;
    if (params.hardcopyStatus === 'has') clsWhere.hasHardcopy = true;
    if (params.hardcopyStatus === 'missing') clsWhere.hasHardcopy = false;
    if (params.originalStatus === 'has') clsWhere.hasOriginal = true;
    if (params.originalStatus === 'missing') clsWhere.hasOriginal = false;
    if (params.versionFilter === 'current') clsWhere.isCurrent = true;
    if (params.search) {
      clsWhere.OR = [
        { documentNumber: { contains: params.search, mode: 'insensitive' } },
        { classificationNumber: { contains: params.search, mode: 'insensitive' } },
        { notes: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const cls = await prisma.classificationResultHistory.findMany({
      where: clsWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
        task: { select: { id: true, taskCode: true } },
        product: {
          select: {
            id: true,
            manufacturerProductCode: true,
            manufacturerId: true,
            manufacturer: { select: { id: true, name: true } },
          },
        },
      },
    });

    for (const c of cls) {
      const mfgId = c.product.manufacturerId;
      if (params.manufacturerId && mfgId !== params.manufacturerId) continue;
      if (params.allowedManufacturerIds && !params.allowedManufacturerIds.includes(mfgId)) continue;
      results.push({
        ...c,
        documentType: 'CLASSIFICATION_RESULT',
        _source: 'classification',
        _version: c.isCurrent ? 'Current' : 'Historical',
        scope: `Product ${c.product.manufacturerProductCode}`,
      });
    }
  }

  // Sort combined by createdAt desc
  return results.sort((a, b) => {
    const aDate = new Date((a as { createdAt: string }).createdAt).getTime();
    const bDate = new Date((b as { createdAt: string }).createdAt).getTime();
    return bDate - aDate;
  });
}

export async function getById(id: string) {
  const d = await prisma.registrationDocument.findUnique({ where: { id }, include: docInclude });
  if (!d) throw notFound('Document not found');
  return d;
}

export async function create(data: {
  taskId?: string;
  documentType: DocumentType;
  documentNumber?: string;
  appliesTo?: 'ENTIRE_CASE' | 'SPECIFIC_PRODUCTS';
  productIds?: string[];
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  issuedDate?: string | null;
  expiryDate?: string | null;
  status?: DocumentStatus;
  hasHardcopy?: boolean;
  hasOriginal?: boolean;
  hardcopyReceivedDate?: string | null;
  originalReceivedDate?: string | null;
  hardcopyNotes?: string;
  notes?: string;
  uploadedById: string;
}) {
  return prisma.registrationDocument.create({
    data: {
      taskId: data.taskId,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      appliesTo: data.appliesTo ?? 'ENTIRE_CASE',
      fileName: data.fileName,
      filePath: data.filePath,
      fileSize: data.fileSize,
      issuedDate: data.issuedDate ? new Date(data.issuedDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      status: data.status ?? (data.fileName ? 'COLLECTED' : 'MISSING'),
      hasHardcopy: data.hasHardcopy ?? false,
      hasOriginal: data.hasOriginal ?? false,
      hardcopyReceivedDate: data.hardcopyReceivedDate ? new Date(data.hardcopyReceivedDate) : null,
      originalReceivedDate: data.originalReceivedDate ? new Date(data.originalReceivedDate) : null,
      hardcopyNotes: data.hardcopyNotes,
      notes: data.notes,
      uploadedById: data.uploadedById,
      productLinks:
        data.appliesTo === 'SPECIFIC_PRODUCTS' && data.productIds?.length
          ? { create: data.productIds.map((productId) => ({ productId })) }
          : undefined,
    },
    include: docInclude,
  });
}

export async function update(
  id: string,
  data: {
    documentType?: DocumentType;
    documentNumber?: string | null;
    appliesTo?: 'ENTIRE_CASE' | 'SPECIFIC_PRODUCTS';
    issuedDate?: string | null;
    expiryDate?: string | null;
    status?: DocumentStatus;
    hasHardcopy?: boolean;
    hasOriginal?: boolean;
    hardcopyReceivedDate?: string | null;
    originalReceivedDate?: string | null;
    hardcopyNotes?: string | null;
    notes?: string | null;
    fileName?: string;
    filePath?: string;
    fileSize?: number;
  },
) {
  await getById(id);
  return prisma.registrationDocument.update({
    where: { id },
    data: {
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      appliesTo: data.appliesTo,
      issuedDate: data.issuedDate !== undefined
        ? (data.issuedDate ? new Date(data.issuedDate) : null)
        : undefined,
      expiryDate: data.expiryDate !== undefined
        ? (data.expiryDate ? new Date(data.expiryDate) : null)
        : undefined,
      status: data.status,
      hasHardcopy: data.hasHardcopy,
      hasOriginal: data.hasOriginal,
      hardcopyReceivedDate: data.hardcopyReceivedDate !== undefined
        ? (data.hardcopyReceivedDate ? new Date(data.hardcopyReceivedDate) : null)
        : undefined,
      originalReceivedDate: data.originalReceivedDate !== undefined
        ? (data.originalReceivedDate ? new Date(data.originalReceivedDate) : null)
        : undefined,
      hardcopyNotes: data.hardcopyNotes,
      notes: data.notes,
      fileName: data.fileName,
      filePath: data.filePath,
      fileSize: data.fileSize,
    },
    include: docInclude,
  });
}

export async function remove(id: string) {
  await getById(id);
  return prisma.registrationDocument.delete({ where: { id } });
}

// SPEC §13 — auto-update job logic
export async function runAutoUpdate() {
  const now = new Date();
  let needUpdate = 0;
  let expired = 0;

  // RegistrationDocument
  const docs = await prisma.registrationDocument.findMany({
    where: { expiryDate: { not: null }, status: { notIn: ['ACCEPTED', 'EXPIRED'] } },
  });
  for (const d of docs) {
    if (!d.expiryDate) continue;
    const threshold = new Date(d.expiryDate.getTime() - 120 * 86400000);
    if (now > d.expiryDate && d.status === 'NEED_UPDATE') {
      await prisma.registrationDocument.update({ where: { id: d.id }, data: { status: 'EXPIRED' } });
      expired++;
    } else if (now >= threshold && d.status !== 'ACCEPTED') {
      await prisma.registrationDocument.update({ where: { id: d.id }, data: { status: 'NEED_UPDATE' } });
      needUpdate++;
    }
  }

  // RegistrationCertificateHistory
  const certs = await prisma.registrationCertificateHistory.findMany({
    where: { expiryDate: { not: null }, status: { notIn: ['ACCEPTED', 'EXPIRED'] } },
  });
  for (const c of certs) {
    if (!c.expiryDate) continue;
    const threshold = new Date(c.expiryDate.getTime() - 120 * 86400000);
    if (now > c.expiryDate && c.status === 'NEED_UPDATE') {
      await prisma.registrationCertificateHistory.update({ where: { id: c.id }, data: { status: 'EXPIRED' } });
      expired++;
    } else if (now >= threshold) {
      await prisma.registrationCertificateHistory.update({ where: { id: c.id }, data: { status: 'NEED_UPDATE' } });
      needUpdate++;
    }
  }

  // ClassificationResultHistory
  const cls = await prisma.classificationResultHistory.findMany({
    where: { expiryDate: { not: null }, status: { notIn: ['ACCEPTED', 'EXPIRED'] } },
  });
  for (const c of cls) {
    if (!c.expiryDate) continue;
    const threshold = new Date(c.expiryDate.getTime() - 120 * 86400000);
    if (now > c.expiryDate && c.status === 'NEED_UPDATE') {
      await prisma.classificationResultHistory.update({ where: { id: c.id }, data: { status: 'EXPIRED' } });
      expired++;
    } else if (now >= threshold) {
      await prisma.classificationResultHistory.update({ where: { id: c.id }, data: { status: 'NEED_UPDATE' } });
      needUpdate++;
    }
  }

  return { scanned: docs.length + certs.length + cls.length, needUpdate, expired };
}
