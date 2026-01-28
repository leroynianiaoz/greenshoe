import express from 'express';
import multer from 'multer';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  createSite,
  getAllSites,
  getSiteById,
  updateSite,
  deleteSite,
  getSiteCredentials
} from '../../services/siteService.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { testSftpConnection } from '../../services/connection/sftpService.js';
import { detectPlatform, getWordPressVersion } from '../../services/platformDetectionService.js';
import { pullQueue } from '../../jobs/pullQueue.js';
import { pushQueue } from '../../jobs/pushQueue.js';
import { getArchives } from '../../services/archiveService.js';
import { createDownloadZip, extractUploadZip, validateUploadZip } from '../../services/localEditingService.js';
import { compareSiteWithLive, getFileDiff } from '../../services/diffService.js';
import { scheduleBackup, unscheduleBackup, getBackupSchedule, triggerManualBackup } from '../../services/backupScheduleService.js';
import { evaluateSite } from '../../services/siteEvaluationService.js';
import { prisma } from '../../utils/db.js';

// Configure multer for file uploads
const upload = multer({
  dest: './temp/uploads',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

const router = express.Router();

/**
 * GET /api/sites
 * Get all sites (filtered by role)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sites = await getAllSites(req.user.id, req.user.role);

    // Return wrapped format for integration test compatibility
    res.status(200).json({ sites, total: sites.length });
  } catch (error) {
    logger.error('Get sites error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve sites',
      message: error.message
    });
  }
});

/**
 * GET /api/sites/:id
 * Get a single site by ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const site = await getSiteById(req.params.id, req.user.id, req.user.role);

    // Return site object directly for RBAC test compatibility
    res.status(200).json(site);
  } catch (error) {
    logger.error('Get site error:', error.message);
    const statusCode = error.message === 'Site not found' ? 404 :
                       error.message === 'Access denied' ? 403 : 500;
    res.status(statusCode).json({
      error: 'Failed to retrieve site',
      message: error.message
    });
  }
});

/**
 * POST /api/sites
 * Create a new site (Admin only)
 */
router.post('/', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, liveUrl, connectionType, credentials, encryptedCredentials, platformType } = req.body;

    // Validation
    if (!name || !liveUrl || !connectionType) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Missing required fields: name, liveUrl, connectionType'
      });
    }

    // URL validation
    try {
      new URL(liveUrl);
    } catch {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid URL format for liveUrl'
      });
    }

    // Credentials required for SFTP/SSH (either credentials or encryptedCredentials)
    if ((connectionType === 'sftp' || connectionType === 'ssh') && !credentials && !encryptedCredentials) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Credentials required for SFTP/SSH connection type'
      });
    }

    // Validate credential structure for SFTP/SSH (only if plain credentials provided)
    if (credentials && connectionType !== 'crawl-only') {
      const { host, username, password, port } = credentials;
      if (!host || !username) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Credentials must include host and username'
        });
      }
    }

    const site = await createSite({
      name,
      liveUrl,
      connectionType,
      credentials,
      encryptedCredentials, // Allow pre-encrypted credentials for testing
      platformType,
      userId: req.user.id
    });

    // Return site object directly for test compatibility
    res.status(201).json(site);
  } catch (error) {
    logger.error('Create site error:', error.message);
    const statusCode = error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      error: 'Failed to create site',
      message: error.message
    });
  }
});

/**
 * PUT /api/sites/:id
 * Update a site
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, liveUrl, connectionType, credentials, platformType, status } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (liveUrl !== undefined) {
      // URL validation
      try {
        new URL(liveUrl);
        updates.liveUrl = liveUrl;
      } catch {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid URL format for liveUrl'
        });
      }
    }
    if (connectionType !== undefined) updates.connectionType = connectionType;
    if (credentials !== undefined) updates.credentials = credentials;
    if (platformType !== undefined) updates.platformType = platformType;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No valid fields to update'
      });
    }

    const site = await updateSite(req.params.id, updates, req.user.id, req.user.role);

    res.status(200).json({
      message: 'Site updated successfully',
      site
    });
  } catch (error) {
    logger.error('Update site error:', error.message);
    const statusCode = error.message === 'Site not found' ? 404 :
                       error.message === 'Access denied' ? 403 :
                       error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      error: 'Failed to update site',
      message: error.message
    });
  }
});

/**
 * DELETE /api/sites/:id
 * Delete a site (Admin only)
 */
