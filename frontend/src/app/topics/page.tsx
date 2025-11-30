import { getServerSession } from 'next-auth';
import { getTopics, getTodaysSchedule, getTaxonomy, Topic } from '@/lib/api';
import { authOptions } from '@/lib/auth';
import TopicsContent from '@/components/TopicsContent';

export const revalidate = 0; // No caching during development

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

async function getTopicsData(userEmail?: string) {
  try {
    // If filtering by user, fetch their topics (all statuses)
    if (userEmail) {
      const [userTopics, schedule, taxonomy] = await Promise.all([
        getTopics({ submitted_by: userEmail, limit: 100 }),
        getTodaysSchedule(),
        getTaxonomy(),
      ]);

      // Sort by created_at descending for user's own topics
      const sortedTopics = userTopics.topics.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return {
        topics: sortedTopics,
        schedule,
        totalPending: userTopics.total,
        taxonomy,
        isUserFilter: true,
      };
    }

    // Default: fetch all approved and pending topics
    const [approvedTopics, pendingTopics, schedule, taxonomy] = await Promise.all([
      getTopics({ status: 'approved', limit: 50 }),
      getTopics({ status: 'pending', limit: 50 }),
      getTodaysSchedule(),
      getTaxonomy(),
    ]);

    // Combine all topics and sort by vote count (descending)
    const allTopics: Topic[] = [
      ...approvedTopics.topics,
      ...pendingTopics.topics,
    ].sort((a, b) => b.vote_count - a.vote_count);

    return {
      topics: allTopics,
      schedule,
      totalPending: approvedTopics.total + pendingTopics.total,
      taxonomy,
      isUserFilter: false,
    };
  } catch (error) {
    console.error('Failed to fetch topics:', error);
    return {
      topics: [],
      schedule: null,
      totalPending: 0,
      taxonomy: null,
      isUserFilter: false,
    };
  }
}

export default async function TopicsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  // If filter=mine and user is logged in, filter by their email
  const userEmail = params.filter === 'mine' && session?.user?.email
    ? session.user.email
    : undefined;

  const { topics, schedule, totalPending, taxonomy, isUserFilter } = await getTopicsData(userEmail);

  return (
    <TopicsContent
      topics={topics}
      schedule={schedule}
      totalPending={totalPending}
      taxonomy={taxonomy}
      isUserFilter={isUserFilter}
      userEmail={session?.user?.email || undefined}
    />
  );
}
