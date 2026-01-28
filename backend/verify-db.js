import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

try {
  // Test connection by counting users
  const userCount = await prisma.user.count();
  const siteCount = await prisma.site.count();
  const operationCount = await prisma.operation.count();
  const archiveCount = await prisma.archive.count();
  const notificationCount = await prisma.notification.count();

  console.log('✅ Database connection successful!');
  console.log('\nTable counts:');
  console.log(`- Users: ${userCount}`);
  console.log(`- Sites: ${siteCount}`);
  console.log(`- Operations: ${operationCount}`);
  console.log(`- Archives: ${archiveCount}`);
  console.log(`- Notifications: ${notificationCount}`);
  console.log('\n✅ All tables exist and are accessible!');

  await prisma.$disconnect();
} catch (error) {
  console.error('❌ Database error:', error.message);
  process.exit(1);
}
