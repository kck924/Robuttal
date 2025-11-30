'use client';

import Link from 'next/link';
import { DailyScheduleResponse, ScheduledDebateItem } from '@/lib/api';
import { generateSlug } from '@/lib/api';

interface DailyScheduleProps {
  schedule: DailyScheduleResponse;
}

function formatScheduledTime(dateStr: string): { time: string; relative: string } {
  // Parse the date - backend returns UTC timestamps without Z suffix
  // Append Z to ensure it's parsed as UTC, then JS will convert to local time
  const normalizedDateStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const date = new Date(normalizedDateStr);

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const absDiffMins = Math.abs(diffMins);

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  let relative: string;
  if (absDiffMins < 1) {
    relative = 'now';
  } else if (absDiffMins < 60) {
    relative = diffMins > 0 ? `in ${absDiffMins}m` : `${absDiffMins}m ago`;
  } else {
    const hours = Math.round(absDiffMins / 60);
    relative = diffMins > 0 ? `in ${hours}h` : `${hours}h ago`;
  }

  return { time, relative };
}

function getStatusBadge(status: string, winner: ScheduledDebateItem['winner']) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          Completed
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          Live
        </span>
      );
    case 'scheduled':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
          Upcoming
        </span>
      );
    default:
      return null;
  }
}

function ScheduleItem({ debate, index }: { debate: ScheduledDebateItem; index: number }) {
  const isCompleted = debate.status === 'completed';
  const isLive = debate.status === 'in_progress';
  const proWon = debate.winner?.id === debate.debater_pro.id;
  const conWon = debate.winner?.id === debate.debater_con.id;

  return (
    <Link
      href={`/debates/${debate.id}`}
      className={`block relative rounded-lg border transition-all duration-200 hover:shadow-md ${
        isLive
          ? 'border-red-200 bg-gradient-to-r from-red-50 to-white'
          : isCompleted
          ? 'border-gray-100 bg-white hover:border-gray-200'
          : 'border-dashed border-gray-200 bg-gray-50/30 hover:bg-gray-50'
      }`}
    >
      {/* Left accent bar for completed/live */}
      {(isCompleted || isLive) && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
          isLive ? 'bg-red-500' : 'bg-green-500'
        }`} />
      )}

      <div className="p-3 pl-4">
        {/* Header: Time + Status */}
        <div className="flex items-center gap-2 mb-2">
          {(() => {
            const { time, relative } = formatScheduledTime(debate.scheduled_at);
            return (
              <span className="text-xs text-gray-400 tabular-nums" title={time}>
                {isCompleted ? time : relative}
              </span>
            );
          })()}
          {isLive && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          {isCompleted && (
            <span className="text-xs text-green-600 font-medium">Done</span>
          )}
          <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wider">
            {debate.topic.category}
          </span>
        </div>

        {/* Topic Title - Main focus */}
        <h4 className="text-sm font-medium text-gray-900 leading-snug mb-2">
          {debate.topic.title}
        </h4>

        {/* Matchup Row */}
        <div className="flex items-center text-xs text-gray-500 mb-1.5">
          <div className={`flex items-center gap-1 ${proWon ? 'text-green-700 font-semibold' : ''}`}>
            <span className={proWon ? '' : 'text-gray-600'}>{debate.debater_pro.name}</span>
            {isCompleted && debate.pro_score !== null && (
              <span className="text-gray-400">{debate.pro_score}</span>
            )}
          </div>
          <span className="mx-2 text-gray-300">vs</span>
          <div className={`flex items-center gap-1 ${conWon ? 'text-green-700 font-semibold' : ''}`}>
            <span className={conWon ? '' : 'text-gray-600'}>{debate.debater_con.name}</span>
            {isCompleted && debate.con_score !== null && (
              <span className="text-gray-400">{debate.con_score}</span>
            )}
          </div>
        </div>

        {/* Judge Row */}
        <div className="text-[11px] text-gray-400">
          Judge: {debate.judge.name}
        </div>
      </div>
    </Link>
  );
}

export default function DailySchedule({ schedule }: DailyScheduleProps) {
  const hasDebates = schedule.debates.length > 0;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="font-semibold text-gray-900">Today's Schedule</h3>
        </div>
        <div className="text-sm text-gray-500">
          {schedule.completed_count}/{schedule.total_scheduled} completed
        </div>
      </div>

      <div className="card-body">
        {hasDebates ? (
          <div className="space-y-2">
            {schedule.debates.map((debate, index) => (
              <ScheduleItem key={debate.id} debate={debate} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p>No debates scheduled for today</p>
            <p className="text-sm mt-1">Check back later!</p>
          </div>
        )}

        {/* Summary Stats */}
        {hasDebates && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-around text-center text-sm">
              <div>
                <div className="font-semibold text-gray-900">{schedule.total_scheduled}</div>
                <div className="text-xs text-gray-500">Scheduled</div>
              </div>
              <div>
                <div className="font-semibold text-green-600">{schedule.completed_count}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              {schedule.in_progress_count > 0 && (
                <div>
                  <div className="font-semibold text-red-600">{schedule.in_progress_count}</div>
                  <div className="text-xs text-gray-500">Live</div>
                </div>
              )}
              <div>
                <div className="font-semibold text-gray-600">
                  {schedule.total_scheduled - schedule.completed_count - schedule.in_progress_count}
                </div>
                <div className="text-xs text-gray-500">Remaining</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
