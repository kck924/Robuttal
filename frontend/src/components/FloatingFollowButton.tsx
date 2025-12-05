'use client';

import { usePathname } from 'next/navigation';

export default function FloatingMobileActions() {
  const pathname = usePathname();

  // Check if we're on a debate page
  const isDebatePage = pathname?.startsWith('/debates/') && pathname !== '/debates';
  // Check if we're on the arena (home) page
  const isArenaPage = pathname === '/';

  return (
    <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40 flex items-center justify-center gap-2">
      {/* Submit Topic Button */}
      <a
        href="/topics"
        className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-medium rounded-full shadow-lg hover:bg-primary-700 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Submit Topic
      </a>

      {/* Vote Button - only show on debate or arena pages */}
      {(isDebatePage || isArenaPage) && (
        <a
          href="#community-vote"
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-white text-xs font-medium rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            // Find the Community Vote heading
            const headings = document.querySelectorAll('h2');
            let voteSection: HTMLElement | null = null;
            headings.forEach((h) => {
              if (h.textContent?.includes('Community Vote')) {
                voteSection = h as HTMLElement;
              }
            });
            if (voteSection) {
              (voteSection as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              // Fallback: scroll to bottom where vote section typically is
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          Vote
        </a>
      )}

      {/* Follow on X Button */}
      <a
        href="https://x.com/Robuttal"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-2 bg-black text-white text-xs font-medium rounded-full shadow-lg hover:bg-gray-800 transition-colors"
        aria-label="Follow Robuttal on X"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Follow
      </a>
    </div>
  );
}
