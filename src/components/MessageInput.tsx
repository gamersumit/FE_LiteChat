import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, Smile, Mic, Square } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
  placeholder: string;
  isTyping: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled,
  placeholder,
  isTyping,
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Common emojis for quick access
  const quickEmojis = ['👍', '��', '😂', '❤️', '🤔', '👌', '🙏', '🎉'];

  // Auto-resize textarea with reduced height
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      // Reduced max height from 120px to 80px to eliminate white space
      textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !disabled && !isTyping) {
      onSendMessage(message.trim());
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const canSend = message.trim() && !disabled && !isTyping;

  return (
    <div className="border-t border-gray-200 bg-white">
      <form onSubmit={handleSubmit} className="p-3">
        <div className="flex items-end space-x-2">
          {/* Message input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={disabled ? 'Connecting...' : placeholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 pr-24 text-sm 
                         focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                         disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                         scrollbar-hide"
              style={{ 
                maxHeight: '80px', // Reduced from 120px to 80px
                minHeight: '36px', // Reduced from 40px to 36px
              }}
            />
            
            {/* Input accessories */}
            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
              {/* Emoji picker button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={disabled}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
                aria-label="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              
              {/* File attachment button */}
              <button
                type="button"
                disabled={disabled}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
                aria-label="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              
              {/* Voice recording button */}
              <button
                type="button"
                onClick={() => setIsRecording(!isRecording)}
                disabled={disabled}
                className={`p-1 transition-colors disabled:cursor-not-allowed ${
                  isRecording 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
              >
                {isRecording ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
            
            {/* Emoji picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                <div className="flex space-x-1">
                  {quickEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                        textareaRef.current?.focus();
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Character count */}
            {message.length > 1800 && (
              <div className="absolute bottom-1 left-2 text-xs text-gray-400">
                {message.length}/2000
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!canSend}
            className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
              canSend
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            {isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Status indicators - COMPACT VERSION */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center space-x-2">
            {/* Connection status */}
            {disabled && (
              <span className="text-xs text-gray-500 flex items-center">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-1"></div>
                Connecting...
              </span>
            )}
            
            {/* Recording status */}
            {isRecording && (
              <span className="text-xs text-red-600 flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></div>
                Recording...
              </span>
            )}
            
            {/* Typing status */}
            {isTyping && (
              <span className="text-xs text-blue-600 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                AI is typing...
              </span>
            )}
          </div>

          {/* Tips - only show when no other status */}
          {!disabled && !isTyping && message.length === 0 && !isRecording && (
            <span className="text-xs text-gray-400">
              Press Enter to send, Shift+Enter for new line
            </span>
          )}
          
          {/* Message count - only show when typing */}
          {message.length > 0 && (
            <span className="text-xs text-gray-400">
              {message.length} characters
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
