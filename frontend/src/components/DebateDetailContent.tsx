'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DebateDetail, VoteTally, voteOnDebate, generateSlug } from '@/lib/api';
import { useToastActions } from './Toast';

// Social share button component
function ShareButtons({ debate }: { debate: DebateDetail }) {
  const toast = useToastActions();
  const [copied, setCopied] = useState(false);

  // Get the current URL (will work client-side)
  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return '';
  };

  const shareText = `AI Debate: "${debate.topic.title}" - ${debate.debater_pro.name} vs ${debate.debater_con.name}`;
  const hashtags = 'AI,AIDebate,Robuttal';

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(getShareUrl())}&hashtags=${hashtags}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
  };

  const handleRedditShare = () => {
    const url = `https://www.reddit.com/submit?url=${encodeURIComponent(getShareUrl())}&title=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 mr-1">Share:</span>

      {/* Twitter/X */}
      <button
        onClick={handleTwitterShare}
        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        title="Share on X (Twitter)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* Facebook */}
      <button
        onClick={handleFacebookShare}
        className="p-2 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 transition-colors"
        title="Share on Facebook"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>

      {/* LinkedIn */}
      <button
        onClick={handleLinkedInShare}
        className="p-2 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 transition-colors"
        title="Share on LinkedIn"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </button>

      {/* Reddit */}
      <button
        onClick={handleRedditShare}
        className="p-2 rounded-lg bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-orange-600 transition-colors"
        title="Share on Reddit"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className={`p-2 rounded-lg transition-colors ${
          copied
            ? 'bg-green-100 text-green-600'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
        }`}
        title="Copy link"
      >
        {copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        )}
      </button>
    </div>
  );
}

// Score breakdown by category
interface CategoryScores {
  logical_consistency: number;
  evidence: number;
  persuasiveness: number;
  engagement: number;
}

// Category analysis from judge
interface CategoryAnalysis {
  logical_consistency?: string;
  evidence?: string;
  persuasiveness?: string;
  engagement?: string;
}

// Parse judgment JSON content
function parseJudgmentContent(content: string): {
  pro_scores?: CategoryScores;
  con_scores?: CategoryScores;
  category_analysis?: CategoryAnalysis;
  winner?: string;
  reasoning?: string;
} | null {
  try {
    const parsed = JSON.parse(content.trim());
    if (parsed.pro_scores || parsed.pro_score !== undefined) return parsed;
  } catch {
    const match = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        // Fall through
      }
    }
  }
  return null;
}

// Criterion analysis from auditor
interface CriterionAnalysis {
  accuracy?: string;
  fairness?: string;
  thoroughness?: string;
  reasoning_quality?: string;
}

// Parse audit JSON content
function parseAuditContent(content: string): {
  accuracy?: number;
  fairness?: number;
  thoroughness?: number;
  reasoning_quality?: number;
  criterion_analysis?: CriterionAnalysis;
  overall_score?: number;
  notes?: string;
} | null {
  try {
    const parsed = JSON.parse(content.trim());
    if (parsed.accuracy !== undefined) return parsed;
  } catch {
    const match = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        // Fall through
      }
    }
  }
  return null;
}

// Category descriptions for tooltips
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Logical Consistency': 'Are arguments internally coherent and free of contradictions?',
  'Evidence & Examples': 'Are claims supported with concrete examples or reasoning?',
  'Persuasiveness': 'How compelling and convincing is the overall case?',
  'Engagement': 'How well did they address and counter opponent\'s points?',
};

// Score comparison bar - stacked bars for direct comparison
function ScoreComparisonBar({ label, proScore, conScore, maxScore = 25, analysis }: {
  label: string;
  proScore: number;
  conScore: number;
  maxScore?: number;
  analysis?: string;
}) {
  const proPercent = (proScore / maxScore) * 100;
  const conPercent = (conScore / maxScore) * 100;
  const proWins = proScore > conScore;
  const conWins = conScore > proScore;
  const description = CATEGORY_DESCRIPTIONS[label];

  return (
    <div className="mb-5 last:mb-0 group">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5 cursor-help" title={description}>
          {label}
          {description && (
            <svg className="w-3.5 h-3.5 text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </span>
        <span className="text-xs text-gray-400">/{maxScore}</span>
      </div>
      {/* Tooltip on hover */}
      {description && (
        <div className="hidden group-hover:block text-xs text-gray-500 mb-2 -mt-0.5">{description}</div>
      )}
      {/* Stacked bars for direct comparison */}
      <div className="space-y-1">
        {/* Pro bar */}
        <div className={`flex items-center gap-2 transition-opacity ${conWins ? 'opacity-40' : ''}`}>
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-green-500"
              style={{ width: `${proPercent}%` }}
            />
          </div>
          <span className={`text-xs font-semibold w-6 text-right ${proWins ? 'text-green-600' : 'text-gray-400'}`}>{proScore}</span>
        </div>
        {/* Con bar */}
        <div className={`flex items-center gap-2 transition-opacity ${proWins ? 'opacity-40' : ''}`}>
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-red-500"
              style={{ width: `${conPercent}%` }}
            />
          </div>
          <span className={`text-xs font-semibold w-6 text-right ${conWins ? 'text-red-600' : 'text-gray-400'}`}>{conScore}</span>
        </div>
      </div>
      {/* Category analysis from judge */}
      {analysis && (
        <div className="mt-2 text-xs text-gray-600 leading-relaxed bg-white rounded p-2 border border-gray-100">
          {analysis}
        </div>
      )}
    </div>
  );
}

// Judgment entry content with score visualization
function JudgmentEntryContent({ content, proName, conName }: { content: string; proName: string; conName: string }) {
  const parsed = parseJudgmentContent(content);

  if (!parsed || !parsed.pro_scores || !parsed.con_scores) {
    // Fall back to plain text for old format judgments
    return (
      <div className="text-gray-700 leading-7">
        {content.split(/\n\n+/).map((paragraph, idx) => (
          <p key={idx} className={idx > 0 ? 'mt-4' : ''}>
            {paragraph.trim()}
          </p>
        ))}
      </div>
    );
  }

  const proTotal = parsed.pro_scores.logical_consistency + parsed.pro_scores.evidence +
                   parsed.pro_scores.persuasiveness + parsed.pro_scores.engagement;
  const conTotal = parsed.con_scores.logical_consistency + parsed.con_scores.evidence +
                   parsed.con_scores.persuasiveness + parsed.con_scores.engagement;

  return (
    <div className="space-y-6">
      {/* Score Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-gray-900">Score Breakdown</h4>
          <div className="flex gap-6 text-sm">
            <span className="text-green-600 font-semibold">PRO: {proTotal}</span>
            <span className="text-red-600 font-semibold">CON: {conTotal}</span>
          </div>
        </div>
        <ScoreComparisonBar
          label="Logical Consistency"
          proScore={parsed.pro_scores.logical_consistency}
          conScore={parsed.con_scores.logical_consistency}
          analysis={parsed.category_analysis?.logical_consistency}
        />
        <ScoreComparisonBar
          label="Evidence & Examples"
          proScore={parsed.pro_scores.evidence}
          conScore={parsed.con_scores.evidence}
          analysis={parsed.category_analysis?.evidence}
        />
        <ScoreComparisonBar
          label="Persuasiveness"
          proScore={parsed.pro_scores.persuasiveness}
          conScore={parsed.con_scores.persuasiveness}
          analysis={parsed.category_analysis?.persuasiveness}
        />
        <ScoreComparisonBar
          label="Engagement"
          proScore={parsed.pro_scores.engagement}
          conScore={parsed.con_scores.engagement}
          analysis={parsed.category_analysis?.engagement}
        />
      </div>

      {/* Winner Declaration - Premium Design */}
      {parsed.winner && (
        <div className={`relative overflow-hidden rounded-xl ${
          parsed.winner === 'pro'
            ? 'bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900'
            : 'bg-gradient-to-br from-gray-900 via-rose-950 to-gray-900'
        }`}>
          {/* Background glow */}
          <div className={`absolute inset-0 ${
            parsed.winner === 'pro'
              ? 'bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0'
              : 'bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-500/0'
          }`} />

          {/* Decorative elements */}
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 ${
            parsed.winner === 'pro' ? 'bg-emerald-400' : 'bg-rose-400'
          }`} />

          <div className="relative px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                  parsed.winner === 'pro'
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${parsed.winner === 'pro' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  Winner
                </span>
                <p className="text-white font-semibold mt-1">
                  {parsed.winner === 'pro' ? proName : conName}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {parsed.winner.toUpperCase()} side
                </p>
              </div>
              <div className={`text-2xl font-bold font-mono ${
                parsed.winner === 'pro' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {proTotal} - {conTotal}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reasoning */}
      {parsed.reasoning && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Judge&apos;s Reasoning</div>
          <div className="text-gray-700 leading-7">
            {parsed.reasoning.split(/\n\n+/).map((paragraph, idx) => (
              <p key={idx} className={idx > 0 ? 'mt-4' : ''}>
                {paragraph.trim()}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Audit score bar with analysis (single metric 0-10)
function AuditScoreBar({ label, score, analysis, maxScore = 10 }: {
  label: string;
  score: number;
  analysis?: string;
  maxScore?: number;
}) {
  const percent = (score / maxScore) * 100;
  const color = score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="mb-5 last:mb-0">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{score}/{maxScore}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
      {analysis && (
        <div className="mt-2 text-xs text-gray-600 leading-relaxed bg-white rounded p-2 border border-gray-100">
          {analysis}
        </div>
      )}
    </div>
  );
}

// Audit entry content with score visualization
function AuditEntryContent({ content }: { content: string }) {
  const parsed = parseAuditContent(content);

  if (!parsed || parsed.accuracy === undefined) {
    // Fall back to plain text
    return (
      <div className="text-gray-700 leading-7">
        {content.split(/\n\n+/).map((paragraph, idx) => (
          <p key={idx} className={idx > 0 ? 'mt-4' : ''}>
            {paragraph.trim()}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audit Scores */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-gray-900">Judge Performance Audit</h4>
          {parsed.overall_score !== undefined && (
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              parsed.overall_score >= 8 ? 'bg-green-100 text-green-800' :
              parsed.overall_score >= 6 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              Overall: {parsed.overall_score.toFixed(1)}/10
            </span>
          )}
        </div>
        {parsed.accuracy !== undefined && (
          <AuditScoreBar
            label="Accuracy"
            score={parsed.accuracy}
            analysis={parsed.criterion_analysis?.accuracy}
          />
        )}
        {parsed.fairness !== undefined && (
          <AuditScoreBar
            label="Fairness"
            score={parsed.fairness}
            analysis={parsed.criterion_analysis?.fairness}
          />
        )}
        {parsed.thoroughness !== undefined && (
          <AuditScoreBar
            label="Thoroughness"
            score={parsed.thoroughness}
            analysis={parsed.criterion_analysis?.thoroughness}
          />
        )}
        {parsed.reasoning_quality !== undefined && (
          <AuditScoreBar
            label="Reasoning Quality"
            score={parsed.reasoning_quality}
            analysis={parsed.criterion_analysis?.reasoning_quality}
          />
        )}
      </div>

      {/* Auditor Summary */}
      {parsed.notes && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Summary</div>
          <div className="text-gray-700 leading-7">
            {parsed.notes.split(/\n\n+/).map((paragraph, idx) => (
              <p key={idx} className={idx > 0 ? 'mt-4' : ''}>
                {paragraph.trim()}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface DebateDetailContentProps {
  debate: DebateDetail;
  initialVotes: VoteTally | null;
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

// Compact Elo delta badge for mobile
function EloDeltaBadge({ before, after }: { before: number | null; after: number | null }) {
  if (before === null || after === null) return null;

  const delta = after - before;
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
      isPositive
        ? 'bg-green-100 text-green-700'
        : isNegative
        ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-500'
    }`}>
      {isPositive ? '↑' : isNegative ? '↓' : '→'}
      {Math.abs(delta)}
    </span>
  );
}

