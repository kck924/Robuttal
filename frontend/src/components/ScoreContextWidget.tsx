'use client';

import type { DebateDetail } from '@/lib/api';

interface ScoreContextWidgetProps {
  debate: DebateDetail;
}

// Dot plot visualization for a single debater's score context
function ScoreDotPlot({
  label,
  modelName,
  currentScore,
  historicalAvg,
  siteAvg,
  judgeAvg,
  color,
}: {
  label: string;
  modelName: string | null;
  currentScore: number;
  historicalAvg: number | null;
  siteAvg: number | null;
  judgeAvg: number | null;
  color: string;
}) {
  // Scale: debate scores are 0-100
  const minScore = 0;
  const maxScore = 100;
  const range = maxScore - minScore;

  // Convert score to percentage position
  const scoreToPercent = (score: number) => ((score - minScore) / range) * 100;

  // All data points for visualization (historical avg shown separately as marker)
  const dataPoints = [
    { value: currentScore, label: 'This debate', color, isMain: true },
    siteAvg !== null
      ? { value: siteAvg, label: 'Site avg', color: '#9ca3af', isMain: false }
      : null,
    judgeAvg !== null
      ? { value: judgeAvg, label: 'Judge avg', color: '#a855f7', isMain: false }
      : null,
  ].filter(Boolean) as Array<{
    value: number;
    label: string;
    color: string;
    isMain: boolean;
  }>;

  // Determine current score position relative to averages
  const avgValues = [historicalAvg, siteAvg, judgeAvg].filter(
    (v) => v !== null
  ) as number[];
  const avgMean =
    avgValues.length > 0
      ? avgValues.reduce((a, b) => a + b, 0) / avgValues.length
      : null;
  const isAboveAverage = avgMean !== null && currentScore > avgMean;
  const isBelowAverage = avgMean !== null && currentScore < avgMean;

  return (
    <div className="space-y-1.5">
      {/* Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color }}
          >
            {label}
          </span>
          {modelName && (
            <span className="text-xs text-gray-500 font-medium truncate max-w-[120px]">
              {modelName}
            </span>
          )}
        </div>
        <span
          className={`text-xs font-mono font-bold ${
            isAboveAverage
              ? 'text-green-600'
              : isBelowAverage
              ? 'text-red-600'
              : 'text-gray-600'
          }`}
        >
          {currentScore}
        </span>
      </div>

      {/* Dot plot track */}
      <div className="relative h-8 bg-gray-100 rounded-lg overflow-visible">
        {/* Tick marks at 25, 50, 75 */}
        {[25, 50, 75].map((tick) => (
          <div
            key={tick}
            className="absolute top-0 bottom-0 w-px bg-gray-200"
            style={{ left: `${scoreToPercent(tick)}%` }}
          />
        ))}

        {/* Historical average marker - solid vertical line */}
        {historicalAvg !== null && (
          <div
            className="absolute top-0 bottom-0 group z-5"
            style={{ left: `${scoreToPercent(historicalAvg)}%` }}
          >
            {/* Solid vertical line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 -ml-px"
              style={{ backgroundColor: color, opacity: 0.6 }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
              Model avg: {historicalAvg.toFixed(0)}
            </div>
          </div>
        )}

        {/* Data point dots */}
        {dataPoints.map((point, idx) => (
          <div
            key={idx}
            className="absolute top-1/2 -translate-y-1/2 group"
            style={{ left: `${scoreToPercent(point.value)}%` }}
          >
            {/* Dot */}
            <div
              className={`rounded-full transition-transform hover:scale-125 ${
                point.isMain ? 'w-4 h-4 -ml-2 shadow-md z-10' : 'w-2.5 h-2.5 -ml-1.5 opacity-70'
              }`}
              style={{ backgroundColor: point.color }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
              {point.label}: {point.value.toFixed(0)}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
        {dataPoints.map((point, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <span
              className={`rounded-full ${point.isMain ? 'w-2 h-2' : 'w-1.5 h-1.5'}`}
              style={{ backgroundColor: point.color }}
            />
            {point.label}
          </span>
        ))}
        {historicalAvg !== null && (
          <span className="flex items-center gap-1">
            <span
              className="w-0.5 h-3 rounded-full"
              style={{ backgroundColor: color, opacity: 0.6 }}
            />
            Model avg
          </span>
        )}
      </div>
    </div>
  );
}

export default function ScoreContextWidget({ debate }: ScoreContextWidgetProps) {
  // Only show if we have scores
  if (debate.pro_score === null || debate.con_score === null) {
    return null;
  }

  // Extract debate score context if available
  const context = debate.debate_score_context;

  // Model-specific historical averages
  const proHistoricalAvg = context?.pro_model_avg ?? null;
  const conHistoricalAvg = context?.con_model_avg ?? null;

  // Site-wide and judge averages
  const siteAvg = context?.site_avg_score ?? null;
  const judgeAvg = context?.judge_avg_given ?? null;

  return (
    <div className="card">
      <div className="card-header py-3">
        <h3 className="text-sm font-semibold text-gray-900">Score Context</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          How this debate compares to averages
        </p>
      </div>
      <div className="card-body space-y-4">
        {/* Pro score context */}
        <ScoreDotPlot
          label="Pro"
          modelName={debate.debater_pro?.name ?? null}
          currentScore={debate.pro_score}
          historicalAvg={proHistoricalAvg}
          siteAvg={siteAvg}
          judgeAvg={judgeAvg}
          color="#22c55e"
        />

        {/* Con score context */}
        <ScoreDotPlot
          label="Con"
          modelName={debate.debater_con?.name ?? null}
          currentScore={debate.con_score}
          historicalAvg={conHistoricalAvg}
          siteAvg={siteAvg}
          judgeAvg={judgeAvg}
          color="#ef4444"
        />

        {/* Additional context info */}
        {context && (
          <div className="pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {context.site_avg_score !== null && (
                <div>
                  <div className="text-gray-500">Site Average</div>
                  <div className="font-semibold text-gray-700">
                    {context.site_avg_score.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {context.site_total_debates} debates
                  </div>
                </div>
              )}
              {context.judge_avg_given !== null && (
                <div>
                  <div className="text-gray-500">Judge Avg Given</div>
                  <div className="font-semibold text-purple-600">
                    {context.judge_avg_given.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {context.judge_debates_judged} judged
                  </div>
                </div>
              )}
              {context.pro_model_avg !== null && (
                <div>
                  <div className="text-gray-500">Pro Model Avg</div>
                  <div className="font-semibold text-green-600">
                    {context.pro_model_avg.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {context.pro_model_debates} debates
                  </div>
                </div>
              )}
              {context.con_model_avg !== null && (
                <div>
                  <div className="text-gray-500">Con Model Avg</div>
                  <div className="font-semibold text-red-600">
                    {context.con_model_avg.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {context.con_model_debates} debates
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
