const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/leaderboard';
const MAX_USER_ID = parseInt(process.env.MAX_USER_ID) || 1000000;
const MIN_SCORE = 100;
const MAX_SCORE = 10000;
const MIN_DELAY = 500; 
const MAX_DELAY = 2000; 

const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalLatency: 0,
  minLatency: Infinity,
  maxLatency: 0,
  startTime: Date.now(),
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDelay() {
  return randomInt(MIN_DELAY, MAX_DELAY);
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function updateStats(success, latency) {
  stats.totalRequests++;
  if (success) {
    stats.successfulRequests++;
    stats.totalLatency += latency;
    stats.minLatency = Math.min(stats.minLatency, latency);
    stats.maxLatency = Math.max(stats.maxLatency, latency);
  } else {
    stats.failedRequests++;
  }
}


function printStats() {
  const runtime = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  const successRate = ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2);
  const avgLatency = stats.successfulRequests > 0 
    ? (stats.totalLatency / stats.successfulRequests).toFixed(2) 
    : 0;

  console.log('LOAD SIMULATION STATISTICS');
  console.log(`Runtime: ${runtime}s`);
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Successful: ${stats.successfulRequests}`);
  console.log(`Failed: ${stats.failedRequests}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Avg Latency: ${avgLatency}ms`);
  console.log(`Min Latency: ${stats.minLatency === Infinity ? 0 : stats.minLatency}ms`);
  console.log(`Max Latency: ${stats.maxLatency}ms`);
  console.log(`Requests/sec: ${(stats.totalRequests / (runtime || 1)).toFixed(2)}`);
}

async function submitScore(userId) {
  const score = randomInt(MIN_SCORE, MAX_SCORE);
  const startTime = Date.now();

  try {
    const response = await axios.post(`${API_BASE_URL}/submit`, {
      user_id: userId,
      score: score,
      game_mode: Math.random() > 0.5 ? 'solo' : 'team',
    });

    const latency = Date.now() - startTime;
    updateStats(true, latency);
    
    console.log(`✓ [${latency}ms] Score submitted - User: ${userId}, Score: ${score}`);
    return response.data;
  } catch (error) {
    const latency = Date.now() - startTime;
    updateStats(false, latency);
    console.error(`✗ [${latency}ms] Failed to submit score:`, error.message);
    return null;
  }
}


async function getTopPlayers() {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${API_BASE_URL}/top`);
    const latency = Date.now() - startTime;
    updateStats(true, latency);
    
    console.log(`✓ [${latency}ms] Fetched top players (${response.data.count} players)`);
    return response.data;
  } catch (error) {
    const latency = Date.now() - startTime;
    updateStats(false, latency);
    console.error(`✗ [${latency}ms] Failed to fetch top players:`, error.message);
    return null;
  }
}


async function getUserRank(userId) {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${API_BASE_URL}/rank/${userId}`);
    const latency = Date.now() - startTime;
    updateStats(true, latency);
    
    const { rank, totalScore } = response.data.data;
    console.log(`✓ [${latency}ms] User rank - User: ${userId}, Rank: ${rank}, Score: ${totalScore}`);
    return response.data;
  } catch (error) {
    const latency = Date.now() - startTime;
    updateStats(false, latency);
    console.error(`✗ [${latency}ms] Failed to fetch user rank:`, error.message);
    return null;
  }
}


async function runSimulation() {
  console.log('STARTING LOAD SIMULATION');
  console.log(`Target API: ${API_BASE_URL}`);
  console.log(`Max User ID: ${MAX_USER_ID}`);
  console.log(`Score Range: ${MIN_SCORE} - ${MAX_SCORE}`);
  console.log(`Delay Range: ${MIN_DELAY}ms - ${MAX_DELAY}ms`);
  console.log('Press Ctrl+C to stop\n');

  const statsInterval = setInterval(printStats, 10000);

  try {
    while (true) {
      const userId = randomInt(1, MAX_USER_ID);

      await submitScore(userId);
      await sleep(randomDelay() / 2);
      
      await getTopPlayers();
      await sleep(randomDelay() / 2);
      
      await getUserRank(userId);

      await sleep(randomDelay());
    }
  } catch (error) {
    console.error('Simulation error:', error);
  } finally {
    clearInterval(statsInterval);
    printStats();
  }
}

process.on('SIGINT', () => {
  console.log('\n\nReceived SIGINT. Shutting down gracefully...');
  printStats();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nReceived SIGTERM. Shutting down gracefully...');
  printStats();
  process.exit(0);
});

runSimulation().catch((error) => {
  console.error('Fatal error:', error);
  printStats();
  process.exit(1);
});
