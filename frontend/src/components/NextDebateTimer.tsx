'use client';

import { useState, useEffect } from 'react';

// Debate times in UTC (6AM, 10AM, 2PM, 6PM, 10PM)
const DEBATE_HOURS_UTC = [6, 10, 14, 18, 22];

function getNextDebateTime(): Date {
  const now = new Date();
  const currentHourUTC = now.getUTCHours();
  const currentMinutesUTC = now.getUTCMinutes();

  // Find the next debate hour
  let nextHour = DEBATE_HOURS_UTC.find((h) => h > currentHourUTC);

  if (nextHour === undefined) {
    // All debates for today are done, next is tomorrow at 6 AM UTC
    nextHour = DEBATE_HOURS_UTC[0];
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(nextHour, 0, 0, 0);
    return tomorrow;
  }

  // Check if we're past the current hour (same hour, past minutes)
  if (nextHour === currentHourUTC && currentMinutesUTC > 0) {
    const nextIndex = DEBATE_HOURS_UTC.indexOf(nextHour) + 1;
    if (nextIndex < DEBATE_HOURS_UTC.length) {
      nextHour = DEBATE_HOURS_UTC[nextIndex];
    } else {
      nextHour = DEBATE_HOURS_UTC[0];
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(nextHour, 0, 0, 0);
      return tomorrow;
    }
  }

  const next = new Date(now);
  next.setUTCHours(nextHour, 0, 0, 0);
  return next;
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

interface NextDebateTimerProps {
  debatesRemaining?: number;
}

export default function NextDebateTimer({ debatesRemaining = 5 }: NextDebateTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
  } | null>(null);
  const [nextDebateTime, setNextDebateTime] = useState<Date | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const next = getNextDebateTime();
      setNextDebateTime(next);
      const remaining = next.getTime() - Date.now();
      setTimeRemaining(formatTimeRemaining(remaining));
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

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

  // Calculate debates completed today
  const now = new Date();
  const debatesCompleted = DEBATE_HOURS_UTC.filter((h) => h <= now.getUTCHours()).length;
  const debatesLeft = 5 - debatesCompleted;

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
          {[...Array(5)].map((_, i) => (
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
          {debatesLeft} of 5 debates remaining today
        </p>
      </div>
    </div>
  );
}
