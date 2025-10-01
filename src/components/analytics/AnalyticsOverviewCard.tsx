import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnalyticsOverviewCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  iconColor?: string;
  trend?: {
    value: number;
    period: string;
  };
  description?: string;
}

const AnalyticsOverviewCard: React.FC<AnalyticsOverviewCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = 'text-gray-600',
  trend,
  description
}) => {
  const getTrendDisplay = () => {
    if (!trend) return null;
    
    const isPositive = trend.value > 0;
    const isNegative = trend.value < 0;
    
    let TrendIcon = Minus;
    let trendColor = 'text-gray-500';
    
    if (isPositive) {
      TrendIcon = TrendingUp;
      trendColor = 'text-green-500';
    } else if (isNegative) {
      TrendIcon = TrendingDown;
      trendColor = 'text-red-500';
    }
    
    const displayValue = Math.abs(trend.value);
    const sign = isPositive ? '+' : isNegative ? '-' : '';
    
    return (
      <div className={`flex items-center space-x-1 text-xs ${trendColor}`}>
        <TrendIcon className="w-3 h-3" />
        <span>{sign}{displayValue.toFixed(1)}%</span>
        <span className="text-gray-400">vs {trend.period}</span>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
          {description && (
            <p className="text-xs text-gray-600 mb-2">{description}</p>
          )}
          {getTrendDisplay()}
        </div>
        <div className="ml-4">
          <div className={`p-3 rounded-full bg-gray-50`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverviewCard;