import { MAIN_DEBATE_PHASES, getPhaseShortName, DEBATE_PHASES } from '@/lib/utils';

interface PhaseProgressProps {
  currentPhase?: string;
  completedPhases: string[];
  status: string;
}

export default function PhaseProgress({
  currentPhase,
  completedPhases,
  status,
}: PhaseProgressProps) {
  const isCompleted = status === 'completed';
  const isJudging = status === 'judging';

  // Determine which phases to show based on status
  const phases = isCompleted || isJudging ? DEBATE_PHASES : MAIN_DEBATE_PHASES;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold text-gray-900">Debate Progress</h3>
      </div>
      <div className="card-body p-0">
        <ul className="divide-y divide-gray-100">
          {phases.map((phase) => {
            const isComplete = completedPhases.includes(phase);
            const isCurrent = currentPhase === phase;
            const isPending = !isComplete && !isCurrent;

            return (
              <li
                key={phase}
                className={`flex items-center gap-3 px-4 py-3 ${
                  isCurrent ? 'bg-blue-50' : ''
                }`}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {isComplete ? (
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-5 h-5 border-2 border-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                </div>

                {/* Phase Name */}
                <span
                  className={`text-sm ${
                    isComplete
                      ? 'text-gray-700'
                      : isCurrent
                      ? 'text-blue-700 font-medium'
                      : 'text-gray-400'
                  }`}
                >
                  {getPhaseShortName(phase)}
                </span>

                {/* Current indicator */}
                {isCurrent && (
                  <span className="ml-auto text-xs text-blue-600 font-medium">
                    In Progress
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
