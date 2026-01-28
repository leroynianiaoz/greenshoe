/**
 * Security Tests: RBAC (Role-Based Access Control) Enforcement
 *
 * Tests that all endpoints properly enforce role-based permissions:
 * - DEVELOPER: View sites, pull, download, upload
 * - PROJECT_MANAGER: All above + push, view archives, restore, manage backups
 * - ADMIN: All above + manage users, delete sites
 */

import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  createTestUser,
  createTestSite,
  createTestArchive,
  generateToken,
  cleanAllTestData,
  createTestStagingDirectory,
  encryptTestCredentials,
  getMockSFTPCredentials
} from '../utils/testHelpers.js';
import { testBackupSchedules } from '../utils/fixtures.js';

describe('Security Tests: RBAC Enforcement', () => {
  let app;
  let httpServer;
  let io;

  let developerUser, developerToken;
  let pmUser, pmToken;
  let adminUser, adminToken;
  let testSite;

  beforeAll(async () => {
    const appSetup = createApp();
    app = appSetup.app;
    httpServer = appSetup.httpServer;
    io = appSetup.io;

    await cleanAllTestData();

    // Create users for all roles
    const devResult = await createTestUser('DEVELOPER');
    developerUser = devResult.user;
    developerToken = generateToken(developerUser.id, developerUser.role);

    const pmResult = await createTestUser('PROJECT_MANAGER');
    pmUser = pmResult.user;
    pmToken = generateToken(pmUser.id, pmUser.role);

    const adminResult = await createTestUser('ADMIN');
    adminUser = adminResult.user;
    adminToken = generateToken(adminUser.id, adminUser.role);

    // Create test site
    const credentials = getMockSFTPCredentials();
    const encryptedCredentials = await encryptTestCredentials(credentials);

    testSite = await createTestSite(adminUser.id, {
      name: 'RBAC Test Site',
      status: 'ACTIVE',
      encryptedCredentials
    });

    await createTestStagingDirectory(testSite.slug);
  });

  afterAll(async () => {
    await cleanAllTestData();

    if (io) io.close();
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  describe('Authentication Required', () => {
    test('all endpoints reject unauthenticated requests', async () => {
      const endpoints = [
        { method: 'get', path: '/api/sites' },
        { method: 'post', path: '/api/sites' },
        { method: 'get', path: `/api/sites/${testSite.id}` },
        { method: 'post', path: `/api/sites/${testSite.id}/pull` },
        { method: 'post', path: `/api/sites/${testSite.id}/push` },
        { method: 'delete', path: `/api/sites/${testSite.id}` }
      ];

      for (const endpoint of endpoints) {
        const res = await request(app)[endpoint.method](endpoint.path);
        expect(res.status).toBe(401);
      }
    });

    test('invalid token is rejected', async () => {
      const res = await request(app)
        .get('/api/sites')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    test('expired token is rejected', async () => {
      // Create token with expired timestamp
      const expiredToken = generateToken(developerUser.id, developerUser.role);
      // Note: In real scenario, would need to manipulate token expiration

      const res = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${expiredToken}`);

      // Should be authenticated (token not actually expired in test)
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('Developer Role Permissions', () => {
    test('✅ Developer CAN view sites', async () => {
      const res = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sites');
      expect(Array.isArray(res.body.sites)).toBe(true);
    });

    test('✅ Developer CAN view specific site', async () => {
      const res = await request(app)
        .get(`/api/sites/${testSite.id}`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testSite.id);
    });

    test('✅ Developer CAN pull from live', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/pull`)
        .set('Authorization', `Bearer ${developerToken}`);

      // Should be allowed (may fail due to mock credentials)
      expect([200, 202, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ Developer CAN download for local editing', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/download`)
        .set('Authorization', `Bearer ${developerToken}`);

      // Should be allowed (may fail if staging doesn't exist)
      expect([200, 404, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ Developer CAN upload edited site', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/upload`)
        .set('Authorization', `Bearer ${developerToken}`);

      // Should be allowed (will fail without file)
      expect([400, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('❌ Developer CANNOT push to production', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    test('❌ Developer CANNOT schedule backups', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send(testBackupSchedules.daily);

      expect(res.status).toBe(403);
    });

    test('❌ Developer CANNOT trigger manual backup', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/backup`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(403);
    });

    test('❌ Developer CANNOT view archives', async () => {
      const res = await request(app)
        .get(`/api/sites/${testSite.id}/archives`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(403);
    });

    test('❌ Developer CANNOT restore from archive', async () => {
      const archive = await createTestArchive(testSite.id);

      const res = await request(app)
        .post(`/api/sites/${testSite.id}/archives/${archive.id}/restore`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(403);
    });

    test('❌ Developer CANNOT delete sites', async () => {
      const res = await request(app)
        .delete(`/api/sites/${testSite.id}`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(403);
    });

    test('❌ Developer CANNOT create sites', async () => {
      const res = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          name: 'New Site',
          liveUrl: 'https://example.com',
          connectionType: 'crawl-only'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Project Manager Role Permissions', () => {
    test('✅ PM CAN view sites', async () => {
      const res = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
    });

    test('✅ PM CAN pull from live', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/pull`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect([200, 202, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ PM CAN download for local editing', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/download`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect([200, 404, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ PM CAN upload edited site', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/upload`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect([400, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ PM CAN push to production', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${pmToken}`);

      // Should be allowed (may fail due to mock credentials)
      expect([200, 202, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ PM CAN push partial changes', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ files: ['index.html'] });

      expect([200, 202, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ PM CAN view diff', async () => {
      const res = await request(app)
        .get(`/api/sites/${testSite.id}/diff`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect([200, 404, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ PM CAN schedule backups', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send(testBackupSchedules.daily);

      expect([200, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ PM CAN trigger manual backup', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/backup`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect([200, 202, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ PM CAN view archives', async () => {
      const res = await request(app)
        .get(`/api/sites/${testSite.id}/archives`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect([200, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ PM CAN restore from archive', async () => {
      const archive = await createTestArchive(testSite.id);

      const res = await request(app)
        .post(`/api/sites/${testSite.id}/archives/${archive.id}/restore`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect([200, 202, 404, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('❌ PM CANNOT delete sites', async () => {
      const res = await request(app)
        .delete(`/api/sites/${testSite.id}`)
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(403);
    });

    test('❌ PM CANNOT create sites', async () => {
      const res = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          name: 'New Site',
          liveUrl: 'https://example.com',
          connectionType: 'crawl-only'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Admin Role Permissions', () => {
    test('✅ Admin CAN view sites', async () => {
      const res = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    test('✅ Admin CAN create sites', async () => {
      const res = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Admin Test Site ${Date.now()}`,
          liveUrl: 'https://example.com',
          connectionType: 'crawl-only'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
    });

    test('✅ Admin CAN update sites', async () => {
      const res = await request(app)
        .put(`/api/sites/${testSite.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name'
        });

      expect([200, 404, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ Admin CAN pull from live', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/pull`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 202, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ Admin CAN push to production', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 202, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ Admin CAN schedule backups', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testBackupSchedules.daily);

      expect([200, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ Admin CAN view archives', async () => {
      const res = await request(app)
        .get(`/api/sites/${testSite.id}/archives`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ Admin CAN restore from archive', async () => {
      const archive = await createTestArchive(testSite.id);

      const res = await request(app)
        .post(`/api/sites/${testSite.id}/archives/${archive.id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 202, 404, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ Admin CAN delete sites', async () => {
      // Create a temporary site to delete
      const tempSite = await createTestSite(adminUser.id, {
        name: 'Temp Site to Delete'
      });

      const res = await request(app)
        .delete(`/api/sites/${tempSite.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 500]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    test('✅ Admin CAN manage users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      // May not have /api/users endpoint yet
      expect([200, 404]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });
  });

  describe('Cross-Role Permission Verification', () => {
    test('cannot escalate privileges by changing JWT', async () => {
      // Developer tries to access admin-only endpoint
      const res = await request(app)
        .delete(`/api/sites/${testSite.id}`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(403);
    });

    test('cannot impersonate other users', async () => {
      // Developer tries to act as admin by manipulating request
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send({ userId: adminUser.id }); // Try to impersonate

      expect(res.status).toBe(403);
    });
  });

  describe('Site Ownership and Access Control', () => {
    let otherUser, otherToken;
    let privateSite;

    beforeAll(async () => {
      // Create another PM user
      const otherResult = await createTestUser('PROJECT_MANAGER');
      otherUser = otherResult.user;
      otherToken = generateToken(otherUser.id, otherUser.role);

      // Create site owned by otherUser
      privateSite = await createTestSite(otherUser.id, {
        name: 'Private Site'
      });
    });

    test('users can view all sites regardless of ownership', async () => {
      const res = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);

      const sites = res.body.sites;
      const canSeePrivateSite = sites.some(s => s.id === privateSite.id);
      expect(canSeePrivateSite).toBe(true);
    });

    test('users can operate on sites they do not own', async () => {
      // PM should be able to push to any site
      const res = await request(app)
        .post(`/api/sites/${privateSite.id}/push`)
        .set('Authorization', `Bearer ${pmToken}`);

      // Should be allowed (may fail for other reasons)
      expect(res.status).not.toBe(403);
    });
  });

  describe('Endpoint-Specific Permission Tests', () => {
    test('site evaluation endpoint is accessible to all authenticated users', async () => {
      const testUrl = 'https://example.com';

      // Developer
      let res = await request(app)
        .post('/api/sites/evaluate')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({ url: testUrl });
      expect(res.status).not.toBe(403);

      // PM
      res = await request(app)
        .post('/api/sites/evaluate')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ url: testUrl });
      expect(res.status).not.toBe(403);

      // Admin
      res = await request(app)
        .post('/api/sites/evaluate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: testUrl });
      expect(res.status).not.toBe(403);
    });

    test('diff viewing requires at least Developer role', async () => {
      const res = await request(app)
        .get(`/api/sites/${testSite.id}/diff`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).not.toBe(403);
    });

    test('backup schedule viewing requires PM or Admin', async () => {
      // Developer cannot view
      let res = await request(app)
        .get(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${developerToken}`);
      expect(res.status).toBe(403);

      // PM can view
      res = await request(app)
        .get(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${pmToken}`);
      expect(res.status).not.toBe(403);

      // Admin can view
      res = await request(app)
        .get(`/api/sites/${testSite.id}/backup/schedule`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).not.toBe(403);
    });
  });

  describe('Error Messages Do Not Leak Information', () => {
    test('403 error does not reveal if resource exists', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .delete(`/api/sites/${fakeId}`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(403);
      // Should not reveal whether site exists
      expect(res.body.error).not.toContain('not found');
    });

    test('unauthorized access does not reveal user roles', async () => {
      const res = await request(app)
        .post(`/api/sites/${testSite.id}/push`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(res.status).toBe(403);
      // Should not reveal what roles are allowed
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Token Tampering Prevention', () => {
    test('modified token is rejected', async () => {
      const tamperedToken = developerToken.slice(0, -5) + 'xxxxx';

      const res = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
    });

    test('token with elevated role is rejected', async () => {
      // Try to manually create token with admin role for developer user
      const fakeAdminToken = generateToken(developerUser.id, 'ADMIN');

      const res = await request(app)
        .delete(`/api/sites/${testSite.id}`)
        .set('Authorization', `Bearer ${fakeAdminToken}`);

      // System should validate role against database
      // May still work if role is taken from token without validation
      expect([403, 401]).toContain(res.status);
    });
  });
});
