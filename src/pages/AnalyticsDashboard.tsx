import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Users,
  Clock,
  Activity,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowUp,
  ArrowDown,
  Eye,
  Link2
} from 'lucide-react';
// Removed useAuth context import - now using Redux auth
import { useAppSelector } from '../store';
import ResponsiveLayout from '../components/common/ResponsiveLayout';
import { useResponsive } from '../hooks/useResponsive';
import AnalyticsOverviewCard from '../components/analytics/AnalyticsOverviewCard';
import SessionAnalyticsChart from '../components/analytics/SessionAnalyticsChart';
import ThreadAnalyticsView from '../components/analytics/ThreadAnalyticsView';
import PerformanceMetrics from '../components/analytics/PerformanceMetrics';
import AnalyticsInsights from '../components/analytics/AnalyticsInsights';

interface AnalyticsData {
  website_id: string;
  analysis_period: {
    days: number;
    start_date: string;
    end_date: string;
    analyzed_conversations: number;
  };
  key_metrics: {
    total_conversations: number;
    total_messages: number;
    unique_visitors: number;
    avg_conversation_length: number;
    avg_messages_per_conversation: number;
    total_conversation_duration_hours: number;
  };
  engagement_summary: {
    engagement_score: number;
    response_rate: number;
    conversation_completion_rate: number;
    avg_response_time_seconds: number;
  };
  quality_indicators: {
    overall_quality_score: number;
    coherence_score: number;
    satisfaction_score: number;
    issue_resolution_rate: number;
  };
  trends: Record<string, any>;
  insights: string[];
  generated_at: string;
  processing_time_ms: number;
}

const AnalyticsDashboard: React.FC = () => {
  const { websiteId } = useParams<{ websiteId: string }>();
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  const isRefreshing = useAppSelector(state => state.auth.isRefreshing);
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'threads' | 'performance' | 'insights'>('overview');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // Don't redirect if we're in the middle of a token refresh
    if (!isAuthenticated && !isRefreshing) {
      navigate('/login');
      return;
    }
    if (!websiteId) {
      navigate('/dashboard');
      return;
    }
    if (isAuthenticated) {
      loadAnalyticsData();
    }
  }, [isAuthenticated, isRefreshing, websiteId, selectedPeriod, navigate]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/analytics/websites/${websiteId}/overview?days=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load analytics data: ${response.status}`);
      }

      const data = await response.json();
      setAnalyticsData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      console.error('Analytics loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch(`/api/v1/analytics/websites/${websiteId}/export?days=${selectedPeriod}&format=json`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const exportData = await response.json();
        if (exportData.download_info?.download_url) {
          window.open(exportData.download_info.download_url, '_blank');
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <ResponsiveLayout showNavigation={true} title="Analytics">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-800">{error || 'Failed to load analytics data'}</p>
            </div>
            <button
              onClick={loadAnalyticsData}
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
    <ResponsiveLayout showNavigation={true} title="Analytics">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 flex items-center space-x-2">
                <span>Website {websiteId?.slice(0, 8)}...</span>
                <span>•</span>
                <span>Last {analyticsData.analysis_period.days} days</span>
                {lastUpdated && (
                  <>
                    <span>•</span>
                    <span className="text-sm">Updated {lastUpdated.toLocaleTimeString()}</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <select
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button
                onClick={loadAnalyticsData}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
                {!isMobile && <span>Refresh</span>}
              </button>
              <button
                onClick={handleExportData}
                className="flex items-center space-x-1 bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700"
              >
                <Download className="w-4 h-4" />
                {!isMobile && <span>Export</span>}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'sessions', label: 'Sessions', icon: Users },
              { key: 'threads', label: 'Threads', icon: Link2 },
              { key: 'performance', label: 'Performance', icon: Activity },
              { key: 'insights', label: 'Insights', icon: Eye }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <AnalyticsOverviewCard
                title="Total Conversations"
                value={formatNumber(analyticsData.key_metrics.total_conversations)}
                icon={MessageSquare}
                iconColor="text-blue-600"
                trend={analyticsData.trends?.conversations_trend}
              />
              <AnalyticsOverviewCard
                title="Unique Visitors"
                value={formatNumber(analyticsData.key_metrics.unique_visitors)}
                icon={Users}
                iconColor="text-green-600"
                trend={analyticsData.trends?.visitors_trend}
              />
              <AnalyticsOverviewCard
                title="Avg Response Time"
                value={formatDuration(analyticsData.engagement_summary.avg_response_time_seconds)}
                icon={Clock}
                iconColor="text-yellow-600"
                trend={analyticsData.trends?.response_time_trend}
              />
              <AnalyticsOverviewCard
                title="Quality Score"
                value={`${analyticsData.quality_indicators.overall_quality_score.toFixed(1)}/5`}
                icon={CheckCircle}
                iconColor="text-purple-600"
                trend={analyticsData.trends?.quality_trend}
              />
            </div>

            {/* Engagement & Quality Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Engagement Score</span>
                    <span className="font-medium">{analyticsData.engagement_summary.engagement_score.toFixed(1)}/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Response Rate</span>
                    <span className="font-medium">{(analyticsData.engagement_summary.response_rate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completion Rate</span>
                    <span className="font-medium">{(analyticsData.engagement_summary.conversation_completion_rate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Messages/Conv</span>
                    <span className="font-medium">{analyticsData.key_metrics.avg_messages_per_conversation.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Indicators</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Overall Quality</span>
                    <span className="font-medium">{analyticsData.quality_indicators.overall_quality_score.toFixed(1)}/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Coherence Score</span>
                    <span className="font-medium">{analyticsData.quality_indicators.coherence_score.toFixed(1)}/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Satisfaction</span>
                    <span className="font-medium">{analyticsData.quality_indicators.satisfaction_score.toFixed(1)}/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Resolution Rate</span>
                    <span className="font-medium">{(analyticsData.quality_indicators.issue_resolution_rate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Insights */}
            {analyticsData.insights && analyticsData.insights.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
                <div className="space-y-2">
                  {analyticsData.insights.slice(0, 5).map((insight, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'sessions' && (
          <SessionAnalyticsChart websiteId={websiteId!} days={selectedPeriod} />
        )}

        {activeTab === 'threads' && (
          <ThreadAnalyticsView websiteId={websiteId!} days={selectedPeriod} />
        )}

        {activeTab === 'performance' && (
          <PerformanceMetrics websiteId={websiteId!} days={selectedPeriod} />
        )}

        {activeTab === 'insights' && (
          <AnalyticsInsights websiteId={websiteId!} days={selectedPeriod} />
        )}
      </div>
    </ResponsiveLayout>
  );
};

export default AnalyticsDashboard;