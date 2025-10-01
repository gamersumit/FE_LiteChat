/**
 * Dashboard Slice
 *
 * Manages shared dashboard data to eliminate redundant API calls
 * Consolidates data from Dashboard.tsx and Websites.tsx
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { apiService, type Website, type DashboardOverview, type DashboardMetrics, type WebsitesWithMetricsResponse, type ChatStats, type CrawlStatus } from '../services/centralizedApi';
import { config } from '../config/env';

interface DashboardState {
  // Website data (shared between Dashboard and Websites pages)
  websites: Website[];
  websitesLoading: boolean;
  websitesError: string | null;
  websitesLastFetch: number | null;

  // Dashboard metrics (consolidated from overview API)
  metrics: DashboardMetrics | null;
  metricsLoading: boolean;
  metricsError: string | null;
  metricsLastFetch: number | null;

  // Pagination info
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  } | null;

  // Dashboard overview data (deprecated, use metrics instead)
  overview: DashboardOverview | null;
  overviewLoading: boolean;
  overviewError: string | null;
  overviewLastFetch: number | null;

  // Chat statistics
  chatStats: ChatStats | null;
  chatStatsLoading: boolean;
  chatStatsError: string | null;
  chatStatsLastFetch: number | null;
  chatStatsPeriod: string;

  // Crawl status for websites
  crawlStatuses: Record<string, CrawlStatus>;
  crawlStatusesLoading: Record<string, boolean>;
  crawlStatusesError: Record<string, string>;
  crawlTriggerLoading: Record<string, boolean>;

  // UI state
  selectedWebsiteId: string | null;
  refreshInterval: number;
}

const initialState: DashboardState = {
  websites: [],
  websitesLoading: false,
  websitesError: null,
  websitesLastFetch: null,

  metrics: null,
  metricsLoading: false,
  metricsError: null,
  metricsLastFetch: null,

  pagination: null,

  overview: null,
  overviewLoading: false,
  overviewError: null,
  overviewLastFetch: null,

  chatStats: null,
  chatStatsLoading: false,
  chatStatsError: null,
  chatStatsLastFetch: null,
  chatStatsPeriod: '30d',

  crawlStatuses: {},
  crawlStatusesLoading: {},
  crawlStatusesError: {},
  crawlTriggerLoading: {},

  selectedWebsiteId: null,
  refreshInterval: 30000 // 30 seconds
};

// Async thunks

/**
 * Fetch websites with metrics (replaces separate overview + websites calls)
 */
export const fetchWebsitesWithMetrics = createAsyncThunk(
  'dashboard/fetchWebsitesWithMetrics',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const { page = 1, limit = config.defaults.paginationSize } = params;
      const response = await apiService.getWebsitesWithMetrics(page, limit);

      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to fetch websites and metrics');
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch websites and metrics');
    }
  }
);

/**
 * Fetch websites list with pagination (backward compatibility)
 */
export const fetchWebsites = createAsyncThunk(
  'dashboard/fetchWebsites',
  async (params: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const { page = 1, limit = 1000 } = params; // Default to get all websites for now
      const response = await apiService.getWebsitesWithMetrics(page, limit);

      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to fetch websites');
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch websites');
    }
  }
);

/**
 * Fetch dashboard data efficiently (eliminates redundant API calls)
 * Gets both overview and website summary in optimized way
 */
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchDashboardData',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      // Fetch overview data
      const overviewResponse = await apiService.getDashboardOverview();
      if (!overviewResponse.success) {
        return rejectWithValue(overviewResponse.message || 'Failed to fetch dashboard overview');
      }

      // Fetch websites data (first page for dashboard display)
      const websitesResponse = await apiService.getAllWebsites();
      if (!websitesResponse.success) {
        return rejectWithValue(websitesResponse.message || 'Failed to fetch websites');
      }

      return {
        overview: overviewResponse.data,
        websites: { websites: websitesResponse.data }
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
    }
  }
);

/**
 * Fetch dashboard overview
 */
export const fetchDashboardOverview = createAsyncThunk(
  'dashboard/fetchOverview',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getDashboardOverview();

      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to fetch dashboard overview');
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch dashboard overview');
    }
  }
);

/**
 * Fetch chat statistics
 */
export const fetchChatStats = createAsyncThunk(
  'dashboard/fetchChatStats',
  async (period: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getChatStats(period);

      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to fetch chat stats');
      }

      return { data: response.data, period };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch chat stats');
    }
  }
);

