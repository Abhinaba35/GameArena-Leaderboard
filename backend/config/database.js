const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

let prisma;


function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
      datasources: {
        db: {
          url: `${process.env.DATABASE_URL}?connection_limit=100`,
        },
      },
    });

    prisma.$on('query', (e) => {
      if (e.duration > 1000) { 
        logger.warn('Slow query detected', {
          query: e.query,
          duration: e.duration,
          params: e.params,
        });
      }
    });

    prisma.$on('warn', (e) => {
      logger.warn('Prisma warning', e);
    });

    prisma.$on('error', (e) => {
      logger.error('Prisma error', e);
    });

    logger.info('Prisma Client initialized');
  }

  return prisma;
}


async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Prisma Client disconnected');
  }
}

module.exports = {
  getPrismaClient,
  disconnectPrisma,
};
