import { prisma } from '../utils/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

/**
 * Register a new user
 * @param {Object} data - User data { email, password, role }
 * @returns {Object} User object and token
 */
export async function register({ email, password, role = 'DEVELOPER' }) {
  // Validate role
  const validRoles = ['DEVELOPER', 'PROJECT_MANAGER', 'ADMIN'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  // Generate JWT token
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  logger.info(`User registered: ${email} (${role})`);

  return { user, token };
}

/**
 * Login a user
 * @param {Object} credentials - { email, password }
 * @returns {Object} User object and token
 */
export async function login({ email, password }) {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Generate JWT token
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  logger.info(`User logged in: ${email}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token
  };
}

/**
 * Get user by ID
 * @param {String} userId
 * @returns {Object} User object
 */
export async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}
