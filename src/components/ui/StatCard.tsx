import React from 'react';
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './Card';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    period: string;
  };
  description?: string;
  loading?: boolean;
  error?: string;
  className?: string;
}

/**
 * Specialized card component for displaying statistics with trend indicators
 * Used in dashboard overview cards and analytics displays
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = 'text-gray-600',
  trend,
  description,
  loading = false,
  error,
  className = ''
}) => {
  const getTrendDisplay = () => {
    if (!trend) return null;

    const isPositive = trend.value > 0;
    const isNegative = trend.value < 0;

    const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    const trendColor = isPositive
      ? 'text-green-600 dark:text-green-400'
      : isNegative
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-600 dark:text-gray-400';

    return (
      <div className={`flex items-center space-x-1 ${trendColor}`}>
        <TrendIcon className="w-4 h-4" />
        <span className="text-sm font-medium">
          {Math.abs(trend.value)}% {trend.period}
        </span>
      </div>
    );
  };

  return (
    <Card
      variant="stat"
      loading={loading}
      error={error}
      className={className}
      icon={Icon}
      iconColor={iconColor}
    >
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </h3>

        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {value}
        </p>

        {trend && (
          <div className="flex items-center justify-center">
            {getTrendDisplay()}
          </div>
        )}

        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {description}
          </p>
        )}
      </div>
    </Card>
  );
};

export default StatCard;