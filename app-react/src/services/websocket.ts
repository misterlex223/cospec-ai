// WebSocket 服務
class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 初始重連延遲 3 秒
  
  // 連接 WebSocket
  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }
    
    // 清除之前的重連計時器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    try {
      // 獲取當前主機和端口
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = window.location.port === '3000' ? '3001' : window.location.port; // 如果前端在 3000 端口，後端在 3001
      
      const wsUrl = `${protocol}//${host}:${port}/ws`;
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.connectionAttempts = 0; // 重置連接嘗試次數
        this.reconnectDelay = 3000; // 重置重連延遲
        
        // 觸發連接事件
        this.dispatchEvent('connection', { status: 'connected' });
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // 根據消息類型觸發對應事件
          if (data && data.type) {
            this.dispatchEvent(data.type, data);
          }
          
          // 同時觸發通用消息事件
          this.dispatchEvent('message', data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      this.socket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        this.socket = null;
        
        // 觸發斷開連接事件
        this.dispatchEvent('connection', { status: 'disconnected', code: event.code, reason: event.reason });
        
        // 嘗試重新連接
        this.scheduleReconnect();
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        
        // 觸發錯誤事件
        this.dispatchEvent('error', { error });
      };
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
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
      this.socket.close();
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
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
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
