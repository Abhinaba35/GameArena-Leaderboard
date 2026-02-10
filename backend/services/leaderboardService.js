const { getPrismaClient } = require('../config/database');
const { getRedisClient, CACHE_KEYS, CACHE_TTL, invalidateLeaderboardCache, invalidateUserCache } = require('../config/redis');
const { addRankRecalculationJob } = require('../config/queues');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');

const prisma = getPrismaClient();
const redis = getRedisClient();

/** 
 * @param {number} userId 
 * @param {number} score 
 * @param {string} gameMode 
 * @returns {Promise<Object>} 
 */
async function submitScore(userId, score, gameMode = 'solo') {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          username: `user_${userId}`,
        },
      });
      
      const gameSession = await tx.gameSession.create({
        data: {
          userId,
          score,
          gameMode,
        },
      });
      const scoreAggregation = await tx.gameSession.aggregate({
        where: { userId },
        _sum: { score: true },
        _avg: { score: true },
        _count: true,
      });

      const totalScore = scoreAggregation._sum.score || 0;

      const leaderboardEntry = await tx.leaderboards.upsert({
        where: { userId },
        update: { 
          totalScore,
        },
        create: {
          userId,
          totalScore,
        },
      });

      return { gameSession, leaderboardEntry, totalScore };
    }, {
      isolationLevel: 'ReadCommitted',
      timeout: 30000, // 30 second timeout
    });

    await Promise.allSettled([
      invalidateLeaderboardCache(),
      invalidateUserCache(userId),
    ]);

    if (process.env.RANK_RECALCULATION_ENABLED === 'true') {
      await addRankRecalculationJob({ userId, incremental: true });
    }

    logger.info(`Score submitted successfully`, { 
      userId, 
      score, 
      totalScore: result.totalScore 
    });

    return result.leaderboardsEntry;

  } catch (error) {
    logger.error('Failed to submit score', { userId, score, error: error.message });
    throw new AppError('Failed to submit score. Please try again.', 500);
  }
}

/**
 * @param {number} limit
 * @returns {Promise<Array>} 
 */
async function getTopPlayers(limit = 10) {
  const cacheKey = CACHE_KEYS.TOP_LEADERBOARD;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Leaderboard cache hit');
      return JSON.parse(cached);
    }

    logger.debug('Leaderboard cache miss');

    const topPlayers = await prisma.$queryRaw`
      SELECT 
        l.user_id,
        u.username,
        l.total_score,
        RANK() OVER (ORDER BY l.total_score DESC) as rank
      FROM leaderboards l
      INNER JOIN users u ON l.user_id = u.id
      ORDER BY l.total_score DESC
      LIMIT ${limit}
    `;

    const formattedPlayers = topPlayers.map(player => ({
      userId: Number(player.user_id),
      username: player.username,
      totalScore: Number(player.total_score),
      rank: Number(player.rank),
    }));

    await redis.setex(
      cacheKey,
      CACHE_TTL.LEADERBOARD,
      JSON.stringify(formattedPlayers)
    );

    logger.info(`Retrieved top ${limit} players from database`);
    return formattedPlayers;

  } catch (error) {
    logger.error('Failed to get top players', { error: error.message });
    throw new AppError('Failed to retrieve leaderboards', 500);
  }
}

/**
 * @param {number} userId 
 * @returns {Promise<Object>} 
 */
async function getPlayerRank(userId) {
  const cacheKey = CACHE_KEYS.USER_RANK(userId);

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug(`Rank cache hit for user ${userId}`);
      return JSON.parse(cached);
    }

    logger.debug(`Rank cache miss for user ${userId}`);

    const rankData = await prisma.$queryRaw`
      SELECT 
        l.user_id,
        u.username,
        l.total_score,
        (
          SELECT COUNT(*) + 1
          FROM leaderboards l2
          WHERE l2.total_score > l.total_score
        ) as rank,
        (SELECT COUNT(*) FROM leaderboards) as total_players
      FROM leaderboards l
      INNER JOIN users u ON l.user_id = u.id
      WHERE l.user_id = ${userId}
      LIMIT 1
    `;

    if (!rankData || rankData.length === 0) {
      throw new AppError('Player not found in leaderboards', 404);
    }

    const result = {
      userId: Number(rankData[0].user_id),
      username: rankData[0].username,
      totalScore: Number(rankData[0].total_score),
      rank: Number(rankData[0].rank),
      totalPlayers: Number(rankData[0].total_players),
    };

    await redis.setex(
      cacheKey,
      CACHE_TTL.RANK,
      JSON.stringify(result)
    );

    logger.info(`Retrieved rank for user ${userId}: rank ${result.rank}`);
    return result;

  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`Failed to get rank for user ${userId}`, { error: error.message });
    throw new AppError('Failed to retrieve player rank', 500);
  }
}

/**

 * @param {number} batchSize

 */
async function recalculateAllRanks(batchSize = 1000) {
  try {
    logger.info('Starting full rank recalculation');

    await prisma.$executeRaw`
      UPDATE leaderboards
      SET rank = ranked.rank
      FROM (
        SELECT 
          user_id,
          RANK() OVER (ORDER BY total_score DESC) as rank
        FROM leaderboards
      ) AS ranked
      WHERE leaderboards.user_id = ranked.user_id
    `;

    await invalidateLeaderboardCache();
    
    logger.info('Full rank recalculation completed');
    return { success: true, message: 'Ranks recalculated successfully' };

  } catch (error) {
    logger.error('Failed to recalculate ranks', { error: error.message });
    throw error;
  }
}

module.exports = {
  submitScore,
  getTopPlayers,
  getPlayerRank,
  recalculateAllRanks,
};
