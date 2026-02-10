const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { validateRequest, submitScoreSchema, userIdParamSchema } = require('../utils/validation');


router.post(
  '/submit',
  validateRequest(submitScoreSchema, 'body'),
  leaderboardController.submitScore
);


router.get(
  '/top',
  leaderboardController.getTopPlayers
);


router.get(
  '/rank/:userId',
  validateRequest(userIdParamSchema, 'params'),
  leaderboardController.getPlayerRank
);


router.get(
  '/stats',
  leaderboardController.getStats
);


router.post(
  '/recalculate',
  leaderboardController.triggerRankRecalculation
);

module.exports = router;
