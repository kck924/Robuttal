import { TranscriptSkeleton, StatsGridSkeleton } from '@/components/Skeletons';

export default function DebateLoading() {
  return (
    <div className="container-narrow py-8">
      {/* Breadcrumb */}
      <div className="mb-4">
        <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-8 w-full bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Matchup Card */}
      <div className="card mb-8">
        <div className="card-body">
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Pro */}
            <div className="text-center">
              <div className="h-4 w-8 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
              <div className="h-10 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>

            {/* VS */}
            <div className="text-center">
              <div className="h-10 w-10 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>

            {/* Con */}
            <div className="text-center">
              <div className="h-4 w-8 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
              <div className="h-10 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <StatsGridSkeleton />
      </div>

      {/* Phase Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
        ))}
      </div>

      {/* Transcript */}
      <div className="card mb-8">
        <div className="card-header">
          <div className="h-6 w-28 bg-gray-200 rounded animate-pulse mb-1" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="card-body">
          <TranscriptSkeleton />
        </div>
      </div>

      {/* Judge Info */}
      <div className="card mb-8">
        <div className="card-header">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-1" />
          <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
            <div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Community Vote */}
      <div className="card">
        <div className="card-header">
          <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-1" />
          <div className="h-4 w-52 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mx-auto mt-4" />
        </div>
      </div>
    </div>
  );
}
