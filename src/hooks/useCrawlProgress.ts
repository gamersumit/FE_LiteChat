/**
 * Hook for streaming crawl progress tracking with 2-second polling.
 * Monitors active crawling jobs and provides real-time progress updates.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { config } from '../config/env';

export interface CrawlJobProgress {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  pages_queued: number;
  pages_processing: number;
  pages_completed: number;
  pages_failed: number;
  total_pages: number;
  progress_percentage: number;
  current_page_url?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

interface UseCrawlProgressOptions {
  /** Polling interval in milliseconds (default: 2000) */
  pollingInterval?: number;
  /** Auto-stop polling when job completes (default: true) */
  autoStopOnComplete?: boolean;
}

interface UseCrawlProgressReturn {
  /** Current progress data */
  progress: CrawlJobProgress | null;
  /** Whether progress is being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Start monitoring a job */
  startPolling: (jobId: string) => void;
  /** Stop monitoring */
  stopPolling: () => void;
  /** Whether polling is active */
  isPolling: boolean;
  /** Manually refresh progress */
  refreshProgress: () => Promise<void>;
}

export const useCrawlProgress = (
  options: UseCrawlProgressOptions = {}
): UseCrawlProgressReturn => {
  const {
    pollingInterval = 2000,
    autoStopOnComplete = true
  } = options;

  const [progress, setProgress] = useState<CrawlJobProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const jobIdRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProgress = useCallback(async (jobId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const authToken = localStorage.getItem('auth_token');
      const response = await fetch(
        `${config.api.baseUrl}/api/v1/crawl/crawling-jobs/${jobId}/progress`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch progress: ${response.statusText}`);
      }

      const data: CrawlJobProgress = await response.json();
      setProgress(data);

      // Auto-stop polling if job is complete
      if (autoStopOnComplete && ['completed', 'failed', 'cancelled'].includes(data.status)) {
        stopPolling();
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch progress';
      setError(errorMessage);
      console.error('Error fetching crawl progress:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [autoStopOnComplete]);

  const startPolling = useCallback((jobId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    jobIdRef.current = jobId;
    setIsPolling(true);

    // Fetch immediately
    fetchProgress(jobId);

    // Start polling interval
    pollingIntervalRef.current = setInterval(() => {
      if (jobIdRef.current) {
        fetchProgress(jobIdRef.current);
      }
    }, pollingInterval);
  }, [fetchProgress, pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
    jobIdRef.current = null;
  }, []);

  const refreshProgress = useCallback(async () => {
    if (jobIdRef.current) {
      await fetchProgress(jobIdRef.current);
    }
  }, [fetchProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    progress,
    isLoading,
    error,
    startPolling,
    stopPolling,
    isPolling,
    refreshProgress,
  };
};
