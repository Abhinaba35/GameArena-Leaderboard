const { Worker } = require('bullmq');
const { recalculateAllRanks } = require('../services/leaderboardService');
const { getTopPlayers } = require('../services/leaderboardService');
const logger = require('../config/logger');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};


const rankRecalculationWorker = new Worker(
  'rank-recalculation',
  async (job) => {
    const { userId, fullRecalculation, incremental } = job.data;
    
    logger.info(`Processing rank recalculation job ${job.id}`, job.data);

    try {
      if (fullRecalculation) {
        await recalculateAllRanks();
        logger.info(`Full rank recalculation completed for job ${job.id}`);
      } else if (incremental && userId) {
        logger.info(`Incremental rank update for user ${userId}`);
      }

      return { success: true, processedAt: new Date().toISOString() };
    } catch (error) {
      logger.error(`Rank recalculation job ${job.id} failed`, error);
      throw error; 
    }
  },
  {
    connection,
    concurrency: 2, 
    limiter: {
      max: 5, 
      duration: 1000, 
    },
  }
);


const cacheWarmingWorker = new Worker(
  'cache-warming',
  async (job) => {
    logger.info(`Processing cache warming job ${job.id}`);

    try {
      await getTopPlayers(10);
      await getTopPlayers(50); 
      
      logger.info(`Cache warming completed for job ${job.id}`);
      return { success: true, processedAt: new Date().toISOString() };
    } catch (error) {
      logger.error(`Cache warming job ${job.id} failed`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1,
  }
);

rankRecalculationWorker.on('completed', (job) => {
  logger.info(`Rank recalculation job ${job.id} completed`);
});

rankRecalculationWorker.on('failed', (job, err) => {
  logger.error(`Rank recalculation job ${job?.id} failed`, err);
});

cacheWarmingWorker.on('completed', (job) => {
  logger.info(`Cache warming job ${job.id} completed`);
});

cacheWarmingWorker.on('failed', (job, err) => {
  logger.error(`Cache warming job ${job?.id} failed`, err);
});


async function closeWorkers() {
  await rankRecalculationWorker.close();
  await cacheWarmingWorker.close();
  logger.info('All workers closed');
}

module.exports = {
  rankRecalculationWorker,
  cacheWarmingWorker,
  closeWorkers,
};
