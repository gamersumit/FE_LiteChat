/**
 * Test page for Crawling Jobs with real-time progress tracking.
 * Demonstrates the streaming crawl architecture UI.
 */
import React from 'react';
import { Activity } from 'lucide-react';
import CrawlingHistory from '../components/crawl/CrawlingHistory';

const CrawlingJobsTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Activity className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Crawling Jobs Monitor
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time monitoring of web crawling jobs with streaming progress updates
          </p>
        </div>

        {/* Active Jobs Section */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <CrawlingHistory activeOnly={true} limit={5} />
          </div>
        </div>

        {/* All Jobs History */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <CrawlingHistory activeOnly={false} limit={20} />
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
            Real-time Progress Features
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Progress updates every 2 seconds for active jobs</li>
            <li>• Live progress bar showing completion percentage</li>
            <li>• Current page URL display during crawling</li>
            <li>• Page counts: completed, failed, queued, processing</li>
            <li>• Cancel button for running jobs</li>
            <li>• Status badges with color coding</li>
            <li>• Auto-refresh when jobs complete</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CrawlingJobsTest;