/**
 * Delete website with optimistic update
 */
export const deleteWebsite = createAsyncThunk(
  'dashboard/deleteWebsite',
  async (websiteId: string, { rejectWithValue, dispatch, getState }) => {
    // Store current state for potential rollback
    const currentState = getState() as RootState;
    const websiteToDelete = currentState.dashboard.websites.find(w => w.id === websiteId);

    // Optimistic update - remove from UI immediately
    dispatch(removeWebsiteOptimistic(websiteId));

    try {
      const response = await apiService.deleteWebsite(websiteId);

      if (!response.success) {
        // Revert optimistic update on failure
        if (websiteToDelete) {
          dispatch(revertWebsiteDelete(websiteToDelete));
        }
        return rejectWithValue(response.message || 'Failed to delete website');
      }

      // Return both the websiteId and the deleted website data for metrics update
      return { websiteId, deletedWebsite: websiteToDelete };
    } catch (error) {
      // Revert optimistic update on error
      if (websiteToDelete) {
        dispatch(revertWebsiteDelete(websiteToDelete));
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete website');
    }
  }
);

/**
 * Fetch crawl status for a website
 */
export const fetchCrawlStatus = createAsyncThunk(
  'dashboard/fetchCrawlStatus',
  async (websiteId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getWebsiteCrawlStatus(websiteId);

      if (!response.success) {
        return rejectWithValue({ websiteId, error: response.message || 'Failed to fetch crawl status' });
      }

      return { websiteId, status: response.data };
    } catch (error) {
      return rejectWithValue({
        websiteId,
        error: error instanceof Error ? error.message : 'Failed to fetch crawl status'
      });
    }
  }
);

/**
 * Trigger crawl for a website (optimized - no full refresh)
 */
export const triggerCrawl = createAsyncThunk(
  'dashboard/triggerCrawl',
  async ({ websiteId, maxPages }: { websiteId: string; maxPages?: number }, { rejectWithValue, dispatch }) => {
    try {
      const response = await apiService.triggerCrawl(websiteId, maxPages);

      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to trigger crawl');
      }

      // Fetch updated crawl status only
      dispatch(fetchCrawlStatus(websiteId));

      return { websiteId, taskId: response.data.task_id };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to trigger crawl');
    }
  }
);

/**
 * Fetch all dashboard data in parallel
 */
export const fetchAllDashboardData = createAsyncThunk(
  'dashboard/fetchAll',
  async (_, { dispatch }) => {
    // Fetch all dashboard data in parallel
    const promises = [
      dispatch(fetchWebsites({})),
      dispatch(fetchDashboardOverview()),
      dispatch(fetchChatStats('30d'))
    ];

    await Promise.allSettled(promises);
    return null;
  }
);

/**
 * Refresh dashboard state after write operations
 */
export const refreshDashboardState = createAsyncThunk(
  'dashboard/refreshState',
  async (_, { dispatch }) => {
    // Refresh all relevant data to ensure state is up-to-date
    const promises = [
      dispatch(fetchWebsitesWithMetrics({ page: 1, limit: config.defaults.paginationSize })),
      dispatch(fetchChatStats('30d'))
    ];

    await Promise.allSettled(promises);
    return null;
  }
);

/**
 * Create new website and add to state directly (no full refresh)
 */
