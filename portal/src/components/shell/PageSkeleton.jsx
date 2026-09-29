import { Skeleton } from '../ui';

// Placeholder while a lazily loaded page downloads.
export function PageSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
      </div>
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
