import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/leaderboard';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error('[API Response Error]', error);
    
    const message = error.response?.data?.error || error.message || 'An error occurred';
    
    return Promise.reject({
      message,
      status: error.response?.status,
      details: error.response?.data?.details,
    });
  }
);

/**
 * @param {number} userId 
 * @param {number} score 
 * @param {string} gameMode 
 */
export async function submitScore(userId, score, gameMode = 'solo') {
  const response = await apiClient.post('/submit', {
    user_id: userId,
    score,
    game_mode: gameMode,
  });
  return response.data;
}

/**
 * @param {number} limit 
 */
export async function getTopPlayers(limit = 10) {
  const response = await apiClient.get('/top', {
    params: { limit },
  });
  return response.data;
}

/**
 * @param {number} userId 
 */
export async function getPlayerRank(userId) {
  const response = await apiClient.get(`/rank/${userId}`);
  return response.data;
}


export async function getStats() {
  const response = await apiClient.get('/stats');
  return response.data;
}

export default {
  submitScore,
  getTopPlayers,
  getPlayerRank,
  getStats,
};