export const createWebsite = createAsyncThunk(
  'dashboard/createWebsite',
  async (websiteData: {
    name: string;
    domain: string;
    url: string;
    description: string;
    category: string;
    scrapingFrequency: string;
    maxPages: number;
    features: string[];
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.createWebsite(websiteData);

      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to create website');
      }

      // Return the website from the backend response
      return {
        website: response.data.website,
        message: response.data.message
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create website');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    // UI state management
    setSelectedWebsite: (state, action: PayloadAction<string | null>) => {
      state.selectedWebsiteId = action.payload;
    },
    setChatStatsPeriod: (state, action: PayloadAction<string>) => {
      state.chatStatsPeriod = action.payload;
    },
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },

    // Optimistic updates
    removeWebsiteOptimistic: (state, action: PayloadAction<string>) => {
      const websiteId = action.payload;
      const websiteToDelete = state.websites.find(w => w.id === websiteId);

      // Remove website from array
      state.websites = state.websites.filter(w => w.id !== websiteId);

      // Update metrics optimistically
      if (state.metrics && websiteToDelete) {
        state.metrics.total_websites = Math.max(0, state.metrics.total_websites - 1);

        // Update active/inactive counts based on deleted website status
        if (websiteToDelete.status === 'active') {
          state.metrics.active_websites = Math.max(0, state.metrics.active_websites - 1);
        } else if (websiteToDelete.status === 'inactive') {
          state.metrics.inactive_websites = Math.max(0, state.metrics.inactive_websites - 1);
        }

        // Update this month's count if applicable
        const now = new Date();
        const createdDate = new Date(websiteToDelete.created_at);
        if (createdDate.getMonth() === now.getMonth() &&
            createdDate.getFullYear() === now.getFullYear()) {
          state.metrics.websites_created_this_month = Math.max(0, state.metrics.websites_created_this_month - 1);
        }
      }

      // Update overview optimistically
      if (state.overview) {
        state.overview.total_websites = state.websites.length;

        // Recalculate website counts in overview
        const activeCount = state.websites.filter(w => w.status === 'active').length;
        const inactiveCount = state.websites.filter(w => w.status === 'inactive').length;

        // Update overview counts
        state.overview.total_websites = state.websites.length;
        state.overview.active_websites = activeCount;
      }

      // Update timestamps immediately for cross-page state sync
      const timestamp = Date.now().toString();
      localStorage.setItem('dashboard_last_fetch', timestamp);
      localStorage.setItem('websites_last_fetch', timestamp);
    },
    revertWebsiteDelete: (state, action: PayloadAction<Website>) => {
      // Restore the deleted website to its original position
      const website = action.payload;
      state.websites.push(website);
      // Sort by creation date to maintain order
      state.websites.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Revert metrics changes
      if (state.metrics) {
        state.metrics.total_websites += 1;

        // Restore active/inactive counts based on website status
        if (website.status === 'active') {
          state.metrics.active_websites += 1;
        } else if (website.status === 'inactive') {
          state.metrics.inactive_websites += 1;
        }

        // Restore this month's count if applicable
        const now = new Date();
        const createdDate = new Date(website.created_at);
        if (createdDate.getMonth() === now.getMonth() &&
            createdDate.getFullYear() === now.getFullYear()) {
          state.metrics.websites_created_this_month += 1;
        }
      }

      // Revert overview changes
      if (state.overview) {
        state.overview.total_websites = state.websites.length;

        // Recalculate website counts in overview
        const activeCount = state.websites.filter(w => w.status === 'active').length;
        const inactiveCount = state.websites.filter(w => w.status === 'inactive').length;

        // Update overview counts
        state.overview.total_websites = state.websites.length;
        state.overview.active_websites = activeCount;
      }

      // Clear timestamps to trigger fresh data fetch on next navigation
      localStorage.removeItem('dashboard_last_fetch');
      localStorage.removeItem('websites_last_fetch');
    },

    // Clear errors
    clearWebsitesError: (state) => {
      state.websitesError = null;
    },
    clearOverviewError: (state) => {
      state.overviewError = null;
    },
    clearChatStatsError: (state) => {
      state.chatStatsError = null;
    },
    clearCrawlStatusError: (state, action: PayloadAction<string>) => {
      delete state.crawlStatusesError[action.payload];
    },

    // Update website status (for real-time updates)
    updateWebsiteStatus: (state, action: PayloadAction<{ id: string; status: Website['status'] }>) => {
      const website = state.websites.find(w => w.id === action.payload.id);
      if (website) {
        website.status = action.payload.status;
      }
    },

    // Update crawl status
    updateCrawlStatus: (state, action: PayloadAction<{ websiteId: string; status: CrawlStatus }>) => {
      state.crawlStatuses[action.payload.websiteId] = action.payload.status;
    }
  },
  extraReducers: (builder) => {
    // Fetch websites
    builder
      .addCase(fetchWebsites.pending, (state) => {
        state.websitesLoading = true;
        state.websitesError = null;
      })
      .addCase(fetchWebsites.fulfilled, (state, action) => {
        state.websitesLoading = false;
        state.websites = action.payload.websites;
        state.websitesLastFetch = Date.now();
        state.websitesError = null;
      })
      .addCase(fetchWebsites.rejected, (state, action) => {
        state.websitesLoading = false;
        state.websitesError = action.payload as string;
      });

    // Fetch dashboard overview
    builder
      .addCase(fetchDashboardOverview.pending, (state) => {
        state.overviewLoading = true;
        state.overviewError = null;
      })
      .addCase(fetchDashboardOverview.fulfilled, (state, action) => {
        state.overviewLoading = false;
        state.overview = action.payload;
        state.overviewLastFetch = Date.now();
        state.overviewError = null;
      })
      .addCase(fetchDashboardOverview.rejected, (state, action) => {
        state.overviewLoading = false;
        state.overviewError = action.payload as string;
      });

    // Fetch chat stats
    builder
      .addCase(fetchChatStats.pending, (state) => {
        state.chatStatsLoading = true;
        state.chatStatsError = null;
      })
      .addCase(fetchChatStats.fulfilled, (state, action) => {
        state.chatStatsLoading = false;
        state.chatStats = action.payload.data;
        state.chatStatsPeriod = action.payload.period;
        state.chatStatsLastFetch = Date.now();
        state.chatStatsError = null;
      })
      .addCase(fetchChatStats.rejected, (state, action) => {
        state.chatStatsLoading = false;
        state.chatStatsError = action.payload as string;
      });

    // Fetch dashboard data (optimized call that gets both overview and websites)
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.overviewLoading = true;
        state.websitesLoading = true;
        state.overviewError = null;
        state.websitesError = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.overviewLoading = false;
        state.websitesLoading = false;
        state.overview = action.payload.overview;
        state.websites = action.payload.websites.websites;
        state.overviewLastFetch = Date.now();
        state.websitesLastFetch = Date.now();
        state.overviewError = null;
        state.websitesError = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.overviewLoading = false;
        state.websitesLoading = false;
        state.overviewError = action.payload as string;
        state.websitesError = action.payload as string;
      });

    // Fetch websites with metrics (new consolidated API)
    builder
      .addCase(fetchWebsitesWithMetrics.pending, (state) => {
        state.websitesLoading = true;
        state.metricsLoading = true;
        state.websitesError = null;
        state.metricsError = null;
      })
      .addCase(fetchWebsitesWithMetrics.fulfilled, (state, action) => {
        state.websitesLoading = false;
        state.metricsLoading = false;
        state.websites = action.payload.websites;
        state.metrics = action.payload.metrics;
        state.pagination = action.payload.pagination;
        state.websitesLastFetch = Date.now();
        state.metricsLastFetch = Date.now();
        state.websitesError = null;
        state.metricsError = null;
      })
      .addCase(fetchWebsitesWithMetrics.rejected, (state, action) => {
        state.websitesLoading = false;
        state.metricsLoading = false;
        state.websitesError = action.payload as string;
        state.metricsError = action.payload as string;
      });

    // Delete website
    builder
      .addCase(deleteWebsite.fulfilled, (state, action) => {
        // Website deletion confirmed successfully
        // All state updates were already done in the optimistic update
        // Just ensure timestamps are current (redundant but safe)
        const timestamp = Date.now().toString();
        localStorage.setItem('dashboard_last_fetch', timestamp);
        localStorage.setItem('websites_last_fetch', timestamp);
      })
      .addCase(deleteWebsite.rejected, () => {
        // Optimistic update reverted in thunk
      });

    // Fetch crawl status
    builder
      .addCase(fetchCrawlStatus.pending, (state, action) => {
        const websiteId = action.meta.arg;
        state.crawlStatusesLoading[websiteId] = true;
        delete state.crawlStatusesError[websiteId];
      })
      .addCase(fetchCrawlStatus.fulfilled, (state, action) => {
        const { websiteId, status } = action.payload;
        state.crawlStatusesLoading[websiteId] = false;
        state.crawlStatuses[websiteId] = status;
        delete state.crawlStatusesError[websiteId];
      })
      .addCase(fetchCrawlStatus.rejected, (state, action) => {
        const { websiteId, error } = action.payload as { websiteId: string; error: string };
        state.crawlStatusesLoading[websiteId] = false;
        state.crawlStatusesError[websiteId] = error;
      });

    // Trigger crawl
    builder
      .addCase(triggerCrawl.pending, (state, action) => {
        const websiteId = action.meta.arg.websiteId;
        state.crawlTriggerLoading[websiteId] = true;
      })
      .addCase(triggerCrawl.fulfilled, (state, action) => {
        const { websiteId } = action.payload;
        state.crawlTriggerLoading[websiteId] = false;
        // Update crawl status to show crawl has started
        if (state.crawlStatuses[websiteId]) {
          state.crawlStatuses[websiteId].crawl_active = true;
          state.crawlStatuses[websiteId].status = 'running';
        }
      })
      .addCase(triggerCrawl.rejected, (state, action) => {
        const websiteId = action.meta.arg.websiteId;
        state.crawlTriggerLoading[websiteId] = false;
      });

    // Create website - add directly to state without full refresh
    builder
      .addCase(createWebsite.fulfilled, (state, action) => {
        const { website } = action.payload;
        if (website) {
          // Add new website to the beginning of the list
          state.websites.unshift(website);

          // Update all relevant metrics
          if (state.metrics) {
            state.metrics.total_websites += 1;

            // Update active/inactive counts based on website status
            if (website.status === 'active') {
              state.metrics.active_websites += 1;
            } else if (website.status === 'inactive') {
              state.metrics.inactive_websites += 1;
            }

            // Check if website was created this month
            const now = new Date();
            const createdDate = new Date(website.created_at);
            if (createdDate.getMonth() === now.getMonth() &&
                createdDate.getFullYear() === now.getFullYear()) {
              state.metrics.websites_created_this_month += 1;
            }
          }

          // Update overview if it exists
          if (state.overview) {
            state.overview.total_websites = state.websites.length;

            // Update website counts in overview
            const activeCount = state.websites.filter(w => w.status === 'active').length;
            const inactiveCount = state.websites.filter(w => w.status === 'inactive').length;

            // Update overview counts
            state.overview.total_websites = state.websites.length;
            state.overview.active_websites = activeCount;
          }

          // Update timestamps to prevent unnecessary reloads
          const timestamp = Date.now().toString();
          localStorage.setItem('dashboard_last_fetch', timestamp);
          localStorage.setItem('websites_last_fetch', timestamp);
        }
      });
  }
});

