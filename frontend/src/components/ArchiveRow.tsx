'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DebateListItem, generateSlug } from '@/lib/api';

interface ArchiveRowProps {
  debate: DebateListItem;
}

function getProviderColor(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'anthropic':
      return 'text-orange-600';
    case 'openai':
      return 'text-green-600';
    case 'google':
      return 'text-blue-600';
    case 'mistral':
      return 'text-purple-600';
    default:
      return 'text-gray-500';
  }
}

function getCategoryColor(category: string): string {
  switch (category.toLowerCase()) {
    case 'ethics':
      return 'bg-purple-100 text-purple-700';
    case 'technology':
      return 'bg-blue-100 text-blue-700';
    case 'philosophy':
      return 'bg-indigo-100 text-indigo-700';
    case 'politics':
      return 'bg-red-100 text-red-700';
    case 'society':
      return 'bg-green-100 text-green-700';
    case 'science':
      return 'bg-cyan-100 text-cyan-700';
    case 'economics':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function ArchiveRow({ debate }: ArchiveRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const completedDate = debate.completed_at
    ? new Date(debate.completed_at)
    : new Date(debate.scheduled_at);

  const proWon = debate.winner?.id === debate.debater_pro.id;
  const conWon = debate.winner?.id === debate.debater_con.id;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Main Row */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Date */}
          <div className="w-20 flex-shrink-0">
            <div className="text-sm font-medium text-gray-900">
              {completedDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div className="text-xs text-gray-500">
              {completedDate.toLocaleDateString('en-US', { year: 'numeric' })}
            </div>
          </div>

          {/* Topic */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${getCategoryColor(
                  debate.topic.category
                )}`}
              >
                {debate.topic.category}
              </span>
            </div>
            <p className="text-sm text-gray-900">
              {debate.topic.title}
            </p>
          </div>

          {/* Matchup */}
          <div className="w-64 flex-shrink-0 hidden md:block">
            <div className="flex items-center gap-2">
              {/* Pro */}
              <div
                className={`flex-1 text-right ${
                  proWon ? 'font-semibold' : 'text-gray-500'
                }`}
              >
                <div
                  className={`text-sm truncate flex items-center justify-end gap-1 ${
                    proWon ? 'text-gray-900' : 'text-gray-600'
                  }`}
                >
                  {proWon && (
                    <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="truncate">{debate.debater_pro.name}</span>
                </div>
                <div className={`text-xs ${getProviderColor(debate.debater_pro.provider)}`}>
                  PRO
                </div>
              </div>

              {/* VS */}
              <div className="text-xs text-gray-400 px-2">vs</div>

              {/* Con */}
              <div
                className={`flex-1 ${
                  conWon ? 'font-semibold' : 'text-gray-500'
                }`}
              >
                <div
                  className={`text-sm truncate flex items-center gap-1 ${
                    conWon ? 'text-gray-900' : 'text-gray-600'
                  }`}
                >
                  <span className="truncate">{debate.debater_con.name}</span>
                  {conWon && (
                    <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className={`text-xs ${getProviderColor(debate.debater_con.provider)}`}>
                  CON
                </div>
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="w-24 flex-shrink-0 text-center hidden sm:block">
            {debate.pro_score !== null && debate.con_score !== null ? (
              <div className="flex items-center justify-center gap-1">
                <span
                  className={`font-mono text-sm ${
                    proWon ? 'text-green-600 font-semibold' : 'text-gray-500'
                  }`}
                >
                  {debate.pro_score}
                </span>
                <span className="text-gray-300">-</span>
                <span
                  className={`font-mono text-sm ${
                    conWon ? 'text-green-600 font-semibold' : 'text-gray-500'
                  }`}
                >
                  {debate.con_score}
                </span>
              </div>
            ) : (
              <span className="text-gray-400 text-sm">—</span>
            )}
          </div>

          {/* Judge */}
          <div className="w-28 flex-shrink-0 hidden lg:block text-center pl-4 border-l border-gray-200">
            <div className="text-sm text-gray-900 truncate">
              {debate.judge.name}
            </div>
            <div className={`text-xs ${getProviderColor(debate.judge.provider)}`}>
              {debate.judge.provider}
            </div>
          </div>

          {/* Expand Icon */}
          <div className="w-8 flex-shrink-0 flex justify-center">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column - Matchup Details */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Matchup Details
              </h4>

              {/* Pro Debater */}
              <div
                className={`p-3 rounded-lg mb-2 ${
                  proWon ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-green-600 uppercase">
                      Pro
                    </span>
                    <Link href={`/models/${generateSlug(debate.debater_pro.name)}`} className="block hover:text-primary-600">
                      <p className="font-medium text-gray-900">
                        {debate.debater_pro.name}
                      </p>
                    </Link>
                    <p className={`text-xs ${getProviderColor(debate.debater_pro.provider)}`}>
                      {debate.debater_pro.provider} • <a href="/elo" className="hover:underline">Elo</a> {debate.debater_pro.elo_rating}
                    </p>
                  </div>
                  {debate.pro_score !== null && (
                    <div className="text-right">
                      <span
                        className={`text-2xl font-mono font-bold ${
                          proWon ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        {debate.pro_score}
                      </span>
                      {proWon && (
                        <p className="text-xs text-green-600 font-medium">Winner</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Con Debater */}
              <div
                className={`p-3 rounded-lg ${
                  conWon ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-red-600 uppercase">
                      Con
                    </span>
                    <Link href={`/models/${generateSlug(debate.debater_con.name)}`} className="block hover:text-primary-600">
                      <p className="font-medium text-gray-900">
                        {debate.debater_con.name}
                      </p>
                    </Link>
                    <p className={`text-xs ${getProviderColor(debate.debater_con.provider)}`}>
                      {debate.debater_con.provider} • <a href="/elo" className="hover:underline">Elo</a> {debate.debater_con.elo_rating}
                    </p>
                  </div>
                  {debate.con_score !== null && (
                    <div className="text-right">
                      <span
                        className={`text-2xl font-mono font-bold ${
                          conWon ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        {debate.con_score}
                      </span>
                      {conWon && (
                        <p className="text-xs text-green-600 font-medium">Winner</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Meta Info */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Debate Info
              </h4>
              <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Judge</span>
                  <span className="text-gray-900">{debate.judge.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-900">
                    {completedDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Category</span>
                  <span className="text-gray-900">{debate.topic.category}</span>
                </div>
              </div>

              {/* View Full Debate Button */}
              <Link
                href={`/debates/${debate.id}`}
                className="btn-primary w-full mt-4 text-center block"
              >
                View Full Debate
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
