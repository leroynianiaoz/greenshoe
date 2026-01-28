import express from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * Test endpoint - requires authentication
 */
router.get('/auth-test', authMiddleware, (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: req.user
  });
});

/**
 * Test endpoint - requires ADMIN role
 */
router.get('/admin-only', authMiddleware, requireRole('ADMIN'), (req, res) => {
  res.json({
    message: 'Admin access granted',
    user: req.user
  });
});

/**
 * Test endpoint - requires PROJECT_MANAGER or ADMIN role
 */
router.get('/manager-only', authMiddleware, requireRole('PROJECT_MANAGER', 'ADMIN'), (req, res) => {
  res.json({
    message: 'Manager or Admin access granted',
    user: req.user
  });
});

export { router as testRouter };
