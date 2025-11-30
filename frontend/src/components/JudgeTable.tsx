import Link from 'next/link';
import { JudgeStanding } from '@/lib/api';

interface JudgeTableProps {
  standings: JudgeStanding[];
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBar(score: number | null): number {
  if (score === null) return 0;
  return (score / 10) * 100;
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

export default function JudgeTable({ standings }: JudgeTableProps) {
  if (standings.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Judge Rankings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Based on meta-judge audits of judging quality
          </p>
        </div>
        <div className="card-body">
          <p className="text-gray-500 text-center py-8">
            No judging data yet. Rankings will appear after debates are completed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">Judge Rankings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Based on meta-judge audits • Score is average of accuracy, fairness,
          thoroughness, and reasoning quality (1-10 each)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-cell table-header w-16">Rank</th>
              <th className="table-cell table-header">Model</th>
              <th className="table-cell table-header text-right">Judged</th>
              <th className="table-cell table-header text-right">Avg Score</th>
              <th className="table-cell table-header w-48">Score Bar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {standings.map((model) => (
              <tr key={model.id} className="hover:bg-gray-50 transition-colors">
                {/* Rank */}
                <td className="table-cell">
                  <span className="font-mono font-medium text-gray-500">
                    {model.rank}
                  </span>
                </td>

                {/* Model */}
                <td className="table-cell">
                  <Link
                    href={`/models/${model.slug}`}
                    className="hover:text-primary-600"
                  >
                    <div className="font-medium text-gray-900">{model.name}</div>
                    <div className={`text-xs ${getProviderColor(model.provider)}`}>
                      {model.provider}
                    </div>
                  </Link>
                </td>

                {/* Times Judged */}
                <td className="table-cell text-right">
                  <span className="font-mono">{model.times_judged}</span>
                </td>

                {/* Average Score */}
                <td className="table-cell text-right">
                  <span
                    className={`font-mono font-semibold ${getScoreColor(
                      model.avg_judge_score
                    )}`}
                  >
                    {model.avg_judge_score !== null
                      ? model.avg_judge_score.toFixed(1)
                      : '—'}
                  </span>
                  <span className="text-gray-400 text-xs">/10</span>
                </td>

                {/* Score Bar */}
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          model.avg_judge_score !== null
                            ? model.avg_judge_score >= 8
                              ? 'bg-green-500'
                              : model.avg_judge_score >= 6
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                            : 'bg-gray-300'
                        }`}
                        style={{
                          width: `${getScoreBar(model.avg_judge_score)}%`,
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
