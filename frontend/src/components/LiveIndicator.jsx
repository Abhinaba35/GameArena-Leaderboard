import React from 'react';
import './LiveIndicator.css';

const LiveIndicator = ({ isConnected, lastUpdate }) => {
  return (
    <div className="live-indicator">
      <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
      <span className="status-text">
        {isConnected ? 'Live' : 'Disconnected'}
      </span>
      {lastUpdate && isConnected && (
        <span className="last-update">
          Last update: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default LiveIndicator;
