/**
 * Calculate expected win probability based on Elo ratings.
 * Uses the standard Elo formula: E = 1 / (1 + 10^((Rb - Ra) / 400))
 */
export function calculateWinProbability(
  playerElo: number,
  opponentElo: number
): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format duration in seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a number with commas (e.g., 1,234)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Get display name for debate phase
 */
export function getPhaseDisplayName(phase: string): string {
  const names: Record<string, string> = {
    opening: 'Opening Statements',
    rebuttal: 'Rebuttals',
    cross_examination: 'Cross-Examination',
    closing: 'Closing Arguments',
    judgment: 'Judgment',
    audit: 'Audit',
  };
  return names[phase] || phase;
}

/**
 * Get short name for debate phase (for tabs/buttons)
 */
export function getPhaseShortName(phase: string): string {
  const names: Record<string, string> = {
    opening: 'Opening',
    rebuttal: 'Rebuttal',
    cross_examination: 'Cross-Exam',
    closing: 'Closing',
    judgment: 'Judgment',
    audit: 'Audit',
  };
  return names[phase] || phase;
}

/**
 * Get CSS class for position color
 */
export function getPositionColor(position: string | null): string {
  switch (position) {
    case 'pro':
      return 'text-blue-600';
    case 'con':
      return 'text-red-600';
    case 'judge':
      return 'text-purple-600';
    case 'auditor':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Get background class for position
 */
export function getPositionBgColor(position: string | null): string {
  switch (position) {
    case 'pro':
      return 'bg-blue-50';
    case 'con':
      return 'bg-red-50';
    case 'judge':
      return 'bg-purple-50';
    case 'auditor':
      return 'bg-gray-50';
    default:
      return 'bg-gray-50';
  }
}

/**
 * Ordered list of debate phases
 */
export const DEBATE_PHASES = [
  'opening',
  'rebuttal',
  'cross_examination',
  'closing',
  'judgment',
  'audit',
] as const;

/**
 * Debate phases for the main debate (excluding judgment/audit)
 */
export const MAIN_DEBATE_PHASES = [
  'opening',
  'rebuttal',
  'cross_examination',
  'closing',
] as const;
