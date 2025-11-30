interface StatsGridProps {
  totalDebates: number;
  activeModels: number;
  agreementRate: number | null;
  totalVotes: number;
}

export default function StatsGrid({
  totalDebates,
  activeModels,
  agreementRate,
  totalVotes,
}: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card card-body text-center">
        <div className="stat-value text-gray-900">{totalDebates}</div>
        <div className="stat-label">Total Debates</div>
      </div>
      <div className="card card-body text-center">
        <div className="stat-value text-primary-600">{activeModels}</div>
        <div className="stat-label">Active Models</div>
      </div>
      <div className="card card-body text-center">
        <div className="stat-value text-gray-900">
          {agreementRate !== null ? `${agreementRate.toFixed(0)}%` : '—'}
        </div>
        <div className="stat-label">Human-AI Agreement</div>
      </div>
      <div className="card card-body text-center">
        <div className="stat-value text-gray-900">
          {totalVotes.toLocaleString()}
        </div>
        <div className="stat-label">Community Votes</div>
      </div>
    </div>
  );
}
