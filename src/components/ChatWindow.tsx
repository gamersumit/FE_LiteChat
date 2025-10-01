import React, { useState } from 'react';
import { X, Minus, Settings, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import type { ChatState, WidgetState, WidgetConfig, WidgetSettings } from '../types/api';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ChatWindowProps {
  chatState: ChatState;
  widgetState: WidgetState;
  config: WidgetConfig | null;
  onSendMessage: (message: string) => void;
  onClose: () => void;
  onMinimize: () => void;
  settings: WidgetSettings;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chatState,
  widgetState,
  config,
  onSendMessage,
  onClose,
  onMinimize,
  settings,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  
  // Simulate online users count
  const [onlineUsers] = useState(Math.floor(Math.random() * 50) + 10);
  
  const windowHeight = widgetState.isMinimized 
    ? 'h-12' 
    : isExpanded 
    ? 'h-[600px] sm:h-[700px]' 
    : 'h-96 sm:h-[500px]';
  const windowWidth = isExpanded ? 'w-96 sm:w-[450px]' : 'w-80 sm:w-96';

  return (
    <div 
      className={`chat-window ${windowWidth} ${windowHeight} 
                  fixed bottom-20 transition-all duration-300 animate-slide-up
                  ${settings.position.includes('right') ? 'right-6' : 'left-6'}`}
      style={{ zIndex: 9998 }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b border-gray-200 relative"
        style={{ 
          background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.primaryColor}dd 100%)`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center space-x-3">
          {/* Avatar/Logo */}
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-white font-semibold text-sm leading-tight">
              {config?.config.company_name || settings.title || 'Chat Support'}
            </h3>
            
            {/* Status line */}
            <div className="flex items-center space-x-2 text-xs text-white/80">
              {widgetState.isConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Online</span>
                  {showOnlineUsers && (
                    <span>• {onlineUsers} users online</span>
                  )}
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>Connecting...</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded hover:bg-white/20 transition-colors"
            aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-white" />
            ) : (
              <VolumeX className="w-4 h-4 text-white" />
            )}
          </button>
          
          {/* Expand/Contract button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded hover:bg-white/20 transition-colors"
            aria-label={isExpanded ? 'Contract window' : 'Expand window'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-white" />
            ) : (
              <Maximize2 className="w-4 h-4 text-white" />
            )}
          </button>
          
          {/* Settings button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded hover:bg-white/20 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4 text-white" />
          </button>
          
          {/* Minimize button */}
          <button
            onClick={onMinimize}
            className="p-1.5 rounded hover:bg-white/20 transition-colors"
            aria-label={widgetState.isMinimized ? 'Expand chat' : 'Minimize chat'}
          >
            <Minus className="w-4 h-4 text-white" />
          </button>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/20 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        
        {/* Settings dropdown */}
        {showSettings && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 animate-fade-in">
            <div className="p-3">
              <h4 className="font-semibold text-gray-800 text-sm mb-3">Chat Settings</h4>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sound notifications</span>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Show online users</span>
                  <input
                    type="checkbox"
                    checked={showOnlineUsers}
                    onChange={(e) => setShowOnlineUsers(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </label>
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Status: {widgetState.isConnected ? 'Connected' : 'Disconnected'}</div>
                    <div>Messages: {chatState.messages.length}</div>
                    <div>Version: 1.0.0</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat content (hidden when minimized) */}
      {!widgetState.isMinimized && (
        <>
          {/* Error state */}
          {widgetState.hasError && (
            <div className="p-4 bg-red-50 border-b border-red-200">
              <p className="text-red-600 text-sm">
                {widgetState.errorMessage || 'Something went wrong. Please try again.'}
              </p>
            </div>
          )}

          {/* Loading state */}
          {widgetState.isLoading && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">Loading...</p>
              </div>
            </div>
          )}

          {/* Chat interface */}
          {!widgetState.isLoading && (
            <>
              {/* Messages */}
              <MessageList 
                messages={chatState.messages}
                isTyping={chatState.isTyping}
                isConnected={widgetState.isConnected}
              />
              
              {/* Message input */}
              <MessageInput
                onSendMessage={onSendMessage}
                disabled={widgetState.isLoading || !widgetState.isConnected}
                placeholder={settings.placeholder || 'Type your message...'}
                isTyping={chatState.isTyping}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ChatWindow;