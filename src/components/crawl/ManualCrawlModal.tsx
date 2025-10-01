import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  AlertTriangle,
  Globe,
  Loader2,
  Settings,
  Info
} from 'lucide-react';
import { useCrawl } from '../../hooks/useCrawl';

interface ManualCrawlModalProps {
  isOpen: boolean;
  onClose: () => void;
  website: {
    id: string;
    name: string;
    domain: string;
    url: string;
    status?: string;
  };
  onCrawlStarted?: (taskId: string) => void;
}

const ManualCrawlModal: React.FC<ManualCrawlModalProps> = ({
  isOpen,
  onClose,
  website,
  onCrawlStarted,
}) => {
  const { triggerCrawl, isLoading } = useCrawl();
  const navigate = useNavigate();
  const location = useLocation();
  const [maxPages, setMaxPages] = useState(100);
  const [maxDepth, setMaxDepth] = useState(3);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Redirect to parent page on F5 refresh if modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = () => {
      sessionStorage.setItem('modal_was_open', 'manual_crawl');
      sessionStorage.setItem('modal_parent_path', location.pathname);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Check if we just refreshed from a modal
    const wasModalOpen = sessionStorage.getItem('modal_was_open');
    const parentPath = sessionStorage.getItem('modal_parent_path');
    if (wasModalOpen === 'manual_crawl' && parentPath) {
      sessionStorage.removeItem('modal_was_open');
      sessionStorage.removeItem('modal_parent_path');
      navigate(parentPath);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, navigate, location.pathname]);

  const handleCrawl = async () => {
    // Prevent crawling inactive websites
    if (website.status === 'inactive') {
      return;
    }

    const result = await triggerCrawl(website.id, { maxPages, maxDepth });

    if (result.success && result.taskId) {
      onCrawlStarted?.(result.taskId);
      onClose();
    }
    // Error handling is managed by the hook
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Globe className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Manual Crawl
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {website.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning or Inactive Status */}
          {website.status === 'inactive' ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-red-800 dark:text-red-200 font-medium mb-1">
                    Website is inactive
                  </p>
                  <p className="text-red-700 dark:text-red-300">
                    This website is currently inactive and cannot be crawled. Please activate the website from the dashboard before attempting to crawl.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                    Before starting the crawl:
                  </p>
                  <ul className="text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                    <li>This will crawl your website content for the chatbot</li>
                    <li>Existing content will be updated with new information</li>
                    <li>The process may take several minutes depending on site size</li>
                    <li>Your chatbot responses will improve with updated content</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Website Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Website Details
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <div><span className="font-medium">Name:</span> {website.name}</div>
              <div><span className="font-medium">Domain:</span> {website.domain}</div>
              <div><span className="font-medium">URL:</span> {website.url}</div>
            </div>
          </div>

          {/* Advanced Options - Only show if website is active */}
          {website.status !== 'inactive' && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
              >
                <Settings className="w-4 h-4" />
                <span>Advanced Options</span>
              </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <label htmlFor="maxPages" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Pages
                  </label>
                  <input
                    type="number"
                    id="maxPages"
                    min="1"
                    max="1000"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value) || 100)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Limit the number of pages to crawl (1-1000)
                  </p>
                </div>

                <div>
                  <label htmlFor="maxDepth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Depth
                  </label>
                  <input
                    type="number"
                    id="maxDepth"
                    min="1"
                    max="10"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value) || 3)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How deep to follow links from the starting page (1-10)
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-1">Estimated Duration:</p>
                      <p>Approximately {Math.max(1, Math.floor(maxPages / 20))} minutes for {maxPages} pages</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCrawl}
              disabled={isLoading || website.status === 'inactive'}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              title={website.status === 'inactive' ? 'Cannot crawl inactive website' : ''}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {website.status === 'inactive' ? 'Website Inactive' :
                 isLoading ? 'Starting Crawl...' :
                 'Start Crawl'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualCrawlModal;