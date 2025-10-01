# UI Component Library

A unified component library providing consistent design patterns and eliminating card design inconsistencies across the ChatLite frontend application.

## Overview

This component library was created to address the **Frontend UI & State Management Fixes** specification requirements, specifically:

- ✅ **Card Component Standardization**: Unified card designs across all pages
- ✅ **Status Display Consistency**: Standard status indicators and badges
- ✅ **Loading State Enhancement**: Skeleton loading components for better UX
- ✅ **Design System Foundation**: Reusable components with consistent styling

## Components

### Card Components

#### `Card` - Base Card Component
The foundational card component that standardizes all card designs.

```tsx
import { Card } from '../ui';

<Card
  title="Website Analytics"
  subtitle="dashboard.example.com"
  status="active"
  icon={Globe}
  actions={[
    { label: 'Edit', onClick: handleEdit, icon: Edit },
    { label: 'Delete', onClick: handleDelete, icon: Trash2, variant: 'danger' }
  ]}
>
  <p>Card content goes here</p>
</Card>
```

**Props:**
- `title?: string` - Card title
- `subtitle?: string` - Card subtitle
- `status?: 'active' | 'inactive' | 'pending' | 'error' | 'success' | 'warning'`
- `actions?: CardAction[]` - Action buttons
- `loading?: boolean` - Loading state
- `error?: string` - Error message
- `variant?: 'default' | 'compact' | 'detailed' | 'stat'`
- `icon?: LucideIcon` - Header icon
- `onClick?: () => void` - Click handler

#### `StatCard` - Statistics Display
Specialized card for displaying statistics with trend indicators.

```tsx
import { StatCard } from '../ui';
import { Users } from 'lucide-react';

<StatCard
  title="Total Users"
  value="1,234"
  icon={Users}
  trend={{ value: 12.5, period: 'this month' }}
  description="Active users this month"
/>
```

#### `WebsiteCard` - Website Information
Specialized card for displaying website information with built-in actions.

```tsx
import { WebsiteCard } from '../ui';

<WebsiteCard
  website={websiteData}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onViewAnalytics={handleAnalytics}
  onViewScript={handleScript}
/>
```

### Status Components

#### `StatusBadge` - Status Indicators
Unified status badges for consistent status display.

```tsx
import { StatusBadge } from '../ui';

<StatusBadge status="active" size="md" variant="default" />
<StatusBadge status="pending" text="Processing" />
<StatusBadge status="error" variant="outlined" />
```

**Status Types:**
- `active` - Green checkmark
- `inactive` - Gray minus
- `pending` - Yellow clock
- `error` - Red X circle
- `success` - Green checkmark
- `warning` - Yellow triangle
- `loading` - Blue spinning loader

#### `StatusDot` - Minimal Status
Simple colored dots for minimal status indication.

```tsx
import { StatusDot } from '../ui';

<StatusDot status="active" size="md" />
```

### Loading Components

#### `Skeleton` - Basic Skeleton
Basic skeleton loading component for individual elements.

```tsx
import { Skeleton } from '../ui';

<Skeleton variant="text" lines={3} />
<Skeleton variant="circular" width={40} height={40} />
<Skeleton variant="rectangular" width="100%" height={200} />
```

#### Pre-built Skeletons
Ready-to-use skeleton components for common layouts.

```tsx
import {
  CardSkeleton,
  StatCardSkeleton,
  WebsiteCardSkeleton,
  DashboardSkeleton
} from '../ui';

// For card layouts
<CardSkeleton />

// For stat cards
<StatCardSkeleton />

// For website cards
<WebsiteCardSkeleton />

// For entire dashboard
<DashboardSkeleton />
```

#### `LoadingOverlay` - Overlay Loading
Loading overlay for existing content.

```tsx
import { LoadingOverlay } from '../ui';

<LoadingOverlay loading={isLoading}>
  <YourExistingContent />
</LoadingOverlay>
```

## Design System

### Color Scheme
Components support both light and dark modes with consistent color usage:

- **Green**: Active, Success states
- **Red**: Error, Danger states
- **Yellow**: Warning, Pending states
- **Blue**: Info, Loading states
- **Gray**: Inactive, Neutral states

### Sizing
Consistent sizing system across all components:

- **sm**: Small (compact mobile views)
- **md**: Medium (default desktop)
- **lg**: Large (emphasis areas)

### Variants
Multiple variants for different use cases:

- **default**: Standard appearance with background
- **outlined**: Border-only appearance
- **minimal**: Text-only appearance
- **compact**: Reduced padding
- **detailed**: Increased padding and styling

## Usage Guidelines

### 1. Consistent Status Display
Always use `StatusBadge` or `StatusDot` for status indication instead of custom styling:

```tsx
// ✅ Good
<StatusBadge status="active" />

// ❌ Avoid
<span className="text-green-600">Active</span>
```

### 2. Loading States
Use skeleton components during loading instead of spinners for better UX:

```tsx
// ✅ Good - Shows content structure
{loading ? <CardSkeleton /> : <Card {...props} />}

// ❌ Avoid - Generic spinner
{loading ? <Spinner /> : <Card {...props} />}
```

### 3. Card Consistency
Use the unified `Card` component instead of custom card implementations:

```tsx
// ✅ Good
<Card title="Analytics" status="active">
  <AnalyticsContent />
</Card>

// ❌ Avoid
<div className="bg-white p-6 rounded-lg border">
  <h3>Analytics</h3>
  <AnalyticsContent />
</div>
```

### 4. Action Buttons
Use the built-in actions system for consistent button styling:

```tsx
// ✅ Good
<Card
  actions={[
    { label: 'Edit', onClick: handleEdit, variant: 'secondary' },
    { label: 'Delete', onClick: handleDelete, variant: 'danger' }
  ]}
>
```

## Migration Guide

### From Old Card Patterns

**Before:**
```tsx
<div className="bg-white p-6 rounded-lg shadow-sm border">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold">{title}</h3>
    <button onClick={handleEdit}>Edit</button>
  </div>
  {children}
</div>
```

**After:**
```tsx
<Card
  title={title}
  actions={[{ label: 'Edit', onClick: handleEdit }]}
>
  {children}
</Card>
```

### From Custom Status Indicators

**Before:**
```tsx
<span className={`px-2 py-1 rounded text-xs ${
  status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
}`}>
  {status}
</span>
```

**After:**
```tsx
<StatusBadge status={status} />
```

## Performance Considerations

- Components use optimized CSS classes for minimal bundle impact
- Skeleton components prevent layout shift during loading
- Consistent component reuse improves browser caching
- TypeScript interfaces provide compile-time optimization

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- Dark mode support via CSS custom properties
- Responsive design with mobile-first approach

## Contributing

When adding new UI components:

1. Follow the established design patterns
2. Include TypeScript interfaces
3. Support both light and dark modes
4. Add skeleton loading variants
5. Include comprehensive examples
6. Update this README

## Related Files

- `src/components/ui/index.ts` - Main exports
- `src/store/` - Redux state management
- `src/hooks/` - Custom hooks for state
- `tailwind.config.js` - Design system tokens