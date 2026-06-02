import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/http.js';
import type { Prisma, RiskClass, ProductType, CommercialStatus } from '@prisma/client';

const productInclude = {
  manufacturer: { select: { id: true, name: true } },
  plants: { include: { plant: { select: { id: true, plantName: true, country: true } } } },
  countries: { select: { id: true, country: true } },
  registrations: {
    include: {
      licenseHolder: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  licenseHolders: {
    include: { licenseHolder: { select: { id: true, name: true } } },
  },
} satisfies Prisma.ProductInclude;

export async function list(params: {
  search?: string;
  manufacturerId?: string;
  riskClass?: string;
  licenseHolderId?: string;
}) {
  const where: Prisma.ProductWhereInput = {};
  if (params.manufacturerId) where.manufacturerId = params.manufacturerId;
  if (params.riskClass) where.riskClass = params.riskClass as RiskClass;
  if (params.licenseHolderId) {
    where.licenseHolders = { some: { licenseHolderId: params.licenseHolderId } };
  }
  if (params.search) {
    where.OR = [
      { manufacturerProductCode: { contains: params.search, mode: 'insensitive' } },
      { productNameEn: { contains: params.search, mode: 'insensitive' } },
      { productNameVn: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  return prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: productInclude,
  });
}

export async function getById(id: string) {
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      ...productInclude,
      classificationHistory: {
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: { select: { id: true, fullName: true } } },
      },
      documentLinks: { include: { document: true } },
    },
  });
  if (!p) throw notFound('Product not found');
  return p;
}

export async function create(data: {
  manufacturerProductCode: string;
  productNameEn: string;
  productNameVn: string;
  manufacturerId: string;
  riskClass?: RiskClass;
  productType?: ProductType;
  commercialStatus?: CommercialStatus;
  erpProductCode?: string;
  plantIds?: string[];
  countries?: string[];
  licenseHolderIds?: string[];
  importBatchId?: string;
  sourceSheet?: string;
}) {
  return prisma.product.create({
    data: {
      manufacturerProductCode: data.manufacturerProductCode,
      productNameEn: data.productNameEn,
      productNameVn: data.productNameVn,
      manufacturerId: data.manufacturerId,
      riskClass: data.riskClass ?? 'PENDING',
      productType: data.productType,
      commercialStatus: data.commercialStatus,
      erpProductCode: data.erpProductCode,
      importBatchId: data.importBatchId,
      sourceSheet: data.sourceSheet,
      plants: data.plantIds?.length
        ? { create: data.plantIds.map((plantId) => ({ plantId })) }
        : undefined,
      countries: data.countries?.length
        ? { create: data.countries.map((country) => ({ country })) }
        : undefined,
      licenseHolders: data.licenseHolderIds?.length
        ? { create: data.licenseHolderIds.map((licenseHolderId) => ({ licenseHolderId })) }
        : undefined,
    },
    include: productInclude,
  });
}

export async function update(
  id: string,
  data: {
    manufacturerProductCode?: string;
    productNameEn?: string;
    productNameVn?: string;
    manufacturerId?: string;
    riskClass?: RiskClass;
    productType?: ProductType | null;
    commercialStatus?: CommercialStatus | null;
    erpProductCode?: string;
    plantIds?: string[];
    countries?: string[];
    licenseHolderIds?: string[];
  },
) {
  await getById(id);
  return prisma.$transaction(async (tx) => {
    if (data.plantIds !== undefined) {
      await tx.productPlant.deleteMany({ where: { productId: id } });
      if (data.plantIds.length) {
        await tx.productPlant.createMany({
          data: data.plantIds.map((plantId) => ({ productId: id, plantId })),
        });
      }
    }
    if (data.countries !== undefined) {
      await tx.productCountryOfOrigin.deleteMany({ where: { productId: id } });
      if (data.countries.length) {
        await tx.productCountryOfOrigin.createMany({
          data: data.countries.map((country) => ({ productId: id, country })),
        });
      }
    }
    if (data.licenseHolderIds !== undefined) {
      await tx.productLicenseHolder.deleteMany({ where: { productId: id } });
      if (data.licenseHolderIds.length) {
        await tx.productLicenseHolder.createMany({
          data: data.licenseHolderIds.map((licenseHolderId) => ({ productId: id, licenseHolderId })),
        });
      }
    }
    return tx.product.update({
      where: { id },
      data: {
        manufacturerProductCode: data.manufacturerProductCode,
        productNameEn: data.productNameEn,
        productNameVn: data.productNameVn,
        manufacturerId: data.manufacturerId,
        riskClass: data.riskClass,
        productType: data.productType,
        commercialStatus: data.commercialStatus,
        erpProductCode: data.erpProductCode,
      },
      include: productInclude,
    });
  });
}