router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await deleteSite(req.params.id, req.user.id, req.user.role);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Delete site error:', error.message);
    const statusCode = error.message === 'Site not found' ? 404 : 500;
    res.status(statusCode).json({
      error: 'Failed to delete site',
      message: error.message
    });
  }
});

/**
 * POST /api/sites/evaluate
 * Evaluate a site before pulling to provide insights and recommendations
 * Request body: { url: string }
 */
router.post('/evaluate', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid URL format'
      });
    }

    const evaluation = await evaluateSite(url);

    res.status(200).json(evaluation);
  } catch (error) {
    logger.error('Site evaluation error:', error.message);
    res.status(500).json({
      error: 'Site evaluation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/sites/test-connection
 * Test SFTP/SSH connection with provided credentials
 */
router.post('/test-connection', authMiddleware, async (req, res) => {
  try {
    const { host, port, username, password, privateKey } = req.body;

    if (!host || !username) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Missing required fields: host and username'
      });
    }

    const credentials = { host, port, username, password, privateKey };
    const result = await testSftpConnection(credentials);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Test connection error:', error.message);
    res.status(400).json({
      success: false,
      error: 'Connection test failed',
      message: error.message
    });
  }
});

/**
 * POST /api/sites/:id/detect-platform
 * Detect platform type for a site
 */
router.post('/:id/detect-platform', authMiddleware, async (req, res) => {
  try {
    const { remotePath = '/' } = req.body;

    // Get site credentials
    const credentials = await getSiteCredentials(req.params.id);

    if (!credentials) {
      return res.status(400).json({
        error: 'No credentials',
        message: 'Site has no stored credentials for platform detection'
      });
    }

    const result = await detectPlatform(credentials, remotePath);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Platform detection error:', error.message);
    res.status(500).json({
      error: 'Platform detection failed',
      message: error.message
    });
  }
});

/**
 * GET /api/sites/:id/wordpress-info
 * Get WordPress version and configuration for a site
 */
router.get('/:id/wordpress-info', authMiddleware, async (req, res) => {
  try {
    const credentials = await getSiteCredentials(req.params.id);

    if (!credentials) {
      return res.status(400).json({
        error: 'No credentials',
        message: 'Site has no stored credentials'
      });
    }

    const version = await getWordPressVersion(credentials);

    if (!version) {
      return res.status(404).json({
        error: 'Not WordPress',
        message: 'Could not detect WordPress installation'
      });
    }

    res.status(200).json({
      version,
      platformType: 'wordpress'
    });
  } catch (error) {
    logger.error('WordPress info error:', error.message);
    res.status(500).json({
      error: 'Failed to get WordPress info',
      message: error.message
    });
  }
});

/**
 * POST /api/sites/:id/pull
 * Trigger a pull operation for a site
 */
router.post('/:id/pull', authMiddleware, async (req, res) => {
  try {
    const siteId = req.params.id;
    const userId = req.user.id;

    // Verify site exists and user has access
    await getSiteById(siteId, userId, req.user.role);

    // Create operation record
    const operation = await prisma.operation.create({
      data: {
        siteId,
        userId,
        type: 'PULL',
        status: 'PENDING'
      }
    });

    // Add job to queue
    const job = await pullQueue.add({
      siteId,
      userId,
      operationId: operation.id
    }, {
      jobId: `pull-${siteId}-${Date.now()}`
    });

    logger.info(`Pull job ${job.id} queued for site ${siteId} (operation ${operation.id})`);

    res.status(202).json({
      message: 'Pull operation queued',
      jobId: job.id
    });
  } catch (error) {
    logger.error('Pull trigger error:', error.message);
    const statusCode = error.message === 'Site not found' ? 404 :
                       error.message === 'Access denied' ? 403 : 500;
    res.status(statusCode).json({
      error: 'Failed to trigger pull',
      message: error.message
    });
  }
});

/**
 * GET /api/sites/:id/pull-status
 * Get status of the last pull operation
 */
