import { prisma } from '../lib/prisma.js';

export async function summary(userId: string) {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const d30 = new Date(now.getTime() + 30 * 86400000);
  const d60 = new Date(now.getTime() + 60 * 86400000);
  const d90 = new Date(now.getTime() + 90 * 86400000);

  const [
    totalProducts,
    totalRegistrations,
    activeRegistrations,
    vmedOwnedActive,
    monitoredActive,
    activeTasks,
    myActiveTasks,
    overdueTasks,
    completedThisMonth,
    completedPrevMonth,
    reworkRequired,
    dueSoon,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.productRegistration.count(),
    prisma.productRegistration.count({ where: { commercialStatus: 'ACTIVE' } }),
    prisma.productRegistration.count({ where: { commercialStatus: 'ACTIVE', ownershipType: 'VMED_OWNED' } }),
    prisma.productRegistration.count({ where: { commercialStatus: 'ACTIVE', ownershipType: 'MONITORED' } }),
    prisma.registrationTask.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.registrationTask.count({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, responsibleId: userId },
    }),
    prisma.registrationTask.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, targetDeadline: { lt: now } },
      select: { priority: true },
    }),
    prisma.registrationTask.count({ where: { status: 'COMPLETED', completedDate: { gte: startMonth } } }),
    prisma.registrationTask.count({
      where: { status: 'COMPLETED', completedDate: { gte: startPrevMonth, lt: startMonth } },
    }),
    prisma.registrationTask.count({ where: { status: 'REWORK_REQUIRED' } }),
    prisma.registrationTask.findMany({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        targetDeadline: { gte: now, lte: in7 },
      },
      orderBy: { targetDeadline: 'asc' },
      select: { id: true, taskCode: true, title: true, targetDeadline: true, status: true },
    }),
  ]);

  // Docs expiring — from 3 sources
  const [docExp30, docExp60, docExp90, certExp30, certExp60, certExp90, clsExp30, clsExp60, clsExp90] = await Promise.all([
    prisma.registrationDocument.count({ where: { expiryDate: { gte: now, lte: d30 } } }),
    prisma.registrationDocument.count({ where: { expiryDate: { gt: d30, lte: d60 } } }),
    prisma.registrationDocument.count({ where: { expiryDate: { gt: d60, lte: d90 } } }),
    prisma.registrationCertificateHistory.count({ where: { expiryDate: { gte: now, lte: d30 }, isCurrent: true } }),
    prisma.registrationCertificateHistory.count({ where: { expiryDate: { gt: d30, lte: d60 }, isCurrent: true } }),
    prisma.registrationCertificateHistory.count({ where: { expiryDate: { gt: d60, lte: d90 }, isCurrent: true } }),
    prisma.classificationResultHistory.count({ where: { expiryDate: { gte: now, lte: d30 }, isCurrent: true } }),
    prisma.classificationResultHistory.count({ where: { expiryDate: { gt: d30, lte: d60 }, isCurrent: true } }),
    prisma.classificationResultHistory.count({ where: { expiryDate: { gt: d60, lte: d90 }, isCurrent: true } }),
  ]);

  return {
    totalProducts,
    totalRegistrations,
    activeRegistrations,
    vmedOwnedActive,
    monitoredActive,
    activeTasks,
    myActiveTasks,
    overdueHigh: overdueTasks.filter((t: { priority: string }) => t.priority === 'HIGH').length,
    overdueNormal: overdueTasks.filter((t: { priority: string }) => t.priority !== 'HIGH').length,
    completedThisMonth,
    completedPrevMonth,
    reworkRequired,
    docsExpiring: {
      d30: docExp30 + certExp30 + clsExp30,
      d60: docExp60 + certExp60 + clsExp60,
      d90: docExp90 + certExp90 + clsExp90,
    },
    dueSoon,
  };
}
