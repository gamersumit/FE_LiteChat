import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  Users, 
  MessageSquare, 
  TrendingUp,
  Activity,
  Loader2,
  AlertCircle,
  Eye,
  RotateCcw,
  Hash
} from 'lucide-react';

interface ThreadAnalyticsData {
  website_id: string;
  analysis_period: {
    days: number;
    start_date: string;
    end_date: string;
  };
  thread_metrics: {
    total_threads: number;
    active_threads: number;
    avg_thread_length: number;
    avg_conversations_per_thread: number;
    thread_continuation_rate: number;
  };
  topic_analysis: Record<string, number>;
  visitor_journey: {
    multi_session_visitors: number;
    avg_sessions_per_visitor: number;
    visitor_return_rate: number;
  };
  thread_health: {
    coherent_threads: number;
    broken_threads: number;
    avg_coherence_score: number;
  };
  thread_details?: Array<{
    thread_id: string;
    topic: string;
    conversations_count: number;
    total_messages: number;
    start_date: string;
    last_activity: string;
    coherence_score: number;
    visitor_id: string;
  }>;
}

interface ThreadAnalyticsViewProps {
  websiteId: string;
  days: number;
}

const ThreadAnalyticsView: React.FC<ThreadAnalyticsViewProps> = ({ websiteId, days }) => {
  const [data, setData] = useState<ThreadAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadThreadAnalytics();
  }, [websiteId, days]);

  const loadThreadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/v1/analytics/websites/${websiteId}/threads?days=${days}&include_thread_details=${showDetails}`, 
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load thread analytics: ${response.status}`);
      }

      const threadData = await response.json();
      setData(threadData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load thread analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
    if (!showDetails) {
      loadThreadAnalytics();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-gray-600">Loading thread analytics...</p>
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
            <p className="text-red-600">{error || 'Failed to load thread analytics'}</p>
            <button
              onClick={loadThreadAnalytics}
              className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // const formatDuration = (days: number): string => {
  //   if (days < 1) return '< 1 day';
  //   if (days < 30) return `${days.toFixed(1)} days`;
  //   return `${(days / 30).toFixed(1)} months`;
  // };

  const getCoherenceColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const topTopics = Object.entries(data.topic_analysis)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Thread Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Threads</p>
              <p className="text-2xl font-bold text-gray-900">{data.thread_metrics.total_threads}</p>
            </div>
            <Link2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Threads</p>
              <p className="text-2xl font-bold text-green-600">{data.thread_metrics.active_threads}</p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Thread Length</p>
              <p className="text-2xl font-bold text-gray-900">{data.thread_metrics.avg_thread_length.toFixed(1)}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Continuation Rate</p>
              <p className="text-2xl font-bold text-gray-900">{(data.thread_metrics.thread_continuation_rate * 100).toFixed(1)}%</p>
            </div>
            <RotateCcw className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Thread Health & Visitor Journey */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thread Health */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 text-indigo-600 mr-2" />
            Thread Health
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Coherent Threads</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(data.thread_health.coherent_threads / data.thread_metrics.total_threads) * 100}%` }}
                  />
                </div>
                <span className="font-medium text-sm">{data.thread_health.coherent_threads}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Broken Threads</span>
              <span className="font-medium text-red-600">{data.thread_health.broken_threads}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Coherence Score</span>
              <span className={`font-medium ${getCoherenceColor(data.thread_health.avg_coherence_score)}`}>
                {data.thread_health.avg_coherence_score.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Conversations/Thread</span>
              <span className="font-medium">{data.thread_metrics.avg_conversations_per_thread.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Visitor Journey */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 text-indigo-600 mr-2" />
            Visitor Journey
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Multi-session Visitors</span>
              <span className="font-medium">{data.visitor_journey.multi_session_visitors}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Sessions/Visitor</span>
              <span className="font-medium">{data.visitor_journey.avg_sessions_per_visitor.toFixed(1)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Visitor Return Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${data.visitor_journey.visitor_return_rate * 100}%` }}
                  />
                </div>
                <span className="font-medium text-sm">{(data.visitor_journey.visitor_return_rate * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-xs text-gray-500 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                Higher return rates indicate better user engagement and satisfaction
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Hash className="w-5 h-5 text-indigo-600 mr-2" />
          Top Conversation Topics
        </h3>
        {topTopics.length > 0 ? (
          <div className="space-y-3">
            {topTopics.map(([topic, count], index) => (
              <div key={topic} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-400' :
                    'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-900 capitalize">{topic}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${(count / Math.max(...Object.values(data.topic_analysis))) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No topic data available for this period</p>
        )}
      </div>

      {/* Thread Details Toggle */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Eye className="w-5 h-5 text-indigo-600 mr-2" />
            Thread Details
          </h3>
          <button
            onClick={toggleDetails}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            <span>{showDetails ? 'Hide Details' : 'Show Details'}</span>
          </button>
        </div>

        {showDetails && data.thread_details && (
          <div className="space-y-3">
            {data.thread_details.length > 0 ? (
              data.thread_details.map((thread) => (
                <div key={thread.thread_id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Link2 className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 capitalize">{thread.topic}</span>
                      <span className={`text-sm px-2 py-1 rounded ${getCoherenceColor(thread.coherence_score)} bg-gray-50`}>
                        {thread.coherence_score.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(thread.last_activity).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">{thread.conversations_count}</span> conversations
                    </div>
                    <div>
                      <span className="font-medium">{thread.total_messages}</span> messages
                    </div>
                    <div>
                      Started {new Date(thread.start_date).toLocaleDateString()}
                    </div>
                    <div>
                      Visitor: {thread.visitor_id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No thread details available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadAnalyticsView;