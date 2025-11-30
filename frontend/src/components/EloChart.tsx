'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { EloHistoryResponse } from '@/lib/api';

// Provider-based color palette
const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#ea580c', // Orange
  openai: '#22c55e', // Green
  google: '#3b82f6', // Blue
  mistral: '#a855f7', // Purple
  xai: '#ef4444', // Red
};

// Fallback colors if we run out
const FALLBACK_COLORS = [
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#84cc16', // Lime
];

interface EloChartProps {
  eloHistory: EloHistoryResponse;
}

export default function EloChart({ eloHistory }: EloChartProps) {
  // Transform data for Recharts
  // We need to create a unified timeline with all models' Elo at each point
  const { chartData, models } = useMemo(() => {
    if (!eloHistory?.models?.length) {
      return { chartData: [], models: [] };
    }

    // Collect all unique dates
    const allDates = new Set<string>();
    eloHistory.models.forEach(model => {
      model.data_points.forEach(dp => {
        // Normalize to date only (no time) for grouping
        const date = new Date(dp.date).toISOString().split('T')[0];
        allDates.add(date);
      });
    });

    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort();

    // Build chart data
    const chartData = sortedDates.map(date => {
      const point: Record<string, string | number> = { date };

      eloHistory.models.forEach(model => {
        // Find the most recent Elo for this model on or before this date
        const relevantPoints = model.data_points.filter(dp => {
          const dpDate = new Date(dp.date).toISOString().split('T')[0];
          return dpDate <= date;
        });

        if (relevantPoints.length > 0) {
          // Get the most recent one
          const latest = relevantPoints[relevantPoints.length - 1];
          point[model.model_slug] = latest.elo;
        }
      });

      return point;
    });

    // Assign colors to models
    const usedProviderColors = new Set<string>();
    let fallbackIndex = 0;

    const models = eloHistory.models.map(model => {
      let color = PROVIDER_COLORS[model.provider];

      // If provider color already used, use fallback
      if (!color || usedProviderColors.has(color)) {
        color = FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
        fallbackIndex++;
      } else {
        usedProviderColors.add(color);
      }

      return {
        slug: model.model_slug,
        name: model.model_name,
        provider: model.provider,
        color,
      };
    });

    return { chartData, models };
  }, [eloHistory]);

  if (!chartData.length) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">
            <a href="/elo" className="hover:text-primary-600">Elo</a> History
          </h2>
          <p className="text-sm text-gray-500 mt-1">Rating changes over time</p>
        </div>
        <div className="card-body">
          <div className="h-64 flex items-center justify-center text-gray-500">
            No Elo history data available yet
          </div>
        </div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 mb-2">
          {formatDate(label || '')}
        </p>
        <div className="space-y-1">
          {payload
            .sort((a, b) => b.value - a.value)
            .map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">{entry.name}:</span>
                <span className="font-medium">{entry.value}</span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">
          <a href="/elo" className="hover:text-primary-600">Elo</a> History
        </h2>
        <p className="text-sm text-gray-500 mt-1">Rating changes over time</p>
      </div>
      <div className="card-body">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#9ca3af"
                fontSize={12}
              />
              <YAxis
                domain={['dataMin - 20', 'dataMax + 20']}
                stroke="#9ca3af"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => (
                  <span className="text-sm text-gray-600">{value}</span>
                )}
              />
              {models.map((model) => (
                <Line
                  key={model.slug}
                  type="monotone"
                  dataKey={model.slug}
                  name={model.name}
                  stroke={model.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: model.color }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
