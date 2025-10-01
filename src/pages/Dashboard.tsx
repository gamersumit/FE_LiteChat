import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Globe,
  MessageSquare,
  BarChart3,
  Activity,
  ExternalLink,
  CheckCircle,
  Code,
  Search,
  Filter,
  User,
  Mail,
  LogOut,
  ChevronUp
} from 'lucide-react';
import { useResponsive } from '../hooks/useResponsive';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import { useAppDispatch, useAppSelector } from '../store';
import { logoutUser } from '../store/authSlice';
import {
  fetchWebsitesWithMetrics,
  fetchChatStats,
  selectWebsites,
  selectWebsitesLoading,
  selectDashboardMetrics,
  selectMetricsLoading,
  selectChatStats,
  selectChatStatsLoading
} from '../store/dashboardSlice';
import { showSuccessToast, showErrorToast } from '../store/notificationSlice';
import { config } from '../config/env';

import type { Website as ApiWebsite } from '../services/centralizedApi';
import { StatusBadge, StatCard, Card } from '../components/ui';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';
import WebsiteRegistrationWizard from '../components/website/WebsiteRegistrationWizard';

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


const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  const isRefreshing = useAppSelector(state => state.auth.isRefreshing);
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  // Enable automatic token refresh to prevent login redirects
  useTokenRefresh();

  // Redux state
  const dispatch = useAppDispatch();
  const websites = useAppSelector(selectWebsites);
  const websitesLoading = useAppSelector(selectWebsitesLoading);
  const metrics = useAppSelector(selectDashboardMetrics);
  const metricsLoading = useAppSelector(selectMetricsLoading);
  const chatStats = useAppSelector(selectChatStats);
  const chatStatsLoading = useAppSelector(selectChatStatsLoading);

  // Local UI state only
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Website['status']>('all');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const isLoading = false; // websitesLoading || metricsLoading || chatStatsLoading;

  // Debug loading states
  console.log('Loading states:', {
    websitesLoading,
    metricsLoading,
    chatStatsLoading,
    websites: websites.length,
    metrics,
    chatStats
  });

  useEffect(() => {
    console.log('Dashboard useEffect triggered:', { isAuthenticated, isRefreshing });

    // Don't redirect if we're in the middle of a token refresh
    if (!isAuthenticated && !isRefreshing) {
      navigate('/login');
      return;
    }

    // Always load data when component mounts (includes F5 refresh)
    if (isAuthenticated) {
      console.log('Dashboard: Loading fresh data on component mount (F5 refresh or navigation)');
      loadDashboardData();
      const timestamp = Date.now().toString();
      localStorage.setItem('dashboard_last_fetch', timestamp);
      localStorage.setItem('websites_last_fetch', timestamp);
    }
  }, [isAuthenticated, isRefreshing, navigate]);

  // Handle page visibility and focus events for fresh data
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        // Page became visible, refresh data if it's been more than 1 minute
        const lastFetch = localStorage.getItem('dashboard_last_fetch');
        const isStale = !lastFetch || (Date.now() - parseInt(lastFetch)) > 60000; // 1 minute
        if (isStale) {
          loadDashboardData();
          const timestamp = Date.now().toString();
          localStorage.setItem('dashboard_last_fetch', timestamp);
          localStorage.setItem('websites_last_fetch', timestamp);
        }
      }
    };

    const handleFocus = () => {
      if (isAuthenticated) {
        // Window regained focus, check for stale data
        const lastFetch = localStorage.getItem('dashboard_last_fetch');
        const isStale = !lastFetch || (Date.now() - parseInt(lastFetch)) > 60000; // 1 minute
        if (isStale) {
          loadDashboardData();
          const timestamp = Date.now().toString();
          localStorage.setItem('dashboard_last_fetch', timestamp);
          localStorage.setItem('websites_last_fetch', timestamp);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      console.log('Dashboard: Fetching all APIs...');

      // Fetch all dashboard data in parallel
      const promises = [
        dispatch(fetchWebsitesWithMetrics({ page: 1, limit: 1000 })),
        dispatch(fetchChatStats('30d'))
      ];

      await Promise.all(promises);
      console.log('Dashboard: All APIs loaded successfully');

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      dispatch(showErrorToast('Failed to load dashboard data', 'Please refresh the page or try again later'));
    }
  };


  // Filter websites based on search and status
  const filteredWebsites = websites.filter(website => {
    const matchesSearch = website.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         website.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || website.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

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


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Sidebar with Navigation */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex-shrink-0 flex flex-col h-full">
        <div className="p-6">
          <Link to="/dashboard" className="text-xl font-bold text-indigo-600">LiteChat</Link>
        </div>
        <nav className="flex-1">
          <div className="px-4 space-y-2">
            <Link to="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium bg-indigo-900 text-indigo-300 rounded-md">
              Dashboard
            </Link>
            <Link to="/script-generator" className="flex items-center px-3 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md">
              Script
            </Link>
            <Link to="/session-management" className="flex items-center px-3 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md">
              Sessions
            </Link>
          </div>
        </nav>
        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-700">
          <div className="bg-gray-700/50 rounded-lg p-3 mb-3">
            {/* User Avatar and Info */}
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || 'User'}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-400 truncate">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={() => dispatch(logoutUser())}
              className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 group"
            >
              <LogOut className="w-4 h-4 group-hover:text-red-300 transition-colors" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Fixed Header */}
        <div className="px-6 py-6 bg-gray-900">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className={`font-bold text-gray-100 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                Dashboard
              </h1>
              <p className="text-gray-400">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 mt-4 sm:mt-0">
              <button
                onClick={() => setShowRegistrationModal(true)}
                className={`flex items-center space-x-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors ${
                  isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>{isMobile ? 'Add' : 'Add Website'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Fixed Analytics Cards */}
        <div className="px-6 py-4 bg-gray-900">
          {/* Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Websites"
              value={metrics?.total_websites || 0}
              icon={Globe}
              iconColor="text-indigo-600"
            />

            <StatCard
              title="Active Websites"
              value={`${metrics?.active_websites || 0} / ${metrics?.total_websites || 0}`}
              icon={CheckCircle}
              iconColor="text-green-600"
            />

            <StatCard
              title="Total Chats"
              value={metrics?.total_conversations?.toLocaleString() || 0}
              icon={MessageSquare}
              iconColor="text-blue-600"
            />

            <StatCard
              title="Active Crawls"
              value={metrics?.active_crawls || 0}
              icon={Activity}
              iconColor="text-yellow-600"
            />
          </div>
        </div>

        {/* Fixed Search and Filters */}
        <div className="px-6 py-4 bg-gray-900">
          <div className="flex flex-col sm:flex-row gap-4">
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
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Websites Section ONLY */}
        <div className="flex-1 px-6 bg-gray-900">
          <div className="h-full overflow-y-auto py-4" style={{maxHeight: 'calc(100vh - 380px)'}}>
            {filteredWebsites.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-100 mb-2">
                {websites.length === 0 ? 'No websites yet' : 'No websites match your search'}
              </h3>
              <p className="text-gray-400 mb-6">
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
              <div className="space-y-4">
              {filteredWebsites.map(website => {
                const websiteActions = [
                  {
                    label: 'Open Site',
                    onClick: () => window.open(website.url || `https://${website.domain}`, '_blank'),
                    variant: 'secondary' as const,
                    icon: ExternalLink
                  },
                  {
                    label: 'Script',
                    onClick: () => navigate(`/script-generator?websiteId=${website.id}`),
                    variant: 'secondary' as const,
                    icon: Code
                  },
                  {
                    label: 'View',
                    onClick: () => navigate(`/website/${website.id}`),
                    variant: 'primary' as const,
                    icon: Globe
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
                    <div className="flex items-center space-x-6">
                      {/* Website Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {website.name}
                          </h3>
                          <StatusBadge
                            status={mapWebsiteStatusToBadgeStatus(website.status)}
                            size="sm"
                          />
                        </div>
                        <a
                          href={website.url || `https://${website.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {website.domain}
                        </a>
                      </div>

                      {/* Stats */}
                      <div className="flex space-x-8">
                        <div className="text-center">
                          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {(website as any).totalPages || 0}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Pages</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {(website as any).monthlyChats || 0}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Chats</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Last crawled</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            {(website as any).lastCrawled ? new Date((website as any).lastCrawled).toLocaleDateString() : 'Never'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Website Registration Modal */}
      <WebsiteRegistrationWizard
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onSuccess={() => {
          // Refresh the dashboard data after successful registration
          dispatch(fetchWebsitesWithMetrics({ page: 1, limit: config.defaults.paginationSize }));
        }}
      />
    </div>
  );
};

export default Dashboard;