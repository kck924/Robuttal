'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from 'recharts';
import type { EloTrendData } from '@/lib/api';

// Provider-based color palette
const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#ea580c', // Orange
  openai: '#22c55e', // Green
  google: '#3b82f6', // Blue
  mistral: '#a855f7', // Purple
  xai: '#ef4444', // Red
  deepseek: '#14b8a6', // Teal
};

interface ModelEloTrendChartProps {
  eloTrend: EloTrendData;
  modelName: string;
  provider: string;
}

export default function ModelEloTrendChart({
  eloTrend,
  modelName,
  provider,
}: ModelEloTrendChartProps) {
  const router = useRouter();

  const { chartData, lineColor, minElo, maxElo } = useMemo(() => {
    const lineColor = PROVIDER_COLORS[provider] || '#6b7280';

    // Add starting point at debate 0 with starting_elo
    const chartData = [
      {
        debate_number: 0,
        elo: eloTrend.starting_elo,
        result: 'start',
        opponent_name: '',
        debate_id: '',
        completed_at: null,
      },
      ...eloTrend.data_points,
    ];

    // Calculate min/max for Y axis
    const elos = chartData.map((d) => d.elo);
    const minElo = Math.min(...elos);
    const maxElo = Math.max(...elos);

    return { chartData, lineColor, minElo, maxElo };
  }, [eloTrend, provider]);

  if (!eloTrend.data_points.length) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Elo Trend</h2>
          <p className="text-sm text-gray-500 mt-1">Rating changes over debates</p>
        </div>
        <div className="card-body">
          <div className="h-64 flex items-center justify-center text-gray-500">
            No debate history available yet
          </div>
        </div>
      </div>
    );
  }

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: {
        debate_number: number;
        elo: number;
        result: string;
        opponent_name: string;
        debate_id: string;
        completed_at: string | null;
      };
    }>;
  }) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;

    // Starting point tooltip
    if (data.debate_number === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900">Starting Elo</p>
          <p className="text-lg font-bold" style={{ color: lineColor }}>
            {data.elo}
          </p>
        </div>
      );
    }

    const isWin = data.result === 'win';

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 mb-1">
          Debate #{data.debate_number}
        </p>
        {data.completed_at && (
          <p className="text-xs text-gray-500 mb-2">{formatDate(data.completed_at)}</p>
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">vs</span>
            <span className="text-sm font-medium">{data.opponent_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                isWin
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isWin ? 'Win' : 'Loss'}
            </span>
            <span className="text-sm text-gray-600">Elo:</span>
            <span className="text-sm font-bold" style={{ color: lineColor }}>
              {data.elo}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Custom dot component to show wins/losses (clickable for debates)
  const CustomDot = (props: {
    cx?: number;
    cy?: number;
    payload?: {
      result: string;
      debate_number: number;
      debate_id: string;
    };
  }) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    // Starting point - neutral dot (not clickable)
    if (payload.debate_number === 0) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={lineColor}
          stroke="white"
          strokeWidth={2}
        />
      );
    }

    const isWin = payload.result === 'win';

    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={isWin ? '#22c55e' : '#ef4444'}
        stroke="white"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={() => router.push(`/debates/${payload.debate_id}`)}
      />
    );
  };

  // Calculate nice Y axis bounds
  const yMin = Math.floor((minElo - 30) / 50) * 50;
  const yMax = Math.ceil((maxElo + 30) / 50) * 50;

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">Elo Trend</h2>
        <p className="text-sm text-gray-500 mt-1">
          Rating progression across {eloTrend.data_points.length} debate
          {eloTrend.data_points.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="card-body">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="debate_number"
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(value) => (value === 0 ? 'Start' : `#${value}`)}
              />
              <YAxis
                domain={[yMin, yMax]}
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(value) => value.toString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={eloTrend.starting_elo}
                stroke="#d1d5db"
                strokeDasharray="5 5"
              >
                <Label
                  value="1500 neutral"
                  position="insideLeft"
                  offset={10}
                  fill="#9ca3af"
                  fontSize={11}
                />
              </ReferenceLine>
              <Line
                type="monotone"
                dataKey="elo"
                stroke={lineColor}
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 8, fill: lineColor, stroke: 'white', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">Win</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: lineColor }}
            />
            <span className="text-gray-600">{modelName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
