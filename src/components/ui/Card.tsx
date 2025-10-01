import React from 'react';
import { type LucideIcon } from 'lucide-react';

export interface CardAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
}

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  status?: 'active' | 'inactive' | 'pending' | 'error' | 'success' | 'warning';
  actions?: CardAction[];
  loading?: boolean;
  error?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed' | 'stat';
  icon?: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
}

/**
 * Unified Card component that standardizes all card designs across the application
 * Supports different variants, status indicators, actions, and loading states
 */
export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  status,
  actions,
  loading = false,
  error,
  className = '',
  variant = 'default',
  icon: Icon,
  iconColor = 'text-gray-600',
  onClick
}) => {
  const getStatusColors = () => {
    switch (status) {
      case 'active':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800';
      case 'inactive':
        return 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700';
      case 'pending':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'error':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
      case 'success':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800';
      default:
        return 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return 'p-4 rounded-lg shadow-sm border';
      case 'detailed':
        return 'p-6 rounded-lg shadow-lg border';
      case 'stat':
        return 'p-6 rounded-lg shadow-sm border text-center';
      default:
        return 'p-6 rounded-lg shadow-sm border';
    }
  };

  const getActionVariantStyles = (actionVariant: CardAction['variant'], disabled: boolean = false) => {
    if (disabled) {
      return 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400';
    }

    switch (actionVariant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'secondary':
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300';
    }
  };

  const baseClasses = `${getVariantStyles()} ${getStatusColors()} ${className}`;
  const clickableClasses = onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : '';

  if (loading) {
    return (
      <div className={`${baseClasses} animate-pulse`}>
        <div className="flex items-center space-x-4">
          {Icon && <div className="w-8 h-8 bg-gray-300 rounded"></div>}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${clickableClasses}`} onClick={onClick}>
      {/* Header */}
      {(title || Icon || actions) && (
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {Icon && (
              <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${iconColor} flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex flex-wrap gap-1 sm:gap-2 max-w-fit">
              {actions.map((action, index) => {
                const ActionIcon = action.icon;
                const isDisabled = action.disabled || action.loading;
                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDisabled) {
                        action.onClick();
                      }
                    }}
                    disabled={isDisabled}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center space-x-1 flex-shrink-0 ${getActionVariantStyles(action.variant, isDisabled)}`}
                    title={action.label}
                  >
                    {action.loading ? (
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      ActionIcon && <ActionIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                    <span className="hidden sm:inline">{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="text-gray-700 dark:text-gray-300">
        {children}
      </div>

      {/* Status Indicator */}
      {status && variant !== 'stat' && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <StatusIndicator status={status} />
        </div>
      )}
    </div>
  );
};

/**
 * Status indicator component for consistent status display
 */
const StatusIndicator: React.FC<{ status: CardProps['status'] }> = ({ status }) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'active':
        return { text: 'Active', color: 'text-green-600 dark:text-green-400' };
      case 'inactive':
        return { text: 'Inactive', color: 'text-gray-600 dark:text-gray-400' };
      case 'pending':
        return { text: 'Pending', color: 'text-yellow-600 dark:text-yellow-400' };
      case 'error':
        return { text: 'Error', color: 'text-red-600 dark:text-red-400' };
      case 'success':
        return { text: 'Success', color: 'text-green-600 dark:text-green-400' };
      case 'warning':
        return { text: 'Warning', color: 'text-yellow-600 dark:text-yellow-400' };
      default:
        return { text: '', color: '' };
    }
  };

  const { text, color } = getStatusDisplay();

  if (!text) return null;

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
      <span className={`text-sm font-medium ${color}`}>{text}</span>
    </div>
  );
};

export default Card;