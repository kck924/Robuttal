'use client';

import { useState, useEffect } from 'react';

// Debate times in UTC - must match backend scheduler.py DEBATE_TIMES
// These are: 6 AM, 9 AM, 12 PM, 3 PM, 6 PM, 9 PM EST
// Ordered chronologically within an EST day (6 AM EST to 9 PM EST)
const DEBATE_TIMES_UTC: [number, number][] = [
  [11, 0],  // 6 AM EST
  [14, 0],  // 9 AM EST
  [17, 0],  // 12 PM EST
  [20, 0],  // 3 PM EST
  [23, 0],  // 6 PM EST
  [2, 0],   // 9 PM EST (next UTC day, but same EST day)
];

const TOTAL_DAILY_DEBATES = 6;

// The 9 PM EST debate (2:00 UTC) is on the next UTC day but same EST day
// EST day boundary is at 5 AM UTC (midnight EST)
const EST_DAY_START_UTC = 5; // 5 AM UTC = midnight EST

function getNextDebateTime(): Date {
  const now = new Date();
  const currentHourUTC = now.getUTCHours();
  const currentMinuteUTC = now.getUTCMinutes();
  const currentTimeMinutes = currentHourUTC * 60 + currentMinuteUTC;

  // UTC timeline for one cycle:
  // 2:00 UTC (9 PM EST) -> 11:00 UTC (6 AM EST) -> 14:00 -> 17:00 -> 20:00 -> 23:00 -> 2:00 next day

  // If we're before 2 AM UTC, next debate is 2 AM UTC today (9 PM EST tonight)
  if (currentTimeMinutes < 2 * 60) {
    const next = new Date(now);
    next.setUTCHours(2, 0, 0, 0);
    return next;
  }

  // If we're between 2 AM and 11 AM UTC, next debate is 11 AM UTC (6 AM EST)
  if (currentTimeMinutes < 11 * 60) {
    const next = new Date(now);
    next.setUTCHours(11, 0, 0, 0);
    return next;
  }

  // Check times 11, 14, 17, 20, 23 (same UTC day)
  const sameDayTimes = [[11, 0], [14, 0], [17, 0], [20, 0], [23, 0]];
  for (const [hour, minute] of sameDayTimes) {
    const debateTimeMinutes = hour * 60 + minute;
    if (debateTimeMinutes > currentTimeMinutes) {
      const next = new Date(now);
      next.setUTCHours(hour, minute, 0, 0);
      return next;
    }
  }

  // After 23:00 UTC, next debate is 2:00 UTC tomorrow (9 PM EST tonight)
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(2, 0, 0, 0);
  return next;
}

function getDebatesCompletedToday(): number {
  const now = new Date();
  const currentHourUTC = now.getUTCHours();
  const currentMinuteUTC = now.getUTCMinutes();
  const currentTimeMinutes = currentHourUTC * 60 + currentMinuteUTC;

  // "Today" in EST runs from 5 AM UTC to 5 AM UTC next day
  // Debates are at 11, 14, 17, 20, 23 UTC (same day) and 2 UTC (next day)

  let completed = 0;

  // If we're between 2 AM and 5 AM UTC, we're in the tail end of an EST day
  // Only the 9 PM EST (2 AM UTC) debate could have run
  if (currentTimeMinutes >= 2 * 60 && currentTimeMinutes < EST_DAY_START_UTC * 60) {
    // Check if 2 AM has passed
    if (currentTimeMinutes >= 2 * 60) {
      completed = 6; // All debates for this EST day are done
    }
    return completed;
  }

  // Between 5 AM and 11 AM UTC - no debates have run yet for this EST day
  if (currentTimeMinutes >= EST_DAY_START_UTC * 60 && currentTimeMinutes < 11 * 60) {
    return 0;
  }

  // Count debates from 11, 14, 17, 20, 23 that have passed
  const dayDebates = [11, 14, 17, 20, 23];
  for (const hour of dayDebates) {
    if (currentTimeMinutes >= hour * 60) {
      completed++;
    }
  }

  // The 9 PM EST (2 AM UTC) hasn't happened yet since we're still in the same UTC day
  // (it will be tomorrow UTC but tonight EST)

  return completed;
}

function formatTimeRemaining(ms: number): { hours: string; minutes: string; seconds: string } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: hours.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0'),
  };
}

// Hook for timer logic - shared between components
export function useNextDebateTimer() {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
  } | null>(null);
  const [nextDebateTime, setNextDebateTime] = useState<Date | null>(null);
  const [debatesCompleted, setDebatesCompleted] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const next = getNextDebateTime();
      setNextDebateTime(next);
      const remaining = next.getTime() - Date.now();
      setTimeRemaining(formatTimeRemaining(remaining));
      setDebatesCompleted(getDebatesCompletedToday());
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  const debatesLeft = TOTAL_DAILY_DEBATES - debatesCompleted;

  return { timeRemaining, nextDebateTime, debatesCompleted, debatesLeft, totalDebates: TOTAL_DAILY_DEBATES };
}

// Compact timer for header
export function CompactDebateTimer() {
  const { timeRemaining, nextDebateTime } = useNextDebateTimer();

  if (!timeRemaining || !nextDebateTime) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span className="animate-pulse">--:--:--</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <svg className="w-3.5 h-3.5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-gray-500">Next:</span>
      <span className="font-mono font-semibold text-gray-700">
        {timeRemaining.hours}:{timeRemaining.minutes}:{timeRemaining.seconds}
      </span>
    </div>
  );
}

interface NextDebateTimerProps {
  debatesRemaining?: number;
}

export default function NextDebateTimer({ debatesRemaining }: NextDebateTimerProps) {
  const { timeRemaining, nextDebateTime, debatesCompleted, debatesLeft, totalDebates } = useNextDebateTimer();

  if (!timeRemaining || !nextDebateTime) {
    return (
      <div className="card bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="card-body text-center py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-primary-200 rounded w-32 mx-auto mb-2"></div>
            <div className="h-4 bg-primary-200 rounded w-24 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
      <div className="card-body text-center py-6">
        <p className="text-sm text-primary-600 font-medium mb-2">Next Debate In</p>

        {/* Timer Display */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
            <span className="font-mono text-2xl font-bold text-gray-900">
              {timeRemaining.hours}
            </span>
            <span className="text-xs text-gray-500 block">hrs</span>
          </div>
          <span className="text-2xl font-bold text-primary-400">:</span>
          <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
            <span className="font-mono text-2xl font-bold text-gray-900">
              {timeRemaining.minutes}
            </span>
            <span className="text-xs text-gray-500 block">min</span>
          </div>
          <span className="text-2xl font-bold text-primary-400">:</span>
          <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
            <span className="font-mono text-2xl font-bold text-gray-900">
              {timeRemaining.seconds}
            </span>
            <span className="text-xs text-gray-500 block">sec</span>
          </div>
        </div>

        {/* Next debate time */}
        <p className="text-sm text-gray-600 mb-3">
          {nextDebateTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
          })}
        </p>

        {/* Debates remaining */}
        <div className="flex items-center justify-center gap-1">
          {[...Array(totalDebates)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < debatesCompleted
                  ? 'bg-primary-500'
                  : 'bg-primary-200'
              }`}
              title={i < debatesCompleted ? 'Completed' : 'Upcoming'}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {debatesLeft} of {totalDebates} debates remaining today
        </p>
      </div>
    </div>
  );
}
