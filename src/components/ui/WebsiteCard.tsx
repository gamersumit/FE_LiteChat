import React from 'react';
import { Globe, ExternalLink, Edit, Trash2, BarChart3, Code } from 'lucide-react';
import { Card, type CardAction } from './Card';

export interface Website {
  id: string;
  name: string;
  domain: string;
  url: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  createdAt?: string;
  lastCrawled?: string;
  totalPages?: number;
  monthlyChats?: number;
}

export interface WebsiteCardProps {
  website: Website;
  onEdit?: (website: Website) => void;
  onDelete?: (website: Website) => void;
  onViewAnalytics?: (website: Website) => void;
  onViewScript?: (website: Website) => void;
  onVisit?: (website: Website) => void;
  loading?: boolean;
  className?: string;
}

/**
 * Specialized card component for displaying website information
 * Used in dashboard and websites page for consistent website display
 */
export const WebsiteCard: React.FC<WebsiteCardProps> = ({
  website,
  onEdit,
  onDelete,
  onViewAnalytics,
  onViewScript,
  onVisit,
  loading = false,
  className = ''
}) => {
  const actions: CardAction[] = [];

  if (onViewAnalytics) {
    actions.push({
      label: 'Analytics',
      onClick: () => onViewAnalytics(website),
      icon: BarChart3,
      variant: 'secondary'
    });
  }

  if (onViewScript) {
    actions.push({
      label: 'Script',
      onClick: () => onViewScript(website),
      icon: Code,
      variant: 'secondary'
    });
  }

  if (onEdit) {
    actions.push({
      label: 'Edit',
      onClick: () => onEdit(website),
      icon: Edit,
      variant: 'secondary'
    });
  }

  if (onDelete) {
    actions.push({
      label: 'Delete',
      onClick: () => onDelete(website),
      icon: Trash2,
      variant: 'danger'
    });
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card
      title={website.name}
      subtitle={website.domain}
      status={website.status}
      actions={actions}
      loading={loading}
      className={className}
      icon={Globe}
      iconColor="text-blue-600"
      onClick={onVisit ? () => onVisit(website) : undefined}
    >
      <div className="space-y-3">
        {/* Website URL */}
        <div className="flex items-center space-x-2">
          <ExternalLink className="w-4 h-4 text-gray-400" />
          <a
            href={website.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {website.url}
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {website.totalPages !== undefined && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Pages:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {website.totalPages}
              </span>
            </div>
          )}

          {website.monthlyChats !== undefined && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Monthly Chats:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {website.monthlyChats}
              </span>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <span>Created:</span>
            <span className="ml-2">{formatDate(website.createdAt)}</span>
          </div>

          <div>
            <span>Last Crawled:</span>
            <span className="ml-2">{formatDate(website.lastCrawled)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default WebsiteCard;