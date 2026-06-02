import { prisma } from '../lib/prisma.js';
import { notFound, badRequest, forbidden } from '../lib/http.js';
import { nextTaskCode } from '../lib/task-code.js';
import { syncCommercialStatus } from './product-registration.service.js';
import type { Prisma, TaskStatus, TaskType, Role } from '@prisma/client';

export const STATUS_ORDER: TaskStatus[] = [
  'NEW',
  'DOC_COLLECTION',
  'DOSSIER_PREP',
  'SUBMITTED',
  'REWORK_REQUIRED',
  'RESUBMITTED',
  'COMPLETED',
  'CANCELLED',
];

const stepNo = (s: TaskStatus) => STATUS_ORDER.indexOf(s);

function assertTransition(from: TaskStatus, to: TaskStatus, role: Role) {
  if (from === to) throw badRequest('Task is already in this status');
  if (to === 'CANCELLED') {
    if (from === 'CANCELLED') throw badRequest('Task already cancelled');
    return;
  }
  const reopen =
    (from === 'COMPLETED' || from === 'CANCELLED') && to === 'REWORK_REQUIRED';
  if (reopen) {
    if (role !== 'LEGAL_HEAD') throw forbidden('Only Legal Head can re-open this task');
    return;
  }
  if (from === 'COMPLETED' || from === 'CANCELLED') {
    throw badRequest('This task is closed. Only Legal Head can re-open it to Rework Required.');
  }
  const chain = STATUS_ORDER.filter((s) => s !== 'CANCELLED');
  if (chain.indexOf(to) <= chain.indexOf(from)) {
    throw badRequest(`Cannot move from ${from} to ${to}`);
  }
}

const taskInclude = {
  responsible: { select: { id: true, fullName: true, email: true } },
  supervisor: { select: { id: true, fullName: true, email: true } },
  observers: { include: { user: { select: { id: true, fullName: true } } } },
  productRegistration: {
    include: {
      licenseHolder: { select: { id: true, name: true } },
      product: {
        include: {
          manufacturer: { select: { id: true, name: true } },
          plants: { include: { plant: { select: { id: true, plantName: true } } } },
          countries: { select: { country: true } },
        },
      },
    },
  },
  case: true,
  taskProducts: {
    include: {
      product: {
        include: {
          manufacturer: { select: { id: true, name: true } },
          licenseHolders: { include: { licenseHolder: { select: { id: true, name: true } } } },
        },
      },
    },
  },
} satisfies Prisma.RegistrationTaskInclude;

export async function list(params: {
  status?: string;
  priority?: string;
  manufacturerId?: string;
  licenseHolderId?: string;
  ownershipType?: string;
  search?: string;
}) {
  const where: Prisma.RegistrationTaskWhereInput = {};
  if (params.status) where.status = params.status as TaskStatus;
  if (params.priority) where.priority = params.priority as Prisma.RegistrationTaskWhereInput['priority'];

  const regFilter: Prisma.ProductRegistrationWhereInput = {};
  if (params.licenseHolderId) regFilter.licenseHolderId = params.licenseHolderId;
  if (params.ownershipType) regFilter.ownershipType = params.ownershipType as Prisma.ProductRegistrationWhereInput['ownershipType'];
  if (params.manufacturerId) {
    regFilter.product = { manufacturerId: params.manufacturerId };
  }
  if (Object.keys(regFilter).length) where.productRegistration = regFilter;

  if (params.search) {
    where.OR = [
      { taskCode: { contains: params.search, mode: 'insensitive' } },
      { title: { contains: params.search, mode: 'insensitive' } },
      { responsible: { fullName: { contains: params.search, mode: 'insensitive' } } },
    ];
  }
  return prisma.registrationTask.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: taskInclude,
  });
}

export async function getById(id: string) {
  const t = await prisma.registrationTask.findUnique({
    where: { id },
    include: {
      ...taskInclude,
      statusHistory: {
        orderBy: { changedAt: 'desc' },
        include: { changedBy: { select: { fullName: true } } },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, fullName: true } } },
      },
      documents: {
        include: {
          productLinks: { include: { product: { select: { id: true, manufacturerProductCode: true } } } },
          uploadedBy: { select: { id: true, fullName: true } },
        },
      },
      certificateUploads: {
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: { select: { id: true, fullName: true } } },
      },
      classificationUploads: {
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: { select: { id: true, fullName: true } } },
      },
    },
  });
  if (!t) throw notFound('Task not found');
  return t;
}

