/**
 * WebSocket Service — Real-time messaging for Staff Chat & Clinical Alerts
 * Uses native WebSocket with auto-reconnect, heartbeat, and message queuing.
 */
import { useAuthStore } from '../store/authStore';

type MessageHandler = (data: any) => void;

interface WSConfig {
  url: string;
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
  heartbeatIntervalMs?: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WSConfig | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private messageQueue: any[] = [];
  private _connected = false;

  get connected(): boolean {
    return this._connected;
  }

  /**
   * Connect to WebSocket server
   */
  connect(config?: Partial<WSConfig>): void {
    const state = useAuthStore.getState();
    const baseUrl = state.baseUrl || 'ws://217.216.78.81:8080';
    
    this.config = {
      url: config?.url || baseUrl.replace(/^http/, 'ws') + '/ws',
      reconnectIntervalMs: config?.reconnectIntervalMs || 3000,
      maxReconnectAttempts: config?.maxReconnectAttempts || 10,
      heartbeatIntervalMs: config?.heartbeatIntervalMs || 30000,
    };

    this._createConnection();
  }

  private _createConnection(): void {
    if (!this.config) return;

    try {
      const state = useAuthStore.getState();
      const url = `${this.config.url}?token=${state.token || ''}`;
      
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this._connected = true;
        this.reconnectAttempts = 0;
        this._startHeartbeat();
        this._flushQueue();
        this._emit('connection', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.type || 'message';
          this._emit(eventType, data);
          this._emit('message', data); // Global listener
        } catch {
          this._emit('message', { raw: event.data });
        }
      };

      this.ws.onclose = (event) => {
        this._connected = false;
        this._stopHeartbeat();
        this._emit('connection', { status: 'disconnected', code: event.code });
        
        if (event.code !== 1000) { // Not a clean close
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this._emit('error', { message: 'WebSocket error' });
      };
    } catch {
      this._scheduleReconnect();
    }
  }

  /**
   * Send a message through WebSocket (queues if not connected)
   */
  send(type: string, payload: any): void {
    const message = JSON.stringify({ type, ...payload, timestamp: Date.now() });
    
    if (this._connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  /**
   * Subscribe to a specific event type
   */
  on(event: string, handler: MessageHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /**
   * Disconnect cleanly
   */
  disconnect(): void {
    this._stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this._connected = false;
    this.reconnectAttempts = 0;
  }

  private _emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(handler => {
      try { handler(data); } catch (e) { console.error('WS handler error:', e); }
    });
  }

  private _flushQueue(): void {
    while (this.messageQueue.length > 0 && this._connected) {
      const msg = this.messageQueue.shift();
      if (msg && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(msg);
      }
    }
  }

  private _startHeartbeat(): void {
    this._stopHeartbeat();
    if (this.config?.heartbeatIntervalMs) {
      this.heartbeatTimer = setInterval(() => {
        this.send('ping', {});
      }, this.config.heartbeatIntervalMs);
    }
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private _scheduleReconnect(): void {
    if (!this.config) return;
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      this._emit('error', { message: 'Max reconnect attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectIntervalMs! * Math.min(this.reconnectAttempts, 5);
    
    this.reconnectTimer = setTimeout(() => {
      this._emit('connection', { status: 'reconnecting', attempt: this.reconnectAttempts });
      this._createConnection();
    }, delay);
  }
}

// Singleton instance
const wsService = new WebSocketService();
export default wsService;
