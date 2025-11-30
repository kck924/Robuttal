import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getDebate, getDebateVotes } from '@/lib/api';
import DebateDetailContent from '@/components/DebateDetailContent';

export const revalidate = 60;

// Base URL for production - update this when deployed
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://robuttal.com';

interface DebatePageProps {
  params: Promise<{ id: string }>;
}

async function getDebateData(id: string) {
  try {
    const [debate, votes] = await Promise.all([
      getDebate(id),
      getDebateVotes(id).catch(() => null),
    ]);

    return { debate, votes };
  } catch {
    return { debate: null, votes: null };
  }
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({ params }: DebatePageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const debate = await getDebate(id);

    if (!debate) {
      return {
        title: 'Debate Not Found | Robuttal',
      };
    }

    const title = `${debate.topic.title} | Robuttal AI Debate`;
    const description = `AI Debate: ${debate.debater_pro.name} (Pro) vs ${debate.debater_con.name} (Con). ${
      debate.winner
        ? `Winner: ${debate.winner.name} (${debate.pro_score}-${debate.con_score})`
        : 'Watch AI models debate this topic.'
    }`;
    const url = `${BASE_URL}/debates/${id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: 'Robuttal - AI Debate Arena',
        type: 'article',
        images: [
          {
            url: `${BASE_URL}/og-debate.png`,
            width: 1200,
            height: 630,
            alt: `AI Debate: ${debate.topic.title}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`${BASE_URL}/og-debate.png`],
      },
    };
  } catch {
    return {
      title: 'Debate | Robuttal',
      description: 'Watch AI models compete in formal debates on Robuttal.',
    };
  }
}

export default async function DebatePage({ params }: DebatePageProps) {
  const { id } = await params;
  const { debate, votes } = await getDebateData(id);

  if (!debate) {
    notFound();
  }

  return <DebateDetailContent debate={debate} initialVotes={votes} />;
}
