import type { 
  ChatMessage, 
  ChatResponse, 
  ChatHistory, 
  SessionCreateRequest, 
  SessionResponse,
  WidgetConfig, 
  WidgetStatus 
} from '../types/api';
import { SocketService } from './socketService';

export class ApiService {
  private baseUrl: string;
  private socketServices: Map<string, SocketService> = new Map();
  
  constructor(baseUrl: string = 'http://127.0.0.1:8001/api/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get widget configuration from the backend
   */
  async getWidgetConfig(widgetId: string): Promise<WidgetConfig> {
    const response = await fetch(`${this.baseUrl}/widget/config/${widgetId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get widget config: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new chat session
   */
  async createSession(widgetId: string, sessionData: SessionCreateRequest): Promise<SessionResponse> {
    const response = await fetch(`${this.baseUrl}/widget/session/${widgetId}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Send a chat message to the AI
   */
  async sendMessage(widgetId: string, message: ChatMessage): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/widget/chat/${widgetId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId: string): Promise<ChatHistory | null> {
    const response = await fetch(`${this.baseUrl}/chat/history/${sessionId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No history found
      }
      throw new Error(`Failed to get chat history: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check widget status
   */
  async getWidgetStatus(widgetId: string): Promise<WidgetStatus> {
    const response = await fetch(`${this.baseUrl}/widget/status/${widgetId}`);

    if (!response.ok) {
      throw new Error(`Failed to get widget status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Ping widget for health check
   */
  async pingWidget(widgetId: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/widget/ping/${widgetId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to ping widget: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get or create socket service for a session
   */
  getSocketService(sessionId: string): SocketService {
    if (!this.socketServices.has(sessionId)) {
      const socketService = new SocketService(sessionId);
      this.socketServices.set(sessionId, socketService);
    }
    return this.socketServices.get(sessionId)!;
  }

  /**
   * Send message via socket service (real-time)
   */
  async sendMessageViaSocket(sessionId: string, message: string, pageUrl?: string, pageTitle?: string): Promise<any> {
    const socketService = this.getSocketService(sessionId);
    await socketService.connect();
    return socketService.sendChatMessage(message, pageUrl, pageTitle);
  }

  /**
   * Get socket connection info
   */
  async getSocketInfo(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/socket/info`);
    if (!response.ok) {
      throw new Error(`Failed to get socket info: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Close socket service for a session
   */
  closeSocketService(sessionId: string): void {
    const socketService = this.socketServices.get(sessionId);
    if (socketService) {
      socketService.disconnect();
      this.socketServices.delete(sessionId);
    }
  }

  /**
   * Close all socket services
   */
  closeAllSocketServices(): void {
    this.socketServices.forEach((service) => service.disconnect());
    this.socketServices.clear();
  }
}