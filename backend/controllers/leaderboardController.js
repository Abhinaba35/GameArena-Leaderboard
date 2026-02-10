const leaderboardService = require('../services/leaderboardService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

let io = null;

function setSocketIO(socketIO) {
  io = socketIO;
}


const submitScore = asyncHandler(async (req, res) => {
  const { user_id, score, game_mode } = req.body;

  const result = await leaderboardService.submitScore(user_id, score, game_mode);

  if (io) {
    io.emit('leaderboard:updated', {
      userId: user_id,
      score,
      timestamp: new Date().toISOString(),
    });
    logger.debug('Real-time leaderboard update emitted');
  }

  res.status(200).json({
    success: true,
    message: 'Score submitted successfully',
    data: {
      userId: result.userId,
      totalScore: result.totalScore,
      submittedAt: new Date().toISOString(),
    },
  });
});


const getTopPlayers = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const topPlayers = await leaderboardService.getTopPlayers(limit);

  res.status(200).json({
    success: true,
    data: topPlayers,
    count: topPlayers.length,
    timestamp: new Date().toISOString(),
  });
});


const getPlayerRank = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const rankData = await leaderboardService.getPlayerRank(parseInt(userId));

  res.status(200).json({
    success: true,
    data: rankData,
    timestamp: new Date().toISOString(),
  });
});


const triggerRankRecalculation = asyncHandler(async (req, res) => {
  const { addRankRecalculationJob } = require('../config/queues');
  
  await addRankRecalculationJob({ fullRecalculation: true });

  res.status(202).json({
    success: true,
    message: 'Rank recalculation job queued',
    timestamp: new Date().toISOString(),
  });
});


const getStats = asyncHandler(async (req, res) => {
  const { getPrismaClient } = require('../config/database');
  const prisma = getPrismaClient();

  const [totalUsers, totalSessions, avgScore] = await Promise.all([
    prisma.user.count(),
    prisma.gameSession.count(),
    prisma.gameSession.aggregate({
      _avg: { score: true },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalSessions,
      averageScore: Math.round(avgScore._avg.score || 0),
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = {
  setSocketIO,
  submitScore,
  getTopPlayers,
  getPlayerRank,
  triggerRankRecalculation,
  getStats,
};
