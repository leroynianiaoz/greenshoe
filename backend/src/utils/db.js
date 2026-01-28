import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

// In test environment, use global.prisma from test setup
// Otherwise create a new PrismaClient instance
let prisma;

if (process.env.NODE_ENV === 'test' && global.prisma) {
  prisma = global.prisma;
} else {
  prisma = new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });

  // Log Prisma errors and warnings (only for non-test environment)
  prisma.$on('error', (e) => {
    logger.error('Prisma error:', e);
  });

  prisma.$on('warn', (e) => {
    logger.warn('Prisma warning:', e);
  });

  // Graceful shutdown (only for non-test environment)
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

export { prisma };
