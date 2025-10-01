import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Target,
  Users,
  MessageSquare,
  Clock,
  Loader2,
  AlertCircle,
  ChevronRight,
  Star,
  Flag
} from 'lucide-react';

interface InsightsData {
  website_id: string;
  analysis_period: {
    days: number;
    start_date: string;
    end_date: string;
  };
  insights: {
    conversation_patterns: string[];
    user_behavior_insights: string[];
    performance_recommendations: string[];
    content_optimization_suggestions: string[];
    engagement_improvement_tips: string[];
  };
  action_items: {
    high_priority: Array<{
      title: string;
      description: string;
      impact: string;
      effort: string;
    }>;
    medium_priority: Array<{
      title: string;
      description: string;
      impact: string;
      effort: string;
    }>;
    low_priority: Array<{
      title: string;
      description: string;
      impact: string;
      effort: string;
    }>;
  };
  trends_analysis: {
    positive_trends: string[];
    concerning_trends: string[];
    neutral_trends: string[];
  };
  benchmarking: {
    performance_vs_average: {
      score: number;
      comparison: string;
    };
    engagement_vs_average: {
      score: number;
      comparison: string;
    };
    quality_vs_average: {
      score: number;
      comparison: string;
    };
  };
  generated_at: string;
  insight_confidence: number;
}

interface AnalyticsInsightsProps {
  websiteId: string;
  days: number;
}

const AnalyticsInsights: React.FC<AnalyticsInsightsProps> = ({ websiteId, days }) => {
  const [data, setData] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeInsightCategory, setActiveInsightCategory] = useState<string>('conversation_patterns');
  const [activePriority, setActivePriority] = useState<string>('high_priority');

  useEffect(() => {
    loadAnalyticsInsights();
  }, [websiteId, days]);

  const loadAnalyticsInsights = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/analytics/websites/${websiteId}/insights?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load analytics insights: ${response.status}`);
      }

      const insightsData = await response.json();
      setData(insightsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics insights');
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
            <p className="text-gray-600">Generating analytics insights...</p>
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
            <p className="text-red-600">{error || 'Failed to load analytics insights'}</p>
            <button
              onClick={loadAnalyticsInsights}
              className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high_priority': return <Flag className="w-4 h-4 text-red-600" />;
      case 'medium_priority': return <Target className="w-4 h-4 text-yellow-600" />;
      case 'low_priority': return <Star className="w-4 h-4 text-green-600" />;
      default: return <Flag className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high_priority': return 'border-red-200 bg-red-50';
      case 'medium_priority': return 'border-yellow-200 bg-yellow-50';
      case 'low_priority': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getBenchmarkIcon = (score: number) => {
    if (score > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (score < 0) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return <CheckCircle className="w-4 h-4 text-gray-500" />;
  };

  const insightCategories = [
    { key: 'conversation_patterns', label: 'Conversation Patterns', icon: MessageSquare },
    { key: 'user_behavior_insights', label: 'User Behavior', icon: Users },
    { key: 'performance_recommendations', label: 'Performance', icon: Clock },
    { key: 'content_optimization_suggestions', label: 'Content', icon: Lightbulb },
    { key: 'engagement_improvement_tips', label: 'Engagement', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      {/* Insights Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Eye className="w-5 h-5 text-indigo-600 mr-2" />
            Analytics Insights
          </h3>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getConfidenceColor(data.insight_confidence)}`}>
            <Star className="w-4 h-4" />
            <span className="font-medium text-sm">{(data.insight_confidence * 100).toFixed(0)}% Confidence</span>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-4">
          AI-generated insights based on {data.analysis_period.days} days of conversation data.
          Generated on {new Date(data.generated_at).toLocaleString()}.
        </p>
      </div>

      {/* Benchmarking */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Target className="w-5 h-5 text-indigo-600 mr-2" />
          Performance Benchmarking
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center mb-2">
              {getBenchmarkIcon(data.benchmarking.performance_vs_average.score)}
              <span className="ml-2 font-medium">Performance</span>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">
              {data.benchmarking.performance_vs_average.score > 0 ? '+' : ''}
              {data.benchmarking.performance_vs_average.score.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">{data.benchmarking.performance_vs_average.comparison}</p>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center mb-2">
              {getBenchmarkIcon(data.benchmarking.engagement_vs_average.score)}
              <span className="ml-2 font-medium">Engagement</span>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">
              {data.benchmarking.engagement_vs_average.score > 0 ? '+' : ''}
              {data.benchmarking.engagement_vs_average.score.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">{data.benchmarking.engagement_vs_average.comparison}</p>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center mb-2">
              {getBenchmarkIcon(data.benchmarking.quality_vs_average.score)}
              <span className="ml-2 font-medium">Quality</span>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">
              {data.benchmarking.quality_vs_average.score > 0 ? '+' : ''}
              {data.benchmarking.quality_vs_average.score.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">{data.benchmarking.quality_vs_average.comparison}</p>
          </div>
        </div>
      </div>

      {/* Trends Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 text-indigo-600 mr-2" />
          Trend Analysis
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-green-700 mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              Positive Trends
            </h4>
            <div className="space-y-2">
              {data.trends_analysis.positive_trends.length > 0 ? (
                data.trends_analysis.positive_trends.map((trend, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <ChevronRight className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{trend}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No positive trends identified</p>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-red-700 mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Concerning Trends
            </h4>
            <div className="space-y-2">
              {data.trends_analysis.concerning_trends.length > 0 ? (
                data.trends_analysis.concerning_trends.map((trend, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <ChevronRight className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{trend}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No concerning trends identified</p>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              Neutral Trends
            </h4>
            <div className="space-y-2">
              {data.trends_analysis.neutral_trends.length > 0 ? (
                data.trends_analysis.neutral_trends.map((trend, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <ChevronRight className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{trend}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No neutral trends identified</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Insights */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Lightbulb className="w-5 h-5 text-indigo-600 mr-2" />
          Detailed Insights
        </h3>
        
        {/* Category Navigation */}
        <div className="mb-4 border-b">
          <nav className="flex space-x-8 overflow-x-auto">
            {insightCategories.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveInsightCategory(key)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeInsightCategory === key
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
        
        {/* Category Content */}
        <div className="space-y-3">
          {data.insights[activeInsightCategory as keyof typeof data.insights]?.length > 0 ? (
            data.insights[activeInsightCategory as keyof typeof data.insights].map((insight, index) => (
              <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                <Lightbulb className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No insights available for this category</p>
          )}
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Target className="w-5 h-5 text-indigo-600 mr-2" />
          Recommended Actions
        </h3>
        
        {/* Priority Navigation */}
        <div className="mb-4 border-b">
          <nav className="flex space-x-8">
            {[
              { key: 'high_priority', label: 'High Priority' },
              { key: 'medium_priority', label: 'Medium Priority' },
              { key: 'low_priority', label: 'Low Priority' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActivePriority(key)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activePriority === key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {getPriorityIcon(key)}
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        {/* Action Items Content */}
        <div className="space-y-3">
          {data.action_items[activePriority as keyof typeof data.action_items]?.length > 0 ? (
            data.action_items[activePriority as keyof typeof data.action_items].map((item, index) => (
              <div key={index} className={`p-4 border rounded-lg ${getPriorityColor(activePriority)}`}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Impact: {item.impact}</span>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">Effort: {item.effort}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{item.description}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No action items available for this priority level</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsInsights;