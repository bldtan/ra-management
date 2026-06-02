import cron from 'node-cron';
import { runAutoUpdate } from '../services/document.service.js';
import { generateDailyNotifications } from '../services/notification.service.js';

export async function runDailyTasks() {
  try {
    const docResult = await runAutoUpdate();
    await generateDailyNotifications();
    console.log(
      `[daily-job] documents scanned=${docResult.scanned} needUpdate=${docResult.needUpdate} expired=${docResult.expired}; notifications generated`,
    );
  } catch (e) {
    console.error('[daily-job] failed:', e);
  }
}

// Runs once on server start, then daily at 00:01 (SPEC §14 / §20).
export function scheduleDailyJob() {
  runDailyTasks();
  cron.schedule('1 0 * * *', runDailyTasks);
  console.log('[daily-job] scheduled for 00:01 daily');
}
