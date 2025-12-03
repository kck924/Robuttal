import { getDebates, getModels } from '@/lib/api';
import ArchiveContent from '@/components/ArchiveContent';

export const revalidate = 15; // Revalidate every 15 seconds

async function getArchiveData() {
  try {
    const [debatesResponse, modelsResponse] = await Promise.all([
      getDebates({ status: 'completed', limit: 10, offset: 0 }),
      getModels(true),
    ]);

    return {
      debates: debatesResponse.debates,
      total: debatesResponse.total,
      models: modelsResponse.models,
    };
  } catch (error) {
    console.error('Failed to fetch archive data:', error);
    return {
      debates: [],
      total: 0,
      models: [],
    };
  }
}

export default async function ArchivePage() {
  const { debates, total, models } = await getArchiveData();

  return (
    <ArchiveContent
      initialDebates={debates}
      initialTotal={total}
      models={models}
    />
  );
}
