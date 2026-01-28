export default async () => {
  // Disconnect Prisma client after all tests
  if (global.prisma) {
    await global.prisma.$disconnect();
  }

  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 500));
};
