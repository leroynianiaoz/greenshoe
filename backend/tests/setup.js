import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Create global Prisma client for tests
global.prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./prisma/test.db'
    }
  }
});

// Note: testTimeout is set in jest.config.js (30000ms)

// Setup function that runs before all tests
beforeAll(async () => {
  // Clean database before running tests
  await cleanDatabase();
});

// Clean up after each test (skip for integration/E2E and security tests)
afterEach(async () => {
  // Skip cleanup for tests that use beforeAll to create shared test data
  const testPath = expect.getState().testPath;
  if (testPath && (testPath.includes('integration') || testPath.includes('security'))) {
    return;
  }

  // Clean database between tests to ensure isolation for unit tests
  await cleanDatabase();
});

// Clean database helper
async function cleanDatabase() {
  const tables = ['notifications', 'archives', 'operations', 'sites', 'users'];

  for (const table of tables) {
    await global.prisma.$executeRawUnsafe(`DELETE FROM ${table};`);
  }
}

export { cleanDatabase };
