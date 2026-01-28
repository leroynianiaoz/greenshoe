import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import archiver from 'archiver';
import extract from 'extract-zip';
import { logger } from '../utils/logger.js';

const STAGING_BASE_PATH = process.env.STAGING_BASE_PATH || './staging';

/**
 * Create a ZIP file for download (local editing)
 */
export async function createDownloadZip(siteSlug) {
  try {
    const sourceDir = path.join(STAGING_BASE_PATH, siteSlug);

    // Check if staging directory exists
    try {
      await fs.access(sourceDir);
    } catch {
      throw new Error('Site has not been pulled yet. Pull the site first before downloading.');
    }

    // Create temp directory for ZIP
    const tempDir = path.join('./temp', 'downloads');
    await fs.mkdir(tempDir, { recursive: true });

    const zipPath = path.join(tempDir, `${siteSlug}-${Date.now()}.zip`);

    await new Promise((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info(`Download ZIP created: ${archive.pointer()} bytes`);
        resolve();
      });

      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });

    const stats = await fs.stat(zipPath);
    logger.info(`Created download ZIP: ${zipPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    return zipPath;

  } catch (error) {
    logger.error('Download ZIP creation error:', error.message);
    throw new Error(`Failed to create download ZIP: ${error.message}`);
  }
}

/**
 * Extract uploaded ZIP and update staging
 */
export async function extractUploadZip(uploadPath, siteSlug) {
  try {
    const stagingDir = path.join(STAGING_BASE_PATH, siteSlug);

    // Backup existing staging (if exists)
    const backupDir = path.join(STAGING_BASE_PATH, `${siteSlug}-backup-${Date.now()}`);
    try {
      await fs.access(stagingDir);
      await fs.rename(stagingDir, backupDir);
      logger.info(`Backed up existing staging to ${backupDir}`);
    } catch {
      // No existing staging, that's OK
    }

    // Create new staging directory
    await fs.mkdir(stagingDir, { recursive: true });

    // Extract ZIP
    await extract(uploadPath, { dir: path.resolve(stagingDir) });

    logger.info(`Upload ZIP extracted to ${stagingDir}`);

    // Get file count
    const files = await getAllFiles(stagingDir);

    // Delete backup on success
    try {
      await fs.rm(backupDir, { recursive: true });
    } catch {
      // Backup might not exist
    }

    return {
      success: true,
      filesExtracted: files.length,
      stagingDir
    };

  } catch (error) {
    logger.error('Upload ZIP extraction error:', error.message);
    throw new Error(`Failed to extract upload ZIP: ${error.message}`);
  }
}

/**
 * Validate uploaded ZIP
 */
export async function validateUploadZip(filePath, maxSizeMB = 100) {
  try {
    const stats = await fs.stat(filePath);
    const sizeMB = stats.size / 1024 / 1024;

    if (sizeMB > maxSizeMB) {
      throw new Error(`File too large: ${sizeMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`);
    }

    // Check if it's a valid ZIP
    const buffer = await fs.readFile(filePath);
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new Error('Invalid ZIP file');
    }

    return {
      valid: true,
      sizeMB: sizeMB.toFixed(2)
    };

  } catch (error) {
    logger.error('ZIP validation error:', error.message);
    throw error;
  }
}

/**
 * Get all files recursively
 */
async function getAllFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Cleanup old download ZIPs
 */
export async function cleanupDownloadZips() {
  try {
    const tempDir = path.join('./temp', 'downloads');
    const files = await fs.readdir(tempDir);

    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        await fs.unlink(filePath);
        logger.info(`Cleaned up old download ZIP: ${file}`);
      }
    }
  } catch (error) {
    logger.error('Download cleanup error:', error.message);
  }
}
