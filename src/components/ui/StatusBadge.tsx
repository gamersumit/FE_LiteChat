import React from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Minus, Loader2 } from 'lucide-react';

export type StatusType = 'active' | 'inactive' | 'pending' | 'error' | 'success' | 'warning' | 'loading' | 'idle' | 'failed';

export interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'minimal';
  className?: string;
}

/**
 * Unified status badge component for consistent status display across the application
 * Supports different status types, sizes, and variants
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  size = 'md',
  variant = 'default',
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          icon: CheckCircle,
          defaultText: 'Active',
          colors: {
            default: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
            outlined: 'border-green-500 text-green-700 dark:text-green-400 dark:border-green-400',
            minimal: 'text-green-600 dark:text-green-400'
          }
        };
      case 'inactive':
        return {
          icon: Minus,
          defaultText: 'Inactive',
          colors: {
            default: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
            outlined: 'border-gray-500 text-gray-700 dark:text-gray-400 dark:border-gray-400',
            minimal: 'text-gray-600 dark:text-gray-400'
          }
        };
      case 'pending':
        return {
          icon: Clock,
          defaultText: 'Pending',
          colors: {
            default: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
            outlined: 'border-yellow-500 text-yellow-700 dark:text-yellow-400 dark:border-yellow-400',
            minimal: 'text-yellow-600 dark:text-yellow-400'
          }
        };
      case 'error':
        return {
          icon: XCircle,
          defaultText: 'Error',
          colors: {
            default: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
            outlined: 'border-red-500 text-red-700 dark:text-red-400 dark:border-red-400',
            minimal: 'text-red-600 dark:text-red-400'
          }
        };
      case 'success':
        return {
          icon: CheckCircle,
          defaultText: 'Success',
          colors: {
            default: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
            outlined: 'border-green-500 text-green-700 dark:text-green-400 dark:border-green-400',
            minimal: 'text-green-600 dark:text-green-400'
          }
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          defaultText: 'Warning',
          colors: {
            default: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
            outlined: 'border-yellow-500 text-yellow-700 dark:text-yellow-400 dark:border-yellow-400',
            minimal: 'text-yellow-600 dark:text-yellow-400'
          }
        };
      case 'loading':
        return {
          icon: Loader2,
          defaultText: 'Loading',
          colors: {
            default: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
            outlined: 'border-blue-500 text-blue-700 dark:text-blue-400 dark:border-blue-400',
            minimal: 'text-blue-600 dark:text-blue-400'
          }
        };
      case 'idle':
        return {
          icon: Minus,
          defaultText: 'Idle',
          colors: {
            default: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
            outlined: 'border-gray-500 text-gray-700 dark:text-gray-400 dark:border-gray-400',
            minimal: 'text-gray-600 dark:text-gray-400'
          }
        };
      case 'failed':
        return {
          icon: XCircle,
          defaultText: 'Failed',
          colors: {
            default: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
            outlined: 'border-red-500 text-red-700 dark:text-red-400 dark:border-red-400',
            minimal: 'text-red-600 dark:text-red-400'
          }
        };
      default:
        return {
          icon: Minus,
          defaultText: 'Unknown',
          colors: {
            default: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
            outlined: 'border-gray-500 text-gray-700 dark:text-gray-400 dark:border-gray-400',
            minimal: 'text-gray-600 dark:text-gray-400'
          }
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-sm';
      case 'md':
      default:
        return 'px-3 py-1.5 text-xs';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-5 h-5';
      case 'md':
      default:
        return 'w-4 h-4';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'outlined':
        return 'border-2 bg-transparent';
      case 'minimal':
        return 'bg-transparent border-0';
      case 'default':
      default:
        return 'border';
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const displayText = text || config.defaultText;
  const colorClasses = config.colors[variant];
  const sizeClasses = getSizeClasses();
  const iconSizeClasses = getIconSize();
  const variantClasses = getVariantClasses();

  return (
    <span
      className={`
        inline-flex items-center space-x-1.5 font-medium rounded-full
        ${sizeClasses} ${variantClasses} ${colorClasses} ${className}
      `.trim()}
    >
      <Icon
        className={`${iconSizeClasses} ${status === 'loading' ? 'animate-spin' : ''}`}
      />
      <span>{displayText}</span>
    </span>
  );
};

/**
 * Simple status dot component for minimal status indication
 */
export const StatusDot: React.FC<{
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ status, size = 'md', className = '' }) => {
  const config = getStatusConfig();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      case 'md':
      default:
        return 'w-3 h-3';
    }
  };

  function getStatusConfig() {
    switch (status) {
      case 'active':
      case 'success':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-400';
      case 'pending':
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'loading':
        return 'bg-blue-500 animate-pulse';
      case 'idle':
        return 'bg-gray-400';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  }

  return (
    <div
      className={`
        rounded-full ${getSizeClasses()} ${config} ${className}
      `.trim()}
    />
  );
};

export default StatusBadge;