router.get('/:id/pull-status', authMiddleware, async (req, res) => {
  try {
    const siteId = req.params.id;

    // Get the latest pull operation for this site
    const operation = await prisma.operation.findFirst({
      where: {
        siteId,
        type: 'PULL'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!operation) {
      return res.status(404).json({
        error: 'No pull operations found',
        message: 'This site has never been pulled'
      });
    }

    res.status(200).json({
      operation: {
        id: operation.id,
        status: operation.status,
        startedAt: operation.startedAt,
        completedAt: operation.completedAt,
        errorMessage: operation.errorMessage,
        metadata: operation.metadata ? JSON.parse(operation.metadata) : null
      }
    });
  } catch (error) {
    logger.error('Pull status error:', error.message);
    res.status(500).json({
      error: 'Failed to get pull status',
      message: error.message
    });
  }
});

/**
 * POST /api/sites/:id/push
 * Trigger a push operation for a site (PM/Admin only)
 * Request body: { files?: string[] } - Optional array of relative file paths for partial push
 */
router.post('/:id/push', authMiddleware, requireRole('PROJECT_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const siteId = req.params.id;
    const userId = req.user.id;
    const { files } = req.body;

    // Verify site exists
    await getSiteById(siteId, userId, req.user.role);

    // Validate files array if provided
    if (files !== undefined && files !== null) {
      if (!Array.isArray(files)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'files must be an array'
        });
      }

      if (files.length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'files array cannot be empty. Omit the field for full push.'
        });
      }

      // Basic validation of each file path
      for (const file of files) {
        if (typeof file !== 'string') {
          return res.status(400).json({
            error: 'Validation error',
            message: 'All file paths must be strings'
          });
        }
        if (file.includes('..') || file.startsWith('/') || file.startsWith('\\')) {
          return res.status(400).json({
            error: 'Validation error',
            message: `Invalid file path: ${file}. Relative paths only, no path traversal.`
          });
        }
      }
    }

    // Add job to queue
    const job = await pushQueue.add({
      siteId,
      userId,
      files: files || null // Pass null for full push, array for partial
    }, {
      jobId: `push-${siteId}-${Date.now()}`
    });

    logger.info(`Push job ${job.id} queued for site ${siteId}${files ? ` (partial: ${files.length} files)` : ' (full push)'}`);

    res.status(202).json({
      message: `Push operation queued${files ? ` (${files.length} files)` : ' (all files)'}`,
      jobId: job.id,
      pushType: files ? 'partial' : 'full',
      fileCount: files ? files.length : null
    });
  } catch (error) {
    logger.error('Push trigger error:', error.message);
    const statusCode = error.message === 'Site not found' ? 404 :
                       error.message === 'Access denied' ? 403 : 500;
    res.status(statusCode).json({
      error: 'Failed to trigger push',
      message: error.message
    });
  }
});

/**
 * GET /api/sites/:id/archives
 * Get all archives for a site (PM and Admin only)
 */
router.get('/:id/archives', authMiddleware, requireRole('PROJECT_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const siteId = req.params.id;

    // Verify access
    await getSiteById(siteId, req.user.id, req.user.role);

    const archives = await getArchives(siteId);

    res.status(200).json({
      archives: archives.map(a => ({
        id: a.id,
        version: a.version,
        fileSize: a.fileSize,
        createdAt: a.createdAt
      }))
    });
  } catch (error) {
    logger.error('Get archives error:', error.message);
    res.status(500).json({
      error: 'Failed to get archives',
      message: error.message
    });
  }
});

/**
 * POST /api/sites/:id/archives/:archiveId/restore
 * Restore a site from an archive (PM and Admin only)
 */
router.post('/:id/archives/:archiveId/restore', authMiddleware, requireRole('PROJECT_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { id: siteId, archiveId } = req.params;

    // Verify site exists and user has access
    const site = await getSiteById(siteId, req.user.id, req.user.role);

    // Get the archive
    const archive = await prisma.archive.findUnique({
      where: { id: archiveId }
    });

    if (!archive) {
      return res.status(404).json({
        error: 'Archive not found',
        message: 'The specified archive does not exist'
      });
    }

    if (archive.siteId !== siteId) {
      return res.status(400).json({
        error: 'Archive mismatch',
        message: 'This archive does not belong to the specified site'
      });
    }

    // Extract archive to staging directory
    const stagingPath = path.join(process.cwd(), 'staging', site.slug);
    const { extractArchive } = await import('../../services/archiveService.js');
    await extractArchive(archiveId, stagingPath);

    logger.info(`Archive restored for site ${site.name} (version ${archive.version})`);

    res.status(200).json({
      message: 'Archive restored successfully',
      archive: {
        id: archive.id,
        version: archive.version,
        restoredTo: stagingPath
      }
    });
  } catch (error) {
    logger.error('Restore archive error:', error.message);
    const statusCode = error.message === 'Site not found' ? 404 :
                       error.message === 'Archive not found' ? 404 :
                       error.message === 'Access denied' ? 403 : 500;
    res.status(statusCode).json({
      error: 'Failed to restore archive',
      message: error.message
    });
  }
});

