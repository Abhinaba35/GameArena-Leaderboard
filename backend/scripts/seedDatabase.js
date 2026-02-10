require('dotenv').config();
const { getPrismaClient } = require('../config/database');
const logger = require('../config/logger');

const prisma = getPrismaClient();

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');
    const startTime = Date.now();

    logger.info('Truncating tables...');
    await prisma.$executeRaw`TRUNCATE TABLE leaderboards RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE game_sessions RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE users RESTART IDENTITY CASCADE`;
    logger.info('✓ Tables truncated');

    logger.info('Seeding users table...');
    await prisma.$executeRaw`
      INSERT INTO users (id, username)
      SELECT s, 'user_' || s
      FROM generate_series(1, 1000000) AS s
    `;
    logger.info('✓ Users table seeded');

    const batchSize = 100000;
    const totalSessions = 5000000;
    logger.info(`Seeding ${totalSessions} game sessions in batches of ${batchSize}...`);
    for (let i = 0; i < totalSessions; i += batchSize) {
      await prisma.$executeRaw`
        INSERT INTO game_sessions (user_id, score, game_mode, "timestamp")
        SELECT
          floor(random() * 1000000 + 1)::int,
          floor(random() * 10000 + 1)::int,
          CASE WHEN random() > 0.5 THEN 'solo' ELSE 'team' END,
          NOW() - INTERVAL '1 day' * floor(random() * 365)
        FROM generate_series(1, ${batchSize})
      `;
      logger.info(`✓ Seeded ${i + batchSize} of ${totalSessions} game sessions`);
    }
    logger.info('✓ Game sessions table seeded');

    logger.info('Aggregating scores for leaderboard in batches...');
    const totalUsers = 1000000;
    for (let i = 1; i <= totalUsers; i += batchSize) {
      await prisma.$executeRaw`
        INSERT INTO leaderboards (user_id, total_score)
        SELECT 
          user_id, 
          SUM(score) as total_score
        FROM game_sessions
        WHERE user_id BETWEEN ${i} AND ${i + batchSize - 1}
        GROUP BY user_id
        ON CONFLICT (user_id) DO UPDATE
        SET total_score = EXCLUDED.total_score
      `;
      logger.info(`✓ Aggregated scores for users ${i} to ${i + batchSize - 1}`);
    }
    
    logger.info('Recalculating all ranks...');
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
    logger.info('✓ Leaderboard table populated and ranks calculated');

    logger.info('Ensuring indexes are created...');
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_game_sessions_user_timestamp 
      ON game_sessions(user_id, timestamp)
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_game_sessions_user_score 
      ON game_sessions(user_id, score)
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_leaderboards_total_score 
      ON leaderboards(total_score DESC, user_id)
    `;
    logger.info('✓ Indexes created');

    const userCount = await prisma.user.count();
    const sessionCount = await prisma.gameSession.count();
    const leaderboardCount = await prisma.leaderboards.count();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('Database seeding completed successfully!');
    logger.info(`Total Users: ${userCount.toLocaleString()}`);
    logger.info(`Total Game Sessions: ${sessionCount.toLocaleString()}`);
    logger.info(`Leaderboard Entries: ${leaderboardCount.toLocaleString()}`);
    logger.info(`Time Taken: ${duration} seconds`);

  } catch (error) {
    logger.error('Database seeding failed', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Fatal error during seeding', error);
    process.exit(1);
  });
