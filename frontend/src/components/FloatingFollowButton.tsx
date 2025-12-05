'use client';

export default function FloatingFollowButton() {
  return (
    <a
      href="https://x.com/Robuttal"
      target="_blank"
      rel="noopener noreferrer"
      className="sm:hidden fixed bottom-4 right-4 z-40 flex items-center gap-1.5 px-3 py-2 bg-black text-white text-xs font-medium rounded-full shadow-lg hover:bg-gray-800 transition-colors"
      aria-label="Follow Robuttal on X"
    >
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Follow
    </a>
  );
}
