interface EloChartPlaceholderProps {
  modelCount: number;
}

export default function EloChartPlaceholder({ modelCount }: EloChartPlaceholderProps) {
  // Generate placeholder data points
  const models = [
    { name: 'Claude Opus 4.5', color: '#ea580c' },
    { name: 'Claude Sonnet 4.5', color: '#f97316' },
    { name: 'GPT-4o', color: '#22c55e' },
    { name: 'Gemini 2.5 Pro', color: '#3b82f6' },
    { name: 'Mistral Large', color: '#a855f7' },
  ].slice(0, modelCount);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900"><a href="/elo" className="hover:text-primary-600">Elo</a> History</h2>
        <p className="text-sm text-gray-500 mt-1">
          Rating changes over time
        </p>
      </div>
      <div className="card-body">
        {/* Placeholder Chart Area */}
        <div className="relative h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
          {/* Fake Y-axis */}
          <div className="absolute left-4 top-4 bottom-4 flex flex-col justify-between text-xs text-gray-400 font-mono">
            <span>1600</span>
            <span>1550</span>
            <span>1500</span>
            <span>1450</span>
            <span>1400</span>
          </div>

          {/* Fake grid lines */}
          <div className="absolute inset-x-12 top-4 bottom-4 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-t border-gray-200" />
            ))}
          </div>

          {/* Placeholder message */}
          <div className="text-center z-10">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
            <p className="text-gray-500 text-sm">
              Elo history chart coming soon
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Charts will appear after more debates are completed
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          {models.map((model) => (
            <div key={model.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: model.color }}
              />
              <span className="text-sm text-gray-600">{model.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
