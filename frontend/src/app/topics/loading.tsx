import { StatsGridSkeleton, TopicListSkeleton, TimerSkeleton } from '@/components/Skeletons';

export default function TopicsLoading() {
  return (
    <div className="container-wide py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="h-9 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Stats Bar */}
      <div className="mb-8">
        <StatsGridSkeleton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Queue Skeleton */}
          <div className="card border-l-4 border-l-green-500">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-4 w-56 bg-gray-200 rounded animate-pulse mt-1" />
            </div>
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-full bg-gray-200 rounded animate-pulse mb-1" />
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topics Tab Skeleton */}
          <div className="card">
            <div className="border-b border-gray-200">
              <div className="flex">
                <div className="px-6 py-3">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="px-6 py-3">
                  <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
            <TopicListSkeleton count={5} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <TimerSkeleton />

          {/* How It Works Skeleton */}
          <div className="card">
            <div className="card-header">
              <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="card-body space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                    <div className="h-3 w-40 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
