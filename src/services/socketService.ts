/**
 * Socket service for real-time chat using TCP sockets (WebSocket wrapper for browser compatibility)
 */

export interface SocketMessage {
  type: 'chat' | 'ping' | 'typing';
  session_id: string;
  message?: string;
  page_url?: string;
  page_title?: string;
}

export interface SocketResponse {
  type: 'chat_response' | 'pong' | 'error' | 'typing_ack';
  session_id?: string;
  message_id?: string;
  user_message?: string;
  ai_response?: string;
  processing_time_ms?: number;
  model_used?: string;
  confidence_score?: number;
  timestamp?: string;
  error?: string;
}

export class SocketService {
  private socket: WebSocket | null = null;
  private socketUrl: string;
  private sessionId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, (response: SocketResponse) => void> = new Map();
  private connectionPromise: Promise<void> | null = null;

  constructor(sessionId: string, socketUrl: string = 'ws://127.0.0.1:8001/api/v1/chat/stream') {
    this.sessionId = sessionId;
    this.socketUrl = `${socketUrl}/${sessionId}`;
  }

  /**
   * Connect to the socket server
   */
  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // For now, we'll use HTTP polling as a fallback since the backend uses TCP sockets
        // In a production environment, you'd typically use a WebSocket-to-TCP proxy
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Send a chat message via HTTP (fallback to HTTP API for browser compatibility)
   */
  async sendChatMessage(message: string, pageUrl?: string, pageTitle?: string): Promise<SocketResponse> {
    try {
      const response = await fetch('http://127.0.0.1:8001/api/v1/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          session_id: this.sessionId,
          page_url: pageUrl,
          page_title: pageTitle,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Convert HTTP response to socket response format
      const socketResponse: SocketResponse = {
        type: 'chat_response',
        session_id: this.sessionId,
        message_id: data.message_id,
        user_message: message,
        ai_response: data.response,
        processing_time_ms: data.processing_time_ms,
        model_used: 'simple-chat-v1',
        confidence_score: data.confidence_score,
        timestamp: new Date().toISOString(),
      };

      return socketResponse;
    } catch (error) {
      return {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Send a ping message
   */
  async sendPing(): Promise<SocketResponse> {
    // For HTTP fallback, just return a pong
    return {
      type: 'pong',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send typing indicator
   */
  async sendTyping(): Promise<SocketResponse> {
    return {
      type: 'typing_ack',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Register a message handler
   */
  onMessage(type: string, handler: (response: SocketResponse) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove a message handler
   */
  offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Get socket connection info
   */
  async getSocketInfo(): Promise<any> {
    try {
      const response = await fetch('http://127.0.0.1:8001/api/v1/socket/info');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionPromise !== null;
  }

  /**
   * Disconnect from the socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connectionPromise = null;
    this.messageHandlers.clear();
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}