/**
 * CrawlingHistory Component
 * Displays list of crawling jobs with real-time progress tracking.
 * Uses 2-second polling for active jobs.
 */
import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Loader,
  Globe,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useCrawlProgress, type CrawlJobProgress } from '../../hooks/useCrawlProgress';
import { config } from '../../config/env';

interface CrawlingJob {
  job_id: string;
  website_id: string;
  website_name?: string;
  base_url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface CrawlingHistoryProps {
  websiteId?: string;
  /** Show only active jobs */
  activeOnly?: boolean;
  /** Maximum number of jobs to display */
  limit?: number;
}

const CrawlingHistory: React.FC<CrawlingHistoryProps> = ({
  websiteId,
  activeOnly = false,
  limit = 10
}) => {
  const [jobs, setJobs] = useState<CrawlingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeJobIds, setActiveJobIds] = useState<Set<string>>(new Set());

  // Fetch jobs list
  useEffect(() => {
    fetchJobs();
    // Refresh jobs list every 10 seconds
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, [websiteId, activeOnly, limit]);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const authToken = localStorage.getItem('auth_token');
      let url = `${config.api.baseUrl}/api/v1/crawl/crawling-jobs?limit=${limit}`;

      if (websiteId) {
        url += `&website_id=${websiteId}`;
      }
      if (activeOnly) {
        url += '&status=pending,running';
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data.jobs || []);

      // Track active jobs for progress polling
      const activeIds: Set<string> = new Set(
        data.jobs
          .filter((job: CrawlingJob) => ['pending', 'running'].includes(job.status))
          .map((job: CrawlingJob) => job.job_id)
      );
      setActiveJobIds(activeIds);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchJobs();
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading crawling jobs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading jobs</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No crawling jobs
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {activeOnly ? 'No active crawls at the moment.' : 'No crawl history available.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {activeOnly ? 'Active Crawls' : 'Crawling History'}
        </h3>
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.map((job) => (
          <CrawlingJobCard
            key={job.job_id}
            job={job}
            isActive={activeJobIds.has(job.job_id)}
          />
        ))}
      </div>
    </div>
  );
};

interface CrawlingJobCardProps {
  job: CrawlingJob;
  isActive: boolean;
}

const CrawlingJobCard: React.FC<CrawlingJobCardProps> = ({ job, isActive }) => {
  const { progress, startPolling, stopPolling, isPolling } = useCrawlProgress({
    pollingInterval: 2000,
    autoStopOnComplete: true
  });

  const [showDetails, setShowDetails] = useState(false);

  // Start/stop polling based on job status
  useEffect(() => {
    if (isActive) {
      startPolling(job.job_id);
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isActive, job.job_id, startPolling, stopPolling]);

  const handleCancel = async () => {
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch(
        `${config.api.baseUrl}/api/v1/crawl/crawling-jobs/${job.job_id}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }

      // Refresh will happen via polling
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  };

  // Use progress data if available, otherwise use job data
  const displayData = progress || job;
  const currentStatus = progress?.status || job.status;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Status Badge */}
          <div className="flex items-center space-x-3 mb-3">
            <StatusBadge status={currentStatus} />
            {isPolling && (
              <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Loader className="w-3 h-3 animate-spin mr-1" />
                Updating...
              </span>
            )}
          </div>

          {/* URL */}
          <div className="flex items-center space-x-2 mb-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {job.base_url}
            </span>
          </div>

          {/* Progress Bar (for active jobs) */}
          {isActive && progress && (
            <ProgressBar progress={progress} />
          )}

          {/* Stats Row */}
          <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
            {progress && (
              <>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{progress.pages_completed} completed</span>
                </div>
                {progress.pages_failed > 0 && (
                  <div className="flex items-center space-x-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>{progress.pages_failed} failed</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{progress.total_pages} total</span>
                </div>
              </>
            )}
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(job.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Current Page (for running jobs) */}
          {progress?.current_page_url && currentStatus === 'running' && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
              Currently crawling: {progress.current_page_url}
            </div>
          )}

          {/* Error Message */}
          {progress?.error_message && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
              {progress.error_message}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          {['pending', 'running'].includes(currentStatus) && (
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
        };
      case 'running':
        return {
          icon: RefreshCw,
          label: 'Running',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Completed',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
        };
      case 'failed':
        return {
          icon: AlertCircle,
          label: 'Failed',
          className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Cancelled',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        };
      default:
        return {
          icon: Clock,
          label: status,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </span>
  );
};

interface ProgressBarProps {
  progress: CrawlJobProgress;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const percentage = Math.min(100, Math.max(0, progress.progress_percentage));

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
        <span>Progress</span>
        <span className="font-medium">{percentage.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>{progress.pages_completed + progress.pages_failed} / {progress.total_pages} pages</span>
        {progress.pages_queued > 0 && (
          <span>{progress.pages_queued} queued</span>
        )}
      </div>
    </div>
  );
};

export default CrawlingHistory;
