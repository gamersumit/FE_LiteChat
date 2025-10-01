import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Globe,
  ExternalLink,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Settings
} from 'lucide-react';
// Removed useAuth context import - now using Redux auth
import ResponsiveLayout from '../components/common/ResponsiveLayout';
import { useResponsive } from '../hooks/useResponsive';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import ManualCrawlModal from '../components/crawl/ManualCrawlModal';
// Removed CrawlStatusBadge - now using unified StatusBadge
import CrawlHistoryModal from '../components/crawl/CrawlHistoryModal';
import { useCrawl } from '../hooks/useCrawl';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchWebsitesWithMetrics,
  deleteWebsite,
  triggerCrawl,
  selectWebsites,
  selectWebsitesLoading,
  selectWebsitesError,
  selectPagination,
  selectCrawlStatus,
  selectCrawlStatusLoading,
  selectCrawlTriggerLoading,
  selectShouldRefreshWebsites
} from '../store/dashboardSlice';
import { showSuccessToast, showErrorToast } from '../store/notificationSlice';
import type { Website as ApiWebsite } from '../services/centralizedApi';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { WebsiteCardSkeleton } from '../components/ui/SkeletonLoader';

interface Website extends ApiWebsite {
  createdAt?: string;
  lastCrawled?: string;
  totalPages?: number;
  monthlyChats?: number;
  responseRate?: number;
  crawlStatus?: 'idle' | 'active' | 'success' | 'failed';
  crawlLastSuccess?: string;
  crawlPagesProcessed?: number;
}