export async function create(data: {
  taskType: TaskType;
  title: string;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  responsibleId?: string;
  supervisorId?: string;
  observerIds?: string[];
  productRegistrationId?: string;
  targetDeadline?: string | null;
  remarks?: string;
}) {
  const taskCode = await nextTaskCode();
  const task = await prisma.registrationTask.create({
    data: {
      taskCode,
      taskType: data.taskType,
      title: data.title,
      priority: data.priority ?? 'NORMAL',
      responsibleId: data.responsibleId,
      supervisorId: data.supervisorId,
      productRegistrationId: data.productRegistrationId,
      startDate: new Date(),
      targetDeadline: data.targetDeadline ? new Date(data.targetDeadline) : null,
      remarks: data.remarks,
      status: 'NEW',
      statusStepNo: 0,
      observers: data.observerIds?.length
        ? { create: data.observerIds.map((userId) => ({ userId })) }
        : undefined,
      case: {
        create: {
          productRegistrationId: data.productRegistrationId,
        },
      },
      statusHistory: { create: { fromStatus: null, toStatus: 'NEW', note: 'Task created' } },
    },
    include: taskInclude,
  });
  if (data.responsibleId) {
    await prisma.notification.create({
      data: {
        userId: data.responsibleId,
        type: 'TASK_ASSIGNED',
        title: 'Task assigned to you',
        message: `${task.taskCode} — ${task.title}`,
        link: `/tasks/${task.id}`,
      },
    });
  }
  return task;
}

export async function updateGeneral(
  id: string,
  data: {
    taskType?: TaskType;
    title?: string;
    priority?: 'HIGH' | 'NORMAL' | 'LOW';
    responsibleId?: string | null;
    supervisorId?: string | null;
    observerIds?: string[];
    productRegistrationId?: string | null;
    targetDeadline?: string | null;
    remarks?: string;
  },
) {
  await getById(id);
  return prisma.$transaction(async (tx) => {
    if (data.observerIds) {
      await tx.taskObserver.deleteMany({ where: { taskId: id } });
      if (data.observerIds.length)
        await tx.taskObserver.createMany({
          data: data.observerIds.map((userId) => ({ taskId: id, userId })),
        });
    }
    return tx.registrationTask.update({
      where: { id },
      data: {
        taskType: data.taskType,
        title: data.title,
        priority: data.priority,
        responsibleId: data.responsibleId,
        supervisorId: data.supervisorId,
        productRegistrationId: data.productRegistrationId,
        targetDeadline:
          data.targetDeadline === undefined
            ? undefined
            : data.targetDeadline
              ? new Date(data.targetDeadline)
              : null,
        remarks: data.remarks,
      },
      include: taskInclude,
    });
  });
}

// Tab 2 — Case details (no longer contains manufacturer/licenseHolder directly)
export async function updateCase(
  id: string,
  data: {
    caseNotes?: string;
    riskClass?: string;
  },
) {
  const task = await getById(id);
  if (!task.case) throw badRequest('Task has no case');
  const caseId = task.case.id;
  return prisma.registrationCase.update({
    where: { id: caseId },
    data: {
      caseNotes: data.caseNotes,
    },
  });
}

// Tab 4 — Submission & Results. Updates case + syncs ProductRegistration.
export async function updateSubmission(
  id: string,
  data: {
    submissionDate?: string | null;
    applicationNo?: string;
    registrationNo?: string;
    registrationExpiry?: string | null;
    classificationNumber?: string;
    approvalDate?: string | null;
    completionNotes?: string;
  },
) {
  const task = await getById(id);
  if (!task.case) throw badRequest('Task has no case');
  const caseId = task.case.id;

  return prisma.$transaction(async (tx) => {
    await tx.registrationCase.update({
      where: { id: caseId },
      data: {
        submissionDate: data.submissionDate ? new Date(data.submissionDate) : undefined,
        applicationNo: data.applicationNo,
        registrationNo: data.registrationNo,
        registrationExpiry: data.registrationExpiry ? new Date(data.registrationExpiry) : undefined,
        classificationNumber: data.classificationNumber,
        approvalDate: data.approvalDate ? new Date(data.approvalDate) : undefined,
        completionNotes: data.completionNotes,
      },
    });

    // Sync ProductRegistration with submission details
    if (task.productRegistrationId) {
      await tx.productRegistration.update({
        where: { id: task.productRegistrationId },
        data: {
          applicationNo: data.applicationNo,
          registrationNo: data.registrationNo,
          registrationExpiry: data.registrationExpiry ? new Date(data.registrationExpiry) : undefined,
          classificationNumber: data.classificationNumber,
          approvalDate: data.approvalDate ? new Date(data.approvalDate) : undefined,
        },
      });
    }

    return getById(id);
  });
}

