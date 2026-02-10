if (process.env.NEW_RELIC_ENABLED === 'true') {
  require('newrelic');
}

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const logger = require('./config/logger');
const { getPrismaClient, disconnectPrisma } = require('./config/database');
const { getRedisClient, disconnectRedis } = require('./config/redis');
const { closeQueues } = require('./config/queues');
const { closeWorkers } = require('./jobs/workers');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const leaderboardController = require('./controllers/leaderboardController');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

leaderboardController.setSocketIO(io);

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, 
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

app.use('/api/leaderboard', leaderboardRoutes);

app.use(notFoundHandler);

app.use(errorHandler);

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.join('leaderboard');

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  socket.on('leaderboard:request', async () => {
    try {
      const { getTopPlayers } = require('./services/leaderboardService');
      const topPlayers = await getTopPlayers(10);
      socket.emit('leaderboard:data', topPlayers);
    } catch (error) {
      logger.error('Failed to send leaderboard data', error);
      socket.emit('leaderboard:error', { message: 'Failed to fetch leaderboard' });
    }
  });
});

async function initializeApp() {
  try {
    const prisma = getPrismaClient();
    await prisma.$connect();
    logger.info('Database connected successfully');

    const redis = getRedisClient();
    await redis.ping();
    logger.info('Redis connected successfully');

    require('./jobs/workers');
    logger.info('Background workers started');

    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    await closeWorkers();
    await closeQueues();
    await disconnectRedis();
    await disconnectPrisma();
    logger.info('All connections closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown('UNHANDLED_REJECTION');
});

const PORT = process.env.PORT || 8000;

initializeApp().then(() => {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Socket.io enabled for real-time updates`);
    logger.info(`New Relic monitoring: ${process.env.NEW_RELIC_ENABLED === 'true' ? 'enabled' : 'disabled'}`);
  });
});

module.exports = { app, server, io };
