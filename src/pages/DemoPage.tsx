import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Loader2,
  CheckCircle,
  X,
  Home,
  ArrowLeft,
  Monitor,
  Smartphone,
  Tablet,
  Send
} from 'lucide-react';
import { apiService } from '../services/centralizedApi';
import type { DemoStatusResponse } from '../services/centralizedApi';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
}

const DemoPage: React.FC = () => {
  const { demoId } = useParams<{ demoId: string }>();
  const navigate = useNavigate();

  // Demo status state
  const [demoStatus, setDemoStatus] = useState<DemoStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Polling for demo status
  useEffect(() => {
    if (!demoId) return;

    const pollStatus = async () => {
      try {
        const response = await apiService.getDemoStatus(demoId);

        if (response.success && response.data) {
          setDemoStatus(response.data);
          setStatusError(null);

          // Stop polling if ready or failed
          if (response.data.status === 'ready' || response.data.status === 'failed') {
            setIsPolling(false);

            // Add welcome message when ready
            if (response.data.status === 'ready' && messages.length === 0) {
              setMessages([{
                id: 'welcome',
                content: `Hi! 👋 I'm trained on the homepage of ${response.data.domain}. Ask me anything!`,
                type: 'assistant',
                timestamp: new Date()
              }]);
            }
          }
        } else {
          setStatusError(response.message || 'Failed to fetch demo status');
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Error polling demo status:', error);
        setStatusError('Connection error. Please try again.');
        setIsPolling(false);
      }
    };

    // Initial fetch
    pollStatus();

    // Poll every 3 seconds while status is pending/processing
    let intervalId: NodeJS.Timeout | null = null;
    if (isPolling) {
      intervalId = setInterval(pollStatus, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [demoId, isPolling, messages.length]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const messageText = inputValue.trim();
    if (!messageText || isTyping || !demoId) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      type: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Call demo chat API
      const response = await apiService.sendDemoChat(demoId, messageText);

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

  const handleGoToLanding = () => {
    navigate('/');
  };

  const handleTryAgain = () => {
    navigate('/');
  };

  // Device preview dimensions
  const getDeviceDimensions = () => {
    switch (previewDevice) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      case 'desktop':
      default:
        return { width: '100%', height: '100%' };
    }
  };

  const dimensions = getDeviceDimensions();

  // Render loading state
  if (!demoStatus && !statusError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Loading demo...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (statusError || !demoId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Demo Not Found</h2>
          <p className="text-gray-400 mb-6">{statusError || 'Invalid demo ID'}</p>
          <button
            onClick={handleGoToLanding}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Go Back to Landing
          </button>
        </div>
      </div>
    );
  }

  // Render processing state
  if (demoStatus.status === 'pending' || demoStatus.status === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-100 mb-2">
              {demoStatus.status === 'pending' ? 'Starting Demo...' : 'Processing Website...'}
            </h2>
            <p className="text-gray-400">
              We're crawling the homepage and preparing your demo
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-gray-300">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              URL validated
            </div>
            <div className="flex items-center text-sm text-gray-300">
              {demoStatus.status === 'processing' ? (
                <>
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mr-2" />
                  Crawling homepage...
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin mr-2" />
                  Waiting in queue...
                </>
              )}
            </div>
          </div>

          {demoStatus.estimated_time && (
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Estimated time</p>
              <p className="text-lg font-semibold text-indigo-400">{demoStatus.estimated_time}</p>
            </div>
          )}

          <button
            onClick={handleGoToLanding}
            className="mt-6 w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render failed state
  if (demoStatus.status === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Demo Failed</h2>
          <p className="text-gray-400 mb-6">
            {demoStatus.error_message || 'We encountered an error while processing your website.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleGoToLanding}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={handleTryAgain}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render ready state (chat widget rendered directly in React)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGoToLanding}
              className="text-gray-400 hover:text-gray-300 transition-colors p-2 hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-100">Live Demo Preview</h1>
              <p className="text-sm text-gray-400">{demoStatus.domain}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Device Toggle */}
            <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-2 rounded transition-colors ${
                  previewDevice === 'mobile'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                title="Mobile view"
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                className={`p-2 rounded transition-colors ${
                  previewDevice === 'tablet'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                title="Tablet view"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-2 rounded transition-colors ${
                  previewDevice === 'desktop'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                title="Desktop view"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleGoToLanding}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-600 px-6 py-3 border-b border-blue-500">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-blue-100 text-center">
            🔵 Demo Mode - ChatLite widget is live on this page ({demoStatus.chunks_count || 0} knowledge chunks). Click the chat button to test it!
          </p>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div
          className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 relative"
          style={{
            width: dimensions.width,
            height: previewDevice === 'desktop' ? 'calc(100vh - 250px)' : dimensions.height,
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        >
          {/* Mock Website Header */}
          <div className="bg-gray-800 h-10 px-4 flex items-center">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="ml-3 text-white text-sm">{demoStatus.domain}</div>
          </div>

          {/* Website Screenshot */}
          <div className="relative h-[calc(100%-40px)] overflow-y-auto">
            <img
              src={demoStatus.screenshot_url}
              alt={`Screenshot of ${demoStatus.domain}`}
              className="w-full object-cover object-top"
            />
          </div>

          {/* Chat Widget Preview - Positioned Absolutely */}
          <div className="absolute bottom-5 right-5 z-50">
            {/* Chat Window */}
            {isChatOpen && (
              <div
                className="bg-white rounded-lg shadow-2xl border-2 border-indigo-600 mb-3 absolute z-10 transition-all duration-300"
                style={{
                  width: '360px',
                  height: '520px',
                  bottom: '80px',
                  right: '0',
                  borderRadius: '12px'
                }}
              >
                {/* Chat Header */}
                <div
                  className="flex items-center justify-between text-white p-4"
                  style={{
                    backgroundColor: '#667eea',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px'
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">💬</div>
                    <div>
                      <div className="font-semibold">Demo Assistant</div>
                      <div className="text-sm opacity-80">Online now</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Chat Messages */}
                <div ref={messagesContainerRef} className="p-4 space-y-3 overflow-y-auto" style={{ height: '380px' }}>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start space-x-2 ${
                        msg.type === 'user' ? 'justify-end' : ''
                      }`}
                    >
                      {msg.type === 'assistant' && (
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center text-xs">🤖</div>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 max-w-xs ${
                          msg.type === 'assistant'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        <div className="text-sm">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-start space-x-2">
                      <div className="w-6 h-6 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center text-xs">🤖</div>
                      <div className="bg-gray-100 rounded-lg px-3 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="border-t border-gray-200 p-3">
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder={isTyping ? "AI is typing..." : "Ask me about this website..."}
                      value={inputValue || ''}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isTyping}
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm min-w-0 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isTyping}
                      className="bg-indigo-600 text-white rounded px-4 py-2 text-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:bg-indigo-700 flex items-center space-x-1"
                    >
                      {isTyping ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Chat Button */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="rounded-full shadow-lg cursor-pointer flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 focus:outline-none"
              style={{
                width: '70px',
                height: '70px',
                fontSize: '32px',
                backgroundColor: '#667eea',
                borderRadius: '12px'
              }}
            >
              💬
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-400">
            Like what you see? <button onClick={() => navigate('/login')} className="text-indigo-400 hover:text-indigo-300 font-semibold">Sign up</button> to add ChatLite to your own website!
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoPage;
