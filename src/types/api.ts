// API Types for LiteChat Widget

export interface ChatMessage {
  message: string;
  session_id: string;
  visitor_id: string;
  page_url?: string;
  page_title?: string;
  user_agent?: string;
  ip_address?: string;
}

export interface ChatResponse {
  message_id: string;
  response: string;
  confidence_score?: number;
  processing_time_ms: number;
  sources?: string[];
}

export interface MessageHistory {
  id: string;
  content: string;
  message_type: 'user' | 'assistant';
  sequence_number: number;
  sent_at: string;
  was_helpful?: boolean;
}

export interface ChatHistory {
  conversation_id: string;
  session_id: string;
  messages: MessageHistory[];
  total_messages: number;
  started_at: string;
  last_activity_at: string;
}

export interface SessionCreateRequest {
  visitor_id: string;
  page_url?: string;
  page_title?: string;
  user_agent?: string;
  referrer?: string;
}

export interface SessionResponse {
  session_id: string;
  visitor_id: string;
  website_id: string;
  is_active: boolean;
}

export interface WidgetConfig {
  widget_id: string;
  website_id: string;
  domain: string;
  is_active: boolean;
  config: {
    welcome_message?: string;
    placeholder_text?: string;
    widget_color?: string;
    widget_position?: string;
    widget_theme?: string;
    show_avatar?: boolean;
    enable_sound?: boolean;
    auto_open_delay?: number;
    show_online_status?: boolean;
    offline_message?: string;
    thanks_message?: string;
    show_branding?: boolean;
    company_name?: string;
    custom_css?: string;
    font_family?: string;
    border_radius?: number;
  };
  api_endpoints: {
    chat: string;
    session_create: string;
    session_resume: string;
    analytics: string;
  };
}

export interface WidgetStatus {
  widget_id: string;
  is_active: boolean;
  message?: string;
}

export interface TypingIndicator {
  session_id: string;
  is_typing: boolean;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'chunk' | 'complete' | 'error' | 'typing';
  content?: string;
  full_response?: string;
  processing_time_ms?: number;
  model_used?: string;
  error?: string;
  is_typing?: boolean;
}

// Internal widget state types
export interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'error';
  isTyping?: boolean;
}

export interface WidgetState {
  isOpen: boolean;
  isMinimized: boolean;
  isLoading: boolean;
  isConnected: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  sessionId?: string;
  visitorId?: string;
  conversationId?: string;
}

// Configuration types
export interface WidgetSettings {
  widgetId: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor: string;
  apiUrl: string;
  welcomeMessage?: string;
  placeholder?: string;
  title?: string;
}

// Personalization types
export interface UserPreferences {
  user_id: string
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: boolean
  accessibility_mode: boolean
  font_size: 'small' | 'medium' | 'large' | 'extra-large'
  high_contrast: boolean
  reduced_motion: boolean
  conversation_style: 'casual' | 'formal' | 'technical'
  custom_settings: Record<string, any>
}

export interface UserInteraction {
  id: string
  type: string
  timestamp: Date
  data: Record<string, any>
  anonymizedUserId?: string
}

export interface UserBehaviorPattern {
  id: string
  type: string
  pattern: string
  confidence: number
  data: Record<string, any>
  lastUpdated: Date
}

export interface ConversationContext {
  id: string
  topics?: string[]
  sentiment?: string
  userIntent?: string
  complexityLevel?: 'low' | 'medium' | 'high'
  expertiseLevel?: 'beginner' | 'intermediate' | 'expert'
  lastAnalyzed: Date
  error?: string
  fallbackUsed?: boolean
  isFallback?: boolean
}

export interface ContextAnalysisResult {
  topics: string[]
  sentiment: string
  complexity: 'low' | 'medium' | 'high'
  expertise_level: 'beginner' | 'intermediate' | 'expert'
  conversation_flow: string
  key_entities: string[]
  user_intent: string
  confidence: number
}

export interface SmartSuggestion {
  id: string
  type: 'quick_reply' | 'action_suggestion' | 'follow_up' | 'clarification'
  content: string
  confidence: number
  reason: string
  category: string
  action?: string
  complexity?: string
  priority?: 'high' | 'medium' | 'low'
  isFallback?: boolean
  personalizationReason?: string
  adaptationReason?: string
}

export interface PrivacySettings {
  dataCollection: boolean
  analytics: boolean
  personalization: boolean
  anonymizeData: boolean
  retentionPeriod?: number
  consentDate?: Date
}