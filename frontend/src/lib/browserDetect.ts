/**
 * Detect if the user is in an in-app browser (Facebook, LinkedIn, Twitter, Instagram, etc.)
 * These browsers block Google OAuth for security reasons.
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || navigator.vendor || '';

  // Common in-app browser indicators
  const inAppIndicators = [
    'FBAN',           // Facebook App
    'FBAV',           // Facebook App
    'FB_IAB',         // Facebook In-App Browser
    'Instagram',      // Instagram
    'LinkedInApp',    // LinkedIn
    'Twitter',        // Twitter/X (older)
    'Line/',          // Line
    'KAKAOTALK',      // KakaoTalk
    'Snapchat',       // Snapchat
    'BytedanceWebview', // TikTok
    'musical_ly',     // TikTok (older)
  ];

  // Check for in-app browser indicators
  for (const indicator of inAppIndicators) {
    if (ua.includes(indicator)) {
      return true;
    }
  }

  // Additional check: WebView on Android
  if (ua.includes('wv') && ua.includes('Android')) {
    return true;
  }

  return false;
}

/**
 * Get the URL to open the current page in the default browser.
 * Different platforms require different approaches.
 */
export function getOpenInBrowserUrl(): string {
  if (typeof window === 'undefined') return '';

  const currentUrl = window.location.href;
  const ua = navigator.userAgent || '';

  // iOS: Use x-safari-https scheme (works on some apps)
  // Most iOS in-app browsers respect the "Open in Safari" option in their UI
  // We'll just return the current URL and let users use the native option

  // For Android, the intent:// scheme can work but is complex
  // The simplest approach is to guide users to use the menu option

  return currentUrl;
}

/**
 * Attempt to open the current page in the default browser.
 * This uses various techniques depending on the platform.
 */
export function openInDefaultBrowser(): void {
  if (typeof window === 'undefined') return;

  const currentUrl = window.location.href;

  // Try to copy URL to clipboard for easy pasting
  if (navigator.clipboard) {
    navigator.clipboard.writeText(currentUrl).catch(() => {
      // Ignore clipboard errors
    });
  }

  // On iOS, try the x-safari scheme (may not work in all apps)
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) {
    // Safari scheme - replaces https:// with x-safari-https://
    const safariUrl = currentUrl.replace(/^https?:\/\//, 'x-safari-https://');
    window.location.href = safariUrl;
    return;
  }

  // On Android, try intent scheme
  if (/Android/.test(ua)) {
    const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;end`;
    window.location.href = intentUrl;
    return;
  }
}
