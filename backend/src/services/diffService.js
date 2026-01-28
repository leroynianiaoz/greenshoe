import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const STAGING_BASE_PATH = process.env.STAGING_BASE_PATH || './staging';

/**
 * Get file hash for comparison
 */
async function getFileHash(filePath) {
  try {
    const content = await fs.readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

/**
 * Get all files in directory recursively
 */
async function getAllFiles(dir, baseDir = dir) {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        const subFiles = await getAllFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else {
        try {
          const stats = await fs.stat(fullPath);
          files.push({
            path: relativePath.replace(/\\/g, '/'), // Normalize path separators
            fullPath,
            size: stats.size,
            modified: stats.mtime
          });
        } catch (error) {
          logger.warn(`Failed to stat file ${fullPath}:`, error.message);
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to read directory ${dir}:`, error.message);
  }

  return files;
}

/**
 * Compare two directories and generate diff
 */
export async function compareDirectories(stagingDir, liveDir) {
  try {
    logger.info(`Comparing directories: ${stagingDir} vs ${liveDir}`);

    // Check if directories exist
    try {
      await fs.access(stagingDir);
    } catch (error) {
      throw new Error(`Staging directory does not exist: ${stagingDir}`);
    }

    try {
      await fs.access(liveDir);
    } catch (error) {
      throw new Error(`Live/snapshot directory does not exist: ${liveDir}`);
    }

    // Get all files from both directories
    const stagingFiles = await getAllFiles(stagingDir);
    const liveFiles = await getAllFiles(liveDir);

    // Create maps for quick lookup
    const stagingMap = new Map(stagingFiles.map(f => [f.path, f]));
    const liveMap = new Map(liveFiles.map(f => [f.path, f]));

    const added = [];
    const modified = [];
    const deleted = [];
    const unchanged = [];

    // Find added and modified files
    for (const [filePath, stagingFile] of stagingMap) {
      if (!liveMap.has(filePath)) {
        // File exists in staging but not in live = added
        added.push({
          path: filePath,
          size: stagingFile.size,
          type: getFileType(filePath)
        });
      } else {
        const liveFile = liveMap.get(filePath);

        // Compare file sizes first (quick check)
        if (stagingFile.size !== liveFile.size) {
          modified.push({
            path: filePath,
            size: stagingFile.size,
            oldSize: liveFile.size,
            type: getFileType(filePath)
          });
        } else {
          // Same size, compare hashes
          const stagingHash = await getFileHash(stagingFile.fullPath);
          const liveHash = await getFileHash(liveFile.fullPath);

          if (stagingHash !== liveHash) {
            modified.push({
              path: filePath,
              size: stagingFile.size,
              oldSize: liveFile.size,
              type: getFileType(filePath)
            });
          } else {
            unchanged.push({
              path: filePath,
              size: stagingFile.size,
              type: getFileType(filePath)
            });
          }
        }
      }
    }

    // Find deleted files
    for (const [filePath, liveFile] of liveMap) {
      if (!stagingMap.has(filePath)) {
        // File exists in live but not in staging = deleted
        deleted.push({
          path: filePath,
          size: liveFile.size,
          type: getFileType(filePath)
        });
      }
    }

    // Calculate totals
    const totalAdded = added.reduce((sum, f) => sum + f.size, 0);
    const totalModified = modified.reduce((sum, f) => sum + f.size, 0);
    const totalDeleted = deleted.reduce((sum, f) => sum + f.size, 0);

    const result = {
      summary: {
        added: added.length,
        modified: modified.length,
        deleted: deleted.length,
        unchanged: unchanged.length,
        totalFiles: added.length + modified.length + deleted.length + unchanged.length,
        totalAdded,
        totalModified,
        totalDeleted
      },
      files: {
        added: added.sort((a, b) => a.path.localeCompare(b.path)),
        modified: modified.sort((a, b) => a.path.localeCompare(b.path)),
        deleted: deleted.sort((a, b) => a.path.localeCompare(b.path))
      }
    };

    logger.info(`Diff complete: ${added.length} added, ${modified.length} modified, ${deleted.length} deleted`);

    return result;
  } catch (error) {
    logger.error('Diff comparison error:', error.message);
    throw new Error(`Failed to compare directories: ${error.message}`);
  }
}

/**
 * Get file type from extension
 */
function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  const typeMap = {
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.js': 'javascript',
    '.json': 'json',
    '.xml': 'xml',
    '.php': 'php',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
    '.gif': 'image',
    '.svg': 'image',
    '.webp': 'image',
    '.ico': 'image',
    '.woff': 'font',
    '.woff2': 'font',
    '.ttf': 'font',
    '.eot': 'font',
    '.pdf': 'document',
    '.txt': 'text',
    '.md': 'text'
  };

  return typeMap[ext] || 'other';
}

/**
 * Get file diff (line-by-line for text files)
 * @param {string} stagingDir - Base staging directory OR full path to staging file
 * @param {string} liveDir - Base live/snapshot directory OR full path to live file
 * @param {string} [filePath] - Optional relative file path (if base directories provided)
 */
export async function getFileDiff(stagingDir, liveDir, filePath) {
  try {
    // If filePath provided, construct full paths
    const stagingPath = filePath ? path.join(stagingDir, filePath) : stagingDir;
    const livePath = filePath ? path.join(liveDir, filePath) : liveDir;
    const relativePath = filePath || path.basename(stagingPath);

    // Check if files exist
    const stagingExists = await fs.access(stagingPath).then(() => true).catch(() => false);
    const liveExists = await fs.access(livePath).then(() => true).catch(() => false);

    // Handle added file (only in staging)
    if (stagingExists && !liveExists) {
      const stats = await fs.stat(stagingPath);
      return {
        path: relativePath,
        type: 'added',
        oldSize: 0,
        newSize: stats.size,
        diff: []
      };
    }

    // Handle deleted file (only in live/snapshot)
    if (!stagingExists && liveExists) {
      const stats = await fs.stat(livePath);
      return {
        path: relativePath,
        type: 'deleted',
        oldSize: stats.size,
        newSize: 0,
        diff: []
      };
    }

    // Check if binary file by extension
    const binaryExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.dylib', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.avi', '.mov', '.webm'];
    const ext = path.extname(stagingPath).toLowerCase();
    const isBinary = binaryExtensions.includes(ext);

    // Handle binary files
    if (isBinary) {
      const stagingStats = await fs.stat(stagingPath);
      const liveStats = await fs.stat(livePath);
      return {
        path: relativePath,
        type: 'modified',
        oldSize: liveStats.size,
        newSize: stagingStats.size,
        diff: [] // No line-by-line diff for binary files
      };
    }

    // Read text files
    const stagingContent = await fs.readFile(stagingPath, 'utf8');
    const liveContent = await fs.readFile(livePath, 'utf8');

    const stagingLines = stagingContent.split('\n');
    const liveLines = liveContent.split('\n');

    // Simple line-by-line diff
    const diff = [];
    const maxLines = Math.max(stagingLines.length, liveLines.length);

    for (let i = 0; i < maxLines; i++) {
      const stagingLine = stagingLines[i] || '';
      const liveLine = liveLines[i] || '';

      if (stagingLine !== liveLine) {
        if (i < liveLines.length && i < stagingLines.length) {
          diff.push({
            lineNumber: i + 1,
            type: 'modified',
            oldLine: liveLine,
            newLine: stagingLine
          });
        } else if (i >= liveLines.length) {
          diff.push({
            lineNumber: i + 1,
            type: 'added',
            newLine: stagingLine
          });
        } else {
          diff.push({
            lineNumber: i + 1,
            type: 'deleted',
            oldLine: liveLine
          });
        }
      }
    }

    return {
      path: relativePath,
      type: 'modified',
      totalLines: stagingLines.length,
      changedLines: diff.length,
      diff: diff.slice(0, 100) // Limit to first 100 changes for performance
    };
  } catch (error) {
    logger.error('File diff error:', error.message);
    throw new Error(`Failed to generate file diff: ${error.message}`);
  }
}

/**
 * Compare staging with live site for a given site ID
 */
export async function compareSiteWithLive(siteSlug) {
  const stagingDir = path.join(STAGING_BASE_PATH, siteSlug);

  // For now, we'll compare staging with itself as "live" backup
  // In production, this would compare with the actual live directory or cached snapshot
  const liveDir = path.join(STAGING_BASE_PATH, siteSlug, '.live-snapshot');

  // Check if staging directory exists
  try {
    await fs.access(stagingDir);
  } catch (error) {
    throw new Error('Staging directory not found. Pull the site first.');
  }

  // Check if live snapshot exists
  try {
    await fs.access(liveDir);
  } catch (error) {
    // No live snapshot available, return empty diff
    logger.warn(`No live snapshot found for ${siteSlug}, returning empty diff`);
    return {
      summary: {
        added: 0,
        modified: 0,
        deleted: 0,
        unchanged: 0,
        totalFiles: 0,
        totalAdded: 0,
        totalModified: 0,
        totalDeleted: 0
      },
      files: {
        added: [],
        modified: [],
        deleted: []
      },
      message: 'No previous version available for comparison. All files will be pushed.'
    };
  }

  return await compareDirectories(stagingDir, liveDir);
}

/**
 * Create a snapshot of staging for future comparisons
 * @param {string} stagingDirOrSlug - Either staging directory path OR site slug
 * @param {string} [snapshotDirParam] - Optional explicit snapshot directory path
 */
export async function createLiveSnapshot(stagingDirOrSlug, snapshotDirParam) {
  let stagingDir, snapshotDir;

  // Support both calling conventions
  if (snapshotDirParam) {
    // Called with explicit directories: createLiveSnapshot(stagingDir, snapshotDir)
    stagingDir = stagingDirOrSlug;
    snapshotDir = snapshotDirParam;
  } else {
    // Called with site slug: createLiveSnapshot(siteSlug)
    const siteSlug = stagingDirOrSlug;
    stagingDir = path.join(STAGING_BASE_PATH, siteSlug);
    snapshotDir = path.join(STAGING_BASE_PATH, siteSlug, '.live-snapshot');
  }

  try {
    // Remove old snapshot if exists
    try {
      await fs.rm(snapshotDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore if doesn't exist
    }

    // Create snapshot directory
    await fs.mkdir(snapshotDir, { recursive: true });

    // Check if snapshot is inside staging (nested case)
    const isNested = snapshotDir.startsWith(stagingDir + path.sep);

    if (isNested) {
      // Manually copy files to avoid recursive copy issue
      await copyDirectoryExcluding(stagingDir, snapshotDir, ['.live-snapshot']);
    } else {
      // Standard copy
      await fs.cp(stagingDir, snapshotDir, {
        recursive: true,
        filter: (src) => {
          return !src.includes('.live-snapshot');
        }
      });
    }

    logger.info(`Created live snapshot`);
  } catch (error) {
    logger.error('Failed to create live snapshot:', error.message);
    throw error; // Throw for tests to catch
  }
}

/**
 * Helper function to copy directory while excluding specific subdirectories
 */
async function copyDirectoryExcluding(src, dest, excludeDirs) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip excluded directories
    if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyDirectoryExcluding(srcPath, destPath, excludeDirs);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
