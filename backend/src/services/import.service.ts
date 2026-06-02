import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import { badRequest } from '../lib/http.js';
import { normalizeName, levenshtein } from '../lib/levenshtein.js';
import { nextTaskCode } from '../lib/task-code.js';
import type { RiskClass, OwnershipType, ProductType, CommercialStatus } from '@prisma/client';

export type ImportType = 'NEW_PRODUCTS' | 'LEGACY_PRODUCTS';

export interface PreviewRow {
  rowNo: number;
  data: Record<string, string>;
  status: 'OK' | 'WARNING' | 'ERROR';
  messages: string[];
  selected: boolean;
}

const NEW_REQUIRED = [
  'Manufacturer Product Code',
  'Product Name EN',
  'Product Name VN',
  'Manufacturer',
  'Manufacturing Plant',
  'Country of Origin',
  'License Holder',
  'Risk Class',
];
const LEGACY_REQUIRED = [
  'Manufacturer Product Code',
  'Product Name EN',
  'Product Name VN',
  'Manufacturer',
  'Manufacturing Plant',
  'Country of Origin',
  'License Holder',
  'Risk Class',
  'Số ĐKLH',
  'Classification Number',
  'Ownership Type',
];

const VALID_RISK_NEW = ['A', 'B', 'C', 'D', 'NA', 'PENDING'];
const VALID_RISK_LEGACY = ['A', 'B', 'C', 'D'];
const VALID_OWNERSHIP = ['VMED_OWNED', 'MONITORED'];
const VALID_PRODUCT_TYPES = ['MEDICAL_DEVICE', 'BIOCIDE', 'COSMETIC', 'SPARE_PARTS_ACCESSORIES', 'GENERAL_GOODS'];
const VALID_COMMERCIAL_STATUSES = ['ACTIVE', 'INACTIVE_LICENSE_PENDING', 'INACTIVE_LICENSE_REVOKED'];

function parseDate(v: string): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Parse semicolon-separated values
function parseSemicolon(val: string): string[] {
  return val.split(';').map((s) => s.trim()).filter(Boolean);
}

export function buildPreview(buffer: Buffer, importType: ImportType): PreviewRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw badRequest('Workbook has no sheets');
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
  const required = importType === 'LEGACY_PRODUCTS' ? LEGACY_REQUIRED : NEW_REQUIRED;
  const validRisk = importType === 'LEGACY_PRODUCTS' ? VALID_RISK_LEGACY : VALID_RISK_NEW;

  return rows.map((raw, i) => {
    const data: Record<string, string> = {};
    for (const k of Object.keys(raw)) data[k.trim()] = String(raw[k]).trim();
    const messages: string[] = [];
    let status: PreviewRow['status'] = 'OK';

    for (const col of required) {
      if (!data[col]) {
        messages.push(`Missing required: ${col}`);
        status = 'ERROR';
      }
    }
    if (data['Risk Class'] && !validRisk.includes(data['Risk Class'])) {
      messages.push(`Invalid Risk Class "${data['Risk Class']}" (expected: ${validRisk.join('/')})`);
      if (status !== 'ERROR') status = 'WARNING';
    }
    if (importType === 'LEGACY_PRODUCTS') {
      if (data['Ownership Type'] && !VALID_OWNERSHIP.includes(data['Ownership Type'])) {
        messages.push(`Invalid Ownership Type "${data['Ownership Type']}" (expected VMED_OWNED or MONITORED)`);
        if (status !== 'ERROR') status = 'ERROR';
      }
    }
    if (data['Product Type'] && !VALID_PRODUCT_TYPES.includes(data['Product Type'])) {
      messages.push(`Invalid Product Type "${data['Product Type']}" (expected: ${VALID_PRODUCT_TYPES.join('/')})`);
      if (status !== 'ERROR') status = 'WARNING';
    }
    if (data['Commercial Status'] && !VALID_COMMERCIAL_STATUSES.includes(data['Commercial Status'])) {
      messages.push(`Invalid Commercial Status "${data['Commercial Status']}" (expected: ${VALID_COMMERCIAL_STATUSES.join('/')})`);
      if (status !== 'ERROR') status = 'WARNING';
    }
    if (status === 'OK') messages.push('Will import cleanly');

    return { rowNo: i + 2, data, status, messages, selected: status !== 'ERROR' };
  });
}

async function findOrCreateManufacturer(name: string): Promise<{ id: string; fuzzy: boolean }> {
  const all = await prisma.manufacturer.findMany({ select: { id: true, name: true } });
  const target = normalizeName(name);
  const exact = all.find((m) => normalizeName(m.name) === target);
  if (exact) return { id: exact.id, fuzzy: false };
  const fuzzy = all
    .map((m) => ({ m, d: levenshtein(target, normalizeName(m.name)) }))
    .filter((x) => x.d <= 3)
    .sort((a, b) => a.d - b.d)[0];
  if (fuzzy) return { id: fuzzy.m.id, fuzzy: true };
  const created = await prisma.manufacturer.create({ data: { name, status: 'ACTIVE' } });
  return { id: created.id, fuzzy: false };
}

