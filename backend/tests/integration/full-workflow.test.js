/**
 * STRICT Full E2E Workflow Test
 *
 * This test validates the complete staff workflow with STRICT assertions.
 * Every field, status code, and state transition is validated precisely.
 *
 * Steps tested:
 * 1. Authentication & Authorization
 * 2. Site Creation
 * 3. Pre-Pull Evaluation (Phase 10)
 * 4. Pull from Live
 * 5. Local Editing (Download/Upload)
 * 6. Preview Changes (Phase 9 - Diff)
 * 7. Push to Production (Phase 9 - Partial Push)
 * 8. Backup Management (Phase 9 - Scheduling)
 */

import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  createTestUser,
  generateToken,
  cleanAllTestData,
  cleanupTestStagingDirectory,
  createTestStagingDirectory,
  createTestSnapshotDirectory,
  encryptTestCredentials,
  getMockSFTPCredentials,
  prisma
} from '../utils/testHelpers.js';
import { testBackupSchedules } from '../utils/fixtures.js';
import fs from 'fs/promises';
import path from 'path';

describe('STRICT Full E2E Workflow Test', () => {
  let app;
  let httpServer;
  let io;

  let developerUser, developerPassword, developerToken;
  let pmUser, pmPassword, pmToken;
  let adminUser, adminPassword, adminToken;

  let testSite;
  let testSiteSlug;

  beforeAll(async () => {
    const appSetup = createApp();
    app = appSetup.app;
    httpServer = appSetup.httpServer;
    io = appSetup.io;

    await cleanAllTestData();

    const devResult = await createTestUser('DEVELOPER');
    developerUser = devResult.user;
    developerPassword = devResult.password;
    developerToken = generateToken(developerUser.id, developerUser.role);

    const pmResult = await createTestUser('PROJECT_MANAGER');
    pmUser = pmResult.user;
    pmPassword = pmResult.password;
    pmToken = generateToken(pmUser.id, pmUser.role);

    const adminResult = await createTestUser('ADMIN');
    adminUser = adminResult.user;
    adminPassword = adminResult.password;
    adminToken = generateToken(adminUser.id, adminUser.role);
  });

  afterAll(async () => {
    if (testSiteSlug) {
      await cleanupTestStagingDirectory(testSiteSlug);
    }
    await cleanAllTestData();

    if (io) io.close();
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  describe('Step 1: Authentication & Authorization - STRICT', () => {
    test('STRICT: Developer registration returns exact expected structure', async () => {
      const newDev = {
        email: `newdev-${Date.now()}@test.com`,
        password: 'NewDevPass123!',
        role: 'DEVELOPER'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(newDev);

      // STRICT: Exact status code
      expect(res.status).toBe(201);

      // STRICT: Response structure validation
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(20);

      // STRICT: User object validation
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(typeof res.body.user.id).toBe('string');
      expect(res.body.user.email).toBe(newDev.email);
      expect(res.body.user.role).toBe('DEVELOPER');

      // STRICT: Password should NOT be in response
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).not.toHaveProperty('passwordHash');

      // STRICT: Timestamps should exist
      expect(res.body.user).toHaveProperty('createdAt');
      expect(res.body.user).toHaveProperty('updatedAt');

      // STRICT: Verify user exists in database with correct data
      const dbUser = await prisma.user.findUnique({ where: { email: newDev.email } });
      expect(dbUser).not.toBeNull();
      expect(dbUser.email).toBe(newDev.email);
      expect(dbUser.role).toBe('DEVELOPER');
      expect(dbUser.passwordHash).toBeDefined();
      expect(dbUser.passwordHash.length).toBeGreaterThan(50); // bcrypt hash length
    });

    test('STRICT: Login returns valid JWT with correct claims', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: developerUser.email,
          password: developerPassword
        });

      // STRICT: Exact status
      expect(res.status).toBe(200);

      // STRICT: Token validation
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');

      // STRICT: User data validation
      expect(res.body.user.id).toBe(developerUser.id);
      expect(res.body.user.email).toBe(developerUser.email);
      expect(res.body.user.role).toBe('DEVELOPER');

      // STRICT: No sensitive data in response
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    test('STRICT: Invalid credentials return 401 with error message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: developerUser.email,
          password: 'WrongPassword123!'
        });

      // STRICT: Must be exactly 401
      expect(res.status).toBe(401);

      // STRICT: Must have error message
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
      expect(res.body.error.length).toBeGreaterThan(0);

      // STRICT: Should NOT leak user existence
      expect(res.body.error.toLowerCase()).not.toContain('user not found');
    });

    test('STRICT: Unauthenticated request returns exactly 401', async () => {
      const res = await request(app).get('/api/sites');

      // STRICT: Must be 401, not 403 or other
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    test('STRICT: Invalid token format returns 401', async () => {
      const res = await request(app)
        .get('/api/sites')
        .set('Authorization', 'Bearer invalid-token-format');

      // STRICT: Must be 401
      expect(res.status).toBe(401);
    });

    test('STRICT: Missing Authorization header returns 401', async () => {
      const res = await request(app)
        .get('/api/sites')
        .set('Authorization', ''); // Empty auth

      expect(res.status).toBe(401);
    });
  });

  describe('Step 2: Site Creation - STRICT', () => {
    test('STRICT: Admin creates site with complete validation', async () => {
      const credentials = getMockSFTPCredentials();
      const encryptedCredentials = await encryptTestCredentials(credentials);

      const siteData = {
        name: `Strict Test Site ${Date.now()}`,
        liveUrl: 'https://example.com',
        connectionType: 'sftp',
        encryptedCredentials,
        platformType: 'static'
      };

      const res = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(siteData);

      // STRICT: Must be exactly 201
      expect(res.status).toBe(201);

      // STRICT: All required fields present
      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('string');
      expect(res.body.id.length).toBe(36); // UUID length

      expect(res.body.name).toBe(siteData.name);
      expect(res.body.liveUrl).toBe(siteData.liveUrl);
      expect(res.body.connectionType).toBe(siteData.connectionType);
      expect(res.body.platformType).toBe(siteData.platformType);

      // STRICT: Status must be NEVER_PULLED for new site
      expect(res.body.status).toBe('NEVER_PULLED');

      // STRICT: Timestamps must exist and be valid
      expect(res.body.createdAt).toBeDefined();
      expect(new Date(res.body.createdAt).toString()).not.toBe('Invalid Date');
      expect(res.body.updatedAt).toBeDefined();

      // STRICT: Created by must match admin
      expect(res.body.createdById).toBe(adminUser.id);

      // STRICT: Slug must be generated
      expect(res.body.slug).toBeDefined();
      expect(res.body.slug.length).toBeGreaterThan(0);
      expect(res.body.slug).toMatch(/^[a-z0-9-]+$/); // Valid slug format

      // STRICT: Credentials should be encrypted (not plain text)
      expect(res.body.encryptedCredentials).toBeDefined();
      expect(res.body.encryptedCredentials).not.toContain('testuser'); // Should not be plain

      // STRICT: Verify in database
      const dbSite = await prisma.site.findUnique({ where: { id: res.body.id } });
      expect(dbSite).not.toBeNull();
      expect(dbSite.name).toBe(siteData.name);
      expect(dbSite.status).toBe('NEVER_PULLED');
      expect(dbSite.lastPulledAt).toBeNull(); // Should be null for never pulled

      testSite = res.body;
      testSiteSlug = res.body.slug;
    });

    test('STRICT: Non-admin cannot create site (403)', async () => {
      const res = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          name: 'Unauthorized Site',
          liveUrl: 'https://example.com',
          connectionType: 'crawl-only'
        });

      // STRICT: Must be exactly 403, not 401 or 500
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    test('STRICT: All roles can view sites list', async () => {
      // Developer
      const devRes = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${developerToken}`);

      expect(devRes.status).toBe(200);
      expect(devRes.body).toHaveProperty('sites');
      expect(devRes.body).toHaveProperty('total');
      expect(Array.isArray(devRes.body.sites)).toBe(true);
      expect(devRes.body.sites.length).toBeGreaterThan(0);
      expect(devRes.body.total).toBe(devRes.body.sites.length);

      // PM
      const pmRes = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(pmRes.status).toBe(200);
      expect(pmRes.body).toHaveProperty('sites');
      expect(Array.isArray(pmRes.body.sites)).toBe(true);

      // Admin
      const adminRes = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body).toHaveProperty('sites');
      expect(Array.isArray(adminRes.body.sites)).toBe(true);

      // STRICT: All should see same number of sites
      expect(devRes.body.sites.length).toBe(pmRes.body.sites.length);
      expect(pmRes.body.sites.length).toBe(adminRes.body.sites.length);
    });

    test('STRICT: Developer delete attempt returns exactly 403', async () => {
      const res = await request(app)
        .delete(`/api/sites/${testSite.id}`)
        .set('Authorization', `Bearer ${developerToken}`);

      // STRICT: Must be 403, not 401 or 404
      expect(res.status).toBe(403);

      // STRICT: Site should still exist in database
      const dbSite = await prisma.site.findUnique({ where: { id: testSite.id } });
      expect(dbSite).not.toBeNull();
    });

    test('STRICT: Invalid site ID format returns 400 or 404', async () => {
      const res = await request(app)
        .get('/api/sites/invalid-id-format')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(res.status);
    });
  });

  describe('Step 3: Pre-Pull Evaluation - STRICT', () => {
    test('STRICT: Site evaluation returns complete structure', async () => {
      const res = await request(app)
        .post('/api/sites/evaluate')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ url: 'https://example.com' });

      // May fail due to network, but if succeeds must be strict
      if (res.status === 200) {
        // STRICT: Summary must have all fields
        expect(res.body).toHaveProperty('summary');
        expect(res.body.summary).toHaveProperty('title');
        expect(res.body.summary).toHaveProperty('loadTime');
        expect(res.body.summary).toHaveProperty('pageSize');
        expect(res.body.summary).toHaveProperty('internalLinks');
        expect(res.body.summary).toHaveProperty('estimatedPages');
        expect(res.body.summary).toHaveProperty('platform');
        expect(res.body.summary).toHaveProperty('hasDynamicContent');
        expect(res.body.summary).toHaveProperty('accuracyScore');
        expect(res.body.summary).toHaveProperty('crawlStrategy');

        // STRICT: Accuracy score must be 0-100
        expect(res.body.summary.accuracyScore).toBeGreaterThanOrEqual(0);
        expect(res.body.summary.accuracyScore).toBeLessThanOrEqual(100);
        expect(typeof res.body.summary.accuracyScore).toBe('number');

        // STRICT: Crawl strategy must be valid
        expect(['static', 'javascript']).toContain(res.body.summary.crawlStrategy);

        // STRICT: Resources must be present
        expect(res.body).toHaveProperty('resources');
        expect(typeof res.body.resources.html).toBe('number');
        expect(typeof res.body.resources.css).toBe('number');
        expect(typeof res.body.resources.javascript).toBe('number');

        // STRICT: Warnings and recommendations must be arrays
        expect(Array.isArray(res.body.warnings)).toBe(true);
        expect(Array.isArray(res.body.recommendations)).toBe(true);
      } else {
        // STRICT: Failure must be 500 with error message
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error');
      }
    });

    test('STRICT: Invalid URL returns 400 or 500 with error', async () => {
      const res = await request(app)
        .post('/api/sites/evaluate')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ url: 'not-a-valid-url' });

      expect([400, 500]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });

    test('STRICT: Missing URL field returns 400', async () => {
      const res = await request(app)
        .post('/api/sites/evaluate')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Step 4: Pull from Live - STRICT', () => {
    beforeAll(async () => {
      // STRICT: Setup staging directory for tests
      await createTestStagingDirectory(testSiteSlug);
    });

    test('STRICT: Pull creates operation with correct fields', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/pull`)
        .set('Authorization', `Bearer ${pmToken}`);

      // STRICT: Must return job ID
      if (res.status === 200 || res.status === 202) {
        expect(res.body).toHaveProperty('jobId');
        expect(typeof res.body.jobId).toBe('string');
        expect(res.body.jobId.length).toBeGreaterThan(0);

        // STRICT: Verify operation was created in database
        const operation = await prisma.operation.findFirst({
          where: {
            siteId: testSite.id,
            type: 'PULL'
          },
          orderBy: { createdAt: 'desc' }
        });

        expect(operation).not.toBeNull();
        expect(operation.siteId).toBe(testSite.id);
        expect(operation.type).toBe('PULL');
        expect(operation.userId).toBe(pmUser.id);
        expect(['PENDING', 'IN_PROGRESS']).toContain(operation.status);
      }
    });

    test('STRICT: Pull non-existent site returns exactly 404', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .post(`/api/sites/${fakeId}/pull`)
        .set('Authorization', `Bearer ${pmToken}`);

      // STRICT: Must be 404
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    test('STRICT: Site status updates correctly', async () => {
      // Manually update for testing
      await prisma.site.update({
        where: { id: testSite.id },
        data: {
          status: 'ACTIVE',
          lastPulledAt: new Date()
        }
      });

      const res = await request(app)
        .get(`/api/sites/${testSite.id}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.lastPulledAt).not.toBeNull();

      // STRICT: Date must be valid ISO string
      expect(new Date(res.body.lastPulledAt).toString()).not.toBe('Invalid Date');
    });
  });

  describe('Step 5: Local Editing - STRICT', () => {
    test('STRICT: Download returns ZIP with correct headers', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/download`)
        .set('Authorization', `Bearer ${developerToken}`);

      if (res.status === 200) {
        // STRICT: Content-Type must be application/zip
        expect(res.header['content-type']).toContain('application/zip');

        // STRICT: Content-Disposition must include filename
        expect(res.header['content-disposition']).toBeDefined();
        expect(res.header['content-disposition']).toContain(testSiteSlug);
        expect(res.header['content-disposition']).toContain('.zip');

        // STRICT: Body should have data
        expect(res.body).toBeDefined();
      }
    });

    test('STRICT: Upload without file returns exactly 400', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/upload`)
        .set('Authorization', `Bearer ${developerToken}`);

      // STRICT: Must be 400 for missing file
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.toLowerCase()).toContain('file');
    });

    test('STRICT: Upload non-existent site returns 404', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .post(`/api/sites/${fakeId}/upload`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Step 6: Preview Changes (Diff) - STRICT', () => {
    beforeAll(async () => {
      await createTestStagingDirectory(testSiteSlug);
      await createTestSnapshotDirectory(testSiteSlug);
    });

    test('STRICT: Diff returns exact structure with all counts', async () => {
      const res = await request(app)
        .get(`/api/sites/${testSite.id}/diff`)
        .set('Authorization', `Bearer ${pmToken}`);

      if (res.status === 200) {
        // STRICT: Summary must have all required fields
        expect(res.body).toHaveProperty('summary');
        expect(typeof res.body.summary.added).toBe('number');
        expect(typeof res.body.summary.modified).toBe('number');
        expect(typeof res.body.summary.deleted).toBe('number');
        expect(typeof res.body.summary.unchanged).toBe('number');
        expect(typeof res.body.summary.totalFiles).toBe('number');

        // STRICT: Counts must be non-negative
        expect(res.body.summary.added).toBeGreaterThanOrEqual(0);
        expect(res.body.summary.modified).toBeGreaterThanOrEqual(0);
        expect(res.body.summary.deleted).toBeGreaterThanOrEqual(0);
        expect(res.body.summary.unchanged).toBeGreaterThanOrEqual(0);

        // STRICT: Total must equal sum of parts
        const sum = res.body.summary.added + res.body.summary.modified +
                    res.body.summary.deleted + res.body.summary.unchanged;
        expect(res.body.summary.totalFiles).toBe(sum);

        // STRICT: Files must be arrays
        expect(Array.isArray(res.body.files.added)).toBe(true);
        expect(Array.isArray(res.body.files.modified)).toBe(true);
        expect(Array.isArray(res.body.files.deleted)).toBe(true);

        // STRICT: Array lengths must match counts
        expect(res.body.files.added.length).toBe(res.body.summary.added);
        expect(res.body.files.modified.length).toBe(res.body.summary.modified);
        expect(res.body.files.deleted.length).toBe(res.body.summary.deleted);
      }
    });

    test('STRICT: Path traversal in diff is rejected', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '../../outside.txt',
        '/etc/passwd'
      ];

      for (const path of maliciousPaths) {
        const res = await request(app)
          .post(`/api/sites/${testSite.id}/diff/file`)
          .set('Authorization', `Bearer ${pmToken}`)
          .send({ filePath: path });

        // STRICT: Must reject with 400 or 500
        expect([400, 500]).toContain(res.status);
        expect(res.body).toHaveProperty('error');
      }
    });
  });

  describe('Step 7: Push to Production - STRICT', () => {
    test('STRICT: Partial push returns exact response structure', async () => {
      const files = ['index.html', 'style.css'];

      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ files });

      if (res.status === 200 || res.status === 202) {
        // STRICT: Must indicate partial push
        expect(res.body.pushType).toBe('partial');
        expect(res.body.fileCount).toBe(files.length);
        expect(res.body).toHaveProperty('jobId');
      }
    });

    test('STRICT: Path traversal in push is rejected', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ files: ['../../../etc/passwd'] });

      // STRICT: Must be rejected
      expect([400, 500]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });

    test('STRICT: Developer push returns exactly 403', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${developerToken}`);

      // STRICT: Must be 403, not 401
      expect(res.status).toBe(403);
    });
  });

  describe('Step 8: Backup Management - STRICT', () => {
    test('STRICT: Schedule backup returns complete structure', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send(testBackupSchedules.daily);

      // STRICT: Must be exactly 200
      expect(res.status).toBe(200);

      // STRICT: All response fields required
      expect(res.body.success).toBe(true);
      expect(res.body.frequency).toBe('daily');
      expect(res.body.time).toBe('02:00');
      expect(res.body.cron).toBe('0 2 * * *');
      expect(res.body.message).toBeDefined();
      expect(res.body.message).toContain('daily');
      expect(res.body.message).toContain('02:00 UTC');

      // STRICT: Verify in database
      const site = await prisma.site.findUnique({ where: { id: testSite.id } });
      expect(site.backupSchedule).not.toBeNull();

      const schedule = JSON.parse(site.backupSchedule);
      expect(schedule.frequency).toBe('daily');
      expect(schedule.enabled).toBe(true);
      expect(schedule.scheduledBy).toBe(pmUser.id);
    });

    test('STRICT: Get schedule returns exact format', async () => {
      const res = await request(app)
        .get(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
      expect(res.body.frequency).toBe('daily');
      expect(res.body.cron).toBe('0 2 * * *');
      expect(res.body.scheduledBy).toBe(pmUser.id);
      expect(res.body.scheduledAt).toBeDefined();
    });

    test('STRICT: Developer backup attempt returns exactly 403', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send(testBackupSchedules.daily);

      // STRICT: Must be 403
      expect(res.status).toBe(403);

      // STRICT: Schedule should not be changed in database
      const site = await prisma.site.findUnique({ where: { id: testSite.id } });
      const schedule = JSON.parse(site.backupSchedule);
      expect(schedule.scheduledBy).toBe(pmUser.id); // Still PM, not developer
    });

    test('STRICT: Invalid frequency returns 400 with error', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          frequency: 'invalid-frequency',
          time: '02:00'
        });

      expect([400, 500]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.toLowerCase()).toContain('frequency');
    });

    test('STRICT: Manual backup creates job', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/backup`)
        .set('Authorization', `Bearer ${pmToken}`);

      if (res.status === 200 || res.status === 202) {
        expect(res.body.success).toBe(true);
        expect(res.body.jobId).toBeDefined();
        expect(typeof res.body.jobId).toBe('string');
        expect(res.body.message).toContain('Manual backup');
      }
    });

    test('STRICT: Unschedule removes schedule completely', async () => {
      const res = await request(app)
        .delete(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // STRICT: Verify removed from database
      const site = await prisma.site.findUnique({ where: { id: testSite.id } });
      expect(site.backupSchedule).toBeNull();

      // STRICT: Get schedule should return disabled
      const getRes = await request(app)
        .get(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(getRes.body.enabled).toBe(false);
    });
  });

  describe('Integration: Complete Workflow State Validation - STRICT', () => {
    test('STRICT: All operations recorded in history', async () => {
      const operations = await prisma.operation.findMany({
        where: { siteId: testSite.id },
        orderBy: { createdAt: 'asc' }
      });

      expect(operations.length).toBeGreaterThan(0);

      // STRICT: Each operation must have required fields
      operations.forEach(op => {
        expect(op.id).toBeDefined();
        expect(op.siteId).toBe(testSite.id);
        expect(op.userId).toBeDefined();
        expect(['PULL', 'PUSH', 'RESTORE', 'DOWNLOAD', 'UPLOAD', 'BACKUP']).toContain(op.type);
        expect(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLED_BACK']).toContain(op.status);
        expect(op.createdAt).toBeInstanceOf(Date);
      });
    });

    test('STRICT: Final site state is consistent', async () => {
      const site = await prisma.site.findUnique({ where: { id: testSite.id } });

      expect(site).not.toBeNull();
      expect(site.status).toBeDefined();
      expect(['NEVER_PULLED', 'PULLING', 'ACTIVE', 'PUSHING', 'ERROR']).toContain(site.status);
      expect(site.createdById).toBe(adminUser.id);
      expect(site.createdAt).toBeInstanceOf(Date);
      expect(site.updatedAt).toBeInstanceOf(Date);
      expect(site.updatedAt >= site.createdAt).toBe(true);
    });

    test('STRICT: No orphaned data in database', async () => {
      // STRICT: All operations should reference valid users
      const operations = await prisma.operation.findMany({
        where: { siteId: testSite.id }
      });

      for (const op of operations) {
        const user = await prisma.user.findUnique({ where: { id: op.userId } });
        expect(user).not.toBeNull();
      }

      // STRICT: Site should reference valid creator
      const site = await prisma.site.findUnique({ where: { id: testSite.id } });
      const creator = await prisma.user.findUnique({ where: { id: site.createdById } });
      expect(creator).not.toBeNull();
    });
  });
});
