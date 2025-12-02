import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Script from 'next/script';
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

// Generate dynamic metadata for social sharing and SEO
export async function generateMetadata({ params }: DebatePageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const debate = await getDebate(id);

    if (!debate) {
      return {
        title: 'Debate Not Found | Robuttal',
      };
    }

    // Create SEO-optimized title with topic
    const title = `${debate.topic.title} | AI Debate | Robuttal`;

    // Build a rich description for SEO
    const category = debate.topic.category || 'General';
    const debateDate = debate.completed_at
      ? new Date(debate.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : '';

    let description = `${category} debate: ${debate.debater_pro.name} argues for and ${debate.debater_con.name} argues against "${debate.topic.title}". `;
    if (debate.winner) {
      description += `Winner: ${debate.winner.name} (${debate.pro_score}-${debate.con_score}). `;
    }
    description += `Watch AI models engage in structured argumentation with opening statements, rebuttals, cross-examination, and closing arguments.`;

    const url = `${BASE_URL}/debates/${id}`;

    // Build keywords from topic and category
    const keywords = [
      'AI debate',
      'artificial intelligence',
      debate.topic.title,
      category,
      debate.debater_pro.name,
      debate.debater_con.name,
      'LLM comparison',
      'AI argumentation',
      'Robuttal',
    ];

    return {
      title,
      description,
      keywords: keywords.join(', '),
      authors: [{ name: 'Robuttal AI Debate Arena' }],
      alternates: {
        canonical: url,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
        },
      },
      openGraph: {
        title,
        description,
        url,
        siteName: 'Robuttal - AI Debate Arena',
        type: 'article',
        publishedTime: debate.completed_at || debate.created_at,
        modifiedTime: debate.completed_at || debate.created_at,
        section: category,
        tags: [category, 'AI', 'Debate', debate.debater_pro.name, debate.debater_con.name],
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
        creator: '@robuttal',
      },
    };
  } catch {
    return {
      title: 'Debate | Robuttal',
      description: 'Watch AI models compete in formal debates on Robuttal.',
    };
  }
}

// Generate JSON-LD structured data for the debate
function generateStructuredData(debate: any) {
  const debateDate = debate.completed_at || debate.created_at;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: debate.topic.title,
    description: `AI debate between ${debate.debater_pro.name} and ${debate.debater_con.name} on the topic: ${debate.topic.title}`,
    datePublished: debateDate,
    dateModified: debateDate,
    author: {
      '@type': 'Organization',
      name: 'Robuttal AI Debate Arena',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Robuttal',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/robfav.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/debates/${debate.id}`,
    },
    articleSection: debate.topic.category || 'General',
    keywords: `AI debate, ${debate.topic.category}, ${debate.debater_pro.name}, ${debate.debater_con.name}, artificial intelligence`,
    about: {
      '@type': 'Thing',
      name: debate.topic.title,
    },
    mentions: [
      {
        '@type': 'SoftwareApplication',
        name: debate.debater_pro.name,
        applicationCategory: 'AI Language Model',
      },
      {
        '@type': 'SoftwareApplication',
        name: debate.debater_con.name,
        applicationCategory: 'AI Language Model',
      },
    ],
  };
}

export default async function DebatePage({ params }: DebatePageProps) {
  const { id } = await params;
  const { debate, votes } = await getDebateData(id);

  if (!debate) {
    notFound();
  }

  const structuredData = generateStructuredData(debate);

  return (
    <>
      <Script
        id="debate-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <DebateDetailContent debate={debate} initialVotes={votes} />
    </>
  );
}
