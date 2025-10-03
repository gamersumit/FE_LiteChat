/**
 * Centralized API Service
 *
 * This service eliminates the redundant API calls found in the audit:
 * - Consolidates duplicate fetch calls across Dashboard.tsx and Websites.tsx
 * - Provides automatic auth header injection
 * - Implements request deduplication
 * - Centralized error handling
 * - Configurable base URL
 */

import { config } from '../config/env';

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  getToken?: () => string | null;
}

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

interface RequestOptions extends RequestInit {
  suppressErrorNotifications?: boolean;
}

export interface Website {
  id: string;
  domain: string;
  name: string;
  url: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  created_at: string;
  updated_at: string;
  verification_status: string;
  widget_status: string;
  scraping_status: string;
  screenshot_url?: string;
}

export interface DashboardOverview {
  total_websites: number;
  active_websites: number;
  total_conversations: number;
  active_crawls: number;
}

export interface PaginationInfo {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export interface DashboardMetrics {
  total_websites: number;
  active_websites: number;
  inactive_websites: number;
  total_conversations: number;
  total_pages_crawled: number;
  active_crawls: number;
  websites_created_this_month: number;
}

export interface WebsitesWithMetricsResponse {
  websites: Website[];
  pagination: PaginationInfo;
  metrics: DashboardMetrics;
}

export interface ChatStats {
  period: string;
  total_messages: number;
  conversations_count: number;
  avg_response_time: number;
  user_satisfaction: number;
  stats?: Array<{
    date: string;
    chats: number;
    responses: number;
  }>;
}

export interface CrawlStatus {
  status: string;
  crawl_active: boolean;
  pages_crawled: number;
  last_crawled: string;
  error_message?: string;
}

class CentralizedApiService {
  private config: ApiConfig;
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private refreshingToken: boolean = false;
  private tokenRefreshQueue: Array<{ resolve: Function, reject: Function }> = [];

  constructor(apiConfig?: Partial<ApiConfig>) {
    // Use imported config for defaults
    let baseUrl = config.api.baseUrl;
    try {
      if (import.meta?.env?.VITE_API_BASE_URL) {
        baseUrl = import.meta.env.VITE_API_BASE_URL;
      }
    } catch {
      // Fallback to default if import.meta is not available
      baseUrl = config.api.baseUrl;
    }

    this.config = {
      baseUrl,
      timeout: config.api.timeout,
      retryAttempts: config.api.retryAttempts,
      retryDelay: 1000,
      ...apiConfig
    };
  }

  /**
   * Get auth token from Redux store or fallback to storage
   */
  private getAuthToken(): string | null {
    // First try to get token from Redux via provided function
    if (this.config.getToken) {
      const token = this.config.getToken();
      if (token && token !== 'undefined') return token;
    }

    // Fallback to localStorage
    const localToken = localStorage.getItem('auth_token');
    return (localToken && localToken !== 'undefined') ? localToken : null;
  }

