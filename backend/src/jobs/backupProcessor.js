import path from 'path';
import { backupQueue } from './backupQueue.js';
import { createArchive } from '../services/archiveService.js';
import { notifyOperation } from '../services/notificationService.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/db.js';

const STAGING_BASE_PATH = process.env.STAGING_BASE_PATH || './staging';

/**
 * Process a scheduled backup job
 */
async function processBackupJob(job) {
  const { siteId, userId, scheduled } = job.data;

  logger.info(`Processing ${scheduled ? 'scheduled' : 'manual'} backup job for site ${siteId}`);

  // Create operation record
  const operation = await prisma.operation.create({
    data: {
      siteId,
      userId,
      type: 'BACKUP',
      status: 'IN_PROGRESS',
      startedAt: new Date()
    }
  });

  try {
    // Get site details
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      throw new Error('Site not found');
    }

    // Source directory (staging)
    const stagingDir = path.join(STAGING_BASE_PATH, site.slug);

    // Create archive of staging version
    logger.info('Creating backup archive');
    job.progress(50);

    const archive = await createArchive(siteId, stagingDir, scheduled ? 'scheduled-backup' : 'manual-backup');

    job.progress(90);

    // Update operation
    await prisma.operation.update({
      where: { id: operation.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: JSON.stringify({
          archiveId: archive.id,
          archiveSize: archive.size,
          scheduled
        })
      }
    });

    // Create notification
    await notifyOperation({
      userId,
      siteId,
      siteName: site.name,
      operation: 'backup',
      status: 'success',
      message: `${scheduled ? 'Scheduled' : 'Manual'} backup completed for ${site.name}`,
      metadata: {
        archiveId: archive.id,
        archiveSize: archive.size,
        operationId: operation.id,
        scheduled
      }
    });

    logger.info(`Backup completed for site ${siteId}: ${archive.id}`);

    job.progress(100);

    return {
      success: true,
      archiveId: archive.id,
      archiveSize: archive.size
    };

  } catch (error) {
    logger.error(`Backup failed for site ${siteId}:`, error.message);

    // Update operation to FAILED
    await prisma.operation.update({
      where: { id: operation.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error.message
      }
    });

    // Create failure notification
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    await notifyOperation({
      userId,
      siteId,
      siteName: site?.name || 'Unknown site',
      operation: 'backup',
      status: 'failure',
      message: `Failed to backup site: ${error.message}`,
      metadata: {
        operationId: operation.id,
        error: error.message,
        scheduled
      }
    });

    throw error;
  }
}

// Register processor
backupQueue.process(processBackupJob);

logger.info('Backup processor registered');

export { processBackupJob };
