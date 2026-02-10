import React, { useState, useEffect } from 'react';
import LeaderboardTable from './components/LeaderboardTable';
import PlayerRankSearch from './components/PlayerRankSearch';
import LiveIndicator from './components/LiveIndicator';
import { getTopPlayers } from './services/api';
import socketService from './services/socket';
import './App.css';

function App() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateNotification, setUpdateNotification] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTopPlayers(10);
      setPlayers(response.data);
      setLastUpdate(new Date().toISOString());
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    fetchLeaderboard();
    socketService.connect();
    const checkConnection = () => {
      setIsConnected(socketService.isConnected());
    };

    const connectionInterval = setInterval(checkConnection, 1000);
    socketService.onLeaderboardUpdate((data) => {
      console.log('Leaderboard update received:', data);
      
      setUpdateNotification(`Player ${data.userId} scored ${data.score} points!`);
      setTimeout(() => setUpdateNotification(null), 3000);
      
      fetchLeaderboard();
    });

    socketService.onLeaderboardData((data) => {
      console.log('Leaderboard data received:', data);
      setPlayers(data);
      setLastUpdate(new Date().toISOString());
    });
    socketService.onLeaderboardError((error) => {
      console.error('Leaderboard error:', error);
      setError(error.message);
    });
    return () => {
      clearInterval(connectionInterval);
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, []);

  const handleRefresh = () => {
    fetchLeaderboard();
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title-container">
            <div className="header-text">
              <h1 className="header-title">GameArena Leaderboard</h1>
              <p className="header-subtitle">Real-time gaming rankings</p>
            </div>
          </div>
          <div className="header-status">
            <LiveIndicator isConnected={isConnected} lastUpdate={lastUpdate} />
          </div>
        </div>
      </header>

      {updateNotification && (
        <div className="update-notification">
          <div className="notification-content">
            <span className="notification-icon">⚡</span>
            <span className="notification-text">{updateNotification}</span>
            <span className="notification-pulse"></span>
          </div>
        </div>
      )}

      <main className="app-main">
        <div className="main-container">
          <div className="content-grid">
            <section className="search-section">
              <div className="search-card">
                <div className="search-card-header">
                  <h2 className="search-title">
                    Find Player Rank
                  </h2>
                  <p className="search-description">Search for any player by their ID to see their current ranking</p>
                </div>
                <div className="search-card-body">
                  <PlayerRankSearch />
                </div>
              </div>
            </section>

            <section className="leaderboard-section">
              <div className="leaderboard-card">
                <div className="leaderboard-header">
                  <div className="leaderboard-title-container">
                    <h2 className="leaderboard-title">
                      Top 10 Players
                    </h2>
                    <div className="last-update">
                      Last updated: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Loading...'}
                    </div>
                  </div>
                  <button 
                    onClick={handleRefresh} 
                    className="refresh-button"
                    disabled={loading}
                  >
                    <span className="refresh-icon">
                      {loading ? '⏳' : '🔄'}
                    </span>
                    <span className="refresh-text">
                      {loading ? 'Refreshing...' : 'Refresh'}
                    </span>
                  </button>
                </div>
                <LeaderboardTable players={players} loading={loading} error={error} />
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-built-by">
            
            Built by Abhinaba
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy Policy</a>
            <span className="footer-separator">•</span>
            <a href="#" className="footer-link">Terms of Service</a>
            <span className="footer-separator">•</span>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;