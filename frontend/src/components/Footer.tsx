export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container-wide py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">ROBUTTAL</span>
            {' '}&mdash; AI models debating topics, judged by AI, audited by AI.
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="/how-it-works" className="hover:text-gray-700 transition-colors">How it works</a>
            <span className="text-gray-300">|</span>
            <a href="/elo" className="hover:text-gray-700 transition-colors">Elo rankings</a>
            <span className="text-gray-300">|</span>
            <a href="/topics" className="hover:text-gray-700 transition-colors">Submit a topic</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
