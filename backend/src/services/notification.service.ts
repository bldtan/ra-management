import { prisma } from '../lib/prisma.js';
import { notFound, forbidden } from '../lib/http.js';

export async function listForUser(userId: string, limit?: number) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markRead(id: string, userId: string) {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n) throw notFound('Notification not found');
  if (n.userId !== userId) throw forbidden();
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { ok: true };
}

// SPEC §20 — generate deadline + document-expiry notifications (idempotent-ish per day).
export async function generateDailyNotifications() {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const in30 = new Date(now.getTime() + 30 * 86400000);

  const dueTasks = await prisma.registrationTask.findMany({
    where: {
      targetDeadline: { gte: now, lte: in7 },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
  });
  for (const t of dueTasks) {
    const targets = [t.responsibleId, t.supervisorId].filter(Boolean) as string[];
    for (const userId of targets) {
      const exists = await prisma.notification.findFirst({
        where: { userId, type: 'TASK_DEADLINE', link: `/tasks/${t.id}`, createdAt: { gte: new Date(now.toDateString()) } },
      });
      if (!exists)
        await prisma.notification.create({
          data: {
            userId,
            type: 'TASK_DEADLINE',
            title: 'Task deadline in 7 days',
            message: `${t.taskCode} — ${t.title}`,
            link: `/tasks/${t.id}`,
          },
        });
    }
  }

  const expiringDocs = await prisma.registrationDocument.findMany({
    where: { expiryDate: { gte: now, lte: in30 } },
    include: { task: { select: { id: true, responsibleId: true, supervisorId: true } } },
  });
  for (const d of expiringDocs) {
    if (!d.task) continue;
    const targets = [d.task.responsibleId, d.task.supervisorId].filter(Boolean) as string[];
    for (const userId of targets) {
      const exists = await prisma.notification.findFirst({
        where: { userId, type: 'DOC_EXPIRING', link: `/documents?doc=${d.id}`, createdAt: { gte: new Date(now.toDateString()) } },
      });
      if (!exists)
        await prisma.notification.create({
          data: {
            userId,
            type: 'DOC_EXPIRING',
            title: 'Document expiring in 30 days',
            message: d.documentNumber ?? d.documentType,
            link: `/documents?doc=${d.id}`,
          },
        });
    }
  }
}