  /**
   * Create request headers with automatic auth injection
   */
  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(url: string, options: RequestInit = {}): string {
    const method = options.method || 'GET';
    const body = options.body || '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Check if cached response is still valid
   */
  private getCachedResponse<T>(cacheKey: string): T | null {
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    this.requestCache.delete(cacheKey);
    return null;
  }

  /**
   * Cache response with TTL
   */
  private setCachedResponse(cacheKey: string, data: any, ttlMs: number = 300000): void {
    this.requestCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Request with deduplication, caching, and retry logic
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestOptions = {},
    cacheTtl: number = 0
  ): Promise<ApiResponse<T>> {
    const { suppressErrorNotifications = false, ...requestOptions } = options;
    const url = `${this.config.baseUrl}${endpoint}`;
    const cacheKey = this.getCacheKey(url, options);

    // Check cache first for GET requests
    if ((!options.method || options.method === 'GET') && cacheTtl > 0) {
      const cached = this.getCachedResponse<ApiResponse<T>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check for pending request (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create new request
    const requestPromise = this.executeRequest<T>(url, requestOptions, cacheKey, cacheTtl, suppressErrorNotifications);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Execute the actual HTTP request with retry logic and error handling
   */
  private async executeRequest<T>(
    url: string,
    options: RequestInit,
    cacheKey: string,
    cacheTtl: number,
    suppressErrorNotifications: boolean = false
  ): Promise<ApiResponse<T>> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Refresh headers on each attempt (in case token was refreshed)
        const requestOptions: RequestInit = {
          ...options,
          headers: this.getHeaders(options.headers as Record<string, string>),
          signal: AbortSignal.timeout(this.config.timeout)
        };

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          // Handle specific HTTP errors with detailed error handling
          if (response.status === 401 || response.status === 403) {
            // Try to refresh token first
            const refreshSuccess = await this.handleTokenRefresh();

            if (refreshSuccess && attempt === 0) {
              // Retry the request with new token (only once)
              continue;
            }

            // If refresh failed or this is a retry, handle as authentication error
            // Note: No error notifications here - handleTokenRefresh() and handleTokenExpiration() handle user redirects
            if (response.status === 401) {
              throw new Error('Authentication required');
            } else {
              throw new Error('Access forbidden');
            }
          }

          if (response.status === 404) {
            if (!suppressErrorNotifications) {
              this.dispatchErrorNotification('error', 'Resource Not Found', 'The requested resource could not be found.');
            }
            throw new Error('Resource not found');
          }

          if (response.status === 409) {
            // Handle conflict errors (e.g., duplicate resources)
            try {
              const errorData = await response.json();
              const message = errorData.detail || 'Resource already exists';
              if (!suppressErrorNotifications) {
                this.dispatchErrorNotification('error', 'Conflict', message);
              }
              throw new Error(message);
            } catch (error) {
              const message = 'This resource already exists.';
              if (!suppressErrorNotifications) {
                this.dispatchErrorNotification('error', 'Conflict', message);
              }
              throw new Error('Resource conflict');
            }
          }

          if (response.status === 422) {
            // Try to get validation errors from response
            try {
              const errorData = await response.json();
              const message = errorData.detail || 'Validation failed';
              if (!suppressErrorNotifications) {
                this.dispatchErrorNotification('validation', 'Validation Error', message);
              }
            } catch {
              if (!suppressErrorNotifications) {
                this.dispatchErrorNotification('validation', 'Validation Error', 'Please check your input and try again.');
              }
            }
            throw new Error('Validation failed');
          }

          if (response.status >= 500) {
            if (!suppressErrorNotifications) {
              this.dispatchErrorNotification('error', 'Server Error', 'A server error occurred. Please try again later.');
            }
            throw new Error(`Server error: ${response.status}`);
          }

          if (!suppressErrorNotifications) {
            this.dispatchErrorNotification('error', 'Request Failed', `Request failed with status ${response.status}`);
          }
          throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const result: ApiResponse<T> = {
          data,
          success: true
        };

        // Cache successful GET requests
        if ((!options.method || options.method === 'GET') && cacheTtl > 0) {
          this.setCachedResponse(cacheKey, result, cacheTtl);
        }

        return result;

      } catch (error) {
        lastError = error as Error;

        // Handle network errors
        if (!suppressErrorNotifications && error instanceof TypeError && error.message.includes('fetch')) {
          this.dispatchErrorNotification('network', 'Network Error', 'Please check your internet connection and try again.');
        }

        // Handle timeout errors
        if (!suppressErrorNotifications && error instanceof DOMException && error.name === 'TimeoutError') {
          this.dispatchErrorNotification('error', 'Request Timeout', 'The request took too long. Please try again.');
        }

        // Don't retry on auth errors or client errors (4xx status codes)
        if (error instanceof Error &&
          (error.message.includes('Authentication') ||
            error.message.includes('forbidden') ||
            error.message.includes('not found') ||
            error.message.includes('Validation') ||
            error.message.includes('Resource conflict') ||
            error.message.includes('already exists') ||
            error.message.includes('Conflict'))) {
          break;
        }

        // Wait before retry
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (attempt + 1)));
        }
      }
    }

    // Final error notification if all retries failed
    if (!suppressErrorNotifications && lastError && !lastError.message.includes('Authentication') &&
      !lastError.message.includes('forbidden') &&
      !lastError.message.includes('not found') &&
      !lastError.message.includes('Validation')) {
      this.dispatchErrorNotification('error', 'Request Failed', lastError.message);
    }

