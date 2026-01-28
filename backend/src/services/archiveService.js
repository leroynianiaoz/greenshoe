import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/db.js';

const ARCHIVE_BASE_PATH = process.env.ARCHIVE_BASE_PATH || './archives';
const BACKUP_BASE_PATH = process.env.BACKUP_BASE_PATH || './backups';
const MAX_ARCHIVES = 5;

/**
 * Create an archive from a directory
 */
export async function createArchive(siteId, sourceDir, type = 'pull') {
  try {
    // Get site
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      throw new Error('Site not found');
    }

    // Get next version number
    const lastArchive = await prisma.archive.findFirst({
      where: { siteId },
      orderBy: { version: 'desc' }
    });

    const version = lastArchive ? lastArchive.version + 1 : 1;

    // Create archive directory
    const archiveDir = path.join(ARCHIVE_BASE_PATH, site.slug);
    await fs.mkdir(archiveDir, { recursive: true });

    // Archive filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${site.slug}-v${version}-${type}-${timestamp}.zip`;
    const archivePath = path.join(archiveDir, filename);

    // Create ZIP archive
    await createZipArchive(sourceDir, archivePath);

    // Get file size
    const stats = await fs.stat(archivePath);
    const fileSize = stats.size;

    logger.info(`Archive created: ${archivePath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Save to database
    const archive = await prisma.archive.create({
      data: {
        siteId,
        version,
        filePath: archivePath,
        fileSize
      }
    });

    // Cleanup old archives
    await cleanupOldArchives(siteId);

    return archive;

  } catch (error) {
    logger.error('Archive creation error:', error.message);
    throw new Error(`Failed to create archive: ${error.message}`);
  }
}

/**
 * Create a ZIP archive from a directory
 */
async function createZipArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = require('fs').createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      logger.info(`Archive created: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

/**
 * Extract an archive
 */
export async function extractArchive(archiveId, outputDir) {
  try {
    const archive = await prisma.archive.findUnique({
      where: { id: archiveId },
      include: { site: true }
    });

    if (!archive) {
      throw new Error('Archive not found');
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Extract ZIP
    const extract = require('extract-zip');
    await extract(archive.filePath, { dir: path.resolve(outputDir) });

    logger.info(`Archive extracted to ${outputDir}`);

    return {
      success: true,
      outputDir,
      version: archive.version
    };

  } catch (error) {
    logger.error('Archive extraction error:', error.message);
    throw new Error(`Failed to extract archive: ${error.message}`);
  }
}

/**
 * Get all archives for a site
 */
export async function getArchives(siteId) {
  return await prisma.archive.findMany({
    where: { siteId },
    orderBy: { version: 'desc' }
  });
}

/**
 * Delete an archive
 */
export async function deleteArchive(archiveId) {
  try {
    const archive = await prisma.archive.findUnique({
      where: { id: archiveId }
    });

    if (!archive) {
      throw new Error('Archive not found');
    }

    // Delete file
    try {
      await fs.unlink(archive.filePath);
    } catch (error) {
      logger.warn(`Failed to delete archive file ${archive.filePath}:`, error.message);
    }

    // Delete database record
    await prisma.archive.delete({
      where: { id: archiveId }
    });

    logger.info(`Archive deleted: ${archive.filePath}`);

  } catch (error) {
    logger.error('Archive deletion error:', error.message);
    throw error;
  }
}

/**
 * Cleanup old archives (keep only last MAX_ARCHIVES)
 */
async function cleanupOldArchives(siteId) {
  try {
    const archives = await prisma.archive.findMany({
      where: { siteId },
      orderBy: { version: 'desc' }
    });

    if (archives.length <= MAX_ARCHIVES) {
      return;
    }

    const archivesToDelete = archives.slice(MAX_ARCHIVES);
    logger.info(`Cleaning up ${archivesToDelete.length} old archives for site ${siteId}`);

    for (const archive of archivesToDelete) {
      await deleteArchive(archive.id);
    }

  } catch (error) {
    logger.error('Archive cleanup error:', error.message);
  }
}

/**
 * Create backup before push
 */
export async function createBackup(siteId, sourceDir) {
  try {
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      throw new Error('Site not found');
    }

    // Create backup directory
    const backupDir = path.join(BACKUP_BASE_PATH, site.slug);
    await fs.mkdir(backupDir, { recursive: true });

    // Backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${site.slug}-backup-${timestamp}.zip`;
    const backupPath = path.join(backupDir, filename);

    // Create ZIP backup
    await createZipArchive(sourceDir, backupPath);

    const stats = await fs.stat(backupPath);
    logger.info(`Backup created: ${backupPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    return backupPath;

  } catch (error) {
    logger.error('Backup creation error:', error.message);
    throw new Error(`Failed to create backup: ${error.message}`);
  }
}
