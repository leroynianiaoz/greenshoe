import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use global prisma client from setup.js
const prisma = global.prisma;

/**
 * Create a test user
 */
export async function createTestUser(role = 'DEVELOPER') {
  const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  const password = 'TestPassword123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role
    }
  });

  return { user, password };
}

/**
 * Generate JWT token for a user
 */
export function generateToken(userId, role) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Create authenticated request helper
 */
export function createAuthenticatedRequest(app, token) {
  return {
    get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
  };
}

/**
 * Create a test site
 */
export async function createTestSite(userId, overrides = {}) {
  const siteName = `test-site-${Date.now()}`;
  const slug = siteName.toLowerCase().replace(/\s+/g, '-');

  const site = await prisma.site.create({
    data: {
      name: overrides.name || siteName,
      slug: overrides.slug || slug,
      liveUrl: overrides.liveUrl || 'https://example.com',
      connectionType: overrides.connectionType || 'crawl-only',
      encryptedCredentials: overrides.encryptedCredentials || null,
      platformType: overrides.platformType || null,
      status: overrides.status || 'NEVER_PULLED',
      createdById: userId,
      ...overrides
    }
  });

  return site;
}

/**
 * Create a test operation
 */
export async function createTestOperation(siteId, userId, type = 'PULL', status = 'PENDING') {
  const operation = await prisma.operation.create({
    data: {
      siteId,
      userId,
      type,
      status,
      startedAt: status !== 'PENDING' ? new Date() : null,
      completedAt: status === 'COMPLETED' ? new Date() : null
    }
  });

  return operation;
}

/**
 * Create a test archive
 */
export async function createTestArchive(siteId, version = null) {
  // If version not specified, auto-increment based on existing archives
  if (version === null) {
    const lastArchive = await prisma.archive.findFirst({
      where: { siteId },
      orderBy: { version: 'desc' }
    });
    version = lastArchive ? lastArchive.version + 1 : 1;
  }

  const archive = await prisma.archive.create({
    data: {
      siteId,
      version,
      filePath: `/archives/test-archive-${version}.zip`,
      dbPath: `/archives/test-db-${version}.sql`,
      fileSize: 1024 * 1024, // 1MB
    }
  });

  return archive;
}

/**
 * Create a test staging directory structure
 */
export async function createTestStagingDirectory(siteSlug) {
  const stagingDir = path.join(process.cwd(), 'staging', siteSlug);

  // Create directory
  await fs.mkdir(stagingDir, { recursive: true });

  // Create sample files
  await fs.writeFile(path.join(stagingDir, 'index.html'), '<html><body>Test</body></html>');
  await fs.writeFile(path.join(stagingDir, 'style.css'), 'body { margin: 0; }');
  await fs.mkdir(path.join(stagingDir, 'assets'), { recursive: true });
  await fs.writeFile(path.join(stagingDir, 'assets', 'logo.png'), 'fake-image-data');

  return stagingDir;
}

/**
 * Clean up test staging directory
 */
export async function cleanupTestStagingDirectory(siteSlug) {
  const stagingDir = path.join(process.cwd(), 'staging', siteSlug);

  try {
    await fs.rm(stagingDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors if directory doesn't exist
  }
}

/**
 * Create a test snapshot directory
 */
export async function createTestSnapshotDirectory(siteSlug) {
  const snapshotDir = path.join(process.cwd(), 'staging', siteSlug, '.live-snapshot');

  await fs.mkdir(snapshotDir, { recursive: true });
  await fs.writeFile(path.join(snapshotDir, 'index.html'), '<html><body>Old Version</body></html>');

  return snapshotDir;
}

/**
 * Wait for a job to complete
 */
export async function waitForJobCompletion(operation, timeout = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const updated = await prisma.operation.findUnique({
      where: { id: operation.id }
    });

    if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
      return updated;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Job ${operation.id} did not complete within ${timeout}ms`);
}

/**
 * Mock SFTP credentials
 */
export function getMockSFTPCredentials() {
  return {
    type: 'sftp',
    host: 'test-sftp.example.com',
    port: 22,
    username: 'testuser',
    password: 'testpass123',
    remotePath: '/public_html'
  };
}

/**
 * Encrypt credentials for testing
 */
export async function encryptTestCredentials(credentials) {
  const { encrypt } = await import('../../src/services/credentialService.js');
  return encrypt(JSON.stringify(credentials));
}

/**
 * Clean all test data
 */
export async function cleanAllTestData() {
  await prisma.notification.deleteMany({});
  await prisma.archive.deleteMany({});
  await prisma.operation.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.user.deleteMany({});
}

export { prisma };
