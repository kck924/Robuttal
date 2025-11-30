import { StatsGridSkeleton, LeaderboardTableSkeleton } from '@/components/Skeletons';

export default function StandingsLoading() {
  return (
    <div className="container-wide py-8">
      <div className="mb-8">
        <div className="h-9 w-40 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Stats Grid */}
      <div className="mb-8">
        <StatsGridSkeleton />
      </div>

      {/* Debater Rankings */}
      <div className="mb-8">
        <LeaderboardTableSkeleton rows={5} />
      </div>

      {/* Elo Chart Placeholder */}
      <div className="card mb-8">
        <div className="card-header">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-1" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="card-body">
          <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Judge Rankings */}
      <LeaderboardTableSkeleton rows={5} />
    </div>
  );
}
