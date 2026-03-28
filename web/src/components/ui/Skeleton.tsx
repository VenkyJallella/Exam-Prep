import { type HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ variant = 'text', width, height, className = '', ...props }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card space-y-4">
      <Skeleton variant="text" className="h-4 w-3/4" />
      <Skeleton variant="text" className="h-4 w-1/2" />
      <div className="flex gap-3">
        <Skeleton variant="rectangular" className="h-8 w-20" />
        <Skeleton variant="rectangular" className="h-8 w-20" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton variant="rectangular" className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" className="h-12 w-full" />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="h-16 w-16" />
        <div className="space-y-2">
          <Skeleton variant="text" className="h-5 w-40" />
          <Skeleton variant="text" className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-3">
            <Skeleton variant="text" className="h-4 w-20" />
            <Skeleton variant="text" className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3">
          <Skeleton variant="text" className="h-5 w-32" />
          <Skeleton variant="rectangular" className="h-48 w-full" />
        </div>
        <div className="card space-y-3">
          <Skeleton variant="text" className="h-5 w-32" />
          <Skeleton variant="rectangular" className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
