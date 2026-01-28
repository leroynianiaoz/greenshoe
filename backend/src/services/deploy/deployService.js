import fs from 'fs/promises';
import path from 'path';
import { connectSftp, disconnectSftp, uploadFile, directoryExists } from '../connection/sftpService.js';
import { logger } from '../../utils/logger.js';

/**
 * Deploy site to production via SFTP
 * @param {string} localDir - Local directory to deploy from
 * @param {object} credentials - SFTP credentials
 * @param {string} remotePath - Remote path to deploy to
 * @param {string[]} fileList - Optional array of relative file paths to deploy (for partial push)
 */
export async function deploySite(localDir, credentials, remotePath = '/public_html', fileList = null) {
  let sftp = null;
  const uploadedFiles = [];

  try {
    logger.info(`Starting deployment from ${localDir} to ${credentials.host}:${remotePath}`);

    // Connect to SFTP
    sftp = await connectSftp(credentials);

    // Ensure remote directory exists
    const remoteExists = await directoryExists(sftp, remotePath);
    if (!remoteExists) {
      await sftp.mkdir(remotePath, true);
      logger.info(`Created remote directory: ${remotePath}`);
    }

    // Get files to upload
    let files;
    if (fileList !== null && fileList !== undefined) {
      // Partial push mode - validate file list
      if (fileList.length === 0) {
        throw new Error('No files selected for deployment');
      }
      // Validate and convert relative paths to absolute
      files = await validateAndResolvePaths(localDir, fileList);
      logger.info(`Partial push: ${files.length} files selected`);
    } else {
      // Full push - get all files
      files = await getAllFiles(localDir);
      logger.info(`Full push: ${files.length} files to upload`);
    }

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = path.relative(localDir, file);
      const remoteFile = path.posix.join(remotePath, relativePath.replace(/\\/g, '/'));

      // Ensure remote directory exists
      const remoteDir = path.posix.dirname(remoteFile);
      try {
        await sftp.mkdir(remoteDir, true);
      } catch (error) {
        // Directory might already exist
      }

      // Upload file
      await uploadFile(sftp, file, remoteFile);
      uploadedFiles.push(remoteFile);

      if ((i + 1) % 10 === 0) {
        logger.info(`Uploaded ${i + 1}/${files.length} files`);
      }
    }

    logger.info(`Deployment completed: ${uploadedFiles.length} files uploaded`);

    return {
      success: true,
      filesUploaded: uploadedFiles.length,
      files: uploadedFiles
    };

  } catch (error) {
    logger.error('Deployment error:', error.message);
    throw new Error(`Deployment failed: ${error.message}`);
  } finally {
    if (sftp) {
      await disconnectSftp(sftp);
    }
  }
}

/**
 * Get all files recursively from a directory
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
 * Validate and resolve file paths for partial push
 * Prevents path traversal and ensures files exist within localDir
 */
async function validateAndResolvePaths(localDir, relativePaths) {
  const validatedFiles = [];
  const normalizedLocalDir = path.resolve(localDir);

  for (const relativePath of relativePaths) {
    // Prevent path traversal attacks
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      logger.warn(`Rejected invalid path: ${relativePath}`);
      throw new Error(`Invalid file path: ${relativePath}`);
    }

    // Normalize path separators
    const normalizedPath = relativePath.replace(/\\/g, '/');

    // Resolve to absolute path
    const absolutePath = path.resolve(localDir, normalizedPath);

    // Ensure the resolved path is within localDir (security check)
    if (!absolutePath.startsWith(normalizedLocalDir)) {
      logger.warn(`Path traversal attempt detected: ${relativePath}`);
      throw new Error(`Path traversal attempt: ${relativePath}`);
    }

    // Verify file exists and is a file (not a directory)
    try {
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        logger.warn(`Not a file (is a directory): ${relativePath}`);
        throw new Error(`Not a file: ${relativePath}`);
      }
      validatedFiles.push(absolutePath);
    } catch (error) {
      // Re-throw "Not a file" errors as-is
      if (error.message.includes('Not a file')) {
        throw error;
      }
      // Other errors (file not found, etc.)
      logger.warn(`File not found or inaccessible: ${relativePath}`);
      throw new Error(`File not found: ${relativePath}`);
    }
  }

  logger.info(`Validated ${validatedFiles.length} files for partial push`);
  return validatedFiles;
}

/**
 * Create a backup of production before pushing
 */
export async function backupProduction(credentials, remotePath = '/public_html', backupPath) {
  let sftp = null;

  try {
    logger.info(`Creating backup of ${credentials.host}:${remotePath}`);

    sftp = await connectSftp(credentials);

    // Ensure backup directory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true });

    // Download all files from remote
    const files = await downloadDirectory(sftp, remotePath, backupPath);

    logger.info(`Backup completed: ${files.length} files downloaded to ${backupPath}`);

    return {
      success: true,
      filesBackedUp: files.length,
      backupPath
    };

  } catch (error) {
    logger.error('Backup error:', error.message);
    throw new Error(`Backup failed: ${error.message}`);
  } finally {
    if (sftp) {
      await disconnectSftp(sftp);
    }
  }
}

/**
 * Download directory recursively from SFTP
 */
async function downloadDirectory(sftp, remotePath, localPath) {
  const files = [];

  try {
    const list = await sftp.list(remotePath);

    for (const item of list) {
      const remoteFile = path.posix.join(remotePath, item.name);
      const localFile = path.join(localPath, item.name);

      if (item.type === 'd') {
        // Directory
        await fs.mkdir(localFile, { recursive: true });
        const subFiles = await downloadDirectory(sftp, remoteFile, localFile);
        files.push(...subFiles);
      } else {
        // File
        await sftp.get(remoteFile, localFile);
        files.push(localFile);
      }
    }
  } catch (error) {
    logger.warn(`Failed to download directory ${remotePath}:`, error.message);
  }

  return files;
}

/**
 * Rollback to a backup
 */
export async function rollbackToBackup(credentials, backupPath, remotePath = '/public_html') {
  logger.info(`Rolling back ${credentials.host}:${remotePath} from backup ${backupPath}`);

  // Simply deploy the backup
  return await deploySite(backupPath, credentials, remotePath);
}