    return {
      data: null as T,
      success: false,
      message: lastError.message
    };
  }

  /**
   * Handle automatic token refresh on 401/403 errors
   */
  private async handleTokenRefresh(): Promise<boolean> {
    // If already refreshing, wait for it to complete
    if (this.refreshingToken) {
      return new Promise((resolve, reject) => {
        this.tokenRefreshQueue.push({ resolve, reject });
      });
    }

    this.refreshingToken = true;

    try {
      const refreshResponse = await this.refreshToken();

      if (refreshResponse.success) {
        // Update stored tokens in localStorage
        localStorage.setItem('auth_token', refreshResponse.data.access_token);
        localStorage.setItem('refresh_token', refreshResponse.data.refresh_token);

        // Dispatch event to notify Redux store about token refresh
        window.dispatchEvent(new CustomEvent('token-refreshed', {
          detail: {
            access_token: refreshResponse.data.access_token,
            refresh_token: refreshResponse.data.refresh_token
          }
        }));

        // Resolve queued requests
        this.tokenRefreshQueue.forEach(({ resolve }) => resolve(true));
        this.tokenRefreshQueue = [];

        return true;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      // Refresh failed - trigger logout
      this.handleTokenExpiration();

      // Reject queued requests
      this.tokenRefreshQueue.forEach(({ reject }) => reject(error));
      this.tokenRefreshQueue = [];

      return false;
    } finally {
      this.refreshingToken = false;
    }
  }

  /**
   * Handle token expiration by triggering logout
   */
  private handleTokenExpiration(): void {
    // Clear stored tokens
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');

    // Dispatch token expired event for logout
    window.dispatchEvent(new CustomEvent('token-expired'));
  }

  /**
   * Dispatch error notifications to Redux store
   */
  private dispatchErrorNotification(
    type: 'auth' | 'permission' | 'validation' | 'network' | 'error',
    title: string,
    message: string
  ): void {
    // Dispatch custom event that will be caught by the toast system
    window.dispatchEvent(new CustomEvent('api-error', {
      detail: { type, title, message }
    }));
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.requestCache.clear();
    this.pendingRequests.clear();
  }

  // ==================== DASHBOARD API METHODS ====================
  // These methods replace the redundant calls found in the audit

  /**
   * Get websites with comprehensive metrics and pagination (replaces overview + websites APIs)
   */
  async getWebsitesWithMetrics(page: number = 1, limit: number = 10): Promise<ApiResponse<WebsitesWithMetricsResponse>> {
    const response = await this.request<any>(`/api/v1/dashboard/websites?page=${page}&limit=${limit}`, {}, 60000); // 1 minute cache

    if (response.success && response.data?.status === 'success') {
      return {
        success: true,
        data: response.data.data // Extract the nested data
      };
    }

    return {
      success: false,
      message: response.data?.error || response.message || 'Failed to fetch websites with metrics',
      data: { websites: [], pagination: { current_page: 1, per_page: 10, total_items: 0, total_pages: 0, has_next_page: false, has_prev_page: false }, metrics: { total_websites: 0, active_websites: 0, inactive_websites: 0, total_conversations: 0, total_pages_crawled: 0, active_crawls: 0, websites_created_this_month: 0 } }
    };
  }

  /**
   * Get all websites (for backward compatibility)
   */
  async getAllWebsites(): Promise<ApiResponse<Website[]>> {
    const response = await this.getWebsitesWithMetrics(1, 1000); // Get up to 1000 websites
    if (response.success) {
      return {
        ...response,
        data: response.data.websites
      };
    }
    return response as any;
  }

  /**
   * Get dashboard metrics only (extracted from websites API)
   */
  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    const response = await this.getWebsitesWithMetrics(1, 1); // Just get first page for metrics
    if (response.success) {
      return {
        ...response,
        data: response.data.metrics
      };
    }
    return response as any;
  }

  /**
   * @deprecated Use getDashboardMetrics() instead
   */
  async getDashboardOverview(): Promise<ApiResponse<DashboardOverview>> {
    const response = await this.getDashboardMetrics();
    if (response.success) {
      // Map new format to old format for backward compatibility
      return {
        ...response,
        data: {
          total_websites: response.data.total_websites,
          active_websites: response.data.active_websites,
          total_conversations: response.data.total_conversations,
          active_crawls: response.data.active_crawls
        }
      };
    }
    return response as any;
  }

  /**
   * Get chat statistics (Dashboard.tsx:109)
   */
  async getChatStats(period: string = '30d'): Promise<ApiResponse<ChatStats>> {
    return this.request<ChatStats>(`/api/v1/dashboard/chat-stats?period=${period}`, {}, 60000);
  }

  /**
   * Create/register new website
   */
  async createWebsite(websiteData: {
    name: string;
    domain: string;
    url: string;
    description: string;
    category: string;
    scrapingFrequency: string;
    maxPages: number;
    features: string[];
  }): Promise<ApiResponse<{ website: Website; message: string }>> {
    const result = await this.request<{ website: Website; message: string }>('/api/v1/onboarding/register', {
      method: 'POST',
      body: JSON.stringify(websiteData),
      suppressErrorNotifications: true
    });

    // No need to invalidate cache since we'll add the website directly to state
    // Cache will naturally expire or be invalidated on next fetch if needed

    return result;
  }

  /**
   * Delete website (replaces duplicate calls in Dashboard.tsx:220 and Websites.tsx:175)
   */
  async deleteWebsite(websiteId: string): Promise<ApiResponse<void>> {
    const result = await this.request<void>(`/api/v1/websites/${websiteId}`, {
      method: 'DELETE'
    });

    // Invalidate website cache on successful delete
    if (result.success) {
      this.invalidateWebsiteCache();
    }

    return result;
  }

  /**
   * Get website crawl status
   */
  async getWebsiteCrawlStatus(websiteId: string): Promise<ApiResponse<CrawlStatus>> {
    return this.request<CrawlStatus>(`/api/v1/crawl/website/${websiteId}/status`, {}, 10000); // 10 second cache
  }

  /**
   * Trigger manual crawl
   */
  async triggerCrawl(websiteId: string, maxPages?: number): Promise<ApiResponse<{ task_id: string }>> {
    const result = await this.request<{ task_id: string }>('/api/v1/crawl/trigger', {
      method: 'POST',
      body: JSON.stringify({
        website_id: websiteId,
        max_pages: maxPages || 10
      })
    });

    // Invalidate caches on successful crawl trigger
    if (result.success) {
      this.invalidateWebsiteCache();
      this.invalidateAnalyticsCache(websiteId);
    }

    return result;
  }

  // ==================== ANALYTICS API METHODS ====================

  /**
   * Get website analytics overview
   */
  async getWebsiteAnalytics(websiteId: string, period: number = 30): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/analytics/websites/${websiteId}/overview?days=${period}`, {}, 300000); // 5 minute cache
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(websiteId: string, period: number = 30, format: string = 'json'): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/analytics/websites/${websiteId}/export?days=${period}&format=${format}`);
  }

  // ==================== AUTHENTICATION API METHODS ====================

  /**
   * Validate current token
   */
  async validateToken(): Promise<ApiResponse<{ user: any }>> {
    return this.request<{ user: any }>('/api/v1/auth/me');
  }

  /**
   * Refresh authentication token
   * NOTE: This method bypasses the normal request() flow to avoid infinite loops
   */
  async refreshToken(): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return {
        data: null as any,
        success: false,
        message: 'No refresh token available'
      };
    }

    // Direct fetch call to avoid retry logic that would cause infinite loop
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        return {
          data: null as any,
          success: false,
          message: `Token refresh failed: ${response.status}`
        };
      }

      const data = await response.json();

      return {
        data,
        success: true
      };
    } catch (error) {
      return {
        data: null as any,
        success: false,
        message: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<ApiResponse<{ access_token: string; refresh_token: string; user: any }>> {
    return this.request<{ access_token: string; refresh_token: string; user: any }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  /**
   * Register new user
   */
  async register(name: string, email: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // ==================== CACHE INVALIDATION METHODS ====================

  /**
   * Invalidate website-related caches
   */
  private invalidateWebsiteCache(): void {
    const keysToDelete: string[] = [];

    this.requestCache.forEach((value, key) => {
      if (key.includes('/api/v1/dashboard/websites') ||
        key.includes('/api/v1/dashboard/overview')) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.requestCache.delete(key));
  }

  /**
   * Invalidate analytics caches for a specific website
   */
  invalidateAnalyticsCache(websiteId: string): void {
    const keysToDelete: string[] = [];

    this.requestCache.forEach((value, key) => {
      if (key.includes(`/api/v1/analytics/websites/${websiteId}`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.requestCache.delete(key));
  }
}

// Create singleton instance
// Import token provider (will be set after store initialization)
let tokenProvider: (() => string | null) | undefined;

export const setTokenProvider = (provider: () => string | null) => {
  tokenProvider = provider;
};

export const apiService = new CentralizedApiService({
  baseUrl: config.api.baseUrl,
  timeout: config.api.timeout,
  retryAttempts: config.api.retryAttempts,
  retryDelay: 1000,
  getToken: () => tokenProvider ? tokenProvider() : null
});

// Export for testing
export { CentralizedApiService };