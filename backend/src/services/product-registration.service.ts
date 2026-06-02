import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/http.js';
import type { Prisma, CommercialStatus, TaskType, TaskStatus, OwnershipType, WorkflowStatus } from '@prisma/client';

const regInclude = {
  licenseHolder: { select: { id: true, name: true } },
  tasks: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { id: true, taskCode: true, status: true, taskType: true },
  },
} satisfies Prisma.ProductRegistrationInclude;

export async function getById(id: string) {
  const reg = await prisma.productRegistration.findUnique({
    where: { id },
    include: regInclude,
  });
  if (!reg) throw notFound('ProductRegistration not found');
  return reg;
}

export async function create(data: {
  productId: string;
  licenseHolderId: string;
  ownershipType: OwnershipType;
  registrationNo?: string;
  registrationExpiry?: string | null;
  approvalDate?: string | null;
  applicationNo?: string;
  classificationNumber?: string;
  commercialStatus?: CommercialStatus;
  workflowStatus?: WorkflowStatus;
  notes?: string;
}) {
  return prisma.productRegistration.create({
    data: {
      productId: data.productId,
      licenseHolderId: data.licenseHolderId,
      ownershipType: data.ownershipType,
      registrationNo: data.registrationNo,
      registrationExpiry: data.registrationExpiry ? new Date(data.registrationExpiry) : null,
      approvalDate: data.approvalDate ? new Date(data.approvalDate) : null,
      applicationNo: data.applicationNo,
      classificationNumber: data.classificationNumber,
      commercialStatus: data.commercialStatus ?? 'INACTIVE_LICENSE_PENDING',
      workflowStatus: data.workflowStatus ?? 'NOT_STARTED',
      notes: data.notes,
    },
    include: regInclude,
  });
}

export async function update(
  id: string,
  data: {
    licenseHolderId?: string;
    ownershipType?: OwnershipType;
    registrationNo?: string | null;
    registrationExpiry?: string | null;
    approvalDate?: string | null;
    applicationNo?: string | null;
    classificationNumber?: string | null;
    commercialStatus?: CommercialStatus;
    workflowStatus?: WorkflowStatus;
    isActive?: boolean;
    notes?: string | null;
  },
) {
  await getById(id);
  return prisma.productRegistration.update({
    where: { id },
    data: {
      licenseHolderId: data.licenseHolderId,
      ownershipType: data.ownershipType,
      registrationNo: data.registrationNo,
      registrationExpiry: data.registrationExpiry !== undefined
        ? (data.registrationExpiry ? new Date(data.registrationExpiry) : null)
        : undefined,
      approvalDate: data.approvalDate !== undefined
        ? (data.approvalDate ? new Date(data.approvalDate) : null)
        : undefined,
      applicationNo: data.applicationNo,
      classificationNumber: data.classificationNumber,
      commercialStatus: data.commercialStatus,
      workflowStatus: data.workflowStatus,
      isActive: data.isActive,
      notes: data.notes,
    },
    include: regInclude,
  });
}

export async function remove(id: string) {
  await getById(id);
  return prisma.productRegistration.delete({ where: { id } });
}

// Sync commercial status based on task completion (SPEC §8)
export async function syncCommercialStatus(
  registrationId: string,
  taskType: TaskType,
  taskStatus: TaskStatus,
): Promise<void> {
  const reg = await prisma.productRegistration.findUnique({ where: { id: registrationId } });
  if (!reg) return;

  let newCommercialStatus: CommercialStatus = reg.commercialStatus;
  let newWorkflowStatus: WorkflowStatus = reg.workflowStatus;

  switch (taskType) {
    case 'NEW_REGISTRATION':
      if (taskStatus === 'COMPLETED') {
        newCommercialStatus = 'ACTIVE';
        newWorkflowStatus = 'REGISTERED';
      } else if (taskStatus === 'CANCELLED') {
        newWorkflowStatus = 'NOT_STARTED';
      } else {
        newCommercialStatus = 'INACTIVE_LICENSE_PENDING';
        newWorkflowStatus = 'IN_PROGRESS';
      }
      break;
    case 'RENEWAL':
      if (taskStatus === 'COMPLETED') {
        newCommercialStatus = 'ACTIVE';
        newWorkflowStatus = 'REGISTERED';
      } else if (taskStatus !== 'CANCELLED') {
        newWorkflowStatus = 'IN_PROGRESS';
      }
      break;
    case 'REVOCATION':
      if (taskStatus === 'COMPLETED') {
        newCommercialStatus = 'INACTIVE_LICENSE_REVOKED';
        newWorkflowStatus = 'NOT_STARTED';
      }
      break;
    case 'CHANGE_NOTIFICATION':
      // No status change per SPEC
      break;
  }

  await prisma.productRegistration.update({
    where: { id: registrationId },
    data: {
      commercialStatus: newCommercialStatus,
      workflowStatus: newWorkflowStatus,
    },
  });
}
