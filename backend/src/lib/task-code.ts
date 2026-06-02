import { prisma } from './prisma.js';

// Generates next task code: RA-YYYY-NNN (NNN zero-padded, per calendar year).
export async function nextTaskCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RA-${year}-`;
  const last = await prisma.registrationTask.findFirst({
    where: { taskCode: { startsWith: prefix } },
    orderBy: { taskCode: 'desc' },
    select: { taskCode: true },
  });
  let seq = 1;
  if (last) {
    const n = parseInt(last.taskCode.slice(prefix.length), 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(3, '0')}`;
}
