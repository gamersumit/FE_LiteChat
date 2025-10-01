import React from 'react';
import { Check, CheckCheck, AlertCircle, Clock } from 'lucide-react';
import type { Message } from '../types/api';

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.type === 'user';
  const isAssistant = message.type === 'assistant';

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(timestamp);
  };

  // Get status icon for user messages
  const getStatusIcon = () => {
    if (!isUser) return null;

    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        {/* Message bubble */}
        <div
          className={`message-bubble ${message.type} ${
            message.isTyping ? 'animate-pulse' : ''
          } ${message.status === 'error' ? 'border-red-200' : ''}`}
        >
          {/* Message content */}
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {/* Typing indicator inside message for streaming */}
          {message.isTyping && (
            <div className="flex items-center mt-1">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          )}
        </div>

        {/* Message metadata */}
        <div className={`flex items-center mt-1 space-x-1 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {/* Timestamp */}
          <span className="text-xs text-gray-500">
            {formatTime(message.timestamp)}
          </span>

          {/* Status icon for user messages */}
          {getStatusIcon()}

          {/* Error retry option */}
          {message.status === 'error' && isUser && (
            <button 
              className="text-xs text-red-600 hover:text-red-800 underline ml-1"
              onClick={() => {
                // TODO: Implement retry functionality
                console.log('Retry message:', message.id);
              }}
            >
              Retry
            </button>
          )}
        </div>

        {/* Confidence score for assistant messages (debug mode) */}
        {isAssistant && import.meta.env.DEV && (
          <div className="text-xs text-gray-400 mt-1">
            {/* TODO: Add confidence score from API response */}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
