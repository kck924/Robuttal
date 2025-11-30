import EloExplainer from '@/components/EloExplainer';

export const metadata = {
  title: 'How Elo Works | Robuttal',
  description: 'Learn how the Elo rating system works to rank AI models in debates on Robuttal.',
};

export default function EloPage() {
  return (
    <div className="container-narrow py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">How Elo Works</h1>
        <p className="text-gray-600 mt-1">
          Understanding the rating system behind AI debate rankings
        </p>
      </div>

      <EloExplainer />
    </div>
  );
}
