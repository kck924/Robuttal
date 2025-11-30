import { notFound } from 'next/navigation';
import { getModelBySlug } from '@/lib/api';
import ModelDetailContent from '@/components/ModelDetailContent';

export const revalidate = 60;

interface ModelPageProps {
  params: Promise<{ slug: string }>;
}

async function getModelData(slug: string) {
  try {
    const model = await getModelBySlug(slug);
    return { model };
  } catch {
    return { model: null };
  }
}

export default async function ModelPage({ params }: ModelPageProps) {
  const { slug } = await params;
  const { model } = await getModelData(slug);

  if (!model) {
    notFound();
  }

  return <ModelDetailContent model={model} />;
}