async function findOrCreatePlant(manufacturerId: string, plantName: string): Promise<string> {
  const existing = await prisma.manufacturingPlant.findFirst({
    where: { manufacturerId, plantName },
  });
  if (existing) return existing.id;
  const created = await prisma.manufacturingPlant.create({
    data: { manufacturerId, plantName, status: 'ACTIVE' },
  });
  return created.id;
}

export async function confirmImport(
  rows: PreviewRow[],
  importType: ImportType,
  userId: string,
  fileName: string,
) {
  const selected = rows.filter((r) => r.selected && r.status !== 'ERROR');
  const batch = await prisma.importBatch.create({
    data: {
      importType,
      importedById: userId,
      totalRows: rows.length,
      fileName,
    },
  });

  let success = 0;
  let warning = 0;
  const report: { rowNo: number; result: string }[] = [];

  // For LEGACY_PRODUCTS: group products by Số ĐKLH to create one task per registration number
  const legacyGroups = new Map<string, {
    registrationNo: string;
    classificationNumber: string;
    ownershipType: string;
    firstRegistrationId: string;
    productIds: string[];
    productNames: string[];
  }>();

  for (const row of selected) {
    try {
      const d = row.data;
      const mfg = await findOrCreateManufacturer(d['Manufacturer']);
      const lh = await findOrCreateManufacturer(d['License Holder']);
      const hadWarning = row.status === 'WARNING' || mfg.fuzzy || lh.fuzzy;

      // Parse semicolon-separated plants and countries
      const plantNames = parseSemicolon(d['Manufacturing Plant']);
      const countries = parseSemicolon(d['Country of Origin']);

      const riskRaw = d['Risk Class']?.toUpperCase();
      const validRisk = importType === 'LEGACY_PRODUCTS' ? VALID_RISK_LEGACY : VALID_RISK_NEW;
      const riskClass = riskRaw && validRisk.includes(riskRaw) ? (riskRaw as RiskClass) : 'PENDING';
      const productTypeRaw = d['Product Type']?.trim().toUpperCase().replace(/ /g, '_').replace(/&/g, 'ACCESSORIES');
      const productType = productTypeRaw && VALID_PRODUCT_TYPES.includes(productTypeRaw) ? (productTypeRaw as ProductType) : undefined;
      const commercialStatusRaw = d['Commercial Status']?.trim().toUpperCase().replace(/ /g, '_');
      const commercialStatus = commercialStatusRaw && VALID_COMMERCIAL_STATUSES.includes(commercialStatusRaw) ? (commercialStatusRaw as CommercialStatus) : undefined;

      if (importType === 'NEW_PRODUCTS') {
        // Find or create plant IDs
        const plantIds: string[] = [];
        for (const pName of plantNames) {
          const pid = await findOrCreatePlant(mfg.id, pName);
          plantIds.push(pid);
        }

        // Check if product exists
        const existing = await prisma.product.findUnique({
          where: { manufacturerProductCode: d['Manufacturer Product Code'] },
        });

        if (existing) {
          // Update plants and countries
          for (const plantId of plantIds) {
            await prisma.productPlant.upsert({
              where: { productId_plantId: { productId: existing.id, plantId } },
              create: { productId: existing.id, plantId },
              update: {},
            });
          }
          for (const country of countries) {
            await prisma.productCountryOfOrigin.upsert({
              where: { productId_country: { productId: existing.id, country } },
              create: { productId: existing.id, country },
              update: {},
            });
          }
          await prisma.productLicenseHolder.upsert({
            where: { productId_licenseHolderId: { productId: existing.id, licenseHolderId: lh.id } },
            create: { productId: existing.id, licenseHolderId: lh.id },
            update: {},
          });
          report.push({ rowNo: row.rowNo, result: 'Updated existing product' });
        } else {
          await prisma.product.create({
            data: {
              manufacturerProductCode: d['Manufacturer Product Code'],
              productNameEn: d['Product Name EN'],
              productNameVn: d['Product Name VN'],
              manufacturerId: mfg.id,
              riskClass,
              productType,
              commercialStatus,
              erpProductCode: d['ERP Product Code'] || null,
              sourceSheet: 'NEW_IMPORT',
              importBatchId: batch.id,
              plants: { create: plantIds.map((plantId) => ({ plantId })) },
              countries: { create: countries.map((country) => ({ country })) },
              licenseHolders: { create: [{ licenseHolderId: lh.id }] },
            },
          });
          report.push({ rowNo: row.rowNo, result: hadWarning ? 'Imported with warnings' : 'Imported' });
        }

      } else {
        // LEGACY_PRODUCTS — process row, defer task creation until after loop (grouped by Số ĐKLH)
        const ownershipType = (d['Ownership Type'] as OwnershipType) ?? 'VMED_OWNED';
        const registrationNo = d['Số ĐKLH'];
        const classificationNumber = d['Classification Number'];

        const plantIds: string[] = [];
        for (const pName of plantNames) {
          const pid = await findOrCreatePlant(mfg.id, pName);
          plantIds.push(pid);
        }

        let product = await prisma.product.findUnique({
          where: { manufacturerProductCode: d['Manufacturer Product Code'] },
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              manufacturerProductCode: d['Manufacturer Product Code'],
              productNameEn: d['Product Name EN'],
              productNameVn: d['Product Name VN'],
              manufacturerId: mfg.id,
              riskClass,
              productType,
              commercialStatus: commercialStatus ?? 'ACTIVE',
              erpProductCode: d['ERP Product Code'] || null,
              sourceSheet: 'LEGACY_IMPORT',
              importBatchId: batch.id,
              plants: { create: plantIds.map((plantId) => ({ plantId })) },
              countries: { create: countries.map((country) => ({ country })) },
              licenseHolders: { create: [{ licenseHolderId: lh.id }] },
            },
          });
        } else {
          for (const plantId of plantIds) {
            await prisma.productPlant.upsert({
              where: { productId_plantId: { productId: product.id, plantId } },
              create: { productId: product.id, plantId },
              update: {},
            });
          }
          for (const country of countries) {
            await prisma.productCountryOfOrigin.upsert({
              where: { productId_country: { productId: product.id, country } },
              create: { productId: product.id, country },
              update: {},
            });
          }
          await prisma.productLicenseHolder.upsert({
            where: { productId_licenseHolderId: { productId: product.id, licenseHolderId: lh.id } },
            create: { productId: product.id, licenseHolderId: lh.id },
            update: {},
          });
        }

        // Create ProductRegistration per product
        const registration = await prisma.productRegistration.create({
          data: {
            productId: product.id,
            licenseHolderId: lh.id,
            ownershipType,
            registrationNo,
            classificationNumber,
            commercialStatus: commercialStatus ?? 'ACTIVE',
            workflowStatus: 'REGISTERED',
          },
        });

        // Track for grouped task creation
        if (!legacyGroups.has(registrationNo)) {
          legacyGroups.set(registrationNo, {
            registrationNo,
            classificationNumber,
            ownershipType,
            firstRegistrationId: registration.id,
            productIds: [],
            productNames: [],
          });
        }
        legacyGroups.get(registrationNo)!.productIds.push(product.id);
        legacyGroups.get(registrationNo)!.productNames.push(product.productNameEn);

        report.push({ rowNo: row.rowNo, result: hadWarning ? 'Imported with warnings' : 'Imported' });
      }

      if (hadWarning) warning++;
      else success++;
    } catch (e) {
      report.push({ rowNo: row.rowNo, result: `Failed: ${e instanceof Error ? e.message : 'error'}` });
    }
  }

  // Create one task per Số ĐKLH group for LEGACY_PRODUCTS
  for (const group of legacyGroups.values()) {
    try {
      const taskCode = await nextTaskCode();
      const title = group.productIds.length === 1
        ? `Legacy import — ${group.productNames[0]}`
        : `Legacy import — ${group.registrationNo} (${group.productIds.length} products)`;

      const task = await prisma.registrationTask.create({
        data: {
          taskCode,
          taskType: 'NEW_REGISTRATION',
          title,
          status: 'COMPLETED',
          statusStepNo: 6,
          completedDate: new Date(),
          startDate: new Date(),
          productRegistrationId: group.firstRegistrationId,
          case: {
            create: {
              productRegistrationId: group.firstRegistrationId,
              caseStatus: 'CLOSED',
              registrationNo: group.registrationNo,
              classificationNumber: group.classificationNumber,
            },
          },
          statusHistory: {
            create: { fromStatus: null, toStatus: 'COMPLETED', note: 'LEGACY_IMPORT' },
          },
        },
      });

      // Link all products to the task
      if (group.productIds.length > 0) {
        await prisma.taskProduct.createMany({
          data: group.productIds.map((productId) => ({ taskId: task.id, productId })),
          skipDuplicates: true,
        });
      }
    } catch {
      // Task creation failure doesn't block the import
    }
  }

  const skipped = rows.length - selected.length;
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      successCount: success,
      warningCount: warning,
      errorCount: rows.filter((r) => r.status === 'ERROR').length,
    },
  });

  return { batchId: batch.id, success, warning, skipped, report };
}