export async function remove(id: string) {
  await getById(id);
  return prisma.product.delete({ where: { id } });
}

export async function duplicateTemplate(id: string) {
  const p = await getById(id);
  return {
    manufacturerProductCode: '',
    productNameEn: p.productNameEn,
    productNameVn: p.productNameVn,
    manufacturerId: p.manufacturerId,
    riskClass: p.riskClass,
    erpProductCode: p.erpProductCode,
    plantIds: (p as unknown as { plants: { plant: { id: string } }[] }).plants.map((pp) => pp.plant.id),
    countries: (p as unknown as { countries: { country: string }[] }).countries.map((c) => c.country),
  };
}

export async function getRegistrations(productId: string) {
  await getById(productId);
  return prisma.productRegistration.findMany({
    where: { productId },
    include: {
      licenseHolder: { select: { id: true, name: true } },
      tasks: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, taskCode: true, status: true, taskType: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

// Export: one row per ProductRegistration
export async function exportData(params: {
  manufacturerId?: string;
  licenseHolderId?: string;
  riskClass?: string;
  commercialStatus?: string;
}) {
  const where: Prisma.ProductWhereInput = {};
  if (params.manufacturerId) where.manufacturerId = params.manufacturerId;
  if (params.riskClass) where.riskClass = params.riskClass as RiskClass;

  const regWhere: Prisma.ProductRegistrationWhereInput = {};
  if (params.licenseHolderId) regWhere.licenseHolderId = params.licenseHolderId;
  if (params.commercialStatus) {
    regWhere.commercialStatus = params.commercialStatus as Prisma.ProductRegistrationWhereInput['commercialStatus'];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      manufacturer: { select: { name: true } },
      plants: { include: { plant: { select: { plantName: true } } } },
      countries: { select: { country: true } },
      registrations: {
        where: regWhere,
        include: { licenseHolder: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Flatten to one row per registration
  type ExportProduct = {
    manufacturerProductCode: string; productNameEn: string; productNameVn: string; riskClass: string | null; erpProductCode: string | null;
    manufacturer: { name: string };
    plants: { plant: { plantName: string } }[];
    countries: { country: string }[];
    registrations: { licenseHolder: { name: string }; ownershipType: string; registrationNo: string | null; registrationExpiry: Date | null; classificationNumber: string | null; commercialStatus: string; workflowStatus: string }[];
  };
  const rows: Record<string, string | null | undefined>[] = [];
  for (const p of products as unknown as ExportProduct[]) {
    if (p.registrations.length === 0) {
      rows.push({
        'Product Code': p.manufacturerProductCode,
        'Product Name EN': p.productNameEn,
        'Product Name VN': p.productNameVn,
        'Manufacturer': p.manufacturer.name,
        'Plants': p.plants.map((pp) => pp.plant.plantName).join('; '),
        'Countries': p.countries.map((c) => c.country).join('; '),
        'Risk Class': p.riskClass,
        'ERP Code': p.erpProductCode,
        'License Holder': null,
        'Ownership Type': null,
        'Registration No': null,
        'Registration Expiry': null,
        'Classification No': null,
        'Commercial Status': null,
        'Workflow Status': null,
      });
    } else {
      for (const reg of p.registrations) {
        rows.push({
          'Product Code': p.manufacturerProductCode,
          'Product Name EN': p.productNameEn,
          'Product Name VN': p.productNameVn,
          'Manufacturer': p.manufacturer.name,
          'Plants': p.plants.map((pp) => pp.plant.plantName).join('; '),
          'Countries': p.countries.map((c) => c.country).join('; '),
          'Risk Class': p.riskClass,
          'ERP Code': p.erpProductCode,
          'License Holder': reg.licenseHolder.name,
          'Ownership Type': reg.ownershipType,
          'Registration No': reg.registrationNo,
          'Registration Expiry': reg.registrationExpiry?.toISOString().split('T')[0] ?? null,
          'Classification No': reg.classificationNumber,
          'Commercial Status': reg.commercialStatus,
          'Workflow Status': reg.workflowStatus,
        });
      }
    }
  }
  return rows;
}
