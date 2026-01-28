import { logger } from '../utils/logger.js';
import { prisma } from '../utils/db.js';

let io = null;

/**
 * Initialize Socket.IO instance
 */
export function initializeSocketIO(socketIO) {
  io = socketIO;
  logger.info('Notification service initialized with Socket.IO');
}

/**
 * Create a notification and emit via WebSocket
 */
export async function createNotification({ userId, type, message, metadata = null }) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
        read: false
      }
    });

    // Emit WebSocket event if Socket.IO is initialized
    if (io) {
      io.to(`user-${userId}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        read: notification.read,
        createdAt: notification.createdAt,
        metadata: metadata
      });
      logger.info(`Notification emitted via WebSocket for user ${userId}: ${type}`);
    }

    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error.message);
    throw error;
  }
}

/**
 * Create a site operation notification
 */
export async function notifyOperation({ userId, siteId, siteName, operation, status, message, metadata = {} }) {
  const type = `${operation}_${status}`.toUpperCase(); // e.g., PULL_SUCCESS, PUSH_FAILURE

  const fullMessage = message || `${operation.charAt(0).toUpperCase() + operation.slice(1)} operation ${status} for site "${siteName}"`;

  return await createNotification({
    userId,
    type,
    message: fullMessage,
    metadata: {
      siteId,
      siteName,
      operation,
      status,
      ...metadata
    }
  });
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId) {
  return await prisma.notification.count({
    where: {
      userId,
      read: false
    }
  });
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId, userId) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId }
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  if (notification.userId !== userId) {
    throw new Error('Access denied');
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true }
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId) {
  return await prisma.notification.updateMany({
    where: {
      userId,
      read: false
    },
    data: {
      read: true
    }
  });
}

/**
 * Delete old read notifications (keep last 50 per user)
 */
export async function cleanupOldNotifications(userId) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      read: true
    },
    orderBy: { createdAt: 'desc' },
    skip: 50
  });

  if (notifications.length > 0) {
    await prisma.notification.deleteMany({
      where: {
        id: {
          in: notifications.map(n => n.id)
        }
      }
    });
    logger.info(`Cleaned up ${notifications.length} old notifications for user ${userId}`);
  }
}

/**
 * Emit operation progress update via WebSocket (without creating notification)
 */
export function emitProgress({ userId, siteId, operation, progress, message }) {
  if (!io) {
    logger.warn('Socket.IO not initialized, cannot emit progress');
    return;
  }

  io.to(`user-${userId}`).emit('operation-progress', {
    siteId,
    operation,
    progress,
    message,
    timestamp: new Date().toISOString()
  });
}
