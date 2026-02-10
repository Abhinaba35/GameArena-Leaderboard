import React, { useState } from 'react';
import { getPlayerRank } from '../services/api';
import './PlayerRankSearch.css';

const PlayerRankSearch = () => {
  const [userId, setUserId] = useState('');
  const [rankData, setRankData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!userId || userId.trim() === '') {
      setError('Please enter a user ID');
      return;
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum) || userIdNum <= 0) {
      setError('Please enter a valid user ID');
      return;
    }

    setLoading(true);
    setError(null);
    setRankData(null);

    try {
      const response = await getPlayerRank(userIdNum);
      setRankData(response.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch player rank');
      setRankData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUserId('');
    setRankData(null);
    setError(null);
  };

  return (
    <div className="player-rank-search">
      <h2>Search Player Rank</h2>

      <form onSubmit={handleSearch} className="search-form">
        <div className="input-group">
          <input
            type="number"
            placeholder="Enter User ID (e.g., 12345)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="search-input"
            min="1"
          />
          <button 
            type="submit" 
            className="search-button"
            disabled={loading}
          >
            {loading ? 'Searching...' : '🔍 Search'}
          </button>
          {(userId || rankData) && (
            <button 
              type="button" 
              className="clear-button"
              onClick={handleClear}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="rank-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {rankData && (
        <div className="rank-result">
          <div className="rank-card">
            <div className="rank-header">
              <div className="player-avatar-large">
                {rankData.username.charAt(rankData.username.length - 1)}
              </div>
              <div className="player-details">
                <h3>{rankData.username}</h3>
                <p className="user-id">ID: {rankData.userId}</p>
              </div>
            </div>

            <div className="rank-stats">
              <div className="stat-item">
                <div className="stat-label">Rank</div>
                <div className="stat-value rank-value">
                  {rankData.rank <= 3 ? (
                    <span className="medal-large">
                      {rankData.rank === 1 ? '🥇' : rankData.rank === 2 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span>#{rankData.rank}</span>
                  )}
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-label">Total Score</div>
                <div className="stat-value score-value">
                  {rankData.totalScore.toLocaleString()}
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-label">Percentile</div>
                <div className="stat-value">
                  Top {((rankData.rank / rankData.totalPlayers) * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="rank-footer">
              <span className="total-players">
                Out of {rankData.totalPlayers.toLocaleString()} players
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerRankSearch;
