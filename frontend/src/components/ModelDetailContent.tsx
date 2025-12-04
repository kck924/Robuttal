'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ModelDetail, RecentDebate, HeadToHeadRecord, ScoringStats, CategoryScores, JudgingStats, JudgeScores, JudgedDebate, AuditorRecord } from '@/lib/api';
import ModelEloTrendChart from './ModelEloTrendChart';

interface ModelDetailContentProps {
  model: ModelDetail;
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

function getTrendDisplay(trend: number | null): { text: string; color: string; bg: string } {
  if (trend === null || trend === 0) {
    return { text: '0', color: 'text-gray-500', bg: 'bg-gray-100' };
  }
  if (trend > 0) {
    return { text: `+${trend}`, color: 'text-green-600', bg: 'bg-green-50' };
  }
  return { text: `${trend}`, color: 'text-red-600', bg: 'bg-red-50' };
}

// Compact Elo change visualization for debate rows with history
function EloChangeViz({
  before,
  after,
  history = []
}: {
  before: number | null;
  after: number | null;
  history?: number[];
}) {
  if (before === null || after === null) return null;

  const delta = after - before;
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  // Use history if available (already includes current), otherwise just before/after
  const dataPoints = history.length >= 2 ? history : [before, after];

  // SVG dimensions for mini sparkline
  const width = 56;
  const height = 22;
  const paddingX = 3;
  const paddingY = 3;

  // Calculate scale including 1500 baseline for context
  const allValues = [...dataPoints, 1500];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 50;
  const paddedMin = minVal - range * 0.15;
  const paddedMax = maxVal + range * 0.15;
  const paddedRange = paddedMax - paddedMin;

  // Scale functions
  const scaleX = (i: number) => paddingX + (i / (dataPoints.length - 1)) * (width - paddingX * 2);
  const scaleY = (val: number) => paddingY + (1 - (val - paddedMin) / paddedRange) * (height - paddingY * 2);

  const baseline1500Y = scaleY(1500);
  const showBaseline = baseline1500Y > paddingY && baseline1500Y < height - paddingY;

  // Build path for the line
  const pathD = dataPoints
    .map((val, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(val)}`)
    .join(' ');

  // Build path for the filled area
  const areaD = `${pathD} L ${scaleX(dataPoints.length - 1)} ${height - paddingY} L ${scaleX(0)} ${height - paddingY} Z`;

  const strokeColor = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#9ca3af';

  return (
    <div className="flex items-center gap-1.5">
      <svg width={width} height={height} className="overflow-visible">
        {/* 1500 baseline */}
        {showBaseline && (
          <line
            x1={0}
            y1={baseline1500Y}
            x2={width}
            y2={baseline1500Y}
            stroke="#e5e7eb"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        )}
        {/* Area fill */}
        <path
          d={areaD}
          fill={strokeColor}
          fillOpacity={0.12}
        />
        {/* Main line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {dataPoints.map((val, i) => (
          <circle
            key={i}
            cx={scaleX(i)}
            cy={scaleY(val)}
            r={i === dataPoints.length - 1 ? 2.5 : 1.5}
            fill={i === dataPoints.length - 1 ? strokeColor : 'white'}
            stroke={strokeColor}
            strokeWidth={1}
          />
        ))}
      </svg>
      <div className="flex flex-col items-end">
        <span className={`text-xs font-bold font-mono leading-none ${
          isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
        }`}>
          {isPositive ? '+' : ''}{delta}
        </span>
        <span className="text-[10px] text-gray-400 font-mono leading-none mt-0.5">
          {after}
        </span>
      </div>
    </div>
  );
}

// Score breakdown visualization comparing model to site average
function ScoreBreakdown({ stats }: { stats: ScoringStats }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready, then trigger animation
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const categories: { key: keyof CategoryScores; label: string; max: number }[] = [
    { key: 'total', label: 'Overall', max: 100 },
    { key: 'logical_consistency', label: 'Logic', max: 25 },
    { key: 'evidence', label: 'Evidence', max: 25 },
    { key: 'persuasiveness', label: 'Persuasion', max: 25 },
    { key: 'engagement', label: 'Engagement', max: 25 },
  ];

  return (
    <div className="space-y-3">
      {categories.map(({ key, label, max }, index) => {
        const modelVal = stats.model_scores[key];
        const siteVal = stats.site_averages[key];

        if (modelVal === null) return null;

        const modelPct = (modelVal / max) * 100;
        const sitePct = siteVal !== null ? (siteVal / max) * 100 : 0;
        const diff = siteVal !== null ? modelVal - siteVal : null;
        const isAbove = diff !== null && diff > 0;
        const isBelow = diff !== null && diff < 0;
        const isTotal = key === 'total';

        // Stagger delay based on index
        const delay = index * 80;

        return (
          <div key={key} className={isTotal ? 'pb-3 border-b border-gray-100' : ''}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm ${isTotal ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                {label}
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-sm font-semibold ${
                  isAbove ? 'text-green-600' : isBelow ? 'text-red-600' : 'text-gray-700'
                }`}>
                  {modelVal.toFixed(1)}
                </span>
                {diff !== null && (
                  <span className={`text-xs font-mono ${
                    isAbove ? 'text-green-500' : isBelow ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    ({isAbove ? '+' : ''}{diff.toFixed(1)})
                  </span>
                )}
                <span className="text-xs text-gray-400">/ {max}</span>
              </div>
            </div>

            {/* Bar visualization */}
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
              {/* Model score bar with animation */}
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${
                  isAbove ? 'bg-green-500' : isBelow ? 'bg-red-400' : 'bg-gray-400'
                }`}
                style={{
                  width: animated ? `${modelPct}%` : '0%',
                  transition: `width 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
                }}
              />
              {/* Site average marker */}
              {siteVal !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-800"
                  style={{
                    left: `${sitePct}%`,
                    opacity: animated ? 0.5 : 0,
                    transition: `opacity 300ms ease-out ${delay + 400}ms`,
                  }}
                  title={`Site avg: ${siteVal.toFixed(1)}`}
                />
              )}
            </div>

            {/* Site average label */}
            {siteVal !== null && !isTotal && (
              <div className="flex justify-end mt-0.5">
                <span className="text-[10px] text-gray-400">
                  site avg: {siteVal.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-gray-800 opacity-50" />
          <span>Site Average</span>
        </div>
        <span className="text-gray-300">|</span>
        <span>Based on {stats.debates_scored} debate{stats.debates_scored !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

// Judge performance breakdown visualization comparing model to site average
function JudgeBreakdown({ stats }: { stats: JudgingStats }) {
  const [animated, setAnimated] = useState(false);
  const [showDebates, setShowDebates] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready, then trigger animation
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const categories: { key: keyof JudgeScores; label: string; max: number }[] = [
    { key: 'overall', label: 'Overall', max: 10 },
    { key: 'accuracy', label: 'Accuracy', max: 10 },
    { key: 'fairness', label: 'Fairness', max: 10 },
    { key: 'thoroughness', label: 'Thoroughness', max: 10 },
    { key: 'reasoning_quality', label: 'Reasoning', max: 10 },
  ];

  const hasDebates = stats.recent_judged_debates && stats.recent_judged_debates.length > 0;

  return (
    <div>
      {/* Toggle button */}
      {hasDebates && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowDebates(!showDebates)}
            className="text-xs px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1.5"
          >
            {showDebates ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Show Stats
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                See Debates
              </>
            )}
          </button>
        </div>
      )}

      {showDebates ? (
        // Debates list view
        <div className="space-y-2">
          {stats.recent_judged_debates.map((debate) => {
            const completedDate = debate.completed_at ? new Date(debate.completed_at) : null;
            const isGoodScore = debate.judge_score !== null && debate.judge_score >= 7;
            const isMediumScore = debate.judge_score !== null && debate.judge_score >= 5 && debate.judge_score < 7;

            return (
              <Link
                key={debate.id}
                href={`/debates/${debate.id}`}
                className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium line-clamp-1">
                      {debate.topic_title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      <Link href={`/models/${debate.pro_slug}`} className="hover:text-primary-600" onClick={(e) => e.stopPropagation()}>
                        {debate.pro_name}
                      </Link>
                      {' vs '}
                      <Link href={`/models/${debate.con_slug}`} className="hover:text-primary-600" onClick={(e) => e.stopPropagation()}>
                        {debate.con_name}
                      </Link>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Score */}
                    {debate.pro_score !== null && debate.con_score !== null && (
                      <div className="text-xs text-gray-500 font-mono">
                        {debate.pro_score}-{debate.con_score}
                      </div>
                    )}
                    {/* Audit score badge */}
                    {debate.judge_score !== null && (
                      <div className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        isGoodScore ? 'bg-emerald-100 text-emerald-700' :
                        isMediumScore ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {debate.judge_score.toFixed(1)}
                      </div>
                    )}
                    {/* Date */}
                    {completedDate && (
                      <span className="text-xs text-gray-400">
                        {completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        // Bar chart view
        <div className="space-y-3">
          {categories.map(({ key, label, max }, index) => {
            const modelVal = stats.model_scores[key];
            const siteVal = stats.site_averages[key];

            if (modelVal === null) return null;

            const modelPct = (modelVal / max) * 100;
            const sitePct = siteVal !== null ? (siteVal / max) * 100 : 0;
            const diff = siteVal !== null ? modelVal - siteVal : null;
            const isAbove = diff !== null && diff > 0;
            const isBelow = diff !== null && diff < 0;
            const isTotal = key === 'overall';

            // Stagger delay based on index
            const delay = index * 80;

            return (
              <div key={key} className={isTotal ? 'pb-3 border-b border-gray-100' : ''}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${isTotal ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                    {label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm font-semibold ${
                      isAbove ? 'text-green-600' : isBelow ? 'text-red-600' : 'text-gray-700'
                    }`}>
                      {modelVal.toFixed(1)}
                    </span>
                    {diff !== null && (
                      <span className={`text-xs font-mono ${
                        isAbove ? 'text-green-500' : isBelow ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        ({isAbove ? '+' : ''}{diff.toFixed(1)})
                      </span>
                    )}
                    <span className="text-xs text-gray-400">/ {max}</span>
                  </div>
                </div>

                {/* Bar visualization */}
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                  {/* Model score bar with animation */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${
                      isAbove ? 'bg-blue-500' : isBelow ? 'bg-amber-400' : 'bg-gray-400'
                    }`}
                    style={{
                      width: animated ? `${modelPct}%` : '0%',
                      transition: `width 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
                    }}
                  />
                  {/* Site average marker */}
                  {siteVal !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-gray-800"
                      style={{
                        left: `${sitePct}%`,
                        opacity: animated ? 0.5 : 0,
                        transition: `opacity 300ms ease-out ${delay + 400}ms`,
                      }}
                      title={`Site avg: ${siteVal.toFixed(1)}`}
                    />
                  )}
                </div>

                {/* Site average label */}
                {siteVal !== null && !isTotal && (
                  <div className="flex justify-end mt-0.5">
                    <span className="text-[10px] text-gray-400">
                      site avg: {siteVal.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex items-center gap-4 pt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-gray-800 opacity-50" />
              <span>Site Average</span>
            </div>
            <span className="text-gray-300">|</span>
            <span>Based on {stats.times_judged} debate{stats.times_judged !== 1 ? 's' : ''} judged</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Auditor breakdown - shows how each auditor has scored this model as judge
function AuditorBreakdownChart({ records }: { records: AuditorRecord[] }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (records.length === 0) return null;

  // Find the max overall score for scaling
  const maxScore = 10;

  return (
    <div className="space-y-4">
      {records.map((record, index) => {
        const overallPct = (record.avg_overall / maxScore) * 100;
        const delay = index * 100;

        // Color based on score: green for good (>7), amber for medium (5-7), red for poor (<5)
        const isGood = record.avg_overall >= 7;
        const isMedium = record.avg_overall >= 5 && record.avg_overall < 7;

        return (
          <div key={record.auditor_id} className="group">
            <div className="flex items-center justify-between mb-2">
              <Link
                href={`/models/${record.auditor_slug}`}
                className="flex items-center gap-2 hover:text-primary-600 transition-colors"
              >
                <span className="font-medium text-gray-900 group-hover:text-primary-600">
                  {record.auditor_name}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getProviderColor(record.auditor_provider)} bg-gray-100`}>
                  {record.auditor_provider}
                </span>
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {record.times_audited} audit{record.times_audited !== 1 ? 's' : ''}
                </span>
                <span className={`font-mono font-bold text-lg ${
                  isGood ? 'text-emerald-600' : isMedium ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {record.avg_overall.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Main score bar */}
            <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${
                  isGood ? 'bg-emerald-500' : isMedium ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{
                  width: animated ? `${overallPct}%` : '0%',
                  transition: `width 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
                }}
              />
            </div>

            {/* Category breakdown (smaller bars) */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { label: 'Accuracy', value: record.avg_accuracy },
                { label: 'Fairness', value: record.avg_fairness },
                { label: 'Thorough', value: record.avg_thoroughness },
                { label: 'Reasoning', value: record.avg_reasoning },
              ].map((cat) => (
                <div key={cat.label} className="text-center">
                  <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gray-400"
                      style={{
                        width: animated && cat.value !== null ? `${(cat.value / 10) * 100}%` : '0%',
                        transition: `width 500ms ease-out ${delay + 200}ms`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{cat.label}</span>
                  {cat.value !== null && (
                    <span className="text-[10px] text-gray-500 ml-1">{cat.value.toFixed(1)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ModelDetailContent({ model }: ModelDetailContentProps) {
  const totalDebates = model.debates_won + model.debates_lost;
  const trend = getTrendDisplay(model.recent_trend);

  return (
    <div className="container-wide py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-gray-500">
          <li>
            <Link href="/standings" className="hover:text-primary-600">
              Standings
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium">{model.name}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="card p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{model.name}</h1>
              <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${getProviderColor(model.provider)} bg-gray-100`}>
                {model.provider}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Model ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{model.api_model_id}</code>
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 font-mono">{model.elo_rating}</div>
              <div className="text-sm text-gray-500">
                <Link href="/elo" className="hover:text-primary-600">Elo Rating</Link>
              </div>
            </div>
            <div className={`text-center px-4 py-2 rounded-lg ${trend.bg}`}>
              <div className={`text-xl font-bold font-mono ${trend.color}`}>{trend.text}</div>
              <div className="text-xs text-gray-500">Last 10</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-green-600 font-mono">{model.debates_won}</div>
          <div className="text-sm text-gray-500">Wins</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-red-600 font-mono">{model.debates_lost}</div>
          <div className="text-sm text-gray-500">Losses</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-gray-900 font-mono">
            {model.win_rate !== null ? `${model.win_rate.toFixed(0)}%` : '—'}
          </div>
          <div className="text-sm text-gray-500">Win Rate</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-gray-900 font-mono">{totalDebates}</div>
          <div className="text-sm text-gray-500">Total Debates</div>
        </div>
      </div>

      {/* Elo Trend Chart */}
      {model.elo_trend && model.elo_trend.data_points.length > 0 && (
        <div className="mb-8">
          <ModelEloTrendChart
            eloTrend={model.elo_trend}
            modelName={model.name}
            provider={model.provider}
          />
        </div>
      )}

      {/* Performance Breakdowns - Side by Side */}
      {(model.scoring_stats || model.judging_stats) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Debate Performance */}
          {model.scoring_stats && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Debate Performance</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Scores as debater vs. site average
                </p>
              </div>
              <div className="card-body">
                <ScoreBreakdown stats={model.scoring_stats} />
              </div>
            </div>
          )}

          {/* Judge Performance */}
          {model.judging_stats && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Judge Performance</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Audit scores as judge vs. site average
                </p>
              </div>
              <div className="card-body">
                <JudgeBreakdown stats={model.judging_stats} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auditor Breakdown - How each auditor rated this model as judge */}
      {model.auditor_breakdown.length > 0 && (
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Judge Scores by Auditor</h2>
            <p className="text-sm text-gray-500 mt-1">
              How each auditor has rated {model.name} as a judge
            </p>
          </div>
          <div className="card-body">
            <AuditorBreakdownChart records={model.auditor_breakdown} />
          </div>
        </div>
      )}

      {/* Head-to-Head Records */}
      {model.head_to_head.length > 0 && (
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Head-to-Head</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {model.head_to_head.map((record) => {
                const isWinning = record.win_rate >= 50;
                const isDominating = record.win_rate >= 75;
                const isLosing = record.win_rate < 50;
                const isStruggling = record.win_rate <= 25;

                return (
                  <Link
                    key={record.opponent_id}
                    href={`/models/${record.opponent_slug}`}
                    className={`relative p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                      isDominating ? 'border-green-400 bg-green-50' :
                      isWinning ? 'border-green-200 bg-green-50/50' :
                      isStruggling ? 'border-red-400 bg-red-50' :
                      isLosing ? 'border-red-200 bg-red-50/50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {/* Opponent name */}
                    <div className="text-sm font-medium text-gray-900 truncate mb-1">
                      {record.opponent_name}
                    </div>

                    {/* Record */}
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-bold font-mono ${
                        isWinning ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {record.wins}-{record.losses}
                      </span>

                      {/* Mini win rate bar */}
                      <div className="w-8 h-8 relative">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="4"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke={isWinning ? '#22c55e' : '#ef4444'}
                            strokeWidth="4"
                            strokeDasharray={`${record.win_rate * 0.88} 88`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${
                          isWinning ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {record.win_rate.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Debates */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Recent Debates</h2>
          <p className="text-sm text-gray-500 mt-1">
            Last {model.recent_debates.length} completed debates
          </p>
        </div>
        {model.recent_debates.length === 0 ? (
          <div className="card-body">
            <p className="text-gray-500 text-center py-8">
              No debates yet. Check back after this model participates in debates.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {model.recent_debates.map((debate) => {
              const isWin = debate.result === 'win';
              const completedDate = debate.completed_at
                ? new Date(debate.completed_at)
                : null;

              return (
                <Link
                  key={debate.id}
                  href={`/debates/${debate.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Result Badge */}
                  <div
                    className={`flex-shrink-0 w-16 h-8 rounded flex items-center justify-center text-sm font-semibold ${
                      isWin
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isWin ? 'WIN' : 'LOSS'}
                  </div>

                  {/* Topic & Opponent */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-1">
                      {debate.topic_title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      vs {debate.opponent_name} ({debate.position === 'pro' ? 'PRO' : 'CON'})
                    </p>
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0 text-right">
                    {debate.score !== null && debate.opponent_score !== null && (
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-mono text-sm ${
                            isWin ? 'text-green-600 font-semibold' : 'text-gray-500'
                          }`}
                        >
                          {debate.score}
                        </span>
                        <span className="text-gray-300">-</span>
                        <span
                          className={`font-mono text-sm ${
                            !isWin ? 'text-green-600 font-semibold' : 'text-gray-500'
                          }`}
                        >
                          {debate.opponent_score}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Elo Change - visually separated */}
                  <div className="flex-shrink-0 pl-3 ml-3 border-l border-gray-200">
                    <div className="bg-gray-50 rounded-md px-2 py-1">
                      <EloChangeViz
                        before={debate.elo_before}
                        after={debate.elo_after}
                        history={debate.elo_history}
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex-shrink-0 w-20 text-right">
                    {completedDate && (
                      <div className="text-xs text-gray-500">
                        {completedDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <svg
                    className="flex-shrink-0 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Back Link */}
      <div className="mt-8 text-center">
        <Link
          href="/standings"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Standings
        </Link>
      </div>
    </div>
  );
}
