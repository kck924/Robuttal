import Link from 'next/link';
import { DebaterStanding } from '@/lib/api';

interface DebaterTableProps {
  standings: DebaterStanding[];
}

function getRankStyle(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-yellow-50 text-yellow-700';
    case 2:
      return 'bg-gray-50 text-gray-500';
    case 3:
      return 'bg-orange-50 text-orange-700';
    default:
      return 'text-gray-500';
  }
}

function getTrendDisplay(trend: number | null): { text: string; color: string } {
  if (trend === null || trend === 0) {
    return { text: '—', color: 'text-gray-400' };
  }
  if (trend > 0) {
    return { text: `+${trend}`, color: 'text-green-600' };
  }
  return { text: `${trend}`, color: 'text-red-600' };
}

function getProviderColor(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'anthropic':
      return 'text-orange-600';
    case 'openai':
      return 'text-green-600';
    case 'google':
      return 'text-blue-600';
    case 'mistral':
      return 'text-purple-600';
    default:
      return 'text-gray-500';
  }
}

export default function DebaterTable({ standings }: DebaterTableProps) {
  if (standings.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">
            Debater Rankings
          </h2>
        </div>
        <div className="card-body">
          <p className="text-gray-500 text-center py-8">
            No ranking data yet. Rankings will appear after debates are completed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">
          Debater Rankings
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Ranked by <a href="/elo" className="text-primary-600 hover:underline">Elo rating</a> • Trend shows change over last 10 debates
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-cell table-header w-16">Rank</th>
              <th className="table-cell table-header">Model</th>
              <th className="table-cell table-header text-right">W</th>
              <th className="table-cell table-header text-right">L</th>
              <th className="table-cell table-header text-right">Win%</th>
              <th className="table-cell table-header text-right"><a href="/elo" className="hover:text-primary-600">Elo</a></th>
              <th className="table-cell table-header text-right">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {standings.map((model) => {
              const trend = getTrendDisplay(model.recent_trend);

              return (
                <tr
                  key={model.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    model.rank <= 3 ? getRankStyle(model.rank) : ''
                  }`}
                >
                  {/* Rank */}
                  <td className="table-cell">
                    <span className="font-mono font-medium">
                      {model.rank}
                    </span>
                  </td>

                  {/* Model */}
                  <td className="table-cell">
                    <Link
                      href={`/models/${model.slug}`}
                      className="hover:text-primary-600"
                    >
                      <div className="font-medium text-gray-900">
                        {model.name}
                      </div>
                      <div className={`text-xs ${getProviderColor(model.provider)}`}>
                        {model.provider}
                      </div>
                    </Link>
                  </td>

                  {/* Wins */}
                  <td className="table-cell text-right">
                    <span className="font-mono text-green-600">
                      {model.debates_won}
                    </span>
                  </td>

                  {/* Losses */}
                  <td className="table-cell text-right">
                    <span className="font-mono text-red-600">
                      {model.debates_lost}
                    </span>
                  </td>

                  {/* Win Rate */}
                  <td className="table-cell text-right">
                    <span className="font-mono">
                      {model.win_rate !== null
                        ? `${model.win_rate.toFixed(0)}%`
                        : '—'}
                    </span>
                  </td>

                  {/* Elo */}
                  <td className="table-cell text-right">
                    <span className="font-mono font-semibold text-gray-900">
                      {model.elo_rating}
                    </span>
                  </td>

                  {/* Trend */}
                  <td className="table-cell text-right">
                    <span className={`font-mono font-medium ${trend.color}`}>
                      {trend.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
