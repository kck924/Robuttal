'use client';

import { JudgeScoreContext } from '@/lib/api';

interface JudgeScoreComparisonProps {
  context: JudgeScoreContext;
  judgeName: string;
  auditorName: string;
}

interface ComparisonBarProps {
  label: string;
  value: number;
  comparisonValue: number | null;
  count: number;
  countLabel: string;
  color: string;
  isCurrentScore?: boolean;
}

function ComparisonBar({
  label,
  value,
  comparisonValue,
  count,
  countLabel,
  color,
  isCurrentScore = false,
}: ComparisonBarProps) {
  // Scale is 1-10, so we calculate percentage
  const percentage = (value / 10) * 100;
  const comparisonPercentage = comparisonValue ? (comparisonValue / 10) * 100 : null;

  // Calculate difference from comparison
  const diff = comparisonValue ? value - comparisonValue : null;
  const diffText = diff !== null
    ? diff > 0
      ? `+${diff.toFixed(1)}`
      : diff.toFixed(1)
    : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 truncate pr-2" title={label}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-gray-900">
            {value.toFixed(1)}
          </span>
          {diffText && (
            <span
              className={`font-mono text-[10px] ${
                parseFloat(diffText) > 0
                  ? 'text-green-600'
                  : parseFloat(diffText) < 0
                  ? 'text-red-600'
                  : 'text-gray-400'
              }`}
            >
              {diffText}
            </span>
          )}
        </div>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        {/* Comparison marker */}
        {comparisonPercentage !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
            style={{ left: `${comparisonPercentage}%` }}
            title={`Comparison: ${comparisonValue?.toFixed(1)}`}
          />
        )}
        {/* Value bar */}
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-[10px] text-gray-400">
        {count} {countLabel}
      </div>
    </div>
  );
}

export default function JudgeScoreComparison({
  context,
  judgeName,
  auditorName,
}: JudgeScoreComparisonProps) {
  return (
    <div className="space-y-4">
      {/* Current Score - Hero Display */}
      <div className="text-center pb-3 border-b border-gray-100">
        <div className="text-3xl font-bold font-mono text-purple-600">
          {context.current_score.toFixed(1)}
        </div>
        <div className="text-xs text-gray-500 uppercase mt-1">Audit Score</div>
      </div>

      {/* Comparison Bars */}
      <div className="space-y-3">
        {/* vs Judge's Historical Average */}
        <ComparisonBar
          label={`${judgeName}'s avg`}
          value={context.current_score}
          comparisonValue={context.judge_avg}
          count={context.judge_debates_judged}
          countLabel="debates judged"
          color="bg-purple-500"
        />

        {/* vs Site Average */}
        <ComparisonBar
          label="Site average"
          value={context.current_score}
          comparisonValue={context.site_avg}
          count={context.site_total_debates}
          countLabel="total debates"
          color="bg-blue-500"
        />

        {/* vs Auditor's Average */}
        <ComparisonBar
          label={`${auditorName}'s avg given`}
          value={context.current_score}
          comparisonValue={context.auditor_avg}
          count={context.auditor_debates_audited}
          countLabel="debates audited"
          color="bg-amber-500"
        />
      </div>

      {/* Legend */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span>This debate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-0.5 h-2 bg-gray-400" />
            <span>Historical avg</span>
          </div>
        </div>
      </div>
    </div>
  );
}
