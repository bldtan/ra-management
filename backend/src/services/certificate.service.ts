import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/http.js';

export async function uploadCertificate(
  productRegistrationId: string,
  taskId: string | null,
  file: { name: string; path: string; size: number },
  metadata: {
    documentNumber?: string;
    issuedDate?: string | null;
    expiryDate?: string | null;
    notes?: string;
  },
  uploadedById: string,
) {
  // Validate registration exists
  const reg = await prisma.productRegistration.findUnique({ where: { id: productRegistrationId } });
  if (!reg) throw notFound('ProductRegistration not found');

  return prisma.$transaction(async (tx) => {
    // Mark all existing certs as not current
    await tx.registrationCertificateHistory.updateMany({
      where: { productRegistrationId, isCurrent: true },
      data: { isCurrent: false },
    });
    // Insert new current cert
    return tx.registrationCertificateHistory.create({
      data: {
        productRegistrationId,
        taskId: taskId ?? undefined,
        uploadedById,
        fileName: file.name,
        filePath: file.path,
        fileSize: file.size,
        documentNumber: metadata.documentNumber,
        issuedDate: metadata.issuedDate ? new Date(metadata.issuedDate) : null,
        expiryDate: metadata.expiryDate ? new Date(metadata.expiryDate) : null,
        notes: metadata.notes,
        isCurrent: true,
        status: 'COLLECTED',
      },
      include: { uploadedBy: { select: { id: true, fullName: true } } },
    });
  });
}

export async function getCertificateHistory(productRegistrationId: string) {
  return prisma.registrationCertificateHistory.findMany({
    where: { productRegistrationId },
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: { select: { id: true, fullName: true } },
      task: { select: { id: true, taskCode: true } },
    },
  });
}

export async function updateCertificateMetadata(
  id: string,
  metadata: {
    documentNumber?: string | null;
    issuedDate?: string | null;
    expiryDate?: string | null;
    notes?: string | null;
    hasHardcopy?: boolean;
    hasOriginal?: boolean;
    hardcopyReceivedDate?: string | null;
    originalReceivedDate?: string | null;
    hardcopyNotes?: string | null;
    status?: string;
  },
) {
  const cert = await prisma.registrationCertificateHistory.findUnique({ where: { id } });
  if (!cert) throw notFound('Certificate not found');

  return prisma.registrationCertificateHistory.update({
    where: { id },
    data: {
      documentNumber: metadata.documentNumber,
      issuedDate: metadata.issuedDate !== undefined
        ? (metadata.issuedDate ? new Date(metadata.issuedDate) : null)
        : undefined,
      expiryDate: metadata.expiryDate !== undefined
        ? (metadata.expiryDate ? new Date(metadata.expiryDate) : null)
        : undefined,
      notes: metadata.notes,
      hasHardcopy: metadata.hasHardcopy,
      hasOriginal: metadata.hasOriginal,
      hardcopyReceivedDate: metadata.hardcopyReceivedDate !== undefined
        ? (metadata.hardcopyReceivedDate ? new Date(metadata.hardcopyReceivedDate) : null)
        : undefined,
      originalReceivedDate: metadata.originalReceivedDate !== undefined
        ? (metadata.originalReceivedDate ? new Date(metadata.originalReceivedDate) : null)
        : undefined,
      hardcopyNotes: metadata.hardcopyNotes,
    },
    include: { uploadedBy: { select: { id: true, fullName: true } } },
  });
}

export async function uploadClassification(
  productId: string,
  taskId: string | null,
  file: { name: string; path: string; size: number },
  metadata: {
    documentNumber?: string;
    classificationNumber?: string;
    issuedDate?: string | null;
    expiryDate?: string | null;
    notes?: string;
  },
  uploadedById: string,
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw notFound('Product not found');

  return prisma.$transaction(async (tx) => {
    // Mark all existing classifications as not current
    await tx.classificationResultHistory.updateMany({
      where: { productId, isCurrent: true },
      data: { isCurrent: false },
    });
    // Insert new current classification
    return tx.classificationResultHistory.create({
      data: {
        productId,
        taskId: taskId ?? undefined,
        uploadedById,
        fileName: file.name,
        filePath: file.path,
        fileSize: file.size,
        documentNumber: metadata.documentNumber,
        classificationNumber: metadata.classificationNumber,
        issuedDate: metadata.issuedDate ? new Date(metadata.issuedDate) : null,
        expiryDate: metadata.expiryDate ? new Date(metadata.expiryDate) : null,
        notes: metadata.notes,
        isCurrent: true,
        status: 'COLLECTED',
      },
      include: { uploadedBy: { select: { id: true, fullName: true } } },
    });
  });
}

export async function getClassificationHistory(productId: string) {
  return prisma.classificationResultHistory.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: { select: { id: true, fullName: true } },
      task: { select: { id: true, taskCode: true } },
    },
  });
}

export async function updateClassificationMetadata(
  id: string,
  metadata: {
    documentNumber?: string | null;
    classificationNumber?: string | null;
    issuedDate?: string | null;
    expiryDate?: string | null;
    notes?: string | null;
    hasHardcopy?: boolean;
    hasOriginal?: boolean;
    hardcopyReceivedDate?: string | null;
    originalReceivedDate?: string | null;
    hardcopyNotes?: string | null;
  },
) {
  const cls = await prisma.classificationResultHistory.findUnique({ where: { id } });
  if (!cls) throw notFound('Classification not found');

  return prisma.classificationResultHistory.update({
    where: { id },
    data: {
      documentNumber: metadata.documentNumber,
      classificationNumber: metadata.classificationNumber,
      issuedDate: metadata.issuedDate !== undefined
        ? (metadata.issuedDate ? new Date(metadata.issuedDate) : null)
        : undefined,
      expiryDate: metadata.expiryDate !== undefined
        ? (metadata.expiryDate ? new Date(metadata.expiryDate) : null)
        : undefined,
      notes: metadata.notes,
      hasHardcopy: metadata.hasHardcopy,
      hasOriginal: metadata.hasOriginal,
      hardcopyReceivedDate: metadata.hardcopyReceivedDate !== undefined
        ? (metadata.hardcopyReceivedDate ? new Date(metadata.hardcopyReceivedDate) : null)
        : undefined,
      originalReceivedDate: metadata.originalReceivedDate !== undefined
        ? (metadata.originalReceivedDate ? new Date(metadata.originalReceivedDate) : null)
        : undefined,
      hardcopyNotes: metadata.hardcopyNotes,
    },
    include: { uploadedBy: { select: { id: true, fullName: true } } },
  });
}
