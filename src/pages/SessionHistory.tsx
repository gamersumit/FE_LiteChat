import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  History,
  Download,
  Filter,
  Calendar,
  MessageSquare,
  User,
  Clock,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye,
  Trash2
} from 'lucide-react';
// Removed useAuth context import - now using Redux auth
import { useAppSelector } from '../store';
import ResponsiveLayout from '../components/common/ResponsiveLayout';
import { useResponsive } from '../hooks/useResponsive';

interface SessionHistoryData {
  session_token: string;
  session_info: {
    visitor_id: string;
    website_id: string;
    created_at: string;
    expires_at: string;
    is_active: boolean;
  };
  history: Array<{
    conversation_id: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    messages?: Array<{
      id: string;
      content: string;
      message_type: string;
      created_at: string;
    }>;
  }>;
  pagination: {
    current_page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

const SessionHistory: React.FC = () => {
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  const isRefreshing = useAppSelector(state => state.auth.isRefreshing);
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  const [historyData, setHistoryData] = useState<SessionHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [includeMessages, setIncludeMessages] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Don't redirect if we're in the middle of a token refresh
    if (!isAuthenticated && !isRefreshing) {
      navigate('/login');
      return;
    }
    if (!sessionToken) {
      navigate('/dashboard');
      return;
    }
    if (isAuthenticated) {
      loadSessionHistory();
    }
  }, [isAuthenticated, isRefreshing, sessionToken, currentPage, includeMessages, startDate, endDate, navigate]);

  const loadSessionHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        include_messages: includeMessages.toString()
      });

      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(
        `/api/v1/session-history/${sessionToken}/history?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Session not found');
        } else if (response.status === 403) {
          throw new Error('Session has expired');
        }
        throw new Error(`Failed to load session history: ${response.status}`);
      }

      const data = await response.json();
      setHistoryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session history');
      console.error('Session history loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'txt') => {
    try {
      const response = await fetch(
        `/api/v1/session-history/${sessionToken}/export?format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `session_${sessionToken?.slice(0, 8)}_${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDeleteSession = async () => {
    if (!confirm('Are you sure you want to delete all session data? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/session-history/${sessionToken}?confirm=true`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      if (response.ok) {
        alert('Session data deleted successfully');
        navigate('/dashboard');
      } else {
        throw new Error('Failed to delete session');
      }
    } catch (error) {
      alert('Failed to delete session data');
    }
  };

  const toggleConversation = (conversationId: string) => {
    setExpandedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading session history...</p>
        </div>
      </div>
    );
  }

  if (error || !historyData) {
    return (
      <ResponsiveLayout showNavigation={true} title="Session History">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-800">{error || 'Failed to load session history'}</p>
            </div>
            <button
              onClick={loadSessionHistory}
              className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout showNavigation={true} title="Session History">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                Session History
              </h1>
              <p className="text-gray-600 flex items-center space-x-2">
                <span>Token: {sessionToken?.slice(0, 16)}...</span>
                <span>•</span>
                <span>Visitor: {historyData.session_info.visitor_id}</span>
                <span>•</span>
                <span className={historyData.session_info.is_active ? 'text-green-600' : 'text-red-600'}>
                  {historyData.session_info.is_active ? 'Active' : 'Expired'}
                </span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExport('json')}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                {!isMobile && <span>JSON</span>}
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <FileText className="w-4 h-4" />
                {!isMobile && <span>CSV</span>}
              </button>
              <button
                onClick={handleDeleteSession}
                className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                {!isMobile && <span>Delete</span>}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeMessages"
                checked={includeMessages}
                onChange={(e) => setIncludeMessages(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="includeMessages" className="text-sm font-medium text-gray-700">
                Include Messages
              </label>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Session Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="font-medium">{formatDate(historyData.session_info.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Expires</p>
              <p className="font-medium">{formatDate(historyData.session_info.expires_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Conversations</p>
              <p className="font-medium">{historyData.pagination.total_items}</p>
            </div>
          </div>
        </div>

        {/* Conversations */}
        <div className="space-y-4">
          {historyData.history.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
              <p className="text-gray-500">No conversations match your current filters.</p>
            </div>
          ) : (
            historyData.history.map((conversation) => (
              <div key={conversation.conversation_id} className="bg-white rounded-lg shadow-sm border">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleConversation(conversation.conversation_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <MessageSquare className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Conversation {conversation.conversation_id.slice(0, 8)}...
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(conversation.created_at)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{conversation.message_count} messages</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {expandedConversations.has(conversation.conversation_id) && conversation.messages && (
                  <div className="border-t border-gray-200 p-4">
                    <div className="space-y-3">
                      {conversation.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg ${
                            message.message_type === 'user'
                              ? 'bg-indigo-50 border-l-4 border-indigo-400'
                              : 'bg-gray-50 border-l-4 border-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium ${
                              message.message_type === 'user' ? 'text-indigo-700' : 'text-gray-700'
                            }`}>
                              {message.message_type === 'user' ? 'User' : 'Assistant'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(message.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {historyData.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Page {historyData.pagination.current_page} of {historyData.pagination.total_pages}
              ({historyData.pagination.total_items} total conversations)
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={!historyData.pagination.has_previous}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={!historyData.pagination.has_next}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
};

export default SessionHistory;