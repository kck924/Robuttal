'use client';

// Base skeleton component with shimmer animation
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

// Debate Card Skeleton
export function DebateCardSkeleton() {
  return (
    <div className="card">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>

        {/* Topic */}
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-3/4 mb-6" />

        {/* Matchup */}
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Pro */}
          <div className="text-center">
            <Skeleton className="h-4 w-8 mx-auto mb-2" />
            <Skeleton className="h-5 w-24 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto mb-2" />
            <Skeleton className="h-10 w-12 mx-auto" />
          </div>

          {/* VS */}
          <div className="text-center">
            <Skeleton className="h-8 w-8 mx-auto rounded-full" />
          </div>

          {/* Con */}
          <div className="text-center">
            <Skeleton className="h-4 w-8 mx-auto mb-2" />
            <Skeleton className="h-5 w-24 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto mb-2" />
            <Skeleton className="h-10 w-12 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Leaderboard Table Skeleton
export function LeaderboardTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card">
      <div className="card-header">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64 mt-1" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-cell table-header w-16">
                <Skeleton className="h-4 w-8" />
              </th>
              <th className="table-cell table-header">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="table-cell table-header text-right">
                <Skeleton className="h-4 w-6 ml-auto" />
              </th>
              <th className="table-cell table-header text-right">
                <Skeleton className="h-4 w-6 ml-auto" />
              </th>
              <th className="table-cell table-header text-right">
                <Skeleton className="h-4 w-10 ml-auto" />
              </th>
              <th className="table-cell table-header text-right">
                <Skeleton className="h-4 w-10 ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                <td className="table-cell">
                  <Skeleton className="h-5 w-6" />
                </td>
                <td className="table-cell">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </td>
                <td className="table-cell text-right">
                  <Skeleton className="h-5 w-6 ml-auto" />
                </td>
                <td className="table-cell text-right">
                  <Skeleton className="h-5 w-6 ml-auto" />
                </td>
                <td className="table-cell text-right">
                  <Skeleton className="h-5 w-10 ml-auto" />
                </td>
                <td className="table-cell text-right">
                  <Skeleton className="h-5 w-12 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Topic Card Skeleton
export function TopicCardSkeleton() {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex gap-4">
          {/* Vote Button */}
          <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-5 w-full mb-1" />
            <Skeleton className="h-5 w-2/3 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Topic List Skeleton
export function TopicListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, i) => (
        <TopicCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Stats Grid Skeleton
export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card">
          <div className="card-body py-4 text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Archive Row Skeleton
export function ArchiveRowSkeleton() {
  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <div className="flex items-center gap-4">
        {/* Date */}
        <div className="w-20 flex-shrink-0">
          <Skeleton className="h-5 w-14 mb-1" />
          <Skeleton className="h-3 w-10" />
        </div>

        {/* Topic */}
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-5 w-full mb-1" />
          <Skeleton className="h-5 w-2/3" />
        </div>

        {/* Matchup */}
        <div className="w-64 flex-shrink-0 hidden md:flex items-center gap-2">
          <div className="flex-1 text-right">
            <Skeleton className="h-4 w-20 ml-auto mb-1" />
            <Skeleton className="h-3 w-8 ml-auto" />
          </div>
          <Skeleton className="h-4 w-6" />
          <div className="flex-1">
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>

        {/* Score */}
        <div className="w-24 flex-shrink-0 hidden sm:block">
          <Skeleton className="h-5 w-16 mx-auto" />
        </div>

        {/* Expand Icon */}
        <Skeleton className="w-5 h-5 rounded" />
      </div>
    </div>
  );
}

// Archive List Skeleton
export function ArchiveListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <ArchiveRowSkeleton key={i} />
      ))}
    </div>
  );
}

// Transcript Skeleton
export function TranscriptSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// Timer Skeleton
export function TimerSkeleton() {
  return (
    <div className="card bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="card-body text-center py-6">
        <Skeleton className="h-4 w-24 mx-auto mb-3" />
        <div className="flex items-center justify-center gap-2 mb-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-14 h-16 rounded-lg" />
              {i < 2 && <Skeleton className="w-2 h-6" />}
            </div>
          ))}
        </div>
        <Skeleton className="h-4 w-32 mx-auto mb-3" />
        <div className="flex justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-3 h-3 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Full Page Loading Skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="container-wide py-8 animate-pulse">
      <Skeleton className="h-10 w-48 mb-2" />
      <Skeleton className="h-5 w-72 mb-8" />
      <StatsGridSkeleton />
      <div className="mt-8">
        <LeaderboardTableSkeleton />
      </div>
    </div>
  );
}
