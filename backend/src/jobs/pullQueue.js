import Queue from 'bull';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create pull queue
export const pullQueue = new Queue('pull-operations', REDIS_URL, {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200 // Keep last 200 failed jobs
  }
});

// Queue event listeners
pullQueue.on('error', (error) => {
  logger.error('Pull queue error:', error);
});

pullQueue.on('waiting', (jobId) => {
  logger.info(`Job ${jobId} is waiting`);
});

pullQueue.on('active', (job) => {
  logger.info(`Job ${job.id} started processing`);
});

pullQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed successfully`);
});

pullQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err.message);
});

pullQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

logger.info('Pull queue initialized');