export const {
  setSelectedWebsite,
  setChatStatsPeriod,
  setRefreshInterval,
  removeWebsiteOptimistic,
  revertWebsiteDelete,
  clearWebsitesError,
  clearOverviewError,
  clearChatStatsError,
  clearCrawlStatusError,
  updateWebsiteStatus,
  updateCrawlStatus
} = dashboardSlice.actions;

// Import RootState from store
import type { RootState } from './index';

// Selectors
export const selectWebsites = (state: RootState) => state.dashboard.websites;
export const selectWebsitesLoading = (state: RootState) => state.dashboard.websitesLoading;
export const selectWebsitesError = (state: RootState) => state.dashboard.websitesError;

export const selectDashboardOverview = (state: RootState) => state.dashboard.overview;
export const selectOverviewLoading = (state: RootState) => state.dashboard.overviewLoading;
export const selectOverviewError = (state: RootState) => state.dashboard.overviewError;

export const selectDashboardMetrics = (state: RootState) => state.dashboard.metrics;
export const selectMetricsLoading = (state: RootState) => state.dashboard.metricsLoading;
export const selectMetricsError = (state: RootState) => state.dashboard.metricsError;

export const selectPagination = (state: RootState) => state.dashboard.pagination;

export const selectChatStats = (state: RootState) => state.dashboard.chatStats;
export const selectChatStatsLoading = (state: RootState) => state.dashboard.chatStatsLoading;
export const selectChatStatsError = (state: RootState) => state.dashboard.chatStatsError;
export const selectChatStatsPeriod = (state: RootState) => state.dashboard.chatStatsPeriod;

export const selectCrawlStatus = (websiteId: string) => (state: RootState) =>
  state.dashboard?.crawlStatuses?.[websiteId] || null;
export const selectCrawlStatusLoading = (websiteId: string) => (state: RootState) =>
  state.dashboard?.crawlStatusesLoading?.[websiteId] || false;
export const selectCrawlTriggerLoading = (websiteId: string) => (state: RootState) =>
  state.dashboard?.crawlTriggerLoading?.[websiteId] || false;

export const selectSelectedWebsite = (state: RootState) => {
  const selectedId = state.dashboard.selectedWebsiteId;
  return selectedId ? state.dashboard.websites.find(w => w.id === selectedId) : null;
};

// Check if data needs refresh (based on age)
export const selectShouldRefreshWebsites = (state: RootState) => {
  if (!state.dashboard.websitesLastFetch) return true;
  const age = Date.now() - state.dashboard.websitesLastFetch;
  return age > 300000; // 5 minutes
};

export const selectShouldRefreshOverview = (state: RootState) => {
  if (!state.dashboard.overviewLastFetch) return true;
  const age = Date.now() - state.dashboard.overviewLastFetch;
  return age > 60000; // 1 minute
};

export default dashboardSlice.reducer;