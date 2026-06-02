import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/http.js';
import type { Prisma } from '@prisma/client';

export async function list(manufacturerId?: string) {
  const where: Prisma.ManufacturingPlantWhereInput = {};
  if (manufacturerId) where.manufacturerId = manufacturerId;
  return prisma.manufacturingPlant.findMany({
    where,
    orderBy: { plantName: 'asc' },
    include: { manufacturer: { select: { id: true, name: true } } },
  });
}

export async function getById(id: string) {
  const p = await prisma.manufacturingPlant.findUnique({
    where: { id },
    include: { manufacturer: true },
  });
  if (!p) throw notFound('Plant not found');
  return p;
}

export async function create(data: {
  manufacturerId: string;
  plantName: string;
  country?: string;
  address?: string;
  iso13485CertNo?: string;
  iso13485Expiry?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}) {
  return prisma.manufacturingPlant.create({
    data: {
      ...data,
      iso13485Expiry: data.iso13485Expiry ? new Date(data.iso13485Expiry) : null,
    },
  });
}

export async function update(
  id: string,
  data: Prisma.ManufacturingPlantUpdateInput & { iso13485Expiry?: string | null },
) {
  await getById(id);
  const patch: Prisma.ManufacturingPlantUpdateInput = { ...data };
  if (data.iso13485Expiry !== undefined) {
    patch.iso13485Expiry = data.iso13485Expiry ? new Date(data.iso13485Expiry as string) : null;
  }
  return prisma.manufacturingPlant.update({ where: { id }, data: patch });
}

export async function remove(id: string) {
  await getById(id);
  return prisma.manufacturingPlant.update({ where: { id }, data: { status: 'INACTIVE' } });
}