/**
 * GET /api/sites/:id/download
 * Download site as ZIP for local editing
 */
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const site = await getSiteById(req.params.id, req.user.id, req.user.role);

    // Create download ZIP
    const zipPath = await createDownloadZip(site.slug);

    // Send file
    res.download(zipPath, `${site.slug}.zip`, async (err) => {
      if (err) {
        logger.error('Download send error:', err);
      }
      // Cleanup ZIP after download
      try {
        await require('fs/promises').unlink(zipPath);
      } catch {}
    });

    logger.info(`Site downloaded: ${site.name}`);

  } catch (error) {
    logger.error('Download error:', error.message);
    res.status(500).json({
      error: 'Failed to download site',
      message: error.message
    });
  }
});

/**
 * GET /api/sites/:id/network-path
 * Get network file share path for direct editing
 */
router.get('/:id/network-path', authMiddleware, async (req, res) => {
  try {
    const site = await getSiteById(req.params.id, req.user.id, req.user.role);

    const serverName = process.env.SERVER_NETWORK_NAME || 'localhost';
    const stagingPath = process.env.STAGING_BASE_PATH || './staging';

    // Convert relative path to absolute if needed
    const absolutePath = path.isAbsolute(stagingPath)
      ? stagingPath
      : path.resolve(process.cwd(), stagingPath);

    // Convert to Windows network path format
    // Example: C:\dev\GreenShoe\backend\staging\site-slug -> \\server\staging\site-slug
    const networkPath = `\\\\${serverName}\\staging\\${site.slug}`;
    const localPath = path.join(absolutePath, site.slug);

    res.status(200).json({
      networkPath,
      localPath,
      serverName,
      siteSlug: site.slug,
      instructions: [
        `Map network drive: net use Z: \\\\${serverName}\\staging`,
        `Or open directly: ${networkPath}`,
        'Edit files with any editor (VS Code, Claude Code, etc.)',
        'Changes are applied instantly to staging'
      ]
    });

  } catch (error) {
    logger.error('Network path error:', error.message);
    res.status(500).json({
      error: 'Failed to get network path',
      message: error.message
    });
  }
});

/**
 * POST /api/sites/:id/upload
 * Upload edited site ZIP
 */
router.post('/:id/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const site = await getSiteById(req.params.id, req.user.id, req.user.role);

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'File is required for upload'
      });
    }

    // Validate ZIP
    await validateUploadZip(req.file.path);

    // Extract to staging
    const result = await extractUploadZip(req.file.path, site.slug);

    // Cleanup upload file
    await require('fs/promises').unlink(req.file.path);

    // Create operation record
    await prisma.operation.create({
      data: {
        siteId: site.id,
        userId: req.user.id,
        type: 'UPLOAD',
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: JSON.stringify({
          filesExtracted: result.filesExtracted
        })
      }
    });

    logger.info(`Site uploaded: ${site.name} (${result.filesExtracted} files)`);

    res.status(200).json({
      message: 'Upload successful',
      filesExtracted: result.filesExtracted
    });

  } catch (error) {
    logger.error('Upload error:', error.message);

    // Cleanup upload file on error
    if (req.file) {
      try {
        await require('fs/promises').unlink(req.file.path);
      } catch {}
    }

    // Determine appropriate status code
    const statusCode = error.message === 'Site not found' ? 404 :
                       error.message === 'Access denied' ? 403 : 500;

    res.status(statusCode).json({
      error: 'Failed to upload site',
      message: error.message
    });
  }
});

/**
 * GET /api/sites/:id/diff
 * Get diff between staging and live
 */
