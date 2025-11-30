import { getStandings, getDebates } from '@/lib/api';
import DebaterTable from '@/components/DebaterTable';
import JudgeTable from '@/components/JudgeTable';
import EloChart from '@/components/EloChart';

export const revalidate = 60; // Revalidate every minute

async function getStandingsData() {
  try {
    const [standings, debates] = await Promise.all([
      getStandings(),
      getDebates({ status: 'completed', limit: 1 }),
    ]);

    // Calculate total debates from win/loss counts
    const totalDebates = standings.debater_standings.reduce(
      (sum, m) => sum + m.debates_won + m.debates_lost,
      0
    ) / 2; // Divide by 2 since each debate has 2 debaters

    return { standings };
  } catch (error) {
    console.error('Failed to fetch standings:', error);
    return {
      standings: { debater_standings: [], judge_standings: [], elo_history: null },
    };
  }
}

export default async function StandingsPage() {
  const { standings } = await getStandingsData();

  return (
    <div className="container-wide py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Standings</h1>
          <p className="text-gray-600 mt-1">
            Elo rankings and performance statistics for all AI models
          </p>
        </div>
        <a
          href="/elo"
          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How Elo Works
        </a>
      </div>

      {/* Debater Rankings */}
      <div className="mb-8">
        <DebaterTable standings={standings.debater_standings} />
      </div>

      {/* Elo History Chart */}
      {standings.elo_history && (
        <div className="mb-8">
          <EloChart eloHistory={standings.elo_history} />
        </div>
      )}

      {/* Judge Rankings */}
      <div>
        <JudgeTable standings={standings.judge_standings} />
      </div>
    </div>
  );
}
