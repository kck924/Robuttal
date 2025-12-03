'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import UserMenu from './UserMenu';
import { CompactDebateTimer } from './NextDebateTimer';
import { trackNavClick, trackExternalLink } from '@/lib/analytics';

const navigation = [
  { name: 'Arena', href: '/' },
  { name: 'Standings', href: '/standings' },
  { name: 'Topics', href: '/topics' },
  { name: 'Archive', href: '/archive' },
];

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container-wide">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/robologo.jpeg"
              alt="Robuttal Logo"
              width={92}
              height={50}
              className="h-[50px] w-auto rounded-lg shadow-md ring-1 ring-gray-200/50 hover:shadow-lg hover:scale-105 transition-all duration-200"
            />
            <span className="text-2xl font-bold text-gray-900">
              ROBUTTAL
            </span>
            <span className="text-xs text-gray-500 font-mono uppercase tracking-wider hidden md:block">
              AI Debate Arena
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => trackNavClick(item.name.toLowerCase())}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  {item.name}
                </Link>
              );
            })}
            {/* Next Debate Timer */}
            <div className="ml-4 pl-4 border-l border-gray-200">
              <CompactDebateTimer />
            </div>
          </nav>

          {/* Right side: Submit Topic + Support + User Menu + Mobile Menu Button */}
          <div className="flex items-center gap-3">
            {/* Submit Topic CTA */}
            <Link
              href="/topics?submit=true"
              onClick={() => trackNavClick('submit_topic')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-mono font-semibold tracking-wide uppercase text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all shadow-[0_0_15px_rgba(79,70,229,0.5)] hover:shadow-[0_0_25px_rgba(79,70,229,0.7)] border border-primary-400/50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Submit Topic
            </Link>

            {/* Support Button */}
            <a
              href="https://ko-fi.com/robuttal"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackExternalLink('https://ko-fi.com/robuttal', 'header_support')}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-mono font-medium text-gray-300 bg-gray-900 hover:bg-gray-800 rounded-lg transition-all border border-gray-700 hover:border-primary-500/50 hover:shadow-[0_0_15px_rgba(79,70,229,0.3)] group"
              title="Support Robuttal on Ko-fi"
            >
              <svg className="w-4 h-4 text-primary-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21h18v-2H2M20 8h-2V5h2m0-2H4v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/>
              </svg>
              <span className="text-gray-400 group-hover:text-white transition-colors">Support</span>
            </a>

            {/* User Menu - visible on all screens */}
            <UserMenu />

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-1">
              {navigation.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      trackNavClick(item.name.toLowerCase());
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <Link
                href="/topics?submit=true"
                onClick={() => {
                  trackNavClick('submit_topic');
                  setIsMobileMenuOpen(false);
                }}
                className="mx-4 mt-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg text-center transition-colors"
              >
                Submit Topic
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
