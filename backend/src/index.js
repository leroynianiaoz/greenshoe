import 'dotenv/config';
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
import { initializeSocketIO } from './services/notificationService.js';
import { verifyToken } from './utils/jwt.js';

// Import job processors to register with queues
import './jobs/pullProcessor.js';
import './jobs/pushProcessor.js';
import './jobs/backupProcessor.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5200',
      'http://localhost:5200'
    ],
    credentials: true
  }
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

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
    logger.error('Socket.IO authentication error:', error.message);
    next(new Error('Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`WebSocket connected: user ${socket.userEmail} (${socket.userId})`);

  // Join user-specific room for notifications
  socket.join(`user-${socket.userId}`);

  socket.on('disconnect', () => {
    logger.info(`WebSocket disconnected: user ${socket.userEmail}`);
  });
});

// Initialize notification service with Socket.IO
initializeSocketIO(io);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/test', testRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/operations', operationsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
httpServer.listen(PORT, () => {
  logger.info(`GreenShoe backend server running on port ${PORT}`);
  logger.info(`WebSocket server initialized`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;

