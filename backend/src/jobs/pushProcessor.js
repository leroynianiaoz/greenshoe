import path from 'path';
import { pushQueue } from './pushQueue.js';
import { deploySite, backupProduction, rollbackToBackup } from '../services/deploy/deployService.js';
import { getSiteCredentials } from '../services/siteService.js';
import { createArchive } from '../services/archiveService.js';
import { notifyOperation } from '../services/notificationService.js';
import { createLiveSnapshot } from '../services/diffService.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/db.js';

const STAGING_BASE_PATH = process.env.STAGING_BASE_PATH || './staging';

/**
 * Process a push job
 */
async function processPushJob(job) {
  const { siteId, userId, files } = job.data;
  let backupPath = null;
  let deploymentStarted = false; // Track if we actually started deploying

  logger.info(`Processing push job for site ${siteId}${files ? ` (partial: ${files.length} files)` : ' (full push)'}`);

  // Create operation record
  const operation = await prisma.operation.create({
    data: {
      siteId,
      userId,
      type: 'PUSH',
      status: 'IN_PROGRESS',
      startedAt: new Date()
    }
  });

  try {
    // Update site status
    await prisma.site.update({
      where: { id: siteId },
      data: { status: 'PUSHING' }
    });

    // Get site details
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      throw new Error('Site not found');
    }

    // Get credentials
    const credentials = await getSiteCredentials(siteId);
    if (!credentials) {
      throw new Error('Site has no credentials configured');
    }

    // Source directory (staging)
    const stagingDir = path.join(STAGING_BASE_PATH, site.slug);

    // Step 1: Create backup of production
    logger.info('Step 1: Creating backup of production');
    job.progress(10);

    try {
      backupPath = path.join('./backups', site.slug, `pre-push-${Date.now()}`);
      await backupProduction(credentials, credentials.remotePath || '/public_html', backupPath);
    } catch (error) {
      logger.warn('Backup creation failed (non-fatal):', error.message);
      // Continue without backup
    }

    // Step 2: Create archive of staging version
    logger.info('Step 2: Creating archive of staging version');
    job.progress(30);
    await createArchive(siteId, stagingDir, 'push');

    // Step 3: Deploy to production
    logger.info('Step 3: Deploying to production');
    job.progress(50);
    deploymentStarted = true; // Mark that we're actually starting deployment

    const deployResult = await deploySite(
      stagingDir,
      credentials,
      credentials.remotePath || '/public_html',
      files // Pass optional file list for partial push
    );

    job.progress(90);

    // Update site
    await prisma.site.update({
      where: { id: siteId },
      data: { status: 'ACTIVE' }
    });

    // Update operation
    await prisma.operation.update({
      where: { id: operation.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: JSON.stringify({
          filesUploaded: deployResult.filesUploaded,
          backupCreated: !!backupPath
        })
      }
    });

    // Create snapshot of staging for future diffs
    try {
      await createLiveSnapshot(site.slug);
    } catch (error) {
      logger.warn('Failed to create live snapshot:', error.message);
      // Don't fail the push if snapshot creation fails
    }

    // Create notification
    await notifyOperation({
      userId,
      siteId,
      siteName: site.name,
      operation: 'push',
      status: 'success',
      message: `Successfully pushed ${site.name} to production (${deployResult.filesUploaded} files)`,
      metadata: {
        filesUploaded: deployResult.filesUploaded,
        backupCreated: !!backupPath,
        operationId: operation.id
      }
    });

    logger.info(`Push completed for site ${siteId}: ${deployResult.filesUploaded} files uploaded`);

    job.progress(100);

    return {
      success: true,
      filesUploaded: deployResult.filesUploaded
    };

  } catch (error) {
    logger.error(`Push failed for site ${siteId}:`, error.message);

    // Attempt rollback if we have a backup
    if (backupPath) {
      logger.info('Attempting automatic rollback...');
      try {
        const credentials = await getSiteCredentials(siteId);
        await rollbackToBackup(credentials, backupPath);
        logger.info('Rollback successful');

        // Update operation status
        await prisma.operation.update({
          where: { id: operation.id },
          data: {
            status: 'ROLLED_BACK',
            completedAt: new Date(),
            errorMessage: `Push failed: ${error.message}. Rolled back to backup.`
          }
        });

        // Update site status
        await prisma.site.update({
          where: { id: siteId },
          data: { status: 'ACTIVE' }
        });

      } catch (rollbackError) {
        logger.error('Rollback failed:', rollbackError.message);

        // Update site status to ERROR
        await prisma.site.update({
          where: { id: siteId },
          data: { status: 'ERROR' }
        });

        // Update operation to FAILED
        await prisma.operation.update({
          where: { id: operation.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: `Push failed: ${error.message}. Rollback also failed: ${rollbackError.message}`
          }
        });
      }
    } else {
      // No backup available
      // If deployment never started (pre-deployment error like missing credentials),
      // set status back to ACTIVE so user can still download staging content
      // Only use ERROR if deployment actually started (potential partial upload)
      const newStatus = deploymentStarted ? 'ERROR' : 'ACTIVE';

      await prisma.site.update({
        where: { id: siteId },
        data: { status: newStatus }
      });

      await prisma.operation.update({
        where: { id: operation.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: deploymentStarted
            ? error.message
            : `Pre-deployment error: ${error.message}. Staging content is still available.`
        }
      });

      if (!deploymentStarted) {
        logger.info(`Pre-deployment error for site ${siteId}, status set to ACTIVE (staging still available)`);
      }
    }

    // Create failure notification
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    await notifyOperation({
      userId,
      siteId,
      siteName: site?.name || 'Unknown site',
      operation: 'push',
      status: 'failure',
      message: `Failed to push site: ${error.message}`,
      metadata: {
        operationId: operation.id,
        error: error.message,
        rollbackAttempted: !!backupPath
      }
    });

    throw error;
  }
}

// Register processor
pushQueue.process(processPushJob);

logger.info('Push processor registered');

export { processPushJob };
