import type { WebSocketMessage } from '../types/api';

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private isIntentionallyClosed = false;
  
  // Event handlers
  private onMessageHandler: WebSocketEventHandler | null = null;
  private onOpenHandler: (() => void) | null = null;
  private onCloseHandler: (() => void) | null = null;
  private onErrorHandler: ((error: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.isIntentionallyClosed = false;

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.reconnectInterval = 1000;
          
          if (this.onOpenHandler) {
            this.onOpenHandler();
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            if (this.onMessageHandler) {
              this.onMessageHandler(message);
            }
          } catch (error) {
          }
        };

        this.ws.onclose = () => {
          this.ws = null;
          
          if (this.onCloseHandler) {
            this.onCloseHandler();
          }

          // Attempt to reconnect if not intentionally closed
          if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          if (this.onErrorHandler) {
            this.onErrorHandler(error);
          }
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send a message through WebSocket
   */
  sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    
    
    setTimeout(() => {
      this.connect().catch((error) => {
        
        // Increase reconnect interval with exponential backoff
        this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000); // Max 30 seconds
      });
    }, this.reconnectInterval);
  }

  /**
   * Set event handlers
   */
  onMessage(handler: WebSocketEventHandler): void {
    this.onMessageHandler = handler;
  }

  onOpen(handler: () => void): void {
    this.onOpenHandler = handler;
  }

  onClose(handler: () => void): void {
    this.onCloseHandler = handler;
  }

  onError(handler: (error: Event) => void): void {
    this.onErrorHandler = handler;
  }

  /**
   * Remove event handlers
   */
  removeAllHandlers(): void {
    this.onMessageHandler = null;
    this.onOpenHandler = null;
    this.onCloseHandler = null;
    this.onErrorHandler = null;
  }
}