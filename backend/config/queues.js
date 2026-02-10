const { Queue, Worker } = require('bullmq');
const { getRedisClient } = require('./redis');
const logger = require('./logger');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const rankRecalculationQueue = new Queue('rank-recalculation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

const cacheWarmingQueue = new Queue('cache-warming', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
});

/**
 * Add a rank recalculation job
 * @param {Object} data - Job data
 * @param {number} data.userId - Optional specific user to recalculate
 * @param {boolean} data.fullRecalculation - Whether to recalculate all ranks
 */
async function addRankRecalculationJob(data = {}) {
  try {
    const job = await rankRecalculationQueue.add('recalculate-ranks', data, {
      priority: data.fullRecalculation ? 1 : 10,
    });
    logger.info(`Rank recalculation job added: ${job.id}`, data);
    return job;
  } catch (error) {
    logger.error('Failed to add rank recalculation job', error);
    throw error;
  }
}

async function addCacheWarmingJob() {
  try {
    const job = await cacheWarmingQueue.add('warm-cache', {
      timestamp: Date.now(),
    });
    logger.info(`Cache warming job added: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Failed to add cache warming job', error);
    throw error;
  }
}


async function getQueueStats(queueName) {
  const queue = queueName === 'rank-recalculation' 
    ? rankRecalculationQueue 
    : cacheWarmingQueue;
    
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  } catch (error) {
    logger.error(`Failed to get stats for queue: ${queueName}`, error);
    return null;
  }
}


async function closeQueues() {
  await rankRecalculationQueue.close();
  await cacheWarmingQueue.close();
  logger.info('All queues closed');
}

module.exports = {
  rankRecalculationQueue,
  cacheWarmingQueue,
  addRankRecalculationJob,
  addCacheWarmingJob,
  getQueueStats,
  closeQueues,
};
