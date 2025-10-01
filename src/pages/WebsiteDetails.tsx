import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Globe,
  MessageSquare,
  BarChart3,
  Activity,
  ExternalLink,
  Code,
  RefreshCw,
  Clock,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import ResponsiveLayout from '../components/common/ResponsiveLayout';
import { useResponsive } from '../hooks/useResponsive';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import ManualCrawlModal from '../components/crawl/ManualCrawlModal';
import CrawlHistoryModal from '../components/crawl/CrawlHistoryModal';
import { useCrawl } from '../hooks/useCrawl';
import { useAppDispatch, useAppSelector } from '../store';
import {
  deleteWebsite,
  triggerCrawl,
  selectWebsites,
  selectWebsitesLoading,
  selectCrawlStatus,
  selectCrawlTriggerLoading,
  fetchWebsitesWithMetrics
} from '../store/dashboardSlice';
import { showSuccessToast, showErrorToast } from '../store/notificationSlice';
import type { Website as ApiWebsite } from '../services/centralizedApi';
import { StatusBadge, StatCard, Card } from '../components/ui';

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

const WebsiteDetails: React.FC = () => {
  const { websiteId } = useParams<{ websiteId: string }>();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { getWebsiteStatus } = useCrawl();

  // Enable automatic token refresh
  useTokenRefresh();

  // Redux state
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  const isRefreshing = useAppSelector(state => state.auth.isRefreshing);
  const websites = useAppSelector(selectWebsites);
  const websitesLoading = useAppSelector(selectWebsitesLoading);

  // Local state
  const [crawlModalOpen, setCrawlModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Find the specific website
  const website = websites.find(w => w.id === websiteId);

  // Crawl status
  const crawlStatus = useAppSelector(state => selectCrawlStatus(websiteId || '')(state));
  const crawlTriggerLoading = useAppSelector(state => selectCrawlTriggerLoading(websiteId || '')(state));
  const isCrawling = crawlStatus?.crawl_active || crawlStatus?.status === 'running';

  useEffect(() => {
    if (!isAuthenticated && !isRefreshing) {
      navigate('/login');
      return;
    }

    // Always fetch websites on mount/F5 refresh to ensure fresh data
    // Only run once when component mounts
    if (isAuthenticated) {
      dispatch(fetchWebsitesWithMetrics({ page: 1, limit: 1000 }));
    }
  }, [isAuthenticated, isRefreshing, dispatch, navigate]);

  useEffect(() => {
    // Only redirect if we've finished loading and still no website found
    if (!website && !websitesLoading && websites.length > 0) {
      // Website not found, redirect to dashboard
      navigate('/dashboard');
    }
  }, [website, websitesLoading, websites.length, navigate]);

  const handleManualCrawl = () => {
    setCrawlModalOpen(true);
  };

  const handleViewHistory = () => {
    setHistoryModalOpen(true);
  };

  const handleCrawlStarted = async (taskId: string) => {
    if (website) {
      try {
        await dispatch(triggerCrawl({ websiteId: website.id, maxPages: 10 })).unwrap();
        dispatch(showSuccessToast(`Crawl started for "${website.name}"`));
      } catch (error) {
        console.error('Failed to start crawl:', error);
        dispatch(showErrorToast('Failed to start crawl', 'Please try again later'));
      }
    }
  };

  const handleDeleteWebsite = async () => {
    if (!website) return;

    if (confirm(`Are you sure you want to delete "${website.name}"? This action cannot be undone.`)) {
      try {
        await dispatch(deleteWebsite(website.id)).unwrap();
        dispatch(showSuccessToast(`Website "${website.name}" deleted successfully`));
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to delete website:', error);
        dispatch(showErrorToast('Failed to delete website', 'Please try again later'));
      }
    }
  };

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

  if (websitesLoading || !website) {
    return (
      <ResponsiveLayout showNavigation={true} title="LiteChat">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-24 bg-gray-300 rounded"></div>
              ))}
            </div>
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </button>
            </div>
          </div>
          <div className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className={`font-bold text-gray-900 dark:text-gray-100 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                      {website.name}
                    </h1>
                    <StatusBadge
                      status={mapWebsiteStatusToBadgeStatus(website.status)}
                      size="md"
                    />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{website.domain}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.open(website.url || `https://${website.domain}`, '_blank')}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Visit Site</span>
                </button>
                <button
                  onClick={() => navigate(`/script-generator?websiteId=${website.id}`)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Code className="w-4 h-4" />
                  <span className="hidden sm:inline">Script</span>
                </button>
                <button
                  onClick={handleDeleteWebsite}
                  className="flex items-center space-x-2 px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Pages"
            value={(website as any).totalPages || 0}
            icon={Globe}
            iconColor="text-indigo-600"
          />
          <StatCard
            title="Monthly Chats"
            value={(website as any).monthlyChats || 0}
            icon={MessageSquare}
            iconColor="text-blue-600"
          />
          <StatCard
            title="Website Status"
            value={website.status === 'active' ? 'Active' : 'Inactive'}
            icon={CheckCircle}
            iconColor={website.status === 'active' ? "text-green-600" : "text-red-600"}
          />
          <StatCard
            title="Crawl Status"
            value={isCrawling ? 'Running' : 'Idle'}
            icon={Activity}
            iconColor={isCrawling ? "text-yellow-600" : "text-gray-600"}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Crawl Management */}
          <div className="lg:col-span-2">
            <Card>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Crawl Management</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Last Crawled</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(website as any).lastCrawled ? new Date((website as any).lastCrawled).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleManualCrawl}
                      disabled={crawlTriggerLoading || isCrawling || website.status === 'inactive'}
                      className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={website.status === 'inactive' ? 'Cannot crawl inactive website' : ''}
                    >
                      <RefreshCw className={`w-4 h-4 ${(crawlTriggerLoading || isCrawling) ? 'animate-spin' : ''}`} />
                      <span>
                        {crawlTriggerLoading ? 'Starting...' :
                         isCrawling ? 'Crawling...' :
                         website.status === 'inactive' ? 'Website Inactive' :
                         'Start Crawl'}
                      </span>
                    </button>
                    <button
                      onClick={handleViewHistory}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Clock className="w-4 h-4" />
                      <span>History</span>
                    </button>
                  </div>
                </div>

                {crawlStatus && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Current Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                        <span className="text-gray-900 dark:text-gray-100">{crawlStatus.status || 'Idle'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Pages Processed:</span>
                        <span className="text-gray-900 dark:text-gray-100">{crawlStatus.pages_crawled || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {crawlStatus.last_crawled ? new Date(crawlStatus.last_crawled).toLocaleString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Quick Actions</h2>
              </div>
              <div className="p-6 space-y-3">
                <Link
                  to={`/script-generator?websiteId=${website.id}`}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Code className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium">Get Install Script</span>
                </Link>
                <button
                  onClick={() => window.open(website.url || `https://${website.domain}`, '_blank')}
                  className="w-full flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ExternalLink className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium">Visit Website</span>
                </button>
                <button
                  onClick={handleViewHistory}
                  className="w-full flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium">View Crawl History</span>
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Manual Crawl Modal */}
      {website && (
        <ManualCrawlModal
          isOpen={crawlModalOpen}
          onClose={() => setCrawlModalOpen(false)}
          website={website}
          onCrawlStarted={handleCrawlStarted}
        />
      )}

      {/* Crawl History Modal */}
      {website && (
        <CrawlHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          website={website}
        />
      )}
    </ResponsiveLayout>
  );
};

export default WebsiteDetails;