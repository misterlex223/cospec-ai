import { io, Socket } from 'socket.io-client';

// WebSocket 服務 (using Socket.IO)
class WebSocketService {
  private socket: Socket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 初始重連延遲 3 秒

  // 連接 WebSocket (Socket.IO)
  connect(): void {
    if (this.socket && this.socket.connected) {
      console.log('Socket.IO already connected');
      return;
    }

    // 清除之前的重連計時器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      // 獲取當前主機和端口
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
      const host = window.location.hostname;

      // In development, connect directly to backend port 9280
      // In production, use the same port as the frontend
      let port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');

      // Check if we're in development mode (port 3000 or 5173)
      if (port === '3000' || port === '5173') {
        port = '9280'; // Connect directly to backend in development
      }

      const socketUrl = `${protocol}://${host}:${port}`;
      console.log(`Connecting to Socket.IO at ${socketUrl}`);

      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
        reconnection: false, // We'll handle reconnection manually
      });

      this.socket.on('connect', () => {
        console.log('Socket.IO connection established');
        this.connectionAttempts = 0; // 重置連接嘗試次數
        this.reconnectDelay = 3000; // 重置重連延遲

        // 觸發連接事件
        this.dispatchEvent('connection', { status: 'connected' });
      });

      // Listen for file-change events from server
      this.socket.on('file-change', (data) => {
        console.log('File change event received:', data);
        this.dispatchEvent('file-change', data);
      });

      // Listen for generation events
      this.socket.on('generation-output', (data) => {
        console.log('Generation output:', data);
        this.dispatchEvent('generation-output', data);
      });

      this.socket.on('generation-complete', (data) => {
        console.log('Generation complete:', data);
        this.dispatchEvent('generation-complete', data);
      });

      // Listen for git-progress events
      this.socket.on('git-progress', (data) => {
        console.log('Git progress:', data);
        this.dispatchEvent('git-progress', data);
      });

      // Generic message handler - dispatch custom events
      this.socket.onAny((eventName, ...args) => {
        this.dispatchEvent(eventName, args[0] || {});
        this.dispatchEvent('message', { type: eventName, data: args[0] || {} });
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`Socket.IO disconnected: ${reason}`);

        // 觸發斷開連接事件
        this.dispatchEvent('connection', { status: 'disconnected', reason });

        // 嘗試重新連接
        this.scheduleReconnect();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);

        // 觸發錯誤事件
        this.dispatchEvent('error', { error });

        // 如果連接失敗，安排重連
        if (!this.socket?.connected) {
          this.scheduleReconnect();
        }
      });
    } catch (err) {
      console.error('Error creating Socket.IO connection:', err);
      this.scheduleReconnect();
    }
  }
  
  // 安排重新連接
  private scheduleReconnect(): void {
    if (this.connectionAttempts >= this.maxReconnectAttempts) {
      console.log(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached, giving up`);
      return;
    }
    
    this.connectionAttempts++;
    
    // 使用指數退避算法增加重連延遲
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.connectionAttempts - 1));
    console.log(`Scheduling reconnect attempt ${this.connectionAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.connectionAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }
  
  // 斷開連接
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.connectionAttempts = 0;
  }
  
  // 添加事件監聽器
  addEventListener(eventType: string, callback: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)?.add(callback);
  }
  
  // 移除事件監聽器
  removeEventListener(eventType: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(callback);
      
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }
  
  // 分發事件
  private dispatchEvent(eventType: string, data: any): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in WebSocket event listener for ${eventType}:`, err);
        }
      });
    }
  }
  
  // 檢查連接狀態
  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }
}

// 創建單例
export const webSocketService = new WebSocketService();

// 自動連接
export const connectWebSocket = () => {
  webSocketService.connect();
  return webSocketService;
};

export default webSocketService;
