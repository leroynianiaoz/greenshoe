import { prisma } from '../utils/db.js';
import { logger } from '../utils/logger.js';

/**
 * Get all users
 * @returns {Array} Array of user objects
 */
export async function getAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return users;
}

/**
 * Update a user's role
 * @param {String} userId - User ID to update
 * @param {Object} data - Update data { role }
 * @returns {Object} Updated user object
 */
export async function updateUser(userId, { role }) {
  const validRoles = ['DEVELOPER', 'PROJECT_MANAGER', 'ADMIN'];
  if (role && !validRoles.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  logger.info(`User ${userId} role updated to ${role}`);

  return user;
}

/**
 * Delete a user
 * @param {String} userId - User ID to delete
 */
export async function deleteUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  await prisma.user.delete({
    where: { id: userId }
  });

  logger.info(`User ${userId} (${user.email}) deleted`);
}
