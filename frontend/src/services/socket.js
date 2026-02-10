import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }


  connect() {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    console.log('[Socket] Connecting to', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected with ID:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('[Socket] Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed');
    });
  }


  disconnect() {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * Subscribe to leaderboard updates
   * @param {Function} callback - Called when leaderboard is updated
    */
  onLeaderboardUpdate(callback) {
    if (!this.socket) {
      console.error('[Socket] Not connected');
      return;
    }

    console.log('[Socket] Subscribing to leaderboard updates');
    this.socket.on('leaderboard:updated', callback);
    
    this.listeners.set('leaderboard:updated', callback);
  }


  requestLeaderboard() {
    if (!this.socket) {
      console.error('[Socket] Not connected');
      return;
    }

    console.log('[Socket] Requesting leaderboard data');
    this.socket.emit('leaderboard:request');
  }

  /**
   * Subscribe to leaderboard data response
   * @param {Function} callback 
   */
  onLeaderboardData(callback) {
    if (!this.socket) {
      console.error('[Socket] Not connected');
      return;
    }

    this.socket.on('leaderboard:data', callback);
    this.listeners.set('leaderboard:data', callback);
  }

  /**
   * Handle leaderboard errors
   * @param {Function} callback 
   */
  onLeaderboardError(callback) {
    if (!this.socket) {
      console.error('[Socket] Not connected');
      return;
    }

    this.socket.on('leaderboard:error', callback);
    this.listeners.set('leaderboard:error', callback);
  }

  removeAllListeners() {
    if (!this.socket) return;

    this.listeners.forEach((callback, event) => {
      this.socket.off(event, callback);
    });
    this.listeners.clear();
    console.log('[Socket] All listeners removed');
  }


  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();