const Websites: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const { getWebsiteStatus } = useCrawl();

  // Enable automatic token refresh to prevent login redirects
  useTokenRefresh();

  // Redux state
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  const isRefreshing = useAppSelector(state => state.auth.isRefreshing);
  const websites = useAppSelector(selectWebsites);
  const websitesLoading = useAppSelector(selectWebsitesLoading);
  const websitesError = useAppSelector(selectWebsitesError);
  const pagination = useAppSelector(selectPagination);
  const shouldRefreshWebsites = useAppSelector(selectShouldRefreshWebsites);

  // Local UI state only
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Website['status']>('all');
  const [crawlModalOpen, setCrawlModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const isLoading = websitesLoading;

  useEffect(() => {
    // Don't redirect if we're in the middle of a token refresh
    if (!isAuthenticated && !isRefreshing) {
      navigate('/login');
      return;
    }
    // Only load data if we don't have any data or if it's stale (more than 5 minutes old)
    if (isAuthenticated) {
      const hasData = websites.length > 0;
      // Use unified freshness tracking - check both keys and use the most recent
      const dashboardLastFetch = localStorage.getItem('dashboard_last_fetch');
      const websitesLastFetch = localStorage.getItem('websites_last_fetch');
      const lastFetch = Math.max(
        dashboardLastFetch ? parseInt(dashboardLastFetch) : 0,
        websitesLastFetch ? parseInt(websitesLastFetch) : 0
      );
      const isStale = lastFetch === 0 || (Date.now() - lastFetch) > 300000; // 5 minutes

      // Debug logging
      console.log('Websites useEffect:', {
        websites: websites.length,
        hasData,
        lastFetch,
        isStale,
        willLoad: !hasData || isStale
      });

      if (!hasData || isStale) {
        loadWebsites();
        const timestamp = Date.now().toString();
        localStorage.setItem('dashboard_last_fetch', timestamp);
        localStorage.setItem('websites_last_fetch', timestamp);
      }
    }
  }, [isAuthenticated, isRefreshing, navigate]);

  const loadWebsites = async (page: number = 1, limit: number = 1000) => {
    try {
      // Use new consolidated API to get websites with metrics
      await dispatch(fetchWebsitesWithMetrics({ page, limit })).unwrap();
    } catch (error) {
      console.error('Failed to load websites:', error);
      dispatch(showErrorToast('Failed to load websites', 'Please refresh the page or try again later'));
    }
  };

  const handleManualCrawl = (website: Website) => {
    setSelectedWebsite(website);
    setCrawlModalOpen(true);
  };

  const handleViewHistory = (website: Website) => {
    setSelectedWebsite(website);
    setHistoryModalOpen(true);
  };

  const handleCrawlStarted = async (taskId: string) => {
    if (selectedWebsite) {
      // Use Redux action to trigger crawl and update crawl status
      try {
        await dispatch(triggerCrawl({ websiteId: selectedWebsite.id, maxPages: 10 })).unwrap();
        dispatch(showSuccessToast(`Crawl started for "${selectedWebsite.name}"`));
      } catch (error) {
        console.error('Failed to start crawl:', error);
        dispatch(showErrorToast('Failed to start crawl', 'Please try again later'));
      }
    }
  };

  // Get all crawl statuses and trigger loading states for checking website crawling state
  const allCrawlStatuses = useAppSelector(state =>
    websites.reduce((acc, website) => {
      acc[website.id] = selectCrawlStatus(website.id)(state);
      return acc;
    }, {} as Record<string, any>)
  );

  const allCrawlTriggerLoading = useAppSelector(state =>
    websites.reduce((acc, website) => {
      acc[website.id] = selectCrawlTriggerLoading(website.id)(state);
      return acc;
    }, {} as Record<string, boolean>)
  );

  const isWebsiteCrawling = (websiteId: string) => {
    const crawlStatus = allCrawlStatuses[websiteId];
    return crawlStatus?.crawl_active || crawlStatus?.status === 'running';
  };

  // Status mapping for StatusBadge component
  const mapWebsiteStatusToBadgeStatus = (status: Website['status']) => {
    switch (status) {
      case 'active':
        return 'active' as const;
      case 'pending':
        return 'pending' as const;
      case 'error':
        return 'error' as const;
      case 'inactive':
        return 'inactive' as const;
      default:
        return 'inactive' as const;
    }
  };

  const handleDeleteWebsite = async (websiteId: string, websiteName: string) => {
    if (confirm(`Are you sure you want to delete "${websiteName}"? This action cannot be undone.`)) {
      try {
        // Use Redux action with optimistic updates (eliminates redundant API call)
        await dispatch(deleteWebsite(websiteId)).unwrap();
        dispatch(showSuccessToast(`Website "${websiteName}" deleted successfully`));
      } catch (error) {
        console.error('Failed to delete website:', error);
        dispatch(showErrorToast('Failed to delete website', 'Please try again later'));
      }
    }
  };

  const filteredWebsites = websites.filter(website => {
    const matchesSearch = website.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         website.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || website.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <ResponsiveLayout showNavigation={true} title="LiteChat">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 space-y-4 sm:space-y-0">
              <div>
                <h1 className={`font-bold text-gray-900 dark:text-gray-100 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                  Websites
                </h1>
                <p className="text-gray-600 dark:text-gray-300">Manage your website integrations</p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Filters Skeleton */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="h-10 bg-gray-300 dark:bg-gray-600 animate-pulse rounded-lg"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-10 w-32 bg-gray-300 dark:bg-gray-600 animate-pulse rounded-lg"></div>
            </div>
          </div>

          {/* Websites Grid Skeleton */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {Array.from({ length: 6 }, (_, index) => (
              <WebsiteCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout showNavigation={true} title="LiteChat">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className={`font-bold text-gray-900 dark:text-gray-100 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                Websites
              </h1>
              <p className="text-gray-600 dark:text-gray-300">Manage your website integrations</p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                to="/register-website"
                className={`flex items-center space-x-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 ${
                  isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>{isMobile ? 'Add' : 'Add Website'}</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search websites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="text-gray-400 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Setting up</option>
              <option value="error">Error</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Websites Grid */}
        {filteredWebsites.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
              {websites.length === 0 ? 'No websites yet' : 'No websites match your search'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {websites.length === 0 
                ? 'Get started by adding your first website.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
            {websites.length === 0 && (
              <Link
                to="/register-website"
                className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Website</span>
              </Link>
            )}
          </div>
        ) : (
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {filteredWebsites.map(website => {
              const isCrawlLoading = allCrawlTriggerLoading[website.id];
              const isCrawling = isWebsiteCrawling(website.id);

              const websiteActions = [
                {
                  label: isCrawlLoading ? 'Starting...' : isCrawling ? 'Crawling...' : 'Crawl',
                  onClick: () => handleManualCrawl(website),
                  variant: 'primary' as const,
                  icon: RefreshCw,
                  disabled: isCrawlLoading || isCrawling,
                  loading: isCrawlLoading
                },
                {
                  label: 'History',
                  onClick: () => handleViewHistory(website),
                  variant: 'secondary' as const,
                  icon: Clock
                },
                {
                  label: 'Settings',
                  onClick: () => navigate(`/websites/${website.id}/settings`),
                  variant: 'secondary' as const,
                  icon: Settings
                },
                {
                  label: 'Delete',
                  onClick: () => handleDeleteWebsite(website.id, website.name),
                  variant: 'danger' as const,
                  icon: Trash2
                }
              ];

              return (
                <Card
                  key={website.id}
                  variant="compact"
                  status={mapWebsiteStatusToBadgeStatus(website.status)}
                  actions={websiteActions}
                  className="hover:shadow-md transition-shadow"
                >
                  {/* Website Name & Domain - Prominent Display */}
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {website.name}
                    </h3>
                    <a
                      href={website.url || `https://${website.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {website.domain}
                    </a>
                  </div>

                  {/* Website Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {(website as any).totalPages || 0}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Pages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {(website as any).monthlyChats || 0}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Chats</div>
                    </div>
                  </div>

                  {/* Last Crawled */}
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                    Last crawled: {(website as any).lastCrawled ? new Date((website as any).lastCrawled).toLocaleDateString() : 'Never'}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Crawl Modal */}
      {selectedWebsite && (
        <ManualCrawlModal
          isOpen={crawlModalOpen}
          onClose={() => {
            setCrawlModalOpen(false);
            setSelectedWebsite(null);
          }}
          website={selectedWebsite}
          onCrawlStarted={handleCrawlStarted}
        />
      )}

      {/* Crawl History Modal */}
      {selectedWebsite && (
        <CrawlHistoryModal
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false);
            setSelectedWebsite(null);
          }}
          website={selectedWebsite}
        />
      )}
    </ResponsiveLayout>
  );
};

export default Websites;