import Link from 'next/link';
import { getLiveDebate, getDebate, getDebates, getDebateVotes, getTodaysSchedule, getTopics, DailyScheduleResponse, Topic, DebateListItem, DebateDetail } from '@/lib/api';
import ArenaContent from '@/components/ArenaContent';

export const revalidate = 60; // Revalidate every 60 seconds

/**
 * Convert a DebateListItem to a minimal DebateDetail for fallback display.
 * This allows showing basic debate info when the detailed endpoint fails.
 */
function listItemToDetail(item: DebateListItem): DebateDetail {
  return {
    ...item,
    // Use judge as auditor fallback (better than nothing)
    auditor: item.judge,
    judge_score: null,
    started_at: null,
    transcript: [],
    duration_seconds: null,
    total_word_count: 0,
    pro_word_count: 0,
    con_word_count: 0,
    pro_elo_history: [],
    con_elo_history: [],
    judge_score_context: null,
    debate_score_context: null,
  };
}

async function getArenaData() {
  // Fetch schedule and top topics (these are independent and can fail gracefully)
  const [scheduleResponse, topicsResponse] = await Promise.all([
    getTodaysSchedule().catch(() => null),
    getTopics({ status: 'pending', limit: 5 }).catch(() => ({ topics: [], total: 0 })),
  ]);

  // Sort topics by vote count descending to get top topics
  const topTopics = topicsResponse.topics
    .sort((a, b) => b.vote_count - a.vote_count)
    .slice(0, 5);

  // Try to get live debate first
  try {
    const liveResponse = await getLiveDebate();

    // If there's a live debate, use that
    if (liveResponse.is_live && liveResponse.debate) {
      const votes = await getDebateVotes(liveResponse.debate.id).catch(() => null);
      return {
        debate: liveResponse.debate,
        isLive: true,
        votes,
        schedule: scheduleResponse,
        topTopics,
      };
    }
  } catch (error) {
    console.error('Failed to fetch live debate:', error);
    // Continue to fallback
  }

  // Fallback: get most recent debate (completed or judging)
  // Try completed first, then judging if no completed debates exist
  try {
    let debatesResponse = await getDebates({ status: 'completed', limit: 1 });

    // If no completed debates, try judging status (debate finished but still being processed)
    if (debatesResponse.debates.length === 0) {
      debatesResponse = await getDebates({ status: 'judging', limit: 1 });
    }

    if (debatesResponse.debates.length > 0) {
      const listItem = debatesResponse.debates[0];

      // Try to get full debate details, but fall back to list item if it fails
      let debate: DebateDetail;
      try {
        debate = await getDebate(listItem.id);
      } catch (detailError) {
        console.error('Failed to fetch debate details, using list item fallback:', detailError);
        debate = listItemToDetail(listItem);
      }

      const votes = await getDebateVotes(debate.id).catch(() => null);
      return {
        debate,
        isLive: false,
        votes,
        schedule: scheduleResponse,
        topTopics,
      };
    }
  } catch (error) {
    console.error('Failed to fetch recent debate:', error);
  }

  return { debate: null, isLive: false, votes: null, schedule: scheduleResponse, topTopics };
}

export default async function Home() {
  const { debate, isLive, votes, schedule, topTopics } = await getArenaData();

  return <ArenaContent debate={debate} isLive={isLive} votes={votes} schedule={schedule} topTopics={topTopics} />;
}