// SPEC §11 — TaskService.changeStatus()
export async function changeStatus(
  id: string,
  toStatus: TaskStatus,
  actor: { id: string; role: Role },
  note?: string,
) {
  const task = await getById(id);
  assertTransition(task.status, toStatus, actor.role);

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.registrationTask.update({
      where: { id },
      data: {
        status: toStatus,
        statusStepNo: stepNo(toStatus),
        reworkCount: toStatus === 'REWORK_REQUIRED' ? { increment: 1 } : undefined,
        completedDate: toStatus === 'COMPLETED' ? new Date() : undefined,
      },
    });

    await tx.taskStatusHistory.create({
      data: {
        taskId: id,
        fromStatus: task.status,
        toStatus,
        changedById: actor.id,
        note,
      },
    });

    if (task.case && toStatus === 'COMPLETED') {
      await tx.registrationCase.update({
        where: { id: task.case.id },
        data: { caseStatus: 'CLOSED' },
      });
    }

    return t;
  });

  // Sync ProductRegistration commercial status (outside transaction for simplicity)
  if (task.productRegistrationId) {
    await syncCommercialStatus(task.productRegistrationId, task.taskType, toStatus);
  }

  // Notify supervisor + observers
  const recipients = new Set<string>();
  if (task.supervisorId) recipients.add(task.supervisorId);
  for (const o of task.observers) recipients.add(o.userId);
  if (toStatus === 'REWORK_REQUIRED' && task.responsibleId) recipients.add(task.responsibleId);
  recipients.delete(actor.id);
  if (recipients.size) {
    await prisma.notification.createMany({
      data: [...recipients].map((userId) => ({
        userId,
        type: toStatus === 'REWORK_REQUIRED' ? 'TASK_REWORK' : 'TASK_STATUS_CHANGED',
        title: toStatus === 'REWORK_REQUIRED' ? 'Task moved to Rework Required' : 'Task status changed',
        message: `${task.taskCode}: ${task.status} → ${toStatus}`,
        link: `/tasks/${task.id}`,
      })),
    });
  }

  return updated;
}

export async function addComment(taskId: string, userId: string, content: string) {
  await getById(taskId);
  return prisma.taskComment.create({
    data: { taskId, userId, content },
    include: { user: { select: { id: true, fullName: true } } },
  });
}

export async function updateComment(commentId: string, userId: string, content: string) {
  const c = await prisma.taskComment.findUnique({ where: { id: commentId } });
  if (!c) throw notFound('Comment not found');
  if (c.userId !== userId) throw forbidden('You can only edit your own comments');
  return prisma.taskComment.update({ where: { id: commentId }, data: { content } });
}

export async function deleteComment(commentId: string, actor: { id: string; role: Role }) {
  const c = await prisma.taskComment.findUnique({ where: { id: commentId } });
  if (!c) throw notFound('Comment not found');
  if (c.userId !== actor.id && actor.role !== 'LEGAL_HEAD')
    throw forbidden('You can only delete your own comments');
  return prisma.taskComment.delete({ where: { id: commentId } });
}

// Tab 2 — set products linked to this task
export async function updateProducts(taskId: string, productIds: string[]) {
  await getById(taskId);
  return prisma.$transaction(async (tx) => {
    await tx.taskProduct.deleteMany({ where: { taskId } });
    if (productIds.length) {
      await tx.taskProduct.createMany({
        data: productIds.map((productId) => ({ taskId, productId })),
        skipDuplicates: true,
      });
    }
    return getById(taskId);
  });
}
