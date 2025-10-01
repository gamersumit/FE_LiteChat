import React from 'react';
import { MessageCircle, X, Loader2 } from 'lucide-react';

interface ChatButtonProps {
  isOpen: boolean;
  isLoading: boolean;
  hasUnreadMessages: boolean;
  primaryColor: string;
  onClick: () => void;
}

const ChatButton: React.FC<ChatButtonProps> = ({
  isOpen,
  isLoading,
  hasUnreadMessages,
  primaryColor,
  onClick,
}) => {
  return (
    <button
      className="widget-button relative"
      style={{ backgroundColor: primaryColor }}
      onClick={onClick}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      disabled={isLoading}
    >
      {/* Loading spinner */}
      {isLoading && (
        <Loader2 
          className="w-6 h-6 text-white animate-spin" 
        />
      )}
      
      {/* Chat icons */}
      {!isLoading && (
        <>
          {isOpen ? (
            <X className="w-6 h-6 text-white transition-transform duration-200" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white transition-transform duration-200" />
          )}
        </>
      )}
      
      {/* Unread message indicator */}
      {hasUnreadMessages && !isOpen && !isLoading && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white">
          <span className="sr-only">Unread messages</span>
        </div>
      )}
      
      {/* Pulse animation for attention */}
      {hasUnreadMessages && !isOpen && (
        <div 
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: primaryColor }}
        />
      )}
    </button>
  );
};

export default ChatButton;