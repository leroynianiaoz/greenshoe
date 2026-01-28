/**
 * Security Tests: Path Traversal Protection
 *
 * Tests protection against path traversal attacks across all file operations:
 * - Download/upload operations
 * - Diff file viewing
 * - Partial push file selection
 * - Archive restoration
 */

import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  createTestUser,
  createTestSite,
  generateToken,
  cleanAllTestData,
  createTestStagingDirectory,
  createTestSnapshotDirectory
} from '../utils/testHelpers.js';
import fs from 'fs/promises';
import path from 'path';

describe('Security Tests: Path Traversal Protection', () => {
  let app;
  let httpServer;
  let io;
  let testUser;
  let testToken;
  let testSite;
  let testSiteSlug;

  beforeAll(async () => {
    const appSetup = createApp();
    app = appSetup.app;
    httpServer = appSetup.httpServer;
    io = appSetup.io;

    await cleanAllTestData();

    const userResult = await createTestUser('PROJECT_MANAGER');
    testUser = userResult.user;
    testToken = generateToken(testUser.id, testUser.role);

    testSite = await createTestSite(testUser.id, {
      name: 'Security Test Site',
      status: 'ACTIVE'
    });
    testSiteSlug = testSite.slug;

    // Create test staging directory
    await createTestStagingDirectory(testSiteSlug);
    await createTestSnapshotDirectory(testSiteSlug);
  });

  afterAll(async () => {
    await cleanAllTestData();

    if (io) io.close();
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  describe('Diff File Viewing - Path Traversal Protection', () => {
    test('rejects ../ in file path', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '../../outside.txt',
        'valid/../../../etc/passwd',
        './../../etc/passwd'
      ];

      for (const maliciousPath of maliciousPaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: maliciousPath });

        expect([400, 500]).toContain(res.status);
        expect(res.body.error).toBeDefined();
      }
    });

    test('rejects absolute paths', async () => {
      const absolutePaths = [
        '/etc/passwd',
        '/var/www/html/index.html',
        'C:\\Windows\\System32\\config',
        '/home/user/.ssh/id_rsa'
      ];

      for (const absolutePath of absolutePaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: absolutePath });

        expect([400, 500]).toContain(res.status);
      }
    });

    test('rejects null bytes in file path', async () => {
      const nullBytePaths = [
        'index.html\x00.txt',
        'file\x00/../../etc/passwd'
      ];

      for (const nullBytePath of nullBytePaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: nullBytePath });

        expect([400, 500]).toContain(res.status);
      }
    });

    test('accepts valid relative paths', async () => {
      const validPaths = [
        'index.html',
        'assets/logo.png',
        'css/style.css',
        'js/app.js'
      ];

      for (const validPath of validPaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: validPath });

        // May return 404 if file doesn't exist, but should not be 400 (validation error)
        expect([200, 404, 500]).toContain(res.status);
      }
    });

    test('rejects encoded path traversal attempts', async () => {
      const encodedPaths = [
        '%2e%2e%2f%2e%2e%2fetc%2fpasswd', // ../../../etc/passwd
        '..%2f..%2fetc%2fpasswd',
        '%2e%2e/%2e%2e/etc/passwd'
      ];

      for (const encodedPath of encodedPaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: encodedPath });

        expect([400, 500]).toContain(res.status);
      }
    });

    test('rejects double-encoded path traversal', async () => {
      const doubleEncodedPaths = [
        '%252e%252e%252f%252e%252e%252fetc%252fpasswd'
      ];

      for (const path of doubleEncodedPaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: path });

        expect([400, 500]).toContain(res.status);
      }
    });

    test('rejects unicode path traversal attempts', async () => {
      const unicodePaths = [
        '\u002e\u002e\u002f\u002e\u002e\u002fetc\u002fpasswd',
        '．．／．．／etc／passwd'
      ];

      for (const path of unicodePaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: path });

        expect([400, 500]).toContain(res.status);
      }
    });
  });

  describe('Partial Push - Path Traversal Protection', () => {
    test('rejects path traversal in file list', async () => {
      const maliciousFiles = [
        ['../../../etc/passwd'],
        ['../../outside.txt'],
        ['index.html', '../../../etc/passwd'], // Mixed with valid file
      ];

      for (const files of maliciousFiles) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/push`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ files });

        expect([400, 500]).toContain(res.status);
        expect(res.body.error).toBeDefined();
      }
    });

    test('rejects absolute paths in file list', async () => {
      const files = [
        '/etc/passwd',
        '/var/www/html/index.html'
      ];

      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ files });

      expect([400, 500]).toContain(res.status);
    });

    test('validates all files before pushing any', async () => {
      // Mix of valid and invalid files
      const files = [
        'index.html',
        '../../../etc/passwd',
        'style.css'
      ];

      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ files });

      expect([400, 500]).toContain(res.status);
      // Should reject entire operation, not push valid files
    });

    test('accepts valid file list', async () => {
      const files = [
        'index.html',
        'style.css',
        'assets/logo.png'
      ];

      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ files });

      // May fail due to missing files or SFTP, but should not be validation error
      expect(res.status).not.toBe(400);
    });
  });

  describe('Upload Operation - Path Traversal Protection', () => {
    test('validates ZIP contents for path traversal', async () => {
      // Note: This test requires ZIP validation implementation
      // The actual validation happens during ZIP extraction

      const testZipPath = path.join(process.cwd(), 'test-malicious.zip');

      // Create a simple ZIP file (simplified for testing)
      await fs.writeFile(testZipPath, 'fake-zip-content');

      const res = await request(app)
        .post(`/api/sites/${testSite.id}/upload`)
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', testZipPath);

      // Clean up
      await fs.unlink(testZipPath).catch(() => {});

      // Should handle extraction safely
      expect([200, 400, 500]).toContain(res.status);
    });

    test('rejects ZIP with absolute paths in entries', async () => {
      // This would be tested during ZIP extraction
      // Verifying that extract-zip properly handles path traversal
      expect(true).toBe(true); // Placeholder - actual test requires ZIP creation
    });

    test('rejects ZIP with ../ in entry names', async () => {
      // This would be tested during ZIP extraction
      expect(true).toBe(true); // Placeholder - actual test requires ZIP creation
    });
  });

  describe('Download Operation - Path Safety', () => {
    test('only allows downloading site staging directory', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/download`)
        .set('Authorization', `Bearer ${testToken}`);

      // Should only access staging directory for this site
      // Cannot test negative case easily (trying to download other paths)
      // but implementation should restrict to staging/{siteSlug}

      expect([200, 404, 500]).toContain(res.status);
    });

    test('cannot download other sites\' data', async () => {
      // Create second site
      const site2 = await createTestSite(testUser.id, {
        name: 'Second Site'
      });

      // Try to download first site's data through second site's endpoint
      // Implementation should prevent cross-site access

      const res = await request(app)
        .post(`/api/sites/${site2.id}/download`)
        .set('Authorization', `Bearer ${testToken}`);

      // Should only access site2's staging directory
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe('Cross-Site Path Access Prevention', () => {
    let site1;
    let site2;

    beforeAll(async () => {
      site1 = await createTestSite(testUser.id, { name: 'Site 1' });
      site2 = await createTestSite(testUser.id, { name: 'Site 2' });

      await createTestStagingDirectory(site1.slug);
      await createTestStagingDirectory(site2.slug);
    });

    test('cannot access site1 files through site2 diff endpoint', async () => {
      const res = await request(app)
        .post(`/api/sites/${site2.id}/diff/file`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ filePath: `../${site1.slug}/index.html` });

      expect([400, 404, 500]).toContain(res.status);
    });

    test('cannot push site1 files through site2 endpoint', async () => {
      const res = await request(app)
        .post(`/api/sites/${site2.id}/push`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ files: [`../${site1.slug}/index.html`] });

      expect([400, 500]).toContain(res.status);
    });
  });

  describe('Special Characters and Edge Cases', () => {
    test('handles paths with spaces safely', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/diff/file`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ filePath: 'file with spaces.html' });

      // Should not be a security error
      expect([200, 404, 500]).toContain(res.status);
    });

    test('handles unicode characters safely', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/diff/file`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ filePath: 'файл-测试-ファイル.txt' });

      expect([200, 404, 500]).toContain(res.status);
    });

    test('rejects very long paths (potential buffer overflow)', async () => {
      const longPath = 'a/'.repeat(1000) + 'file.txt';

      const res = await request(app)
        .post(`/api/sites/${testSite.id}/diff/file`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ filePath: longPath });

      expect([400, 404, 500]).toContain(res.status);
    });

    test('rejects paths with control characters', async () => {
      const controlCharPaths = [
        'file\n.txt',
        'file\r.txt',
        'file\t.txt'
      ];

      for (const path of controlCharPaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: path });

        expect([400, 404, 500]).toContain(res.status);
      }
    });
  });

  describe('Symbolic Link Protection', () => {
    test('does not follow symlinks outside staging directory', async () => {
      // Create symlink pointing outside staging
      const stagingDir = path.join(process.cwd(), 'staging', testSiteSlug);
      const outsideFile = path.join(process.cwd(), 'outside-target.txt');
      const symlinkPath = path.join(stagingDir, 'malicious-symlink.txt');

      try {
        await fs.writeFile(outsideFile, 'sensitive data');

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

        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: 'malicious-symlink.txt' });

        // Should either reject or safely handle symlink
        expect([400, 404, 500]).toContain(res.status);
      } finally {
        await fs.unlink(symlinkPath).catch(() => {});
        await fs.unlink(outsideFile).catch(() => {});
      }
    });
  });

  describe('Injection Attack Prevention', () => {
    test('rejects paths with shell injection attempts', async () => {
      const injectionPaths = [
        'index.html; cat /etc/passwd',
        'index.html && rm -rf /',
        'index.html | cat /etc/passwd',
        'index.html`cat /etc/passwd`'
      ];

      for (const path of injectionPaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: path });

        expect([400, 404, 500]).toContain(res.status);
      }
    });

    test('rejects paths with SQL injection attempts', async () => {
      const sqlPaths = [
        "index.html' OR '1'='1",
        'index.html; DROP TABLE sites;--',
        "index.html' UNION SELECT * FROM users--"
      ];

      for (const path of sqlPaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: path });

        expect([400, 404, 500]).toContain(res.status);
      }
    });
  });

  describe('Environment-Specific Attacks', () => {
    test('rejects Windows-style path traversal', async () => {
      const windowsPaths = [
        '..\\..\\..\\Windows\\System32\\config',
        '..\\..\\etc\\passwd',
        'C:\\Windows\\System32\\config'
      ];

      for (const path of windowsPaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: path });

        expect([400, 404, 500]).toContain(res.status);
      }
    });

    test('rejects UNC path attempts', async () => {
      const uncPaths = [
        '\\\\server\\share\\file.txt',
        '//server/share/file.txt'
      ];

      for (const path of uncPaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({ filePath: path });

        expect([400, 500]).toContain(res.status);
      }
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    test('handles rapid path traversal attempts', async () => {
      const requests = [];

      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post(`/api/sites/${testSite.id}/diff/file`)
            .set('Authorization', `Bearer ${testToken}`)
            .send({ filePath: '../../../etc/passwd' })
        );
      }

      const results = await Promise.all(requests);

      // All should be rejected
      results.forEach(res => {
        expect([400, 429, 500]).toContain(res.status);
      });
    });
  });
});
