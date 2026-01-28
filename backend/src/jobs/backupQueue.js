import Queue from 'bull';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Queue for scheduled backup operations
 */
export const backupQueue = new Queue('backup', REDIS_URL, {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 100     // Keep last 100 failed jobs
  }
});

// Log queue events
backupQueue.on('completed', (job) => {
  logger.info(`Backup job ${job.id} completed`);
});

backupQueue.on('failed', (job, err) => {
  logger.error(`Backup job ${job.id} failed:`, err.message);
});

backupQueue.on('stalled', (job) => {
  logger.warn(`Backup job ${job.id} stalled`);
});

logger.info('Backup queue initialized');
