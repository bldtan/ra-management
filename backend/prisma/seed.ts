import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log('[seed] Users already exist — skipping seed (idempotent).');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  // --- Users ---
  const [legalHead, ra1, ra2, viewer] = await Promise.all([
    prisma.user.create({
      data: { email: 'legalhead@demo.com', passwordHash, fullName: 'Legal Head', role: 'LEGAL_HEAD' },
    }),
    prisma.user.create({
      data: { email: 'ra1@demo.com', passwordHash, fullName: 'RA Staff One', role: 'RA_STAFF' },
    }),
    prisma.user.create({
      data: { email: 'ra2@demo.com', passwordHash, fullName: 'RA Staff Two', role: 'RA_STAFF' },
    }),
    prisma.user.create({
      data: { email: 'viewer@demo.com', passwordHash, fullName: 'External Viewer', role: 'VIEWER' },
    }),
  ]);

  // --- Manufacturers ---
  const mfgA = await prisma.manufacturer.create({
    data: {
      name: 'Acme Medical Devices GmbH',
      shortName: 'Acme',
      country: 'Germany',
      address: 'Industriestrasse 1, Munich',
      status: 'ACTIVE',
    },
  });
  const mfgB = await prisma.manufacturer.create({
    data: {
      name: 'NovaHealth Instruments Co., Ltd.',
      shortName: 'NovaHealth',
      country: 'Japan',
      address: '2-1 Chiyoda, Tokyo',
      status: 'ACTIVE',
    },
  });
  const mfgC = await prisma.manufacturer.create({
    data: {
      name: 'MediTech Solutions Pte. Ltd.',
      shortName: 'MediTech',
      country: 'Singapore',
      address: '100 Science Park Drive, Singapore',
      status: 'ACTIVE',
    },
  });

  // --- Manufacturing Plants ---
  const plantA1 = await prisma.manufacturingPlant.create({
    data: {
      manufacturerId: mfgA.id,
      plantName: 'Acme Munich Plant',
      country: 'DE',
      address: 'Industriestrasse 1, Munich',
      iso13485CertNo: 'ISO-13485-DE-0001',
      iso13485Expiry: new Date('2027-03-31'),
      status: 'ACTIVE',
    },
  });
  const plantA2 = await prisma.manufacturingPlant.create({
    data: {
      manufacturerId: mfgA.id,
      plantName: 'Acme Berlin Plant',
      country: 'DE',
      address: 'Berliner Strasse 10, Berlin',
      iso13485CertNo: 'ISO-13485-DE-0002',
      iso13485Expiry: new Date('2026-12-31'),
      status: 'ACTIVE',
    },
  });
  const plantB = await prisma.manufacturingPlant.create({
    data: {
      manufacturerId: mfgB.id,
      plantName: 'NovaHealth Tokyo Plant',
      country: 'JP',
      iso13485CertNo: 'ISO-13485-JP-0044',
      iso13485Expiry: new Date('2026-09-30'),
      status: 'ACTIVE',
    },
  });
  const plantC = await prisma.manufacturingPlant.create({
    data: {
      manufacturerId: mfgC.id,
      plantName: 'MediTech Singapore Plant',
      country: 'SG',
      iso13485CertNo: 'ISO-13485-SG-0011',
      iso13485Expiry: new Date('2028-06-30'),
      status: 'ACTIVE',
    },
  });

  // --- Products ---
  const prod1 = await prisma.product.create({
    data: {
      manufacturerProductCode: 'ACM-1001',
      productNameEn: 'Infusion Pump X100',
      productNameVn: 'Bơm tiêm truyền X100',
      manufacturerId: mfgA.id,
      riskClass: 'C',
      plants: {
        create: [{ plantId: plantA1.id }, { plantId: plantA2.id }],
      },
      countries: {
        create: [{ country: 'DE' }],
      },
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      manufacturerProductCode: 'NVH-2002',
      productNameEn: 'Digital Thermometer T20',
      productNameVn: 'Nhiệt kế điện tử T20',
      manufacturerId: mfgB.id,
      riskClass: 'A',
      plants: {
        create: [{ plantId: plantB.id }],
      },
      countries: {
        create: [{ country: 'JP' }],
      },
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      manufacturerProductCode: 'MDT-3001',
      productNameEn: 'Surgical Gloves Pro',
      productNameVn: 'Găng tay phẫu thuật Pro',
      manufacturerId: mfgC.id,
      riskClass: 'B',
      plants: {
        create: [{ plantId: plantC.id }],
      },
      countries: {
        create: [{ country: 'SG' }, { country: 'MY' }],
      },
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      manufacturerProductCode: 'ACM-2005',
      productNameEn: 'Patient Monitor PM500',
      productNameVn: 'Máy theo dõi bệnh nhân PM500',
      manufacturerId: mfgA.id,
      riskClass: 'D',
      plants: {
        create: [{ plantId: plantA1.id }],
      },
      countries: {
        create: [{ country: 'DE' }, { country: 'US' }],
      },
    },
  });

  // --- ProductRegistrations ---
  const reg1 = await prisma.productRegistration.create({
    data: {
      productId: prod1.id,
      licenseHolderId: mfgA.id,
      ownershipType: 'VMED_OWNED',
      registrationNo: null,
      commercialStatus: 'INACTIVE_LICENSE_PENDING',
      workflowStatus: 'IN_PROGRESS',
      applicationNo: 'APP-2024-001',
      notes: 'New registration in progress',
    },
  });

  const reg2 = await prisma.productRegistration.create({
    data: {
      productId: prod2.id,
      licenseHolderId: mfgB.id,
      ownershipType: 'VMED_OWNED',
      registrationNo: 'DKLH-2024-0001',
      registrationExpiry: new Date('2027-06-30'),
      approvalDate: new Date('2022-06-30'),
      applicationNo: 'APP-2022-055',
      classificationNumber: 'PLSP-001-2022',
      commercialStatus: 'ACTIVE',
      workflowStatus: 'REGISTERED',
    },
  });

  const reg3 = await prisma.productRegistration.create({
    data: {
      productId: prod3.id,
      licenseHolderId: mfgC.id,
      ownershipType: 'MONITORED',
      registrationNo: 'DKLH-2023-0088',
      registrationExpiry: new Date('2026-12-31'),
      approvalDate: new Date('2021-12-31'),
      classificationNumber: 'PLSP-088-2021',
      commercialStatus: 'ACTIVE',
      workflowStatus: 'REGISTERED',
    },
  });

  const reg4 = await prisma.productRegistration.create({
    data: {
      productId: prod4.id,
      licenseHolderId: mfgA.id,
      ownershipType: 'VMED_OWNED',
      commercialStatus: 'INACTIVE_LICENSE_PENDING',
      workflowStatus: 'NOT_STARTED',
      notes: 'Pending initial registration',
    },
  });

  // Second registration for prod2 (different license holder - monitored)
  const reg2b = await prisma.productRegistration.create({
    data: {
      productId: prod2.id,
      licenseHolderId: mfgC.id,
      ownershipType: 'MONITORED',
      registrationNo: 'DKLH-2023-0099',
      registrationExpiry: new Date('2025-12-31'), // expired
      commercialStatus: 'INACTIVE_LICENSE_REVOKED',
      workflowStatus: 'EXPIRED',
    },
  });

  // --- Tasks ---
  const task1 = await prisma.registrationTask.create({
    data: {
      taskCode: 'RA-2024-001',
      taskType: 'NEW_REGISTRATION',
      title: 'Đăng ký mới - Infusion Pump X100',
      status: 'DOC_COLLECTION',
      statusStepNo: 1,
      priority: 'HIGH',
      responsibleId: ra1.id,
      supervisorId: legalHead.id,
      productRegistrationId: reg1.id,
      startDate: new Date('2024-01-15'),
      targetDeadline: new Date('2024-12-31'),
      remarks: 'Urgent registration needed',
      statusHistory: {
        create: [
          { fromStatus: null, toStatus: 'NEW', changedById: ra1.id, note: 'Task created' },
          { fromStatus: 'NEW', toStatus: 'DOC_COLLECTION', changedById: ra1.id, note: 'Started document collection' },
        ],
      },
      case: {
        create: {
          productRegistrationId: reg1.id,
          caseStatus: 'OPEN',
          applicationNo: 'APP-2024-001',
          caseNotes: 'Main registration case for Infusion Pump',
        },
      },
    },
  });

  const task2 = await prisma.registrationTask.create({
    data: {
      taskCode: 'RA-2024-002',
      taskType: 'RENEWAL',
      title: 'Gia hạn - Digital Thermometer T20',
      status: 'COMPLETED',
      statusStepNo: 6,
      priority: 'NORMAL',
      responsibleId: ra2.id,
      supervisorId: legalHead.id,
      productRegistrationId: reg2.id,
      startDate: new Date('2024-02-01'),
      targetDeadline: new Date('2024-06-30'),
      completedDate: new Date('2024-06-15'),
      statusHistory: {
        create: [
          { fromStatus: null, toStatus: 'NEW', changedById: ra2.id, note: 'Task created' },
          { fromStatus: 'NEW', toStatus: 'DOC_COLLECTION', changedById: ra2.id },
          { fromStatus: 'DOC_COLLECTION', toStatus: 'DOSSIER_PREP', changedById: ra2.id },
          { fromStatus: 'DOSSIER_PREP', toStatus: 'SUBMITTED', changedById: ra2.id },
          { fromStatus: 'SUBMITTED', toStatus: 'COMPLETED', changedById: legalHead.id, note: 'Registration renewed' },
        ],
      },
      case: {
        create: {
          productRegistrationId: reg2.id,
          caseStatus: 'CLOSED',
          registrationNo: 'DKLH-2024-0001',
          registrationExpiry: new Date('2027-06-30'),
          approvalDate: new Date('2024-06-15'),
        },
      },
    },
  });

  const task3 = await prisma.registrationTask.create({
    data: {
      taskCode: 'RA-2024-003',
      taskType: 'NEW_REGISTRATION',
      title: 'Đăng ký mới - Patient Monitor PM500',
      status: 'NEW',
      statusStepNo: 0,
      priority: 'NORMAL',
      responsibleId: ra1.id,
      productRegistrationId: reg4.id,
      startDate: new Date('2024-08-01'),
      targetDeadline: new Date('2025-06-30'),
      statusHistory: {
        create: [
          { fromStatus: null, toStatus: 'NEW', changedById: ra1.id, note: 'Task created' },
        ],
      },
      case: {
        create: {
          productRegistrationId: reg4.id,
          caseStatus: 'OPEN',
        },
      },
    },
  });

  // --- Comments ---
  await prisma.taskComment.createMany({
    data: [
      { taskId: task1.id, userId: ra1.id, content: 'Waiting for LOA from manufacturer' },
      { taskId: task1.id, userId: legalHead.id, content: 'Please expedite — deadline is approaching' },
      { taskId: task2.id, userId: ra2.id, content: 'All documents submitted successfully' },
    ],
  });

  // --- Viewer permissions ---
  await prisma.viewerManufacturerPermission.create({
    data: {
      userId: viewer.id,
      manufacturerId: mfgA.id,
      canViewProducts: true,
      canViewDocuments: true,
      canDownloadDocuments: false,
      canViewKpi: false,
    },
  });

  // --- Notifications ---
  await prisma.notification.createMany({
    data: [
      {
        userId: ra1.id,
        type: 'TASK_ASSIGNED',
        title: 'Task assigned to you',
        message: 'RA-2024-001 — Đăng ký mới - Infusion Pump X100',
        link: `/tasks/${task1.id}`,
        isRead: false,
      },
      {
        userId: legalHead.id,
        type: 'TASK_STATUS_CHANGED',
        title: 'Task status changed',
        message: 'RA-2024-002: SUBMITTED → COMPLETED',
        link: `/tasks/${task2.id}`,
        isRead: true,
      },
      {
        userId: ra1.id,
        type: 'TASK_ASSIGNED',
        title: 'Task assigned to you',
        message: 'RA-2024-003 — Đăng ký mới - Patient Monitor PM500',
        link: `/tasks/${task3.id}`,
        isRead: false,
      },
    ],
  });

  console.log('[seed] Demo data created successfully:');
  console.log(`  Users: legalhead@demo.com, ra1@demo.com, ra2@demo.com, viewer@demo.com`);
  console.log(`  Manufacturers: ${mfgA.name}, ${mfgB.name}, ${mfgC.name}`);
  console.log(`  Products: ${[prod1, prod2, prod3, prod4].map((p) => p.manufacturerProductCode).join(', ')}`);
  console.log(`  Registrations: ${[reg1, reg2, reg3, reg4, reg2b].length} total`);
  console.log(`  Tasks: RA-2024-001, RA-2024-002, RA-2024-003`);
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