// Elo sparkline visualization component with 1500 baseline
function EloSparkline({ before, after }: { before: number | null; after: number | null }) {
  if (before === null || after === null) return null;

  const delta = after - before;
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  // Build data points (just before/after for now, can add history later)
  const dataPoints = [before, after];

  // SVG dimensions
  const width = 64;
  const height = 24;
  const paddingX = 3;
  const paddingY = 4;

  // Calculate scale based on data range, ensuring 1500 is visible
  const allValues = [...dataPoints, 1500];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 50;

  // Add some padding to the range
  const paddedMin = minVal - range * 0.1;
  const paddedMax = maxVal + range * 0.1;
  const paddedRange = paddedMax - paddedMin;

  // Scale functions
  const scaleX = (i: number) => paddingX + (i / (dataPoints.length - 1)) * (width - paddingX * 2);
  const scaleY = (val: number) => paddingY + (1 - (val - paddedMin) / paddedRange) * (height - paddingY * 2);

  // Calculate 1500 baseline Y position
  const baseline1500Y = scaleY(1500);
  const showBaseline = baseline1500Y > paddingY && baseline1500Y < height - paddingY;

  // Build path
  const pathD = dataPoints
    .map((val, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(val)}`)
    .join(' ');

  // Line color
  const strokeColor = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#9ca3af';

  return (
    <div className="flex items-center justify-center gap-1.5 mt-2">
      <svg width={width} height={height} className="overflow-visible">
        {/* 1500 baseline */}
        {showBaseline && (
          <line
            x1={0}
            y1={baseline1500Y}
            x2={width}
            y2={baseline1500Y}
            stroke="#d1d5db"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        )}
        {/* Area fill under line */}
        <path
          d={`${pathD} L ${scaleX(dataPoints.length - 1)} ${height - paddingY} L ${scaleX(0)} ${height - paddingY} Z`}
          fill={strokeColor}
          fillOpacity={0.15}
        />
        {/* Main line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {dataPoints.map((val, i) => (
          <circle
            key={i}
            cx={scaleX(i)}
            cy={scaleY(val)}
            r={i === dataPoints.length - 1 ? 3 : 2}
            fill={i === dataPoints.length - 1 ? strokeColor : 'white'}
            stroke={strokeColor}
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div className="flex flex-col items-start">
        <span className={`text-xs font-bold font-mono leading-none ${
          isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
        }`}>
          {isPositive ? '+' : ''}{delta}
        </span>
        <span className="text-[10px] text-gray-400 font-mono leading-none mt-0.5">
          {after}
        </span>
      </div>
    </div>
  );
}

// Phase descriptions for context - matches TranscriptViewer
const PHASE_INFO: Record<string, { title: string; description: string; icon: string }> = {
  opening: {
    title: 'Opening Statements',
    description: 'Each debater presents their initial position and key arguments.',
    icon: '1',
  },
  rebuttal: {
    title: 'Rebuttals',
    description: 'Debaters respond to their opponent\'s opening arguments.',
    icon: '2',
  },
  cross_examination: {
    title: 'Cross-Examination',
    description: 'Direct questions and answers between debaters to probe weaknesses.',
    icon: '3',
  },
  closing: {
    title: 'Closing Arguments',
    description: 'Final summaries reinforcing key points and addressing opponent\'s rebuttals.',
    icon: '4',
  },
  judgment: {
    title: 'Judgment',
    description: 'An independent AI judge evaluates both performances and declares a winner.',
    icon: '⚖',
  },
  audit: {
    title: 'Judge Audit',
    description: 'A meta-judge reviews the quality and fairness of the judgment.',
    icon: '🔍',
  },
};

function getPhaseLabel(phase: string): string {
  return PHASE_INFO[phase]?.title || phase;
}

// Parse substitution notice content
interface SubstitutionInfo {
  excusedModel: string;
  replacementModel: string;
  role: string;
}

function parseSubstitutionNotice(content: string): SubstitutionInfo | null {
  const match = content.match(
    /\[SUBSTITUTION NOTICE: (.+?) was unable to continue due to content policy restrictions\. (.+?) has been substituted as the (.+?)\.\]/
  );
  if (match) {
    return {
      excusedModel: match[1],
      replacementModel: match[2],
      role: match[3].toLowerCase(),
    };
  }
  return null;
}

// Check if an entry is a substitution notice
function isSubstitutionNotice(content: string): boolean {
  return content.startsWith('[SUBSTITUTION NOTICE:');
}

// Substitution notice banner component
function SubstitutionBanner({ notices }: { notices: { id: string; content: string }[] }) {
  if (notices.length === 0) return null;

  const parsed = notices.map(n => ({
    entry: n,
    info: parseSubstitutionNotice(n.content),
  })).filter(n => n.info !== null);

  if (parsed.length === 0) return null;

  return (
    <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border-b border-gray-200">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-gray-400">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          <span>Safety filter substitution</span>
        </div>
        <span className="text-gray-300 hidden sm:inline">|</span>
        {parsed.map(({ entry, info }, idx) => (
          <span key={entry.id} className="flex items-center">
            {idx > 0 && <span className="text-gray-300 mx-2">·</span>}
            <span className="text-gray-500">{info!.excusedModel}</span>
            <span className="text-gray-400 mx-1.5">→</span>
            <span className="text-gray-600 font-medium">{info!.replacementModel}</span>
            <span className="text-gray-400 ml-1.5 px-1.5 py-0.5 bg-gray-100 rounded">{info!.role}</span>
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1.5">
        The original model&apos;s content filter blocked the debate topic. A replacement model completed the role.
      </p>
    </div>
  );
}

export default function DebateDetailContent({
  debate,
  initialVotes,
}: DebateDetailContentProps) {
  const [votes, setVotes] = useState<VoteTally | null>(initialVotes);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const toast = useToastActions();

  const proWon = debate.winner?.id === debate.debater_pro.id;
  const conWon = debate.winner?.id === debate.debater_con.id;

  const completedDate = debate.completed_at
    ? new Date(debate.completed_at)
    : new Date(debate.scheduled_at);

  // Separate substitution notices from regular entries
  const substitutionNotices = debate.transcript.filter(e => isSubstitutionNotice(e.content));
  const regularEntries = debate.transcript.filter(e => !isSubstitutionNotice(e.content));

  // Group transcript by phase (only regular entries)
  const phases = ['opening', 'rebuttal', 'cross_examination', 'closing', 'judgment', 'audit'];
  const transcriptByPhase = phases.reduce((acc, phase) => {
    acc[phase] = regularEntries
      .filter((entry) => entry.phase === phase)
      .sort((a, b) => a.sequence_order - b.sequence_order);
    return acc;
  }, {} as Record<string, typeof debate.transcript>);

  const filteredPhases = selectedPhase
    ? phases.filter((p) => p === selectedPhase)
    : phases;

  const handleVote = async (modelId: string) => {
    if (hasVoted || isVoting) return;

    setIsVoting(true);
    try {
      // Generate fingerprint
      const components = [
        navigator.userAgent,
        navigator.language,
        new Date().getTimezoneOffset(),
        screen.width,
        screen.height,
      ];
      const str = components.join('|');
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      const fingerprint = `fp_${Math.abs(hash).toString(36)}`;

      await voteOnDebate(debate.id, {
        model_id: modelId,
        fingerprint,
        ip_address: '',
      });

      setHasVoted(true);
      toast.success('Vote submitted! Thanks for participating.');
      // Optimistically update vote count
      if (votes) {
        const isPro = modelId === debate.debater_pro.id;
        setVotes({
          ...votes,
          total_votes: votes.total_votes + 1,
          pro_votes: isPro ? votes.pro_votes + 1 : votes.pro_votes,
          con_votes: isPro ? votes.con_votes : votes.con_votes + 1,
        });
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to submit vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="container-narrow py-4 sm:py-8 px-4 sm:px-0">
      {/* Breadcrumb */}
      <div className="mb-3 sm:mb-4">
        <Link
          href="/archive"
          className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Archive
        </Link>
      </div>

      {/* Debate Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                debate.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {debate.status === 'completed' ? 'Completed' : debate.status}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(
                debate.topic.category
              )}`}
            >
              {debate.topic.category}
            </span>
            <span className="text-gray-400 hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              {completedDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="hidden sm:block">
            <ShareButtons debate={debate} />
          </div>
        </div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{debate.topic.title}</h1>
      </div>

      {/* Matchup Card */}
      <div className="card mb-6 sm:mb-8">
        <div className="card-body">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
            {/* Pro */}
            <div className={`text-center ${proWon ? '' : 'opacity-75'}`}>
              <div className="text-[10px] sm:text-xs font-semibold text-green-600 uppercase tracking-wide mb-0.5 sm:mb-1">
                Pro
              </div>
              <Link href={`/models/${generateSlug(debate.debater_pro.name)}`} className="hover:text-primary-600">
                <div className="font-semibold text-gray-900 text-xs sm:text-base truncate">{debate.debater_pro.name}</div>
              </Link>
              <div className="text-[10px] sm:text-xs text-gray-500">
                {debate.debater_pro.elo_rating} Elo
              </div>
              {debate.pro_score !== null && (
                <div
                  className={`text-xl sm:text-3xl font-bold font-mono mt-1 sm:mt-2 ${
                    proWon ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {debate.pro_score}
                </div>
              )}
              {proWon && (
                <span className="inline-block mt-1 sm:mt-2 px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 text-[10px] sm:text-xs font-semibold rounded">
                  Winner
                </span>
              )}
              {/* Mobile: compact badge */}
              <div className="sm:hidden mt-1">
                <EloDeltaBadge before={debate.pro_elo_before} after={debate.pro_elo_after} />
              </div>
              {/* Desktop: full sparkline */}
              <div className="hidden sm:block">
                <EloSparkline before={debate.pro_elo_before} after={debate.pro_elo_after} />
              </div>
            </div>

            {/* VS */}
            <div className="text-center">
              <div className="text-xl sm:text-4xl font-bold text-gray-200">vs</div>
            </div>

            {/* Con */}
            <div className={`text-center ${conWon ? '' : 'opacity-75'}`}>
              <div className="text-[10px] sm:text-xs font-semibold text-red-600 uppercase tracking-wide mb-0.5 sm:mb-1">
                Con
              </div>
              <Link href={`/models/${generateSlug(debate.debater_con.name)}`} className="hover:text-primary-600">
                <div className="font-semibold text-gray-900 text-xs sm:text-base truncate">{debate.debater_con.name}</div>
              </Link>
              <div className="text-[10px] sm:text-xs text-gray-500">
                {debate.debater_con.elo_rating} Elo
              </div>
              {debate.con_score !== null && (
                <div
                  className={`text-xl sm:text-3xl font-bold font-mono mt-1 sm:mt-2 ${
                    conWon ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {debate.con_score}
                </div>
              )}
              {conWon && (
                <span className="inline-block mt-1 sm:mt-2 px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 text-[10px] sm:text-xs font-semibold rounded">
                  Winner
                </span>
              )}
              {/* Mobile: compact badge */}
              <div className="sm:hidden mt-1">
                <EloDeltaBadge before={debate.con_elo_before} after={debate.con_elo_after} />
              </div>
              {/* Desktop: full sparkline */}
              <div className="hidden sm:block">
                <EloSparkline before={debate.con_elo_before} after={debate.con_elo_after} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="card">
          <div className="card-body py-3 sm:py-4 text-center">
            <div className="text-base sm:text-lg font-bold font-mono text-gray-900">
              {debate.judge_score !== null ? debate.judge_score.toFixed(1) : '—'}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500">Judge Score</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body py-3 sm:py-4 text-center">
            <div className="text-base sm:text-lg font-bold font-mono text-gray-900">
              {votes?.agreement_with_judge !== null && votes?.agreement_with_judge !== undefined
                ? `${votes.agreement_with_judge.toFixed(0)}%`
                : '—'}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500">Agree w/ Judge</div>
          </div>
        </div>
      </div>

      {/* Phase Filter */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedPhase(null)}
          className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full transition-colors whitespace-nowrap ${
            selectedPhase === null
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {phases.map((phase) => (
          <button
            key={phase}
            onClick={() => setSelectedPhase(phase)}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full transition-colors whitespace-nowrap ${
              selectedPhase === phase
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {getPhaseLabel(phase)}
          </button>
        ))}
      </div>

      {/* Transcript */}
      <div className="card mb-6 sm:mb-8">
        <div className="card-header">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Transcript</h2>
        </div>

        {/* Substitution Notices */}
        <SubstitutionBanner notices={substitutionNotices} />

        <div className="divide-y divide-gray-100">
          {filteredPhases.map((phase) => {
            const entries = transcriptByPhase[phase];
            if (!entries || entries.length === 0) return null;
            const phaseInfo = PHASE_INFO[phase];

            return (
              <div key={phase}>
                {/* Phase Header with icon and description */}
                {phaseInfo && (
                  <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs sm:text-sm font-bold">
                        {phaseInfo.icon}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                          {phaseInfo.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">
                          {phaseInfo.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Entries */}
                {entries.map((entry, indexInPhase) => {
                  const isPro = entry.position === 'pro';
                  const isCon = entry.position === 'con';
                  const isJudge = entry.position === 'judge';
                  const isAuditor = entry.position === 'auditor';

                  // For cross-examination, determine if this is a question or answer
                  // Pattern: PRO asks (Q), CON answers (A), CON asks (Q), PRO answers (A)
                  const isCrossExam = phase === 'cross_examination';
                  const crossExamRole = isCrossExam
                    ? (indexInPhase % 2 === 0 ? 'Question' : 'Answer')
                    : null;

                  let speakerColor = 'text-gray-600';
                  let bgColor = '';

                  if (isPro) {
                    speakerColor = 'text-blue-600';
                    bgColor = 'bg-blue-50/50';
                  } else if (isCon) {
                    speakerColor = 'text-red-600';
                    bgColor = 'bg-red-50/50';
                  } else if (isJudge) {
                    speakerColor = 'text-purple-600';
                    bgColor = 'bg-purple-50/50';
                  } else if (isAuditor) {
                    speakerColor = 'text-indigo-600';
                    bgColor = 'bg-indigo-50/50';
                  }

                  return (
                    <div key={entry.id} className={`px-3 sm:px-6 py-3 sm:py-5 ${bgColor}`}>
                      {/* Speaker Header */}
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${speakerColor}`}>
                          {entry.position?.toUpperCase() || 'Speaker'}
                        </span>
                        {crossExamRole && (
                          <span className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded ${
                            crossExamRole === 'Question'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {crossExamRole}
                          </span>
                        )}
                        <span className="text-gray-400">—</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                          {entry.speaker_name}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="transcript-content">
                        {entry.phase === 'judgment' ? (
                          <JudgmentEntryContent
                            content={entry.content}
                            proName={debate.debater_pro.name}
                            conName={debate.debater_con.name}
                          />
                        ) : entry.phase === 'audit' ? (
                          <AuditEntryContent content={entry.content} />
                        ) : (
                          <div className="text-gray-700 leading-7">
                            {entry.content.split(/\n\n+/).map((paragraph, idx) => (
                              <p key={idx} className={idx > 0 ? 'mt-4' : ''}>
                                {paragraph.trim()}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Judge Info */}
      <div className="card mb-6 sm:mb-8">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Judging</h2>
            <div className="relative group">
              <span
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium cursor-help flex items-center gap-1 ${
                  debate.is_blinded
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {debate.is_blinded ? 'Blinded' : 'Unblinded'}
                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="font-semibold mb-1">
                  {debate.is_blinded ? 'Blinded Evaluation' : 'Unblinded Evaluation'}
                </div>
                <p className="text-gray-300 leading-relaxed">
                  {debate.is_blinded
                    ? 'The judge evaluated this debate without knowing which AI models were debating. Models were identified only as "Debater A" and "Debater B" to prevent potential bias.'
                    : 'The judge knew which AI models were debating (PRO and CON positions). This allows us to study whether model identity influences judging.'
                  }
                </p>
                <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
              </div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Judged by {debate.judge.name}
          </p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <div className="text-xs sm:text-sm text-gray-500 mb-1">Judge</div>
              <Link href={`/models/${generateSlug(debate.judge.name)}`} className="hover:text-primary-600">
                <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{debate.judge.name}</div>
              </Link>
              <div className={`text-[10px] sm:text-xs ${getProviderColor(debate.judge.provider)}`}>
                {debate.judge.provider}
              </div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-gray-500 mb-1">Meta-Auditor</div>
              <Link href={`/models/${generateSlug(debate.auditor.name)}`} className="hover:text-primary-600">
                <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{debate.auditor.name}</div>
              </Link>
              <div className={`text-[10px] sm:text-xs ${getProviderColor(debate.auditor.provider)}`}>
                {debate.auditor.provider}
              </div>
            </div>
          </div>
          {debate.judge_score !== null && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-500">Judge Performance</span>
                <span className="text-base sm:text-lg font-bold font-mono text-gray-900">
                  {debate.judge_score.toFixed(1)}/10
                </span>
              </div>
              <div className="mt-2 h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    debate.judge_score >= 8
                      ? 'bg-green-500'
                      : debate.judge_score >= 6
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${(debate.judge_score / 10) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Community Vote */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Community Vote</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Who do you think should have won?</p>
        </div>
        <div className="card-body">
          {votes && votes.total_votes > 0 && (
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center gap-1 sm:gap-2 mb-2">
                <div
                  className="h-2 sm:h-3 bg-green-500 rounded-l transition-all"
                  style={{ width: `${votes.pro_model.percentage}%` }}
                />
                <div
                  className="h-2 sm:h-3 bg-red-500 rounded-r transition-all"
                  style={{ width: `${votes.con_model.percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-green-600 font-medium">
                  {votes.pro_model.votes} ({votes.pro_model.percentage.toFixed(0)}%)
                </span>
                <span className="text-red-600 font-medium">
                  {votes.con_model.votes} ({votes.con_model.percentage.toFixed(0)}%)
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => handleVote(debate.debater_pro.id)}
              disabled={hasVoted || isVoting}
              className={`flex-1 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors ${
                hasVoted
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Vote Pro
            </button>
            <button
              onClick={() => handleVote(debate.debater_con.id)}
              disabled={hasVoted || isVoting}
              className={`flex-1 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors ${
                hasVoted
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Vote Con
            </button>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 text-center mt-3 sm:mt-4">
            {votes?.total_votes || 0} votes cast
            {hasVoted && ' • Thanks!'}
          </p>
        </div>
      </div>

      {/* Social Sharing - Bottom */}
      <div className="mt-6 sm:mt-8 flex flex-col items-center gap-2">
        <span className="text-sm text-gray-500">Share this debate</span>
        <ShareButtons debate={debate} />
      </div>
    </div>
  );
}
