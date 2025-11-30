import { ArchiveListSkeleton } from '@/components/Skeletons';

export default function ArchiveLoading() {
  return (
    <div className="container-wide py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="h-9 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-5 w-56 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - Filters */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="card-body space-y-4">
              {/* Model Filter */}
              <div>
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
              </div>
              {/* Category Filter */}
              <div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
              </div>
              {/* Date Range */}
              <div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse mb-2" />
                <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card mt-6">
            <div className="card-body text-center">
              <div className="h-9 w-16 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* Table Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-64 h-4 bg-gray-200 rounded animate-pulse hidden md:block" />
                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse hidden sm:block" />
                <div className="w-8" />
              </div>
            </div>

            {/* Skeleton Rows */}
            <ArchiveListSkeleton count={10} />

            {/* Pagination Skeleton */}
            <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                    ))}
                  </div>
                  <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
