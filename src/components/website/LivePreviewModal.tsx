import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, AlertCircle, Rocket, Loader2, Send } from 'lucide-react';
import MessageList from '../MessageList';
import type { Message } from '../../types/api';
import { apiService } from '../../services/centralizedApi';

interface LivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  onStartFullCrawl?: () => void;
  isVerified?: boolean;
}

const LivePreviewModal: React.FC<LivePreviewModalProps> = ({
  isOpen,
  onClose,
  websiteId,
  websiteName,
  websiteUrl,
  onStartFullCrawl,
  isVerified = false
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '1',
        content: `Hi! I'm your AI assistant for ${websiteName}. I'm currently trained on your homepage content. You can test me by asking questions about your business! 🚀`,
        type: 'assistant',
        timestamp: new Date()
      }]);
    }
  }, [isOpen, websiteName, messages.length]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const messageText = inputValue.trim();
    if (!messageText || isTyping) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      type: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue(''); // Clear input

    // Show typing indicator
    setIsTyping(true);

    try {
      // Call actual API to chat with first page content
      const response = await apiService.chatWithFirstPage(
        websiteId,
        messageText,
        `preview-${websiteId}-${Date.now()}`
      );

      if (response.success && response.data) {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: response.data.response,
          type: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        throw new Error(response.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I couldn't process your message. Please try again.",
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartFullCrawl = () => {
    if (onStartFullCrawl) {
      onStartFullCrawl();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100">Live Preview - Test Your Chatbot</h2>
              <p className="text-sm text-gray-400">{websiteName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-600 border-b border-yellow-500 px-6 py-3">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                🟡 Testing with homepage only
              </p>
              <p className="text-xs text-yellow-100 mt-0.5">
                This chatbot can only answer questions about content from your homepage. Start a full crawl to train it on your entire website.
              </p>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <MessageList
              messages={messages}
              isTyping={isTyping}
              isConnected={true}
            />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-700 p-4 bg-gray-800">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isTyping ? "AI is typing..." : "Ask me anything about your homepage..."}
                disabled={isTyping || isLoading}
                className="flex-1 bg-gray-700 text-gray-100 placeholder-gray-400 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping || isLoading}
                className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors duration-200 flex items-center space-x-2"
              >
                {isTyping ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>
            {isTyping && (
              <div className="mt-2 flex items-center text-sm text-gray-400">
                <div className="flex space-x-1 mr-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                AI is thinking...
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-700 p-6 bg-gray-750">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-400">
              <p>Want more comprehensive responses?</p>
              <p className="text-xs text-gray-500 mt-1">Start a full crawl to train on your entire website</p>
            </div>
            <button
              onClick={handleStartFullCrawl}
              disabled={!isVerified || isLoading}
              className="flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
              title={!isVerified ? "Please verify your website first" : "Start full website crawl"}
            >
              <Rocket className="w-4 h-4 mr-2" />
              Start Full Crawl
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePreviewModal;
