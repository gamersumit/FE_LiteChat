import React from 'react';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Pause
} from 'lucide-react';

export type CrawlStatusType = 'idle' | 'active' | 'success' | 'failed';

interface CrawlStatusBadgeProps {
  status: CrawlStatusType;
  lastCrawled?: string;
  pagesProcessed?: number;
  className?: string;
  showTooltip?: boolean;
}

const CrawlStatusBadge: React.FC<CrawlStatusBadgeProps> = ({
  status,
  lastCrawled,
  pagesProcessed = 0,
  className = '',
  showTooltip = true,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          icon: Loader2,
          text: 'Crawling',
          bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          iconProps: { className: 'w-3 h-3 animate-spin' },
        };
      case 'success':
        return {
          icon: CheckCircle,
          text: 'Success',
          bgColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          iconProps: { className: 'w-3 h-3' },
        };
      case 'failed':
        return {
          icon: AlertCircle,
          text: 'Failed',
          bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          iconProps: { className: 'w-3 h-3' },
        };
      case 'idle':
      default:
        return {
          icon: Pause,
          text: 'Idle',
          bgColor: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
          iconProps: { className: 'w-3 h-3' },
        };
    }
  };

  const { icon: Icon, text, bgColor, iconProps } = getStatusConfig();

  const formatLastCrawled = (dateString?: string) => {
    if (!dateString) return 'Never crawled';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        return `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
      }
    } catch (error) {
      return 'Invalid date';
    }
  };

  const tooltipContent = showTooltip ? (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
      <div className="font-medium">{text}</div>
      {lastCrawled && (
        <div className="text-gray-300 dark:text-gray-400">
          Last: {formatLastCrawled(lastCrawled)}
        </div>
      )}
      {pagesProcessed > 0 && (
        <div className="text-gray-300 dark:text-gray-400">
          Pages: {pagesProcessed}
        </div>
      )}
      {/* Tooltip arrow */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
    </div>
  ) : null;

  return (
    <div className={`relative inline-flex items-center group ${className}`}>
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
        <Icon {...iconProps} />
        <span className="ml-1.5">{text}</span>
      </span>
      {tooltipContent}
    </div>
  );
};

export default CrawlStatusBadge;