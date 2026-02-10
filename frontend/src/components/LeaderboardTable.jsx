import React from 'react';

const LeaderboardTable = ({ players, loading, error }) => {
  if (error) {
    return (
      <div className="error-message">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  if (loading && (!players || players.length === 0)) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="empty-state">
        <p>No players on the leaderboard yet</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-table-container">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Total Score</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr 
              key={player.userId} 
              className={`rank-${player.rank}`}
            >
              <td className="rank-cell">
                {player.rank <= 3 ? (
                  <span className={`medal medal-${player.rank}`}>
                    {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                  </span>
                ) : (
                  <span className="rank-number">#{player.rank}</span>
                )}
              </td>
              <td className="player-cell">
                <div className="player-info">
                  <div className="player-avatar">
                    {player.username.charAt(player.username.length - 1)}
                  </div>
                  <span className="player-name">{player.username}</span>
                </div>
              </td>
              <td className="score-cell">
                <span className="score-value">
                  {player.totalScore.toLocaleString()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardTable;
