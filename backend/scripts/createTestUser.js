import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Check if admin user exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@greenshoe.com' }
    });

    if (existingAdmin) {
      console.log('✓ Admin user already exists: admin@greenshoe.com');
      return;
    }

    // Create admin user
    const passwordHash = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@greenshoe.com',
        passwordHash,
        role: 'ADMIN'
      }
    });

    console.log('✓ Created admin user:');
    console.log('  Email: admin@greenshoe.com');
    console.log('  Password: admin123');
    console.log('  Role: ADMIN');

    // Create a developer user
    const devPasswordHash = await bcrypt.hash('dev123', 10);

    const developer = await prisma.user.create({
      data: {
        email: 'dev@greenshoe.com',
        passwordHash: devPasswordHash,
        role: 'DEVELOPER'
      }
    });

    console.log('\n✓ Created developer user:');
    console.log('  Email: dev@greenshoe.com');
    console.log('  Password: dev123');
    console.log('  Role: DEVELOPER');

    // Create a PM user
    const pmPasswordHash = await bcrypt.hash('pm123', 10);

    const pm = await prisma.user.create({
      data: {
        email: 'pm@greenshoe.com',
        passwordHash: pmPasswordHash,
        role: 'PROJECT_MANAGER'
      }
    });

    console.log('\n✓ Created project manager user:');
    console.log('  Email: pm@greenshoe.com');
    console.log('  Password: pm123');
    console.log('  Role: PROJECT_MANAGER');

  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
