import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { logger } from './utils/logger.js';
import { healthRouter } from './api/routes/health.js';
import { authRouter } from './api/routes/auth.js';
import { testRouter } from './api/routes/test.js';
import { sitesRouter } from './api/routes/sites.js';
import { notificationsRouter } from './api/routes/notifications.js';
import { operationsRouter } from './api/routes/operations.js';
import { usersRouter } from './api/routes/users.js';
import { initializeSocketIO } from './services/notificationService.js';
import { verifyToken } from './utils/jwt.js';

/**
 * Create and configure Express app
 * Exported separately for testing purposes
 */
export function createApp() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Only use morgan in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) }
    }));
  }

  // Socket.IO authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Initialize Socket.IO for notifications
  initializeSocketIO(io);

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/test', testRouter);
  app.use('/api/sites', sitesRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/operations', operationsRouter);
  app.use('/api/users', usersRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  });

  return { app, httpServer, io };
}
