import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { useCrawl } from '../../hooks/useCrawl';
import type { CrawlHistoryEntry } from '../../hooks/useCrawl';

interface CrawlHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  website: {
    id: string;
    name: string;
    domain: string;
  };
}

const CrawlHistoryModal: React.FC<CrawlHistoryModalProps> = ({
  isOpen,
  onClose,
  website,
}) => {
  const { getCrawlHistory, isLoading } = useCrawl();
  const navigate = useNavigate();
  const location = useLocation();
  const [history, setHistory] = useState<CrawlHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pageSize = 10;

  // Redirect to parent page on F5 refresh if modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = () => {
      sessionStorage.setItem('modal_was_open', 'crawl_history');
      sessionStorage.setItem('modal_parent_path', location.pathname);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Check if we just refreshed from a modal
    const wasModalOpen = sessionStorage.getItem('modal_was_open');
    const parentPath = sessionStorage.getItem('modal_parent_path');
    if (wasModalOpen === 'crawl_history' && parentPath) {
      sessionStorage.removeItem('modal_was_open');
      sessionStorage.removeItem('modal_parent_path');
      navigate(parentPath);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, navigate, location.pathname]);

  useEffect(() => {
    if (isOpen) {
      loadHistory(true);
    }
  }, [isOpen, statusFilter]);

  const loadHistory = async (reset: boolean = false) => {
    if (reset) {
      setCurrentPage(0);
      setHistory([]);
    }

    const offset = reset ? 0 : currentPage * pageSize;
    const result = await getCrawlHistory(website.id, pageSize, offset);

    if (result.success && result.data) {
      if (reset) {
        setHistory(result.data.history);
      } else {
        setHistory(prev => [...prev, ...result.data!.history]);
      }
      setTotal(result.data.total);
      setHasMore(result.data.has_more);

      if (!reset) {
        setCurrentPage(prev => prev + 1);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadHistory(true);
    setIsRefreshing(false);
  };

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
    loadHistory(false);
  };

  const toggleExpanded = (crawlId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(crawlId)) {
        newSet.delete(crawlId);
      } else {
        newSet.add(crawlId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getTriggerTypeColor = (triggerType: string) => {
    return triggerType === 'manual'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return '-';

    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end.getTime() - start.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);

      if (diffMinutes < 1) {
        return `${diffSeconds}s`;
      } else {
        const seconds = diffSeconds % 60;
        return `${diffMinutes}m ${seconds}s`;
      }
    } catch {
      return '-';
    }
  };

  const filteredHistory = history.filter(entry => {
    if (statusFilter === 'all') return true;
    return entry.status === statusFilter;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Crawl History
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {website.name} • {total} total crawls
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              title="Refresh history"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="success">Success Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && history.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Loading crawl history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No crawl history
              </h4>
              <p className="text-gray-500 dark:text-gray-400">
                {statusFilter === 'all'
                  ? 'No crawls have been performed yet for this website.'
                  : `No ${statusFilter} crawls found.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((entry) => (
                <div
                  key={entry.crawl_id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  {/* Main entry */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(entry.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                          </span>
                        </div>

                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTriggerTypeColor(entry.trigger_type)}`}>
                          {entry.trigger_type}
                        </span>

                        <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          <span className="font-medium">{entry.pages_crawled}</span> pages
                        </div>

                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {formatDateTime(entry.started_at)}
                        </div>

                        {entry.completed_at && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Duration: {formatDuration(entry.started_at, entry.completed_at)}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => toggleExpanded(entry.crawl_id)}
                        className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <span>Details</span>
                        {expandedEntries.has(entry.crawl_id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Expanded details */}
                    {expandedEntries.has(entry.crawl_id) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Crawl ID:</span>
                            <span className="ml-2 text-gray-600 dark:text-gray-400 font-mono text-xs">
                              {entry.crawl_id}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Started:</span>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                              {formatDateTime(entry.started_at)}
                            </span>
                          </div>
                          {entry.completed_at && (
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Completed:</span>
                              <span className="ml-2 text-gray-600 dark:text-gray-400">
                                {formatDateTime(entry.completed_at)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Pages Crawled:</span>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                              {entry.pages_crawled}
                            </span>
                          </div>
                        </div>

                        {entry.error_message && (
                          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                                  Error Details:
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                  {entry.error_message}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-md disabled:opacity-50"
                  >
                    {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{isLoading ? 'Loading...' : 'Load More'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrawlHistoryModal;