const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;


const CACHE_KEYS = {
  TOP_LEADERBOARD: 'leaderboard:top10',
  USER_RANK: (userId) => `leaderboard:rank:${userId}`,
  USER_SCORE: (userId) => `leaderboard:score:${userId}`,
};


const CACHE_TTL = {
  LEADERBOARD: parseInt(process.env.LEADERBOARD_CACHE_TTL) || 60,
  RANK: parseInt(process.env.RANK_CACHE_TTL) || 30,
};


function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      redisClient = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
        keepAlive: 30000,
      });
    } else {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
        keepAlive: 30000,
      });
    }

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', err);
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
  }

  return redisClient;
}


async function invalidateLeaderboardCache() {
  const client = getRedisClient();
  try {
    await client.del(CACHE_KEYS.TOP_LEADERBOARD);
    logger.info('Leaderboard cache invalidated');
  } catch (error) {
    logger.error('Failed to invalidate leaderboard cache', error);
  }
}

async function invalidateUserCache(userId) {
  const client = getRedisClient();
  try {
    await client.del(CACHE_KEYS.USER_RANK(userId));
    await client.del(CACHE_KEYS.USER_SCORE(userId));
    logger.info(`User cache invalidated for userId: ${userId}`);
  } catch (error) {
    logger.error(`Failed to invalidate user cache for userId: ${userId}`, error);
  }
}


async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client disconnected');
  }
}

module.exports = {
  getRedisClient,
  CACHE_KEYS,
  CACHE_TTL,
  invalidateLeaderboardCache,
  invalidateUserCache,
  disconnectRedis,
};
