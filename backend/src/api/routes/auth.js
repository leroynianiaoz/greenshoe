import express from 'express';
import { register, login } from '../../services/authService.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user (Admin only in production)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid email format'
      });
    }

    // Password validation (min 6 characters for MVP)
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters'
      });
    }

    const { user, token } = await register({ email, password, role });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    logger.error('Registration error:', error.message);
    res.status(400).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Login a user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    const { user, token } = await login({ email, password });

    res.status(200).json({
      message: 'Login successful',
      user,
      token
    });
  } catch (error) {
    logger.error('Login error:', error.message);
    res.status(401).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authMiddleware, async (req, res) => {
  res.status(200).json({
    user: req.user
  });
});

export { router as authRouter };
