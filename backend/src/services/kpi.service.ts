import { prisma } from '../lib/prisma.js';
import type { RegistrationTask } from '@prisma/client';

function computeMetrics(tasks: RegistrationTask[]) {
  const now = new Date();
  const active = tasks.filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.status));
  const completed = tasks.filter((t) => t.status === 'COMPLETED');
  const overdue = active.filter((t) => t.targetDeadline && t.targetDeadline < now);
  const reworkCount = tasks.reduce((s, t) => s + t.reworkCount, 0);

  const completionDays = completed
    .filter((t) => t.completedDate && t.startDate)
    .map((t) => (t.completedDate!.getTime() - t.startDate!.getTime()) / 86400000);
  const avgCompletionDays = completionDays.length
    ? +(completionDays.reduce((a, b) => a + b, 0) / completionDays.length).toFixed(1)
    : 0;

  const onTime = completed.filter(
    (t) => t.completedDate && t.targetDeadline && t.completedDate <= t.targetDeadline,
  ).length;
  const firstPass = completed.filter((t) => t.reworkCount === 0).length;

  return {
    activeTasks: active.length,
    completedTasks: completed.length,
    overdueTasks: overdue.length,
    reworkCount,
    avgCompletionDays,
    reworkRate: tasks.length ? +((reworkCount / tasks.length) * 100).toFixed(1) : 0,
    onTimeRate: completed.length ? +((onTime / completed.length) * 100).toFixed(1) : 0,
    firstPassRate: completed.length ? +((firstPass / completed.length) * 100).toFixed(1) : 0,
  };
}

function monthlyMovement(tasks: RegistrationTask[], from: Date, to: Date) {
  const buckets: Record<string, { month: string; completed: number; created: number }> = {};
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    buckets[key] = { month: key, completed: 0, created: 0 };
    cursor.setMonth(cursor.getMonth() + 1);
  }
  for (const t of tasks) {
    const ck = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (buckets[ck]) buckets[ck].created++;
    if (t.completedDate) {
      const mk = `${t.completedDate.getFullYear()}-${String(t.completedDate.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[mk]) buckets[mk].completed++;
    }
  }
  return Object.values(buckets);
}

export async function personalKpi(userId: string, from?: string, to?: string) {
  const fromD = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
  const toD = to ? new Date(to) : new Date();
  const tasks = await prisma.registrationTask.findMany({
    where: {
      OR: [{ responsibleId: userId }, { supervisorId: userId }],
      createdAt: { gte: fromD, lte: toD },
    },
  });
  return { metrics: computeMetrics(tasks), movement: monthlyMovement(tasks, fromD, toD) };
}

export async function teamKpi(from?: string, to?: string) {
  const fromD = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
  const toD = to ? new Date(to) : new Date();
  const users = await prisma.user.findMany({
    where: { role: { in: ['LEGAL_HEAD', 'RA_STAFF'] } },
    select: { id: true, fullName: true },
  });
  const result = [];
  for (const u of users) {
    const tasks = await prisma.registrationTask.findMany({
      where: { responsibleId: u.id, createdAt: { gte: fromD, lte: toD } },
    });
    result.push({
      userId: u.id,
      fullName: u.fullName,
      metrics: computeMetrics(tasks),
      movement: monthlyMovement(tasks, fromD, toD),
    });
  }
  return result;
}
