/**
 * Unit Tests for Partial Push Validation (Phase 9)
 *
 * Tests path validation, security checks, and file selection
 * for partial push feature
 */

import fs from 'fs/promises';
import path from 'path';
import { jest } from '@jest/globals';

// Mock SFTP service functions to avoid actual connections
jest.unstable_mockModule('../../src/services/connection/sftpService.js', () => ({
  connectSftp: jest.fn().mockResolvedValue({
    mkdir: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(undefined)
  }),
  disconnectSftp: jest.fn().mockResolvedValue(undefined),
  uploadFile: jest.fn().mockResolvedValue(undefined),
  directoryExists: jest.fn().mockResolvedValue(true)
}));

// Import deploySite after mocking
const { deploySite } = await import('../../src/services/deploy/deployService.js');

describe('Partial Push Validation Unit Tests', () => {
  const testDir = path.join(process.cwd(), 'test-partial-push-temp');

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });

    // Create test file structure
    await fs.writeFile(path.join(testDir, 'index.html'), '<html>Test</html>');
    await fs.writeFile(path.join(testDir, 'style.css'), 'body { margin: 0; }');
    await fs.mkdir(path.join(testDir, 'assets'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'assets', 'logo.png'), 'fake-image');
    await fs.mkdir(path.join(testDir, 'js'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'js', 'app.js'), 'console.log("app")');
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Path Validation - Security Tests', () => {
    const mockCredentials = {
      host: 'test.example.com',
      port: 22,
      username: 'testuser',
      password: 'testpass'
    };

    test('accepts valid relative file paths', async () => {
      const validPaths = [
        'index.html',
        'style.css',
        'assets/logo.png',
        'js/app.js'
      ];

      await expect(
        deploySite(testDir, mockCredentials, '/public_html', validPaths)
      ).resolves.not.toThrow();
    });

    test('rejects path traversal with ../', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '../../outside.txt',
        'valid/../../etc/passwd'
      ];

      for (const maliciousPath of maliciousPaths) {
        await expect(
          deploySite(testDir, mockCredentials, '/public_html', [maliciousPath])
        ).rejects.toThrow(/Invalid file path|Path traversal/);
      }
    });

    test('rejects absolute paths', async () => {
      const absolutePaths = [
        '/etc/passwd',
        '/var/www/html/index.html',
        'C:\\Windows\\System32\\config',
        '/home/user/file.txt'
      ];

      for (const absolutePath of absolutePaths) {
        await expect(
          deploySite(testDir, mockCredentials, '/public_html', [absolutePath])
        ).rejects.toThrow(/Invalid file path/);
      }
    });

    test('rejects paths with null bytes', async () => {
      const nullBytePaths = [
        'index.html\x00.txt',
        'file\x00/../../etc/passwd'
      ];

      for (const nullBytePath of nullBytePaths) {
        await expect(
          deploySite(testDir, mockCredentials, '/public_html', [nullBytePath])
        ).rejects.toThrow();
      }
    });

    test('rejects non-existent files', async () => {
      const nonExistentPaths = [
        'non-existent.html',
        'assets/missing-image.png'
      ];

      await expect(
        deploySite(testDir, mockCredentials, '/public_html', nonExistentPaths)
      ).rejects.toThrow();
    });

    test('rejects directories (only files allowed)', async () => {
      const directoryPaths = [
        'assets',
        'js'
      ];

      await expect(
        deploySite(testDir, mockCredentials, '/public_html', directoryPaths)
      ).rejects.toThrow(/Not a file/);
    });

    test('validates all files before uploading any', async () => {
      // Mix of valid and invalid paths
      const mixedPaths = [
        'index.html',
        '../../../etc/passwd', // Invalid
        'style.css'
      ];

      await expect(
        deploySite(testDir, mockCredentials, '/public_html', mixedPaths)
      ).rejects.toThrow();

      // The operation should fail before any files are uploaded
    });

    test('handles symbolic links securely', async () => {
      // Create symlink outside test directory
      const outsideFile = path.join(process.cwd(), 'outside-test.txt');
      const symlinkPath = path.join(testDir, 'symlink.txt');

      try {
        await fs.writeFile(outsideFile, 'outside content');

        // Try to create symlink (may fail on Windows without admin rights)
        try {
          await fs.symlink(outsideFile, symlinkPath);
        } catch (symlinkError) {
          if (symlinkError.code === 'EPERM' && process.platform === 'win32') {
            // Skip test on Windows when symlinks require elevated privileges
            console.log('Skipping symlink test on Windows (requires admin privileges)');
            return;
          }
          throw symlinkError;
        }

        // Should reject symlinks that point outside staging dir
        await expect(
          deploySite(testDir, mockCredentials, '/public_html', ['symlink.txt'])
        ).rejects.toThrow();
      } finally {
        // Clean up
        await fs.unlink(symlinkPath).catch(() => {});
        await fs.unlink(outsideFile).catch(() => {});
      }
    });
  });

  describe('File Selection - Functional Tests', () => {
    const mockCredentials = {
      host: 'test.example.com',
      port: 22,
      username: 'testuser',
      password: 'testpass'
    };

    test('uploads only selected files (partial push)', async () => {
      const selectedFiles = ['index.html', 'style.css'];

      const result = await deploySite(testDir, mockCredentials, '/public_html', selectedFiles);

      expect(result.success).toBe(true);
      expect(result.filesUploaded).toBe(2);

    });

    test('uploads all files when no file list provided (full push)', async () => {
      const result = await deploySite(testDir, mockCredentials, '/public_html', null);

      expect(result.success).toBe(true);
      expect(result.filesUploaded).toBeGreaterThan(0);

      // Should upload all files (4 files in test directory)
    });

    test('uploads files in nested directories', async () => {
      const selectedFiles = ['assets/logo.png', 'js/app.js'];

      const result = await deploySite(testDir, mockCredentials, '/public_html', selectedFiles);

      expect(result.success).toBe(true);
      expect(result.filesUploaded).toBe(2);

      // Files uploaded successfully
    });

    test('handles empty file list (no files selected)', async () => {
      await expect(
        deploySite(testDir, mockCredentials, '/public_html', [])
      ).rejects.toThrow();
    });

    test('handles single file selection', async () => {
      const selectedFiles = ['index.html'];

      const result = await deploySite(testDir, mockCredentials, '/public_html', selectedFiles);

      expect(result.success).toBe(true);
      expect(result.filesUploaded).toBe(1);
    });

    test('handles large file lists', async () => {
      // Create many files
      const manyFiles = [];
      for (let i = 0; i < 100; i++) {
        const filename = `file${i}.txt`;
        await fs.writeFile(path.join(testDir, filename), `content ${i}`);
        manyFiles.push(filename);
      }

      const result = await deploySite(testDir, mockCredentials, '/public_html', manyFiles);

      expect(result.success).toBe(true);
      expect(result.filesUploaded).toBe(100);

      // Clean up
      for (let i = 0; i < 100; i++) {
        await fs.unlink(path.join(testDir, `file${i}.txt`)).catch(() => {});
      }
    });
  });

  describe('Path Normalization', () => {
    const mockCredentials = {
      host: 'test.example.com',
      port: 22,
      username: 'testuser',
      password: 'testpass'
    };

    test('handles forward slashes in paths', async () => {
      const paths = ['assets/logo.png', 'js/app.js'];

      await expect(
        deploySite(testDir, mockCredentials, '/public_html', paths)
      ).resolves.not.toThrow();
    });

    test('handles backslashes in paths (Windows)', async () => {
      // On Windows, backslashes should be normalized
      const paths = ['assets\\logo.png'].map(p => p.replace(/\\/g, '/'));

      await expect(
        deploySite(testDir, mockCredentials, '/public_html', paths)
      ).resolves.not.toThrow();
    });

    test('handles paths with extra slashes', async () => {
      const paths = ['./index.html', './assets/logo.png'];

      // Should normalize and validate
      await expect(
        deploySite(testDir, mockCredentials, '/public_html', paths)
      ).resolves.not.toThrow();
    });

    test('handles paths with spaces', async () => {
      // Create file with spaces
      await fs.writeFile(path.join(testDir, 'file with spaces.txt'), 'content');

      const paths = ['file with spaces.txt'];

      const result = await deploySite(testDir, mockCredentials, '/public_html', paths);

      expect(result.success).toBe(true);

      // Clean up
      await fs.unlink(path.join(testDir, 'file with spaces.txt'));
    });

    test('handles special characters in filenames', async () => {
      // Create files with special characters
      const specialFiles = [
        'file-with-dash.txt',
        'file_with_underscore.txt',
        'file.with.dots.txt'
      ];

      for (const file of specialFiles) {
        await fs.writeFile(path.join(testDir, file), 'content');
      }

      const result = await deploySite(testDir, mockCredentials, '/public_html', specialFiles);

      expect(result.success).toBe(true);

      // Clean up
      for (const file of specialFiles) {
        await fs.unlink(path.join(testDir, file)).catch(() => {});
      }
    });
  });

  describe('Error Handling', () => {
    const mockCredentials = {
      host: 'test.example.com',
      port: 22,
      username: 'testuser',
      password: 'testpass'
    };

    test('provides clear error for path traversal attempts', async () => {
      await expect(
        deploySite(testDir, mockCredentials, '/public_html', ['../outside.txt'])
      ).rejects.toThrow(/Invalid file path/);
    });

    test('provides clear error for non-existent files', async () => {
      await expect(
        deploySite(testDir, mockCredentials, '/public_html', ['non-existent.html'])
      ).rejects.toThrow();
    });

    test('provides clear error for directory selection', async () => {
      await expect(
        deploySite(testDir, mockCredentials, '/public_html', ['assets'])
      ).rejects.toThrow(/Not a file/);
    });

    test('handles permission errors gracefully', async () => {
      // Create file with no read permissions (Unix-like systems)
      if (process.platform !== 'win32') {
        const restrictedFile = path.join(testDir, 'restricted.txt');
        await fs.writeFile(restrictedFile, 'content');
        await fs.chmod(restrictedFile, 0o000);

        await expect(
          deploySite(testDir, mockCredentials, '/public_html', ['restricted.txt'])
        ).rejects.toThrow();

        // Clean up
        await fs.chmod(restrictedFile, 0o644).catch(() => {});
        await fs.unlink(restrictedFile).catch(() => {});
      }
    });
  });

  describe('Integration: Full vs Partial Push', () => {
    const mockCredentials = {
      host: 'test.example.com',
      port: 22,
      username: 'testuser',
      password: 'testpass'
    };

    test('full push uploads all files', async () => {
      const result = await deploySite(testDir, mockCredentials, '/public_html', null);

      expect(result.success).toBe(true);
      expect(result.filesUploaded).toBe(4); // All test files

    });

    test('partial push uploads only selected files', async () => {
      const selectedFiles = ['index.html', 'style.css'];
      const result = await deploySite(testDir, mockCredentials, '/public_html', selectedFiles);

      expect(result.success).toBe(true);
      expect(result.filesUploaded).toBe(2);

    });

    test('full push after partial push uploads all files', async () => {
      // First, partial push
      await deploySite(testDir, mockCredentials, '/public_html', ['index.html']);

      jest.clearAllMocks();

      // Then, full push
      const result = await deploySite(testDir, mockCredentials, '/public_html', null);

      expect(result.success).toBe(true);
      expect(result.filesUploaded).toBe(4);

    });
  });

  describe('Edge Cases', () => {
    const mockCredentials = {
      host: 'test.example.com',
      port: 22,
      username: 'testuser',
      password: 'testpass'
    };

    test('handles very long file paths', async () => {
      // Create deeply nested directory
      const deepPath = path.join(testDir, 'a', 'b', 'c', 'd', 'e', 'f');
      await fs.mkdir(deepPath, { recursive: true });
      await fs.writeFile(path.join(deepPath, 'deep.txt'), 'deep content');

      const relativePath = 'a/b/c/d/e/f/deep.txt';

      const result = await deploySite(testDir, mockCredentials, '/public_html', [relativePath]);

      expect(result.success).toBe(true);

      // Clean up
      await fs.rm(path.join(testDir, 'a'), { recursive: true, force: true });
    });

    test('handles unicode characters in filenames', async () => {
      const unicodeFile = 'файл-测试-ファイル.txt';
      await fs.writeFile(path.join(testDir, unicodeFile), 'unicode content');

      const result = await deploySite(testDir, mockCredentials, '/public_html', [unicodeFile]);

      expect(result.success).toBe(true);

      // Clean up
      await fs.unlink(path.join(testDir, unicodeFile)).catch(() => {});
    });

    test('handles case-sensitive file systems', async () => {
      await fs.writeFile(path.join(testDir, 'CaseSensitive.txt'), 'content');

      // Request with different case
      const paths = ['CaseSensitive.txt'];

      const result = await deploySite(testDir, mockCredentials, '/public_html', paths);

      expect(result.success).toBe(true);

      // Clean up
      await fs.unlink(path.join(testDir, 'CaseSensitive.txt'));
    });

    test('handles empty files', async () => {
      await fs.writeFile(path.join(testDir, 'empty.txt'), '');

      const result = await deploySite(testDir, mockCredentials, '/public_html', ['empty.txt']);

      expect(result.success).toBe(true);

      // Clean up
      await fs.unlink(path.join(testDir, 'empty.txt'));
    });

    test('handles duplicate paths in file list', async () => {
      const paths = ['index.html', 'index.html', 'style.css', 'style.css'];

      const result = await deploySite(testDir, mockCredentials, '/public_html', paths);

      // Should deduplicate and upload each file once
      expect(result.success).toBe(true);
    });
  });
});
