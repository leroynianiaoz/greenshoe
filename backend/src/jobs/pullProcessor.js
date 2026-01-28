import path from 'path';
import { pullQueue } from './pullQueue.js';
import { crawlWebsite } from '../services/crawler/crawlerService.js';
import { rewriteUrls } from '../services/crawler/urlRewriteService.js';
import { notifyOperation, emitProgress } from '../services/notificationService.js';
import { createLiveSnapshot } from '../services/diffService.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/db.js';

const STAGING_BASE_PATH = process.env.STAGING_BASE_PATH || './staging';
const STAGING_DOMAIN = process.env.STAGING_DOMAIN || 'http://localhost:8081';

/**
 * Process a pull job
 */
async function processPullJob(job) {
  const { siteId, userId } = job.data;

  logger.info(`Processing pull job for site ${siteId}`);

  // Create operation record
  const operation = await prisma.operation.create({
    data: {
      siteId,
      userId,
      type: 'PULL',
      status: 'IN_PROGRESS',
      startedAt: new Date()
    }
  });

  try {
    // Update site status
    await prisma.site.update({
      where: { id: siteId },
      data: { status: 'PULLING' }
    });

    // Get site details
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      throw new Error('Site not found');
    }

    // Determine output directory
    const outputDir = path.join(STAGING_BASE_PATH, site.slug);

    // Progress callback
    const maxPages = 100;
    const onProgress = (progress) => {
      // Calculate percentage based on maxPages limit
      // For sites < 100 pages: shows accurate percentage
      // For sites > 100 pages: caps at 100% but page count keeps updating
      const percentage = Math.min(100, Math.round((progress.pagesProcessed / maxPages) * 100));
      job.progress(percentage);
      logger.info(`Pull progress: ${progress.pagesProcessed} pages processed (${percentage}%)`);

      // Emit real-time progress via WebSocket with percentage
      emitProgress({
        userId,
        siteId,
        operation: 'pull',
        progress: percentage,
        message: `Crawling... ${progress.pagesProcessed} pages processed`
      });
    };

    // Crawl the website
    logger.info(`Crawling ${site.liveUrl} to ${outputDir}`);
    const crawlResult = await crawlWebsite(site.liveUrl, outputDir, {
      maxPages: maxPages,
      timeout: 30000,
      onProgress
    });

    // Rewrite URLs
    const stagingUrl = `${STAGING_DOMAIN}/${site.slug}`;
    logger.info(`Rewriting URLs from ${site.liveUrl} to ${stagingUrl}`);

    // Emit progress for URL rewriting stage
    emitProgress({
      userId,
      siteId,
      operation: 'pull',
      progress: 100,
      message: 'Rewriting URLs...'
    });

    await rewriteUrls(outputDir, site.liveUrl, stagingUrl);

    // Update site
    await prisma.site.update({
      where: { id: siteId },
      data: {
        status: 'ACTIVE',
        lastPulledAt: new Date()
      }
    });

    // Update operation
    await prisma.operation.update({
      where: { id: operation.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: JSON.stringify({
          pagesProcessed: crawlResult.pagesProcessed,
          outputDir: crawlResult.outputDir
        })
      }
    });

    // Create snapshot of pulled site for future diffs
    try {
      await createLiveSnapshot(site.slug);
    } catch (error) {
      logger.warn('Failed to create live snapshot:', error.message);
      // Don't fail the pull if snapshot creation fails
    }

    // Create notification
    await notifyOperation({
      userId,
      siteId,
      siteName: site.name,
      operation: 'pull',
      status: 'success',
      message: `Successfully pulled ${site.name} (${crawlResult.pagesProcessed} pages)`,
      metadata: {
        pagesProcessed: crawlResult.pagesProcessed,
        operationId: operation.id,
        stagingUrl
      }
    });

    logger.info(`Pull completed for site ${siteId}: ${crawlResult.pagesProcessed} pages`);

    return {
      success: true,
      pagesProcessed: crawlResult.pagesProcessed,
      stagingUrl
    };

  } catch (error) {
    logger.error(`Pull failed for site ${siteId}:`, error.message);

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
        errorMessage: error.message
      }
    });

    // Create failure notification
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    await notifyOperation({
      userId,
      siteId,
      siteName: site?.name || 'Unknown site',
      operation: 'pull',
      status: 'failure',
      message: `Failed to pull site: ${error.message}`,
      metadata: {
        operationId: operation.id,
        error: error.message
      }
    });

    throw error;
  }
}

// Register processor
pullQueue.process(processPullJob);

logger.info('Pull processor registered');

export { processPullJob };
