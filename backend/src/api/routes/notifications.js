import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../utils/db.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Get all notifications for current user
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50
    });

    res.status(200).json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
        metadata: n.metadata ? JSON.parse(n.metadata) : null
      }))
    });
  } catch (error) {
    logger.error('Get notifications error:', error.message);
    res.status(500).json({
      error: 'Failed to get notifications',
      message: error.message
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found'
      });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    });

    res.status(200).json({ message: 'Notification marked as read' });

  } catch (error) {
    logger.error('Mark notification read error:', error.message);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found'
      });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    await prisma.notification.delete({
      where: { id: req.params.id }
    });

    res.status(200).json({ message: 'Notification deleted' });

  } catch (error) {
    logger.error('Delete notification error:', error.message);
    res.status(500).json({
      error: 'Failed to delete notification',
      message: error.message
    });
  }
});

export { router as notificationsRouter };
