import express from 'express';
import { getAllUsers, updateUser, deleteUser } from '../../services/userService.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

/**
 * GET /api/users
 * Get all users (Admin only)
 */
router.get('/', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await getAllUsers();

    res.status(200).json({
      users
    });
  } catch (error) {
    logger.error('Error fetching users:', error.message);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

/**
 * PUT /api/users/:id
 * Update a user's role (Admin only)
 */
router.put('/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Role is required'
      });
    }

    const user = await updateUser(id, { role });

    res.status(200).json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    logger.error('Error updating user:', error.message);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    res.status(400).json({
      error: 'Failed to update user',
      message: error.message
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user (Admin only)
 */
router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cannot delete your own account'
      });
    }

    await deleteUser(id);

    res.status(200).json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error.message);

    if (error.message === 'User not found' || error.code === 'P2025') {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    res.status(500).json({
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

export { router as usersRouter };
