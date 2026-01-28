import Queue from 'bull';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create push queue
export const pushQueue = new Queue('push-operations', REDIS_URL, {
  defaultJobOptions: {
    attempts: 1, // Don't retry pushes automatically
    removeOnComplete: 100,
    removeOnFail: 200
  }
});

// Queue event listeners
pushQueue.on('error', (error) => {
  logger.error('Push queue error:', error);
});

pushQueue.on('active', (job) => {
  logger.info(`Push job ${job.id} started`);
});

pushQueue.on('completed', (job, result) => {
  logger.info(`Push job ${job.id} completed successfully`);
});

pushQueue.on('failed', (job, err) => {
  logger.error(`Push job ${job.id} failed:`, err.message);
});

logger.info('Push queue initialized');
