'use client';

import { useState, useMemo } from 'react';
import { TranscriptEntry, ModelSummary } from '@/lib/api';
import {
  getPhaseShortName,
  getPositionColor,
  getPositionBgColor,
  MAIN_DEBATE_PHASES,
  DEBATE_PHASES,
} from '@/lib/utils';

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

// Parse JSON content from judgment/audit entries
function parseJudgmentContent(content: string): {
  pro_score?: number;
  con_score?: number;
  pro_scores?: CategoryScores;
  con_scores?: CategoryScores;
  category_analysis?: CategoryAnalysis;
  winner?: string;
  reasoning?: string;
} | null {
  try {
    // Try direct parse
    const parsed = JSON.parse(content.trim());
    if (parsed.pro_scores !== undefined || parsed.pro_score !== undefined) return parsed;
  } catch {
    // Try to extract from code block
    const match = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        // Fall through
      }
    }
    // Try to find raw JSON
    const jsonMatch = content.match(/\{[\s\S]*"(pro_score|pro_scores)"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
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
    const jsonMatch = content.match(/\{[\s\S]*"accuracy"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
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

// Score bar component for visualization - stacked bars for comparison
function ScoreBar({ label, proScore, conScore, maxScore = 25, analysis }: {
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
    <div className="mb-5 group">
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
              className="h-full rounded-full transition-all duration-500 bg-emerald-500"
              style={{ width: `${proPercent}%` }}
            />
          </div>
          <span className={`text-xs font-semibold w-6 text-right ${proWins ? 'text-emerald-600' : 'text-gray-400'}`}>{proScore}</span>
        </div>
        {/* Con bar */}
        <div className={`flex items-center gap-2 transition-opacity ${proWins ? 'opacity-40' : ''}`}>
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-rose-500"
              style={{ width: `${conPercent}%` }}
            />
          </div>
          <span className={`text-xs font-semibold w-6 text-right ${conWins ? 'text-rose-600' : 'text-gray-400'}`}>{conScore}</span>
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

// Judgment content renderer
function JudgmentContent({ content, debaterPro, debaterCon }: {
  content: string;
  debaterPro: ModelSummary;
  debaterCon: ModelSummary;
}) {
  const parsed = useMemo(() => parseJudgmentContent(content), [content]);

  if (!parsed) {
    // Fallback to plain text if parsing fails
    return <p className="text-gray-700">{content}</p>;
  }

  // Calculate totals - support both old and new format
  const proTotal = parsed.pro_scores
    ? (parsed.pro_scores.logical_consistency || 0) +
      (parsed.pro_scores.evidence || 0) +
      (parsed.pro_scores.persuasiveness || 0) +
      (parsed.pro_scores.engagement || 0)
    : parsed.pro_score || 0;

  const conTotal = parsed.con_scores
    ? (parsed.con_scores.logical_consistency || 0) +
      (parsed.con_scores.evidence || 0) +
      (parsed.con_scores.persuasiveness || 0) +
      (parsed.con_scores.engagement || 0)
    : parsed.con_score || 0;

  const hasDetailedScores = parsed.pro_scores && parsed.con_scores;

  const isPro = parsed.winner === 'pro';
  const winnerName = isPro ? debaterPro.name : debaterCon.name;
  const loserName = isPro ? debaterCon.name : debaterPro.name;
  const winnerScore = isPro ? proTotal : conTotal;
  const loserScore = isPro ? conTotal : proTotal;

  return (
    <div className="space-y-5">
      {/* Winner Banner - Premium Design */}
      <div className={`relative overflow-hidden rounded-xl ${
        isPro
          ? 'bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900'
          : 'bg-gradient-to-br from-gray-900 via-rose-950 to-gray-900'
      }`}>
        {/* Animated background glow */}
        <div className={`absolute inset-0 ${
          isPro
            ? 'bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0'
            : 'bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-500/0'
        }`} />

        {/* Decorative elements */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${
          isPro ? 'bg-emerald-400' : 'bg-rose-400'
        }`} />
        <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15 ${
          isPro ? 'bg-emerald-500' : 'bg-rose-500'
        }`} />

        <div className="relative px-4 sm:px-6 py-4 sm:py-6">

          {/* Winner Label */}
          <div className="text-center mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider ${
              isPro
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPro ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              Winner
            </span>
          </div>

          {/* Winner Name */}
          <div className="text-center mb-3 sm:mb-4">
            <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
              {winnerName}
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">defeats {loserName}</p>
          </div>

          {/* Score Display */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <div className={`text-2xl sm:text-4xl font-bold font-mono ${isPro ? 'text-emerald-400' : 'text-rose-400'}`}>
              {winnerScore}
            </div>
            <div className="text-gray-500 text-base sm:text-lg font-light">—</div>
            <div className="text-2xl sm:text-4xl font-bold font-mono text-gray-500">
              {loserScore}
            </div>
          </div>

          {/* Score Bar */}
          <div className="mt-3 sm:mt-4 mx-auto max-w-[200px] sm:max-w-xs">
            <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isPro ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-rose-500 to-rose-400'
                }`}
                style={{ width: `${(winnerScore / (winnerScore + loserScore)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Score Breakdown */}
      {hasDetailedScores && (
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500" />
              <span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[100px] sm:max-w-none">{debaterPro.name}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[100px] sm:max-w-none">{debaterCon.name}</span>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500" />
            </div>
          </div>

          <ScoreBar
            label="Logical Consistency"
            proScore={parsed.pro_scores?.logical_consistency || 0}
            conScore={parsed.con_scores?.logical_consistency || 0}
            analysis={parsed.category_analysis?.logical_consistency}
          />
          <ScoreBar
            label="Evidence & Examples"
            proScore={parsed.pro_scores?.evidence || 0}
            conScore={parsed.con_scores?.evidence || 0}
            analysis={parsed.category_analysis?.evidence}
          />
          <ScoreBar
            label="Persuasiveness"
            proScore={parsed.pro_scores?.persuasiveness || 0}
            conScore={parsed.con_scores?.persuasiveness || 0}
            analysis={parsed.category_analysis?.persuasiveness}
          />
          <ScoreBar
            label="Engagement"
            proScore={parsed.pro_scores?.engagement || 0}
            conScore={parsed.con_scores?.engagement || 0}
            analysis={parsed.category_analysis?.engagement}
          />
        </div>
      )}

      {/* Legacy format: simple score display */}
      {!hasDetailedScores && (
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${parsed.winner === 'pro' ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-gray-50'}`}>
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Pro</div>
            <div className="text-sm text-gray-600 mb-2">{debaterPro.name}</div>
            <div className="text-3xl font-bold text-gray-900">{proTotal}</div>
          </div>
          <div className={`p-4 rounded-lg ${parsed.winner === 'con' ? 'bg-rose-50 border-2 border-rose-200' : 'bg-gray-50'}`}>
            <div className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">Con</div>
            <div className="text-sm text-gray-600 mb-2">{debaterCon.name}</div>
            <div className="text-3xl font-bold text-gray-900">{conTotal}</div>
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

// Audit score bar with analysis
function AuditScoreBar({ label, score, description, analysis }: {
  label: string;
  score?: number;
  description: string;
  analysis?: string;
}) {
  const percent = score ? (score / 10) * 100 : 0;
  const color = score && score >= 8 ? 'bg-green-500' : score && score >= 6 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-gray-700" title={description}>{label}</span>
        <span className="text-sm font-semibold text-gray-900">{score}/10</span>
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

// Audit content renderer
function AuditContent({ content }: { content: string }) {
  const parsed = useMemo(() => parseAuditContent(content), [content]);

  if (!parsed) {
    return <p className="text-gray-700">{content}</p>;
  }

  return (
    <div className="space-y-5">
      {/* Overall Score */}
      <div className="p-4 bg-purple-50 rounded-lg text-center">
        <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Overall Score</div>
        <div className="text-3xl font-bold text-gray-900">{parsed.overall_score?.toFixed(1)}</div>
        <div className="text-xs text-gray-500">out of 10</div>
      </div>

      {/* Individual Scores with Analysis */}
      <div className="bg-gray-50 rounded-lg p-4">
        <AuditScoreBar
          label="Accuracy"
          score={parsed.accuracy}
          description="Did they correctly summarize and understand both sides' arguments?"
          analysis={parsed.criterion_analysis?.accuracy}
        />
        <AuditScoreBar
          label="Fairness"
          score={parsed.fairness}
          description="Was the evaluation free from apparent bias toward either side?"
          analysis={parsed.criterion_analysis?.fairness}
        />
        <AuditScoreBar
          label="Thoroughness"
          score={parsed.thoroughness}
          description="Did they address all key points and arguments from both debaters?"
          analysis={parsed.criterion_analysis?.thoroughness}
        />
        <AuditScoreBar
          label="Reasoning Quality"
          score={parsed.reasoning_quality}
          description="Is the decision well-justified with specific references?"
          analysis={parsed.criterion_analysis?.reasoning_quality}
        />
      </div>

      {/* Notes */}
      {parsed.notes && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Summary</div>
          <div className="text-gray-700 leading-relaxed">
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

// Phase descriptions for context
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

// Parse substitution notice content
interface SubstitutionInfo {
  excusedModel: string;
  replacementModel: string;
  role: string;
  phase: string;
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
      phase: '',
    };
  }
  return null;
}

// Check if an entry is a substitution notice
function isSubstitutionNotice(entry: TranscriptEntry): boolean {
  return entry.content.startsWith('[SUBSTITUTION NOTICE:');
}

// Substitution notice banner component
function SubstitutionBanner({ notices }: { notices: TranscriptEntry[] }) {
  if (notices.length === 0) return null;

  const parsed = notices.map(n => ({
    entry: n,
    info: parseSubstitutionNotice(n.content),
  })).filter(n => n.info !== null);

  if (parsed.length === 0) return null;

  return (
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-3 text-xs">
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
        <span className="text-gray-300">|</span>
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

interface TranscriptViewerProps {
  entries: TranscriptEntry[];
  debaterPro: ModelSummary;
  debaterCon: ModelSummary;
  judge: ModelSummary;
  auditor?: ModelSummary;
  showJudgment?: boolean;
}

export default function TranscriptViewer({
  entries,
  debaterPro,
  debaterCon,
  judge,
  auditor,
  showJudgment = false,
}: TranscriptViewerProps) {
  const phases = showJudgment ? DEBATE_PHASES : MAIN_DEBATE_PHASES;
  const [selectedPhase, setSelectedPhase] = useState<string | 'all'>('all');

  // Separate substitution notices from regular entries
  const substitutionNotices = entries.filter(isSubstitutionNotice);
  const regularEntries = entries.filter(e => !isSubstitutionNotice(e));

  // Filter entries by phase (only regular entries)
  const filteredEntries =
    selectedPhase === 'all'
      ? regularEntries.filter((e) =>
          showJudgment ? true : !['judgment', 'audit'].includes(e.phase)
        )
      : regularEntries.filter((e) => e.phase === selectedPhase);

  // Group entries by phase for display
  const entriesByPhase = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.phase]) {
      acc[entry.phase] = [];
    }
    acc[entry.phase].push(entry);
    return acc;
  }, {} as Record<string, TranscriptEntry[]>);

  // Get speaker name
  const getSpeakerName = (entry: TranscriptEntry): string => {
    if (entry.speaker_name) return entry.speaker_name;
    if (entry.speaker_id === debaterPro.id) return debaterPro.name;
    if (entry.speaker_id === debaterCon.id) return debaterCon.name;
    if (entry.speaker_id === judge.id) return judge.name;
    if (auditor && entry.speaker_id === auditor.id) return auditor.name;
    return 'Unknown';
  };

  // Get position label
  const getPositionLabel = (position: string | null): string => {
    switch (position) {
      case 'pro':
        return 'PRO';
      case 'con':
        return 'CON';
      case 'judge':
        return 'JUDGE';
      case 'auditor':
        return 'AUDITOR';
      default:
        return '';
    }
  };

  return (
    <div className="card">
      {/* Phase Filter Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-1 p-2">
          <button
            onClick={() => setSelectedPhase('all')}
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
              selectedPhase === 'all'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Phases
          </button>
          {phases.map((phase) => {
            const hasEntries = regularEntries.some((e) => e.phase === phase);
            return (
              <button
                key={phase}
                onClick={() => setSelectedPhase(phase)}
                disabled={!hasEntries}
                className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
                  selectedPhase === phase
                    ? 'bg-gray-900 text-white'
                    : hasEntries
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                {getPhaseShortName(phase)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Substitution Notices */}
      <SubstitutionBanner notices={substitutionNotices} />

      {/* Transcript Content */}
      <div className="divide-y divide-gray-100">
        {Object.entries(entriesByPhase).map(([phase, phaseEntries]) => (
          <div key={phase}>
            {/* Phase Header */}
            {selectedPhase === 'all' && PHASE_INFO[phase] && (
              <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs sm:text-sm font-bold">
                    {PHASE_INFO[phase].icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                      {PHASE_INFO[phase].title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      {PHASE_INFO[phase].description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Entries */}
            {phaseEntries
              .sort((a, b) => a.sequence_order - b.sequence_order)
              .map((entry, indexInPhase) => {
                // For cross-examination, determine if this is a question or answer
                // Pattern: PRO asks (Q), CON answers (A), CON asks (Q), PRO answers (A)
                const isCrossExam = entry.phase === 'cross_examination';
                const crossExamRole = isCrossExam
                  ? (indexInPhase % 2 === 0 ? 'Question' : 'Answer')
                  : null;

                return (
                <div
                  key={entry.id}
                  className={`px-3 sm:px-6 py-4 sm:py-5 ${getPositionBgColor(entry.position)}`}
                >
                  {/* Speaker Header */}
                  <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <span
                      className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${getPositionColor(
                        entry.position
                      )}`}
                    >
                      {getPositionLabel(entry.position)}
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
                    <span className="text-gray-400 hidden sm:inline">—</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[150px] sm:max-w-none">
                      {getSpeakerName(entry)}
                    </span>
                  </div>

                  {/* Content - use specialized renderers for judgment/audit */}
                  <div className="transcript-content">
                    {entry.phase === 'judgment' ? (
                      <JudgmentContent
                        content={entry.content}
                        debaterPro={debaterPro}
                        debaterCon={debaterCon}
                      />
                    ) : entry.phase === 'audit' ? (
                      <AuditContent content={entry.content} />
                    ) : (
                      <div className="text-gray-700 leading-7">
                        {entry.content.split(/\n\n+/).map((paragraph, idx) => (
                          <p
                            key={idx}
                            className={idx > 0 ? 'mt-4' : ''}
                          >
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
        ))}

        {/* Empty State */}
        {filteredEntries.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">
              {selectedPhase === 'all'
                ? 'No transcript entries yet.'
                : `No entries for ${getPhaseShortName(selectedPhase)} phase yet.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
