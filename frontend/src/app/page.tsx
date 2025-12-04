import Link from 'next/link';
import { getLiveDebate, getDebate, getDebates, getDebateVotes, getTodaysSchedule, getTopics, DailyScheduleResponse, Topic } from '@/lib/api';
import ArenaContent from '@/components/ArenaContent';

export const revalidate = 10; // Revalidate every 10 seconds

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

  // Fallback: get most recent completed debate
  try {
    const debatesResponse = await getDebates({ status: 'completed', limit: 1 });
    if (debatesResponse.debates.length > 0) {
      const debate = await getDebate(debatesResponse.debates[0].id);
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
