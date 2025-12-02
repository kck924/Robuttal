import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://robuttal.com';
// Use the production API URL for sitemap generation
const API_BASE = 'https://robuttal-production.up.railway.app';

interface DebateForSitemap {
  id: string;
  completed_at: string | null;
  topic: {
    category: string;
  };
}

interface ModelForSitemap {
  slug: string;
}

async function getCompletedDebates(): Promise<DebateForSitemap[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(`${API_BASE}/api/debates?status=completed&limit=1000`, {
      signal: controller.signal,
      cache: 'no-store', // Always fetch fresh data at runtime
    });

    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const data = await response.json();
    return data.debates || [];
  } catch (error) {
    console.log('Sitemap: Could not fetch debates, using static pages only');
    return [];
  }
}

async function getActiveModels(): Promise<ModelForSitemap[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE}/api/models?active_only=true`, {
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) return [];
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.log('Sitemap: Could not fetch models, using static pages only');
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/standings`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/topics`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/archive`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/elo`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Dynamic debate pages
  const debates = await getCompletedDebates();
  const debatePages: MetadataRoute.Sitemap = debates.map((debate) => ({
    url: `${BASE_URL}/debates/${debate.id}`,
    lastModified: debate.completed_at ? new Date(debate.completed_at) : new Date(),
    changeFrequency: 'monthly' as const, // Completed debates don't change
    priority: 0.7,
  }));

  // Dynamic model pages
  const models = await getActiveModels();
  const modelPages: MetadataRoute.Sitemap = models.map((model) => ({
    url: `${BASE_URL}/models/${model.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const, // Model stats update with each debate
    priority: 0.8,
  }));

  return [...staticPages, ...modelPages, ...debatePages];
}
