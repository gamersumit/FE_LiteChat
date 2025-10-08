import { useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { showErrorToast } from '../store/notificationSlice';
import { config } from '../config/env';

export interface CrawlStatus {
  status: 'idle' | 'active' | 'success' | 'failed';
  last_crawled?: string;
  pages_crawled?: number;
  last_success?: string;
  next_scheduled?: string;
}

export interface CrawlHistoryEntry {
  crawl_id: string;
  started_at: string;
  completed_at?: string;
  status: 'pending' | 'running' | 'completed' | 'success' | 'failed' | 'cancelled';
  pages_crawled: number;
  trigger_type: 'manual' | 'scheduled';
  error_message?: string;
}

export interface CrawlJobProgress {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  pages_queued: number;
  pages_processing: number;
  pages_completed: number;
  pages_failed: number;
  total_pages: number;
  total_discovered: number;
  pages_processed: number;
  max_pages: number;
  progress_percentage: number;
  estimated_time_remaining?: number;
  current_page_url?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface CrawlHistory {
  history: CrawlHistoryEntry[];
  total: number;
  has_more: boolean;
}

interface UseCrawlReturn {
  // Manual crawl
  triggerCrawl: (websiteId: string, options?: { maxPages?: number; maxDepth?: number }) => Promise<{ success: boolean; taskId?: string; error?: string }>;
  getCrawlStatus: (taskId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  cancelCrawl: (taskId: string) => Promise<{ success: boolean; error?: string }>;

  // Website status
  getWebsiteStatus: (websiteId: string) => Promise<{ success: boolean; data?: CrawlStatus; error?: string }>;

  // Crawl history
  getCrawlHistory: (websiteId: string, limit?: number, offset?: number) => Promise<{ success: boolean; data?: CrawlHistory; error?: string }>;

  // Crawl job progress
  getCrawlJobProgress: (jobId: string, silent?: boolean) => Promise<{ success: boolean; data?: CrawlJobProgress; error?: string }>;

  // State
  isLoading: boolean;
  error: string | null;
}

export const useCrawl = (): UseCrawlReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const { token } = useAppSelector(state => state.auth);

  const getAuthHeaders = () => {
    const authToken = token || localStorage.getItem('auth_token');
    if (!authToken) {
      throw new Error('No authentication token available');
    }
    return {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };
  };

  const handleApiCall = async <T>(apiCall: () => Promise<Response>): Promise<{ success: boolean; data?: T; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiCall();
      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, data: data.data };
      } else {
        const errorMessage = data.detail || data.error || 'Request failed';
        setError(errorMessage);

        // Show user-friendly notifications for specific error types
        if (response.status === 401) {
          dispatch(showErrorToast('Authentication failed', 'Please log in again to continue'));
        } else if (response.status === 403) {
          dispatch(showErrorToast('Access denied', 'You do not have permission to perform this action'));
        } else {
          dispatch(showErrorToast('Request failed', errorMessage));
        }

        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);

      // Show notification for network errors
      if (errorMessage === 'No authentication token available') {
        dispatch(showErrorToast('Authentication required', 'Please log in to access crawl history'));
      } else {
        dispatch(showErrorToast('Connection failed', 'Unable to connect to server. Please check your connection.'));
      }

      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const triggerCrawl = useCallback(async (
    websiteId: string,
    options: { maxPages?: number; maxDepth?: number } = {}
  ) => {
    return handleApiCall(() =>
      fetch(`${config.api.baseUrl}/api/v1/crawl/trigger`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          website_id: websiteId,
          max_pages: options.maxPages || 100,
          max_depth: options.maxDepth || 3,
        }),
      })
    );
  }, []);

  const getCrawlStatus = useCallback(async (taskId: string) => {
    return handleApiCall(() =>
      fetch(`${config.api.baseUrl}/api/v1/crawl/status/${taskId}`, {
        headers: getAuthHeaders(),
      })
    );
  }, []);

  const cancelCrawl = useCallback(async (taskId: string) => {
    return handleApiCall(() =>
      fetch(`${config.api.baseUrl}/api/v1/crawl/cancel/${taskId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
    );
  }, []);

  const getWebsiteStatus = useCallback(async (websiteId: string) => {
    return handleApiCall<CrawlStatus>(() =>
      fetch(`${config.api.baseUrl}/api/v1/crawl/website/${websiteId}/status`, {
        headers: getAuthHeaders(),
      })
    );
  }, []);

  const getCrawlHistory = useCallback(async (
    websiteId: string,
    limit: number = 10,
    offset: number = 0
  ) => {
    return handleApiCall<CrawlHistory>(() =>
      fetch(`${config.api.baseUrl}/api/v1/crawl/website/${websiteId}/history?limit=${limit}&offset=${offset}`, {
        headers: getAuthHeaders(),
      })
    );
  }, []);

  const getCrawlJobProgress = useCallback(async (jobId: string, silent: boolean = false) => {
    // Validate UUID format before making request
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      console.error(`Invalid job_id format: ${jobId}`);
      return { success: false, error: `Invalid job ID format: ${jobId}` };
    }

    // Silent mode for background polling - don't show error toasts
    if (silent) {
      try {
        const response = await fetch(`${config.api.baseUrl}/api/v1/crawl/crawling-jobs/${jobId}/progress`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (response.ok) {
          // Progress API returns data directly, not wrapped in {success, data}
          return { success: true, data: data };
        } else {
          return { success: false, error: data.detail || data.error || 'Request failed' };
        }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Network error' };
      }
    }

    // Regular mode with error toasts
    return handleApiCall<CrawlJobProgress>(() =>
      fetch(`${config.api.baseUrl}/api/v1/crawl/crawling-jobs/${jobId}/progress`, {
        headers: getAuthHeaders(),
      })
    );
  }, []);

  return {
    triggerCrawl,
    getCrawlStatus,
    cancelCrawl,
    getWebsiteStatus,
    getCrawlHistory,
    getCrawlJobProgress,
    isLoading,
    error,
  };
};