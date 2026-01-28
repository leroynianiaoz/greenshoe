import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../utils/db.js';

const router = express.Router();

/**
 * GET /api/operations
 * Get all operations (with optional filtering)
 * Returns operations with site and user details
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {siteId, type, status, limit = '50', offset = '0' } = req.query;

    // Build where clause for filtering
    const where = {};
    if (siteId) where.siteId = siteId;
    if (type) where.type = type;
    if (status) where.status = status;

    const operations = await prisma.operation.findMany({
      where,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            slug: true,
            liveUrl: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.operation.count({ where });

    res.status(200).json({
      operations,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    logger.error('Get operations error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve operations',
      message: error.message
    });
  }
});

/**
 * GET /api/operations/:id
 * Get a single operation by ID with full details
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const operation = await prisma.operation.findUnique({
      where: { id: req.params.id },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            slug: true,
            liveUrl: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!operation) {
      return res.status(404).json({
        error: 'Operation not found',
        message: 'The specified operation does not exist'
      });
    }

    res.status(200).json(operation);

  } catch (error) {
    logger.error('Get operation error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve operation',
      message: error.message
    });
  }
});

/**
 * GET /api/operations/site/:siteId
 * Get all operations for a specific site
 */
router.get('/site/:siteId', authMiddleware, async (req, res) => {
  try {
    const operations = await prisma.operation.findMany({
      where: { siteId: req.params.siteId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      operations,
      total: operations.length
    });

  } catch (error) {
    logger.error('Get site operations error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve site operations',
      message: error.message
    });
  }
});

/**
 * GET /api/operations/stats/summary
 * Get operations statistics summary
 */
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const { siteId } = req.query;
    const where = siteId ? { siteId } : {};

    const [
      total,
      pending,
      inProgress,
      completed,
      failed,
      rolledBack
    ] = await Promise.all([
      prisma.operation.count({ where }),
      prisma.operation.count({ where: { ...where, status: 'PENDING' } }),
      prisma.operation.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.operation.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.operation.count({ where: { ...where, status: 'FAILED' } }),
      prisma.operation.count({ where: { ...where, status: 'ROLLED_BACK' } })
    ]);

    // Get operation counts by type
    const byType = await prisma.operation.groupBy({
      by: ['type'],
      where,
      _count: { type: true }
    });

    const typeStats = {};
    byType.forEach(item => {
      typeStats[item.type] = item._count.type;
    });

    res.status(200).json({
      total,
      byStatus: {
        pending,
        inProgress,
        completed,
        failed,
        rolledBack
      },
      byType: typeStats
    });

  } catch (error) {
    logger.error('Get operations stats error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve operations statistics',
      message: error.message
    });
  }
});

export { router as operationsRouter };
