import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  MessageSquare, 
  Activity,
  Loader2,
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface SessionAnalyticsData {
  website_id: string;
  analysis_period: {
    days: number;
    start_date: string;
    end_date: string;
  };
  session_metrics: {
    total_sessions: number;
    active_sessions: number;
    expired_sessions: number;
    avg_session_duration_minutes: number;
    sessions_per_day: number;
    session_continuation_rate: number;
  };
  conversation_session_mapping: {
    conversations_with_sessions: number;
    multi_session_conversations: number;
    avg_conversations_per_session: number;
  };
  context_optimization: {
    sessions_with_context_optimization: number;
    avg_context_tokens_saved: number;
    optimization_success_rate: number;
  };
}

interface SessionAnalyticsChartProps {
  websiteId: string;
  days: number;
}

const SessionAnalyticsChart: React.FC<SessionAnalyticsChartProps> = ({ websiteId, days }) => {
  const [data, setData] = useState<SessionAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessionAnalytics();
  }, [websiteId, days]);

  const loadSessionAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/analytics/websites/${websiteId}/sessions?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load session analytics: ${response.status}`);
      }

      const sessionData = await response.json();
      setData(sessionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session analytics');
      console.error('Session analytics loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-gray-600">Loading session analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error || 'Failed to load session analytics'}</p>
            <button
              onClick={loadSessionAnalytics}
              className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes.toFixed(1)}m`;
    return `${(minutes / 60).toFixed(1)}h`;
  };

  return (
    <div className="space-y-6">
      {/* Session Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{data.session_metrics.total_sessions}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Sessions</p>
              <p className="text-2xl font-bold text-green-600">{data.session_metrics.active_sessions}</p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(data.session_metrics.avg_session_duration_minutes)}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Sessions/Day</p>
              <p className="text-2xl font-bold text-gray-900">{data.session_metrics.sessions_per_day.toFixed(1)}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Session Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Quality Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 text-indigo-600 mr-2" />
            Session Quality
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Continuation Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${data.session_metrics.session_continuation_rate * 100}%` }}
                  />
                </div>
                <span className="font-medium text-sm">{(data.session_metrics.session_continuation_rate * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Multi-session Conversations</span>
              <span className="font-medium">{data.conversation_session_mapping.multi_session_conversations}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Conversations/Session</span>
              <span className="font-medium">{data.conversation_session_mapping.avg_conversations_per_session.toFixed(1)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Conversations with Sessions</span>
              <span className="font-medium">{data.conversation_session_mapping.conversations_with_sessions}</span>
            </div>
          </div>
        </div>

        {/* Context Optimization */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 text-indigo-600 mr-2" />
            Context Optimization
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Optimization Success Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${data.context_optimization.optimization_success_rate * 100}%` }}
                  />
                </div>
                <span className="font-medium text-sm">{(data.context_optimization.optimization_success_rate * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sessions with Optimization</span>
              <span className="font-medium">{data.context_optimization.sessions_with_context_optimization}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Tokens Saved</span>
              <span className="font-medium">{data.context_optimization.avg_context_tokens_saved.toFixed(0)}</span>
            </div>

            <div className="pt-4 border-t">
              <div className="text-xs text-gray-500 flex items-center">
                <Activity className="w-3 h-3 mr-1" />
                Context optimization reduces token usage while maintaining conversation quality
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Status Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Session Status Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Activity className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{data.session_metrics.active_sessions}</p>
            <p className="text-sm text-gray-600">Active Sessions</p>
            <p className="text-xs text-gray-500 mt-1">
              {((data.session_metrics.active_sessions / data.session_metrics.total_sessions) * 100).toFixed(1)}% of total
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-600">{data.session_metrics.expired_sessions}</p>
            <p className="text-sm text-gray-600">Expired Sessions</p>
            <p className="text-xs text-gray-500 mt-1">
              {((data.session_metrics.expired_sessions / data.session_metrics.total_sessions) * 100).toFixed(1)}% of total
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{data.session_metrics.total_sessions}</p>
            <p className="text-sm text-gray-600">Total Sessions</p>
            <p className="text-xs text-gray-500 mt-1">
              Over {data.analysis_period.days} days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionAnalyticsChart;