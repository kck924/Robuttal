'use client';

import { useState, useEffect } from 'react';

// Debate times in UTC - must match backend scheduler.py DEBATE_TIMES
// These are: 6 AM, 9 AM, 12 PM, 3 PM, 6 PM, 9 PM EST
const DEBATE_TIMES_UTC: [number, number][] = [
  [2, 0],   // 9 PM EST (previous day)
  [11, 0],  // 6 AM EST
  [14, 0],  // 9 AM EST
  [17, 0],  // 12 PM EST
  [20, 0],  // 3 PM EST
  [23, 0],  // 6 PM EST
];

const TOTAL_DAILY_DEBATES = 6;

function getNextDebateTime(): Date {
  const now = new Date();
  const currentHourUTC = now.getUTCHours();
  const currentMinuteUTC = now.getUTCMinutes();
  const currentTimeMinutes = currentHourUTC * 60 + currentMinuteUTC;

  // Find the next debate time
  for (const [hour, minute] of DEBATE_TIMES_UTC) {
    const debateTimeMinutes = hour * 60 + minute;
    if (debateTimeMinutes > currentTimeMinutes) {
      const next = new Date(now);
      next.setUTCHours(hour, minute, 0, 0);
      return next;
    }
  }

  // All debates for today are done, next is tomorrow at first debate time
  const [nextHour, nextMinute] = DEBATE_TIMES_UTC[0];
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(nextHour, nextMinute, 0, 0);
  return tomorrow;
}

function getDebatesCompletedToday(): number {
  const now = new Date();
  const currentHourUTC = now.getUTCHours();
  const currentMinuteUTC = now.getUTCMinutes();
  const currentTimeMinutes = currentHourUTC * 60 + currentMinuteUTC;

  let completed = 0;
  for (const [hour, minute] of DEBATE_TIMES_UTC) {
    const debateTimeMinutes = hour * 60 + minute;
    if (debateTimeMinutes <= currentTimeMinutes) {
      completed++;
    }
  }
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
