import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/http.js';
import { normalizeName, levenshtein } from '../lib/levenshtein.js';
import type { Prisma } from '@prisma/client';

export async function list(params: { search?: string; status?: string }) {
  const where: Prisma.ManufacturerWhereInput = {};
  if (params.status) where.status = params.status as Prisma.ManufacturerWhereInput['status'];
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { shortName: { contains: params.search, mode: 'insensitive' } },
      { country: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  return prisma.manufacturer.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { plants: true, products: true } } },
  });
}

export async function getById(id: string) {
  const m = await prisma.manufacturer.findUnique({
    where: { id },
    include: { plants: true, _count: { select: { products: true } } },
  });
  if (!m) throw notFound('Manufacturer not found');
  return m;
}

// Returns potential duplicates (Levenshtein distance <= 3 on normalized name).
export async function findDuplicates(name: string, excludeId?: string) {
  const target = normalizeName(name);
  const all = await prisma.manufacturer.findMany({
    select: { id: true, name: true, shortName: true, country: true },
  });
  return all
    .filter((m) => m.id !== excludeId)
    .map((m) => ({ ...m, distance: levenshtein(target, normalizeName(m.name)) }))
    .filter((m) => m.distance <= 3)
    .sort((a, b) => a.distance - b.distance);
}

export async function create(data: {
  name: string;
  shortName?: string;
  country?: string;
  address?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  duplicateCheckNotes?: string;
}) {
  const dups = await findDuplicates(data.name);
  return prisma.manufacturer.create({
    data: {
      ...data,
      duplicateCheckStatus: dups.length > 0 ? 'POTENTIAL_DUPLICATE' : 'CLEAR',
    },
  });
}

export async function update(id: string, data: Prisma.ManufacturerUpdateInput) {
  await getById(id);
  return prisma.manufacturer.update({ where: { id }, data });
}

export async function remove(id: string) {
  await getById(id);
  // Soft behaviour: deactivate rather than hard delete to preserve references.
  return prisma.manufacturer.update({ where: { id }, data: { status: 'INACTIVE' } });
}
