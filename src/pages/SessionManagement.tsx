import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  Activity,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Share2,
  Trash2,
  RefreshCw,
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  MessageSquare,
  Download,
  Plus
} from 'lucide-react';
// Removed useAuth context import - now using Redux auth
import { useAppSelector } from '../store';
import ResponsiveLayout from '../components/common/ResponsiveLayout';
import { useResponsive } from '../hooks/useResponsive';

interface Session {
  session_token: string;
  visitor_id: string;
  website_id: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  conversation_count: number;
  total_messages: number;
  last_activity: string;
  context_optimized: boolean;
}

interface SessionStats {
  total_sessions: number;
  active_sessions: number;
  expired_sessions: number;
  avg_session_duration_minutes: number;
  sessions_today: number;
}

const SessionManagement: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  const isRefreshing = useAppSelector(state => state.auth.isRefreshing);
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [websiteFilter, setWebsiteFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'last_activity' | 'expires_at'>('last_activity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Don't redirect if we're in the middle of a token refresh
    if (!isAuthenticated && !isRefreshing) {
      navigate('/login');
      return;
    }
    if (isAuthenticated) {
      loadSessions();
      loadStats();
    }
  }, [isAuthenticated, isRefreshing, currentPage, statusFilter, websiteFilter, sortBy, sortOrder, navigate]);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // This would typically come from a sessions API endpoint
      // For now, we'll simulate it
      const mockSessions: Session[] = [
        {
          session_token: 'session_abc123def456ghi789',
          visitor_id: 'visitor_user123',
          website_id: 'website_example_com',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          conversation_count: 3,
          total_messages: 15,
          last_activity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          context_optimized: true
        },
        {
          session_token: 'session_xyz789abc123def456',
          visitor_id: 'visitor_guest456',
          website_id: 'website_test_site',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          is_active: false,
          conversation_count: 1,
          total_messages: 8,
          last_activity: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          context_optimized: false
        }
      ];

      setSessions(mockSessions);
      setTotalPages(Math.ceil(mockSessions.length / pageSize));
      
    } catch (err) {
      setError('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Mock stats
      const mockStats: SessionStats = {
        total_sessions: 150,
        active_sessions: 45,
        expired_sessions: 105,
        avg_session_duration_minutes: 180,
        sessions_today: 12
      };

      setStats(mockStats);
    } catch (error) {
    }
  };

  const handleSelectSession = (sessionToken: string) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionToken)) {
        newSet.delete(sessionToken);
      } else {
        newSet.add(sessionToken);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map(s => s.session_token)));
    }
  };

  const handleBulkAction = async (action: 'delete' | 'extend' | 'export') => {
    if (selectedSessions.size === 0) return;

    const sessionTokens = Array.from(selectedSessions);
    
    switch (action) {
      case 'delete':
        if (!confirm(`Delete ${sessionTokens.length} sessions? This cannot be undone.`)) return;
        // Implement bulk delete
        break;
      case 'extend':
        // Implement bulk extend
        break;
      case 'export':
        // Implement bulk export
        break;
    }

    setSelectedSessions(new Set());
    loadSessions();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (isActive: boolean, expiresAt: string): string => {
    if (!isActive) return 'text-red-600 bg-red-50';
    const now = new Date();
    const expires = new Date(expiresAt);
    const hoursUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilExpiry < 2) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusIcon = (isActive: boolean, expiresAt: string) => {
    if (!isActive) return <XCircle className="w-4 h-4" />;
    const now = new Date();
    const expires = new Date(expiresAt);
    const hoursUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilExpiry < 2) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const filteredSessions = sessions.filter(session => {
    if (statusFilter !== 'all' && 
        ((statusFilter === 'active' && !session.is_active) || 
         (statusFilter === 'expired' && session.is_active))) {
      return false;
    }
    
    if (searchTerm && !session.visitor_id.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !session.session_token.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveLayout showNavigation={true} title="Session Management">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                Session Management
              </h1>
              <p className="text-gray-600">Manage active sessions and conversation history</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadSessions}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                {!isMobile && <span>Refresh</span>}
              </button>
              <button
                onClick={() => navigate('/session-handoff')}
                className="flex items-center space-x-1 bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                {!isMobile && <span>Create Transfer</span>}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_sessions}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active_sessions}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Expired</p>
                  <p className="text-2xl font-bold text-red-600">{stats.expired_sessions}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDuration(stats.avg_session_duration_minutes)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.sessions_today}</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {selectedSessions.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedSessions.size} selected
                </span>
                <button
                  onClick={() => handleBulkAction('export')}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Export
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedSessions.size === sessions.length && sessions.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSessions.map((session) => (
                  <tr key={session.session_token} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedSessions.has(session.session_token)}
                        onChange={() => handleSelectSession(session.session_token)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.session_token.slice(0, 20)}...
                        </p>
                        <p className="text-sm text-gray-500">{session.visitor_id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(session.is_active, session.expires_at)
                      }`}>
                        {getStatusIcon(session.is_active, session.expires_at)}
                        <span>{session.is_active ? 'Active' : 'Expired'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900">{session.conversation_count} conversations</p>
                        <p className="text-sm text-gray-500">
                          Last: {formatDate(session.last_activity)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{session.total_messages}</span>
                        {session.context_optimized && (
                          <span title="Context optimized">
                            <Activity className="w-4 h-4 text-green-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{formatDate(session.expires_at)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/session-history/${session.session_token}`)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View history"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/session-handoff?session=${session.session_token}`)}
                          className="text-green-600 hover:text-green-900"
                          title="Share session"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          title="More actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredSessions.length)} of {filteredSessions.length} sessions
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm">
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
};

export default SessionManagement;