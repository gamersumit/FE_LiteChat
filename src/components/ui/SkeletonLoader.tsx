import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

/**
 * Basic skeleton loading component for individual elements
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circular':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-lg';
      case 'rectangular':
      default:
        return 'rounded';
    }
  };

  const getStyleProps = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = width;
    if (height) style.height = height;
    return style;
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`bg-gray-300 dark:bg-gray-600 animate-pulse ${getVariantClasses()}`}
            style={getStyleProps()}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-300 dark:bg-gray-600 animate-pulse ${getVariantClasses()} ${className}`}
      style={getStyleProps()}
    />
  );
};

/**
 * Pre-built skeleton for card layouts
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <Skeleton variant="text" lines={3} />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * Pre-built skeleton for dashboard stat cards
 */
export const StatCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center ${className}`}>
    <div className="animate-pulse space-y-4">
      <div className="flex justify-center">
        <Skeleton variant="circular" width={48} height={48} />
      </div>
      <Skeleton variant="text" width="70%" className="mx-auto" />
      <Skeleton variant="text" width="50%" height={32} className="mx-auto" />
      <Skeleton variant="text" width="40%" className="mx-auto" />
    </div>
  </div>
);

/**
 * Pre-built skeleton for website card layouts
 */
export const WebsiteCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Skeleton variant="circular" width={32} height={32} />
          <div className="space-y-2">
            <Skeleton variant="text" width={120} />
            <Skeleton variant="text" width={80} />
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton variant="rounded" width={60} height={28} />
          <Skeleton variant="rounded" width={60} height={28} />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <Skeleton variant="text" width="90%" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * Pre-built skeleton for dashboard layout
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
      <div className="animate-pulse">
        <Skeleton variant="text" width="30%" height={32} className="mb-2" />
        <Skeleton variant="text" width="50%" />
      </div>
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }, (_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>

    {/* Content Area */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        {Array.from({ length: 3 }, (_, index) => (
          <WebsiteCardSkeleton key={index} />
        ))}
      </div>
      <div className="space-y-6">
        {Array.from({ length: 2 }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </div>
  </div>
);

/**
 * Loading overlay for existing content
 */
export const LoadingOverlay: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ loading, children, className = '' }) => {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    </div>
  );
};

export default Skeleton;