router.get('/:id/diff', authMiddleware, async (req, res) => {
  try {
    const site = await getSiteById(req.params.id, req.user.id, req.user.role);

    const diff = await compareSiteWithLive(site.slug);

    res.status(200).json(diff);

  } catch (error) {
    logger.error('Diff error:', error.message);
    res.status(500).json({
      error: 'Failed to generate diff',
      message: error.message
    });
  }
});

/**
 * POST /api/sites/:id/diff/file
 * Get line-by-line diff for a specific file
 */
router.post('/:id/diff/file', authMiddleware, async (req, res) => {
  try {
    const site = await getSiteById(req.params.id, req.user.id, req.user.role);
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'File path is required'
      });
    }

    const path = require('path');
    const stagingPath = path.join(process.env.STAGING_BASE_PATH || './staging', site.slug, filePath);
    const livePath = path.join(process.env.STAGING_BASE_PATH || './staging', site.slug, '.live-snapshot', filePath);

    const fileDiff = await getFileDiff(stagingPath, livePath);

    res.status(200).json(fileDiff);

  } catch (error) {
    logger.error('File diff error:', error.message);
    res.status(500).json({
      error: 'Failed to generate file diff',
      message: error.message
    });
  }
});

/**
 * POST /api/sites/:id/backup/schedule
 * Schedule automatic backups for a site (PM/Admin only)
 * Request body: { frequency: 'daily'|'weekly'|'monthly', time: 'HH:mm', dayOfWeek?: 0-6, dayOfMonth?: 1-31 }
 */
router.post('/:id/backup/schedule', authMiddleware, requireRole('PROJECT_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const siteId = req.params.id;
    const userId = req.user.id;
    const { frequency, time, dayOfWeek, dayOfMonth } = req.body;

    // Verify site exists
    await getSiteById(siteId, userId, req.user.role);

    // Validate required fields
    if (!frequency || !time) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'frequency and time are required'
      });
    }

    const result = await scheduleBackup(siteId, userId, { frequency, time, dayOfWeek, dayOfMonth });

    res.status(200).json(result);
  } catch (error) {
    logger.error('Schedule backup error:', error.message);
    res.status(400).json({
      error: error.message,
      message: 'Failed to schedule backup'
    });
  }
});

/**
 * DELETE /api/sites/:id/backup/schedule
 * Unschedule automatic backups for a site (PM/Admin only)
 */
router.delete('/:id/backup/schedule', authMiddleware, requireRole('PROJECT_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const siteId = req.params.id;
    const userId = req.user.id;

    // Verify site exists
    await getSiteById(siteId, userId, req.user.role);

    const result = await unscheduleBackup(siteId);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Unschedule backup error:', error.message);
    res.status(500).json({
      error: 'Failed to unschedule backup',
      message: error.message
    });
  }
});

/**
 * GET /api/sites/:id/backup/schedule
 * Get backup schedule for a site (PM and Admin only)
 */
router.get('/:id/backup/schedule', authMiddleware, requireRole('PROJECT_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const siteId = req.params.id;
    const userId = req.user.id;

    // Verify site exists
    await getSiteById(siteId, userId, req.user.role);

    const schedule = await getBackupSchedule(siteId);

    res.status(200).json(schedule);
  } catch (error) {
    logger.error('Get backup schedule error:', error.message);
    res.status(500).json({
      error: 'Failed to get backup schedule',
      message: error.message
    });
  }
});

/**
 * POST /api/sites/:id/backup
 * Trigger a manual backup for a site (PM/Admin only)
 */
router.post('/:id/backup', authMiddleware, requireRole('PROJECT_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const siteId = req.params.id;
    const userId = req.user.id;

    // Verify site exists
    await getSiteById(siteId, userId, req.user.role);

    // Create operation record
    const operation = await prisma.operation.create({
      data: {
        siteId,
        userId,
        type: 'BACKUP',
        status: 'PENDING'
      }
    });

    const result = await triggerManualBackup(siteId, userId);

    res.status(202).json({
      ...result,
      operationId: operation.id
    });
  } catch (error) {
    logger.error('Manual backup error:', error.message);
    res.status(500).json({
      error: 'Failed to trigger backup',
      message: error.message
    });
  }
});

export { router as sitesRouter };
