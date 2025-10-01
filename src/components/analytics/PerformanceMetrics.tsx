import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Clock, 
  Database, 
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Cpu
} from 'lucide-react';

interface PerformanceData {
  website_id: string;
  analysis_period: {
    days: number;
    start_date: string;
    end_date: string;
  };
  response_performance: {
    avg_response_time_ms: number;
    median_response_time_ms: number;
    p95_response_time_ms: number;
    slow_responses_count: number;
    response_time_trend: string;
  };
  context_optimization: {
    avg_context_preparation_time_ms: number;
    context_optimization_success_rate: number;
    avg_tokens_optimized: number;
    compression_ratio: number;
  };
  system_health: {
    error_rate: number;
    timeout_rate: number;
    cache_hit_rate: number;
    system_status: string;
  };
  resource_usage: {
    avg_memory_usage_mb: number;
    peak_concurrent_conversations: number;
    database_query_performance: number;
  };
}

interface PerformanceMetricsProps {
  websiteId: string;
  days: number;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ websiteId, days }) => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPerformanceMetrics();
  }, [websiteId, days]);

  const loadPerformanceMetrics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/analytics/websites/${websiteId}/performance?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load performance metrics: ${response.status}`);
      }

      const performanceData = await response.json();
      setData(performanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance metrics');
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
            <p className="text-gray-600">Loading performance metrics...</p>
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
            <p className="text-red-600">{error || 'Failed to load performance metrics'}</p>
            <button
              onClick={loadPerformanceMetrics}
              className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'improving': return <TrendingDown className="w-4 h-4 text-green-500" />;
      case 'degrading': return <TrendingUp className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (mb: number): string => {
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Server className="w-5 h-5 text-indigo-600 mr-2" />
            System Status
          </h3>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(data.system_health.system_status)}`}>
            {getStatusIcon(data.system_health.system_status)}
            <span className="font-medium text-sm capitalize">{data.system_health.system_status}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{(data.system_health.error_rate * 100).toFixed(2)}%</p>
            <p className="text-sm text-gray-600">Error Rate</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{(data.system_health.timeout_rate * 100).toFixed(2)}%</p>
            <p className="text-sm text-gray-600">Timeout Rate</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Zap className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{(data.system_health.cache_hit_rate * 100).toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Cache Hit Rate</p>
          </div>
        </div>
      </div>

      {/* Response Performance */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 text-indigo-600 mr-2" />
          Response Performance
          <div className="ml-2 flex items-center">
            {getTrendIcon(data.response_performance.response_time_trend)}
            <span className="text-sm text-gray-500 ml-1 capitalize">
              {data.response_performance.response_time_trend}
            </span>
          </div>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Average Response Time</p>
            <p className="text-xl font-bold text-gray-900">{formatTime(data.response_performance.avg_response_time_ms)}</p>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Median Response Time</p>
            <p className="text-xl font-bold text-gray-900">{formatTime(data.response_performance.median_response_time_ms)}</p>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600 mb-2">95th Percentile</p>
            <p className="text-xl font-bold text-gray-900">{formatTime(data.response_performance.p95_response_time_ms)}</p>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Slow Responses</p>
            <p className="text-xl font-bold text-red-600">{data.response_performance.slow_responses_count}</p>
          </div>
        </div>
      </div>

      {/* Context Optimization & Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Context Optimization */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Zap className="w-5 h-5 text-indigo-600 mr-2" />
            Context Optimization
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Context Prep Time</span>
              <span className="font-medium">{formatTime(data.context_optimization.avg_context_preparation_time_ms)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Success Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${data.context_optimization.context_optimization_success_rate * 100}%` }}
                  />
                </div>
                <span className="font-medium text-sm">{(data.context_optimization.context_optimization_success_rate * 100).toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Tokens Optimized</span>
              <span className="font-medium">{data.context_optimization.avg_tokens_optimized.toFixed(0)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Compression Ratio</span>
              <span className="font-medium text-green-600">{data.context_optimization.compression_ratio.toFixed(1)}x</span>
            </div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Cpu className="w-5 h-5 text-indigo-600 mr-2" />
            Resource Usage
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Memory Usage</span>
              <span className="font-medium">{formatMemory(data.resource_usage.avg_memory_usage_mb)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Peak Concurrent Chats</span>
              <span className="font-medium">{data.resource_usage.peak_concurrent_conversations}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">DB Query Performance</span>
              <span className="font-medium">{formatTime(data.resource_usage.database_query_performance)}</span>
            </div>
            
            <div className="pt-4 border-t">
              <div className="text-xs text-gray-500 flex items-center">
                <Database className="w-3 h-3 mr-1" />
                Resource usage is optimized for peak performance
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Recommendations */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Recommendations</h3>
        <div className="space-y-3">
          {data.response_performance.avg_response_time_ms > 2000 && (
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Slow Response Times Detected</p>
                <p className="text-xs text-yellow-700">Average response time is above optimal threshold. Consider optimizing context processing or upgrading infrastructure.</p>
              </div>
            </div>
          )}
          
          {data.system_health.error_rate > 0.05 && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">High Error Rate</p>
                <p className="text-xs text-red-700">Error rate is above 5%. Review system logs and consider scaling resources.</p>
              </div>
            </div>
          )}
          
          {data.system_health.cache_hit_rate < 0.8 && (
            <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Cache Performance</p>
                <p className="text-xs text-blue-700">Cache hit rate is below 80%. Consider optimizing caching strategies or increasing cache size.</p>
              </div>
            </div>
          )}
          
          {data.context_optimization.context_optimization_success_rate > 0.9 && data.response_performance.avg_response_time_ms < 1500 && (
            <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Excellent Performance</p>
                <p className="text-xs text-green-700">System is performing optimally with good response times and high optimization success rate.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;