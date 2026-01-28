import { verifyToken } from '../../utils/jwt.js';
import { getUserById } from '../../services/authService.js';
import { logger } from '../../utils/logger.js';

/**
 * Middleware to verify JWT token and attach user to request
 */
export async function authMiddleware(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const user = await getUserById(decoded.userId);

    // Attach user to request object
    req.user = user;

    next();
  } catch (error) {
    logger.error('Authentication error:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message
    });
  }
}

/**
 * Middleware to require specific role(s)
 * @param {String|Array} allowedRoles - Single role or array of roles
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.email} with role ${req.user.role}. Required: ${allowedRoles.join(' or ')}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}
