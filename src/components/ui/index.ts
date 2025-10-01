/**
 * UI Component Library
 *
 * Unified component library providing consistent design patterns
 * and eliminating card design inconsistencies across the application
 */

// Card Components
export { Card } from './Card';
export type { CardProps, CardAction } from './Card';

export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';

export { WebsiteCard } from './WebsiteCard';
export type { WebsiteCardProps, Website } from './WebsiteCard';

// Status Components
export { StatusBadge, StatusDot } from './StatusBadge';
export type { StatusBadgeProps, StatusType } from './StatusBadge';

// Loading Components
export {
  Skeleton,
  CardSkeleton,
  StatCardSkeleton,
  WebsiteCardSkeleton,
  DashboardSkeleton,
  LoadingOverlay
} from './SkeletonLoader';
export type { SkeletonProps } from './SkeletonLoader';

// Re-export existing components for completeness
export { default as LoadingSpinner } from './LoadingSpinner';