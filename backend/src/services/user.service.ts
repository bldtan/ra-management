import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { notFound, conflict } from '../lib/http.js';
import type { Role } from '@prisma/client';

export async function list() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

// Lightweight list for dropdowns (Responsible/Supervisor/Observers).
export async function selectable() {
  return prisma.user.findMany({
    where: { isActive: true, role: { in: ['LEGAL_HEAD', 'RA_STAFF'] } },
    orderBy: { fullName: 'asc' },
    select: { id: true, fullName: true, role: true },
  });
}

export async function create(data: { email: string; password: string; fullName: string; role: Role }) {
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw conflict('Email already in use', 'EMAIL_TAKEN');
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: { email: data.email.toLowerCase(), passwordHash, fullName: data.fullName, role: data.role },
    select: { id: true, email: true, fullName: true, role: true, isActive: true },
  });
}

export async function update(
  id: string,
  data: { fullName?: string; role?: Role; isActive?: boolean; password?: string },
) {
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) throw notFound('User not found');
  const patch: { fullName?: string; role?: Role; isActive?: boolean; passwordHash?: string } = {
    fullName: data.fullName,
    role: data.role,
    isActive: data.isActive,
  };
  if (data.password) patch.passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.update({
    where: { id },
    data: patch,
    select: { id: true, email: true, fullName: true, role: true, isActive: true },
  });
}

export async function deactivate(id: string) {
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) throw notFound('User not found');
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, isActive: true },
  });
}

// Viewer permissions per manufacturer.
export async function getViewerPermissions(userId: string) {
  const manufacturers = await prisma.manufacturer.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  const perms = await prisma.viewerManufacturerPermission.findMany({ where: { userId } });
  const map = new Map(perms.map((p) => [p.manufacturerId, p]));
  return manufacturers.map((m) => {
    const p = map.get(m.id);
    return {
      manufacturerId: m.id,
      manufacturerName: m.name,
      canViewProducts: p?.canViewProducts ?? false,
      canViewDocuments: p?.canViewDocuments ?? false,
      canDownloadDocuments: p?.canDownloadDocuments ?? false,
      canViewKpi: p?.canViewKpi ?? false,
    };
  });
}

export async function setViewerPermissions(
  userId: string,
  perms: {
    manufacturerId: string;
    canViewProducts: boolean;
    canViewDocuments: boolean;
    canDownloadDocuments: boolean;
    canViewKpi: boolean;
  }[],
) {
  await prisma.$transaction(
    perms.map((p) =>
      prisma.viewerManufacturerPermission.upsert({
        where: { userId_manufacturerId: { userId, manufacturerId: p.manufacturerId } },
        create: { userId, ...p },
        update: {
          canViewProducts: p.canViewProducts,
          canViewDocuments: p.canViewDocuments,
          canDownloadDocuments: p.canDownloadDocuments,
          canViewKpi: p.canViewKpi,
        },
      }),
    ),
  );
  return getViewerPermissions(userId);
}

// Manufacturer IDs a viewer may see documents for (download flag honored separately).
export async function viewerAllowedManufacturerIds(userId: string) {
  const perms = await prisma.viewerManufacturerPermission.findMany({
    where: { userId, canViewDocuments: true },
    select: { manufacturerId: true },
  });
  return perms.map((p) => p.manufacturerId);
}

// ViewerDocumentTypePermission — per manufacturer + per document type
export async function getViewerDocTypePermissions(userId: string, manufacturerId: string) {
  const perms = await prisma.viewerDocumentTypePermission.findMany({
    where: { userId, manufacturerId },
  });
  return perms;
}

export async function setViewerDocTypePermissions(
  userId: string,
  manufacturerId: string,
  permissions: { documentType: string; canView: boolean }[],
) {
  const { DocumentType } = await import('@prisma/client');
  return prisma.$transaction(
    permissions.map((p) =>
      prisma.viewerDocumentTypePermission.upsert({
        where: {
          userId_manufacturerId_documentType: {
            userId,
            manufacturerId,
            documentType: p.documentType as keyof typeof DocumentType,
          },
        },
        create: {
          userId,
          manufacturerId,
          documentType: p.documentType as keyof typeof DocumentType,
          canView: p.canView,
        },
        update: { canView: p.canView },
      }),
    ),
  );
}
