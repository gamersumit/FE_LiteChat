import { renderHook, act, waitFor } from '@testing-library/react';
import { useCrawl } from '../useCrawl';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => 'mock-auth-token'),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useCrawl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerCrawl', () => {
    it('should trigger a crawl successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            task_id: 'task-123',
            status: 'pending',
            estimated_duration: 5,
            pages_to_crawl: 100,
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const { result } = renderHook(() => useCrawl());

      let crawlResult;
      await act(async () => {
        crawlResult = await result.current.triggerCrawl('website-123');
      });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8001/api/v1/crawl/trigger', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-auth-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          website_id: 'website-123',
          max_pages: 100,
          max_depth: 3,
        }),
      });

      expect(crawlResult).toEqual({
        success: true,
        data: {
          task_id: 'task-123',
          status: 'pending',
          estimated_duration: 5,
          pages_to_crawl: 100,
        },
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({
          success: false,
          detail: 'No healthy workers available',
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const { result } = renderHook(() => useCrawl());

      let crawlResult;
      await act(async () => {
        crawlResult = await result.current.triggerCrawl('website-123');
      });

      expect(crawlResult).toEqual({
        success: false,
        error: 'No healthy workers available',
      });
      expect(result.current.error).toBe('No healthy workers available');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCrawl());

      let crawlResult;
      await act(async () => {
        crawlResult = await result.current.triggerCrawl('website-123');
      });

      expect(crawlResult).toEqual({
        success: false,
        error: 'Network error',
      });
      expect(result.current.error).toBe('Network error');
    });

    it('should accept custom options', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: { task_id: 'task-123' },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const { result } = renderHook(() => useCrawl());

      await act(async () => {
        await result.current.triggerCrawl('website-123', {
          maxPages: 50,
          maxDepth: 2,
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8001/api/v1/crawl/trigger', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-auth-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          website_id: 'website-123',
          max_pages: 50,
          max_depth: 2,
        }),
      });
    });
  });

  describe('getCrawlStatus', () => {
    it('should get crawl status successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            status: 'completed',
            progress: 100,
            result: { pages_crawled: 45 },
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const { result } = renderHook(() => useCrawl());

      let statusResult;
      await act(async () => {
        statusResult = await result.current.getCrawlStatus('task-123');
      });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8001/api/v1/crawl/status/task-123', {
        headers: {
          'Authorization': 'Bearer mock-auth-token',
          'Content-Type': 'application/json',
        },
      });

      expect(statusResult).toEqual({
        success: true,
        data: {
          status: 'completed',
          progress: 100,
          result: { pages_crawled: 45 },
        },
      });
    });
  });

  describe('cancelCrawl', () => {
    it('should cancel crawl successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            task_id: 'task-123',
            status: 'cancelled',
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const { result } = renderHook(() => useCrawl());

      let cancelResult;
      await act(async () => {
        cancelResult = await result.current.cancelCrawl('task-123');
      });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8001/api/v1/crawl/cancel/task-123', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-auth-token',
          'Content-Type': 'application/json',
        },
      });

      expect(cancelResult).toEqual({
        success: true,
        data: {
          success: true,
          task_id: 'task-123',
          status: 'cancelled',
        },
      });
    });
  });

  describe('getWebsiteStatus', () => {
    it('should get website crawl status successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            status: 'success',
            last_crawled: '2025-09-17T08:00:00Z',
            pages_crawled: 45,
            last_success: '2025-09-17T08:00:00Z',
            next_scheduled: '2025-09-18T08:00:00Z',
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const { result } = renderHook(() => useCrawl());

      let statusResult;
      await act(async () => {
        statusResult = await result.current.getWebsiteStatus('website-123');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/v1/crawl/website/website-123/status',
        {
          headers: {
            'Authorization': 'Bearer mock-auth-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(statusResult).toEqual({
        success: true,
        data: {
          status: 'success',
          last_crawled: '2025-09-17T08:00:00Z',
          pages_crawled: 45,
          last_success: '2025-09-17T08:00:00Z',
          next_scheduled: '2025-09-18T08:00:00Z',
        },
      });
    });
  });

  describe('getCrawlHistory', () => {
    it('should get crawl history successfully', async () => {
      const mockHistory = {
        history: [
          {
            crawl_id: 'crawl_123',
            started_at: '2025-09-17T08:00:00Z',
            completed_at: '2025-09-17T08:15:00Z',
            status: 'success',
            pages_crawled: 45,
            trigger_type: 'manual',
            error_message: null,
          },
        ],
        total: 1,
        has_more: false,
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: mockHistory,
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const { result } = renderHook(() => useCrawl());

      let historyResult;
      await act(async () => {
        historyResult = await result.current.getCrawlHistory('website-123', 5, 0);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/v1/crawl/website/website-123/history?limit=5&offset=0',
        {
          headers: {
            'Authorization': 'Bearer mock-auth-token',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(historyResult).toEqual({
        success: true,
        data: mockHistory,
      });
    });

    it('should use default limit and offset', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true, data: { history: [], total: 0, has_more: false } }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const { result } = renderHook(() => useCrawl());

      await act(async () => {
        await result.current.getCrawlHistory('website-123');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/v1/crawl/website/website-123/history?limit=10&offset=0',
        {
          headers: {
            'Authorization': 'Bearer mock-auth-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });
  });

  describe('loading state', () => {
    it('should manage loading state during API calls', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useCrawl());

      expect(result.current.isLoading).toBe(false);

      const triggerPromise = act(async () => {
        result.current.triggerCrawl('website-123');
      });

      // Should be loading now
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the fetch
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await triggerPromise;

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
    });
  });
});