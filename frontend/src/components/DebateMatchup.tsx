import Link from 'next/link';
import { ModelSummary, TopicSummary, generateSlug } from '@/lib/api';
import { calculateWinProbability } from '@/lib/utils';

interface DebateMatchupProps {
  topic: TopicSummary;
  debaterPro: ModelSummary;
  debaterCon: ModelSummary;
  judge: ModelSummary;
  winner?: ModelSummary | null;
  proScore?: number | null;
  conScore?: number | null;
  status: string;
  // Elo change tracking
  proEloBefore?: number | null;
  proEloAfter?: number | null;
  conEloBefore?: number | null;
  conEloAfter?: number | null;
  // Optional Elo history for sparkline (array of Elo values, oldest first)
  proEloHistory?: number[];
  conEloHistory?: number[];
  // Blinded judging (judge didn't know model names)
  isBlinded?: boolean;
}

// Elo sparkline visualization component with 1500 baseline
function EloSparkline({
  before,
  after,
  history = []
}: {
  before?: number | null;
  after?: number | null;
  history?: number[];
}) {
  if (before === null || before === undefined || after === null || after === undefined) return null;

  const delta = after - before;
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  // Build data points: use history if available, otherwise just before/after
  const dataPoints = history.length >= 2
    ? [...history.slice(-4), after] // Last 4 from history + current = 5 points max
    : [before, after];

  // SVG dimensions
  const width = 64;
  const height = 24;
  const paddingX = 3;
  const paddingY = 4;

  // Calculate scale based on data range, ensuring 1500 is visible
  const allValues = [...dataPoints, 1500];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 50; // Default range if all same

  // Add some padding to the range
  const paddedMin = minVal - range * 0.1;
  const paddedMax = maxVal + range * 0.1;
  const paddedRange = paddedMax - paddedMin;

  // Scale functions
  const scaleX = (i: number) => paddingX + (i / (dataPoints.length - 1)) * (width - paddingX * 2);
  const scaleY = (val: number) => paddingY + (1 - (val - paddedMin) / paddedRange) * (height - paddingY * 2);

  // Calculate 1500 baseline Y position
  const baseline1500Y = scaleY(1500);
  const showBaseline = baseline1500Y > paddingY && baseline1500Y < height - paddingY;

  // Build path
  const pathD = dataPoints
    .map((val, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(val)}`)
    .join(' ');

  // Line color
  const strokeColor = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#9ca3af';

  return (
    <div className="flex items-center justify-center gap-1.5 mt-2">
      <svg width={width} height={height} className="overflow-visible">
        {/* 1500 baseline */}
        {showBaseline && (
          <line
            x1={0}
            y1={baseline1500Y}
            x2={width}
            y2={baseline1500Y}
            stroke="#d1d5db"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        )}
        {/* Area fill under line */}
        <path
          d={`${pathD} L ${scaleX(dataPoints.length - 1)} ${height - paddingY} L ${scaleX(0)} ${height - paddingY} Z`}
          fill={strokeColor}
          fillOpacity={0.15}
        />
        {/* Main line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {dataPoints.map((val, i) => (
          <circle
            key={i}
            cx={scaleX(i)}
            cy={scaleY(val)}
            r={i === dataPoints.length - 1 ? 3 : 2}
            fill={i === dataPoints.length - 1 ? strokeColor : 'white'}
            stroke={strokeColor}
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div className="flex flex-col items-start">
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

export default function DebateMatchup({
  topic,
  debaterPro,
  debaterCon,
  judge,
  winner,
  proScore,
  conScore,
  status,
  proEloBefore,
  proEloAfter,
  conEloBefore,
  conEloAfter,
  proEloHistory = [],
  conEloHistory = [],
  isBlinded = false,
}: DebateMatchupProps) {
  const proWinProb = calculateWinProbability(debaterPro.elo_rating, debaterCon.elo_rating);
  const conWinProb = 1 - proWinProb;

  const isCompleted = status === 'completed';
  const proWon = winner?.id === debaterPro.id;
  const conWon = winner?.id === debaterCon.id;

  return (
    <div className="card">
      {/* Topic Header */}
      <div className="card-header">
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-2">
          <span className="badge bg-gray-100 text-gray-700 text-[10px] sm:text-xs">{topic.category}</span>
          {status === 'in_progress' && (
            <span className="badge bg-red-100 text-red-700 flex items-center gap-1 text-[10px] sm:text-xs">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
          {status === 'completed' && (
            <span className="badge bg-green-100 text-green-700 text-[10px] sm:text-xs">Completed</span>
          )}
          {status === 'judging' && (
            <span className="badge bg-yellow-100 text-yellow-700 text-[10px] sm:text-xs">Judging</span>
          )}
        </div>
        <h2 className="text-base sm:text-xl font-semibold text-gray-900 leading-tight">
          {topic.title}
        </h2>
      </div>

      {/* Matchup */}
      <div className="card-body">
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 sm:gap-4 items-center">
          {/* Pro Side */}
          <div className="col-span-1 sm:col-span-3 text-center">
            <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mb-0.5 sm:mb-1">
              Pro
            </div>
            <Link href={`/models/${generateSlug(debaterPro.name)}`} className="font-semibold text-gray-900 text-sm sm:text-lg hover:text-primary-600 block truncate">
              {debaterPro.name}
            </Link>
            <div className="text-[10px] sm:text-sm text-gray-500 mb-1 sm:mb-2">
              {debaterPro.elo_rating} <a href="/elo" className="hover:text-primary-600">Elo</a>
            </div>
            {isCompleted && proScore !== null && (
              <div className={`text-xl sm:text-3xl font-bold font-mono ${proWon ? 'text-blue-600' : 'text-gray-400'}`}>
                {proScore}
              </div>
            )}
            {isCompleted && proWon && (
              <span className="badge-win mt-1 sm:mt-2 text-[10px] sm:text-xs">Winner</span>
            )}
            <div className="hidden sm:block">
              <EloSparkline before={proEloBefore} after={proEloAfter} history={proEloHistory} />
            </div>
          </div>

          {/* VS Divider */}
          <div className="col-span-1 text-center">
            <div className="text-xl sm:text-3xl font-bold text-gray-300">vs</div>
          </div>

          {/* Con Side */}
          <div className="col-span-1 sm:col-span-3 text-center">
            <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mb-0.5 sm:mb-1">
              Con
            </div>
            <Link href={`/models/${generateSlug(debaterCon.name)}`} className="font-semibold text-gray-900 text-sm sm:text-lg hover:text-primary-600 block truncate">
              {debaterCon.name}
            </Link>
            <div className="text-[10px] sm:text-sm text-gray-500 mb-1 sm:mb-2">
              {debaterCon.elo_rating} <a href="/elo" className="hover:text-primary-600">Elo</a>
            </div>
            {isCompleted && conScore !== null && (
              <div className={`text-xl sm:text-3xl font-bold font-mono ${conWon ? 'text-red-600' : 'text-gray-400'}`}>
                {conScore}
              </div>
            )}
            {isCompleted && conWon && (
              <span className="badge bg-red-100 text-red-800 mt-1 sm:mt-2 text-[10px] sm:text-xs">Winner</span>
            )}
            <div className="hidden sm:block">
              <EloSparkline before={conEloBefore} after={conEloAfter} history={conEloHistory} />
            </div>
          </div>
        </div>

        {/* Elo-based Win Probability Bar */}
        {!isCompleted && (
          <div className="mt-4 sm:mt-6">
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 mb-1">
              <span>Win probability (<a href="/elo" className="text-primary-600 hover:underline">Elo</a>)</span>
            </div>
            <div className="h-2 sm:h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${proWinProb * 100}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${conWinProb * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm font-mono mt-1">
              <span className="text-blue-600">{(proWinProb * 100).toFixed(0)}%</span>
              <span className="text-red-600">{(conWinProb * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Judge Info */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-[10px] sm:text-xs text-gray-500">
              Judged by <Link href={`/models/${generateSlug(judge.name)}`} className="font-medium text-gray-700 hover:text-primary-600">{judge.name}</Link>
            </div>
            <div className="relative group">
              <span
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium cursor-help flex items-center gap-1 ${
                  isBlinded
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {isBlinded ? 'Blinded' : 'Unblinded'}
                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="font-semibold mb-1">
                  {isBlinded ? 'Blinded Evaluation' : 'Unblinded Evaluation'}
                </div>
                <p className="text-gray-300 leading-relaxed">
                  {isBlinded
                    ? 'The judge evaluated this debate without knowing which AI models were debating. Models were identified only as "Debater A" and "Debater B" to prevent potential bias.'
                    : 'The judge knew which AI models were debating (PRO and CON positions). This allows us to study whether model identity influences judging.'
                  }
                </p>
                <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
