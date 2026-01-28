/**
 * Unit Tests for Diff Service (Phase 9)
 *
 * Tests MD5-based file comparison, diff generation, and snapshot management
 */

import {
  compareDirectories,
  createLiveSnapshot,
  getFileDiff
} from '../../src/services/diffService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Diff Service Unit Tests', () => {
  const testDir = path.join(process.cwd(), 'test-diff-temp');
  const stagingDir = path.join(testDir, 'staging');
  const snapshotDir = path.join(testDir, 'snapshot');

  beforeAll(async () => {
    // Create test directories
    await fs.mkdir(stagingDir, { recursive: true });
    await fs.mkdir(snapshotDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directories
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('compareDirectories()', () => {
    beforeEach(async () => {
      // Clean directories before each test
      await fs.rm(stagingDir, { recursive: true, force: true });
      await fs.rm(snapshotDir, { recursive: true, force: true });
      await fs.mkdir(stagingDir, { recursive: true });
      await fs.mkdir(snapshotDir, { recursive: true });
    });

    test('detects no changes when directories are identical', async () => {
      // Create identical files in both directories
      await fs.writeFile(path.join(stagingDir, 'index.html'), '<html>Test</html>');
      await fs.writeFile(path.join(stagingDir, 'style.css'), 'body { margin: 0; }');
      await fs.writeFile(path.join(snapshotDir, 'index.html'), '<html>Test</html>');
      await fs.writeFile(path.join(snapshotDir, 'style.css'), 'body { margin: 0; }');

      const result = await compareDirectories(stagingDir, snapshotDir);

      expect(result.summary.added).toBe(0);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.deleted).toBe(0);
      expect(result.summary.unchanged).toBe(2);
      expect(result.files.added).toHaveLength(0);
      expect(result.files.modified).toHaveLength(0);
      expect(result.files.deleted).toHaveLength(0);
    });

    test('detects added files', async () => {
      // Files only in staging (new files)
      await fs.writeFile(path.join(stagingDir, 'new-page.html'), '<html>New</html>');
      await fs.writeFile(path.join(stagingDir, 'new-script.js'), 'console.log("new");');

      // One file in both (unchanged)
      await fs.writeFile(path.join(stagingDir, 'index.html'), '<html>Same</html>');
      await fs.writeFile(path.join(snapshotDir, 'index.html'), '<html>Same</html>');

      const result = await compareDirectories(stagingDir, snapshotDir);

      expect(result.summary.added).toBe(2);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.deleted).toBe(0);
      expect(result.summary.unchanged).toBe(1);
      expect(result.files.added).toHaveLength(2);
      expect(result.files.added.map(f => f.path)).toContain('new-page.html');
      expect(result.files.added.map(f => f.path)).toContain('new-script.js');
    });

    test('detects modified files using MD5 hash', async () => {
      // Create different content with same filename
      await fs.writeFile(path.join(stagingDir, 'index.html'), '<html>New Version</html>');
      await fs.writeFile(path.join(snapshotDir, 'index.html'), '<html>Old Version</html>');

      await fs.writeFile(path.join(stagingDir, 'style.css'), 'body { color: blue; }');
      await fs.writeFile(path.join(snapshotDir, 'style.css'), 'body { color: red; }');

      const result = await compareDirectories(stagingDir, snapshotDir);

      expect(result.summary.added).toBe(0);
      expect(result.summary.modified).toBe(2);
      expect(result.summary.deleted).toBe(0);
      expect(result.files.modified).toHaveLength(2);
      expect(result.files.modified.map(f => f.path)).toContain('index.html');
      expect(result.files.modified.map(f => f.path)).toContain('style.css');
    });

    test('detects deleted files', async () => {
      // Files only in snapshot (deleted in staging)
      await fs.writeFile(path.join(snapshotDir, 'old-page.html'), '<html>Old</html>');
      await fs.writeFile(path.join(snapshotDir, 'old-script.js'), 'console.log("old");');

      // One file in both (unchanged)
      await fs.writeFile(path.join(stagingDir, 'index.html'), '<html>Same</html>');
      await fs.writeFile(path.join(snapshotDir, 'index.html'), '<html>Same</html>');

      const result = await compareDirectories(stagingDir, snapshotDir);

      expect(result.summary.added).toBe(0);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.deleted).toBe(2);
      expect(result.summary.unchanged).toBe(1);
      expect(result.files.deleted).toHaveLength(2);
      expect(result.files.deleted.map(f => f.path)).toContain('old-page.html');
      expect(result.files.deleted.map(f => f.path)).toContain('old-script.js');
    });

    test('detects mixed changes (added, modified, deleted)', async () => {
      // Added files
      await fs.writeFile(path.join(stagingDir, 'new-page.html'), '<html>New</html>');

      // Modified files
      await fs.writeFile(path.join(stagingDir, 'index.html'), '<html>Modified</html>');
      await fs.writeFile(path.join(snapshotDir, 'index.html'), '<html>Original</html>');

      // Deleted files
      await fs.writeFile(path.join(snapshotDir, 'old-page.html'), '<html>Old</html>');

      // Unchanged files
      await fs.writeFile(path.join(stagingDir, 'about.html'), '<html>About</html>');
      await fs.writeFile(path.join(snapshotDir, 'about.html'), '<html>About</html>');

      const result = await compareDirectories(stagingDir, snapshotDir);

      expect(result.summary.added).toBe(1);
      expect(result.summary.modified).toBe(1);
      expect(result.summary.deleted).toBe(1);
      expect(result.summary.unchanged).toBe(1);
      expect(result.summary.totalFiles).toBe(4);
    });

    test('calculates total sizes correctly', async () => {
      // Create files with known sizes
      const content1 = 'A'.repeat(1000); // 1000 bytes
      const content2 = 'B'.repeat(2000); // 2000 bytes

      await fs.writeFile(path.join(stagingDir, 'added.txt'), content1);
      await fs.writeFile(path.join(stagingDir, 'modified.txt'), content2);
      await fs.writeFile(path.join(snapshotDir, 'modified.txt'), 'old');
      await fs.writeFile(path.join(snapshotDir, 'deleted.txt'), content1);

      const result = await compareDirectories(stagingDir, snapshotDir);

      expect(result.summary.totalAdded).toBeGreaterThan(0);
      expect(result.summary.totalModified).toBeGreaterThan(0);
      expect(result.summary.totalDeleted).toBeGreaterThan(0);
    });

    test('handles nested directory structures', async () => {
      // Create nested directories
      await fs.mkdir(path.join(stagingDir, 'assets', 'images'), { recursive: true });
      await fs.mkdir(path.join(stagingDir, 'css'), { recursive: true });
      await fs.mkdir(path.join(snapshotDir, 'assets', 'images'), { recursive: true });

      // Add files in nested directories
      await fs.writeFile(path.join(stagingDir, 'assets', 'images', 'logo.png'), 'image-data');
      await fs.writeFile(path.join(stagingDir, 'css', 'main.css'), 'body {}');
      await fs.writeFile(path.join(snapshotDir, 'assets', 'images', 'old-logo.png'), 'old-image');

      const result = await compareDirectories(stagingDir, snapshotDir);

      expect(result.summary.added).toBe(2); // logo.png, main.css
      expect(result.summary.deleted).toBe(1); // old-logo.png
      expect(result.files.added.some(f => f.path.includes('assets'))).toBe(true);
      expect(result.files.added.some(f => f.path.includes('css'))).toBe(true);
    });

    test('handles empty directories gracefully', async () => {
      const result = await compareDirectories(stagingDir, snapshotDir);

      expect(result.summary.added).toBe(0);
      expect(result.summary.modified).toBe(0);
      expect(result.summary.deleted).toBe(0);
      expect(result.summary.unchanged).toBe(0);
      expect(result.summary.totalFiles).toBe(0);
    });

    test('handles case where snapshot does not exist', async () => {
      await fs.rm(snapshotDir, { recursive: true, force: true });

      await fs.writeFile(path.join(stagingDir, 'index.html'), '<html>Test</html>');

      await expect(
        compareDirectories(stagingDir, snapshotDir)
      ).rejects.toThrow();
    });
  });

  describe('createLiveSnapshot()', () => {
    const testStagingDir = path.join(testDir, 'test-staging-site');
    const testSnapshotDir = path.join(testStagingDir, '.live-snapshot');

    beforeEach(async () => {
      await fs.rm(testStagingDir, { recursive: true, force: true });
      await fs.mkdir(testStagingDir, { recursive: true });
    });

    test('creates snapshot directory from staging', async () => {
      // Create staging files
      await fs.writeFile(path.join(testStagingDir, 'index.html'), '<html>Test</html>');
      await fs.writeFile(path.join(testStagingDir, 'style.css'), 'body { margin: 0; }');

      await createLiveSnapshot(testStagingDir, testSnapshotDir);

      // Verify snapshot was created
      const snapshotExists = await fs.access(testSnapshotDir).then(() => true).catch(() => false);
      expect(snapshotExists).toBe(true);

      // Verify files were copied
      const snapshotIndexExists = await fs.access(path.join(testSnapshotDir, 'index.html')).then(() => true).catch(() => false);
      const snapshotCssExists = await fs.access(path.join(testSnapshotDir, 'style.css')).then(() => true).catch(() => false);

      expect(snapshotIndexExists).toBe(true);
      expect(snapshotCssExists).toBe(true);
    });

    test('snapshot content matches staging content', async () => {
      const content = '<html><body>Test Content</body></html>';
      await fs.writeFile(path.join(testStagingDir, 'test.html'), content);

      await createLiveSnapshot(testStagingDir, testSnapshotDir);

      const snapshotContent = await fs.readFile(path.join(testSnapshotDir, 'test.html'), 'utf-8');
      expect(snapshotContent).toBe(content);
    });

    test('overwrites existing snapshot', async () => {
      // Create initial snapshot
      await fs.mkdir(testSnapshotDir, { recursive: true });
      await fs.writeFile(path.join(testSnapshotDir, 'old.html'), '<html>Old</html>');

      // Create new staging files
      await fs.writeFile(path.join(testStagingDir, 'new.html'), '<html>New</html>');

      await createLiveSnapshot(testStagingDir, testSnapshotDir);

      // Verify old file is gone and new file exists
      const oldExists = await fs.access(path.join(testSnapshotDir, 'old.html')).then(() => true).catch(() => false);
      const newExists = await fs.access(path.join(testSnapshotDir, 'new.html')).then(() => true).catch(() => false);

      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);
    });

    test('does not copy .live-snapshot directory recursively', async () => {
      // Create nested snapshot directory in staging
      await fs.mkdir(testSnapshotDir, { recursive: true });
      await fs.writeFile(path.join(testSnapshotDir, 'nested.html'), 'nested');

      // Create staging file
      await fs.writeFile(path.join(testStagingDir, 'index.html'), '<html>Test</html>');

      await createLiveSnapshot(testStagingDir, testSnapshotDir);

      // Verify no recursive .live-snapshot/.live-snapshot
      const nestedSnapshotExists = await fs.access(
        path.join(testSnapshotDir, '.live-snapshot')
      ).then(() => true).catch(() => false);

      expect(nestedSnapshotExists).toBe(false);
    });
  });

  describe('getFileDiff()', () => {
    beforeEach(async () => {
      await fs.rm(stagingDir, { recursive: true, force: true });
      await fs.rm(snapshotDir, { recursive: true, force: true });
      await fs.mkdir(stagingDir, { recursive: true });
      await fs.mkdir(snapshotDir, { recursive: true });
    });

    test('generates line-by-line diff for modified file', async () => {
      const oldContent = '<html>\n<head>\n  <title>Old Title</title>\n</head>\n</html>';
      const newContent = '<html>\n<head>\n  <title>New Title</title>\n  <meta charset="UTF-8">\n</head>\n</html>';

      await fs.writeFile(path.join(stagingDir, 'index.html'), newContent);
      await fs.writeFile(path.join(snapshotDir, 'index.html'), oldContent);

      const result = await getFileDiff(stagingDir, snapshotDir, 'index.html');

      expect(result.path).toBe('index.html');
      expect(result.type).toBe('modified');
      expect(Array.isArray(result.diff)).toBe(true);
      expect(result.diff.length).toBeGreaterThan(0);

      // Check for added and deleted lines
      const hasAdded = result.diff.some(line => line.type === 'added');
      const hasDeleted = result.diff.some(line => line.type === 'deleted');

      expect(hasAdded || hasDeleted).toBe(true);
    });

    test('handles added file (only in staging)', async () => {
      await fs.writeFile(path.join(stagingDir, 'new.html'), '<html>New File</html>');

      const result = await getFileDiff(stagingDir, snapshotDir, 'new.html');

      expect(result.type).toBe('added');
      expect(result.oldSize).toBe(0);
      expect(result.newSize).toBeGreaterThan(0);
    });

    test('handles deleted file (only in snapshot)', async () => {
      await fs.writeFile(path.join(snapshotDir, 'deleted.html'), '<html>Deleted File</html>');

      const result = await getFileDiff(stagingDir, snapshotDir, 'deleted.html');

      expect(result.type).toBe('deleted');
      expect(result.oldSize).toBeGreaterThan(0);
      expect(result.newSize).toBe(0);
    });

    test('handles binary files gracefully', async () => {
      // Create binary-like content
      const binaryData = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header

      await fs.writeFile(path.join(stagingDir, 'image.jpg'), binaryData);
      await fs.writeFile(path.join(snapshotDir, 'image.jpg'), Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]));

      const result = await getFileDiff(stagingDir, snapshotDir, 'image.jpg');

      expect(result.path).toBe('image.jpg');
      expect(result.type).toBe('modified');
      // Binary files should have diff info
      expect(result).toHaveProperty('oldSize');
      expect(result).toHaveProperty('newSize');
    });

    test('throws error for non-existent file in both directories', async () => {
      await expect(
        getFileDiff(stagingDir, snapshotDir, 'non-existent.html')
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(async () => {
      // Clean directories before each test
      await fs.rm(stagingDir, { recursive: true, force: true });
      await fs.rm(snapshotDir, { recursive: true, force: true });
      await fs.mkdir(stagingDir, { recursive: true });
      await fs.mkdir(snapshotDir, { recursive: true });
    });

    test('handles very large files', async () => {
      // Create a large file (1MB)
      const largeContent = 'A'.repeat(1024 * 1024);

      await fs.writeFile(path.join(stagingDir, 'large.txt'), largeContent);
      await fs.writeFile(path.join(snapshotDir, 'large.txt'), largeContent);

      const result = await compareDirectories(stagingDir, snapshotDir);

      expect(result.summary.unchanged).toBe(1);
    });

    test('handles files with special characters in names', async () => {
      const specialName = 'file-with-special-chars_!@#$%.html';

      await fs.writeFile(path.join(stagingDir, specialName), '<html>Test</html>');
      await fs.writeFile(path.join(snapshotDir, specialName), '<html>Test</html>');

      const result = await compareDirectories(stagingDir, snapshotDir);

      expect(result.summary.unchanged).toBe(1);
    });

    test('handles empty files', async () => {
      await fs.writeFile(path.join(stagingDir, 'empty.txt'), '');
      await fs.writeFile(path.join(snapshotDir, 'empty.txt'), '');

      const result = await compareDirectories(stagingDir, snapshotDir);

      expect(result.summary.unchanged).toBe(1);
    });

    test('MD5 hash is consistent for identical content', async () => {
      const content = '<html><body>Consistent Content</body></html>';

      await fs.writeFile(path.join(stagingDir, 'file1.html'), content);
      await fs.writeFile(path.join(snapshotDir, 'file1.html'), content);

      const result1 = await compareDirectories(stagingDir, snapshotDir);

      // Clean and recreate with same content
      await fs.rm(stagingDir, { recursive: true, force: true });
      await fs.rm(snapshotDir, { recursive: true, force: true });
      await fs.mkdir(stagingDir, { recursive: true });
      await fs.mkdir(snapshotDir, { recursive: true });

      await fs.writeFile(path.join(stagingDir, 'file1.html'), content);
      await fs.writeFile(path.join(snapshotDir, 'file1.html'), content);

      const result2 = await compareDirectories(stagingDir, snapshotDir);

      expect(result1.summary.unchanged).toBe(result2.summary.unchanged);
    });
  });
});
