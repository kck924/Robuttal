/**
 * Google Analytics event tracking utilities
 *
 * Events are organized by category:
 * - engagement: User interactions (clicks, votes, submissions)
 * - navigation: Page and section navigation
 * - auth: Login/logout events
 * - debate: Debate-related actions
 * - topic: Topic-related actions
 */

// Declare gtag as a global function
declare global {
  interface Window {
    gtag: (
      command: 'event' | 'config' | 'js',
      action: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

/**
 * Track a custom event in Google Analytics
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// ============== Authentication Events ==============

export function trackLogin(provider: string) {
  trackEvent('login', {
    method: provider,
  });
}

export function trackLogout() {
  trackEvent('logout');
}

export function trackSignUpStart(provider: string) {
  trackEvent('sign_up_start', {
    method: provider,
  });
}

// ============== Topic Events ==============

export function trackTopicSubmit(category?: string) {
  trackEvent('topic_submit', {
    event_category: 'engagement',
    topic_category: category,
  });
}

export function trackTopicVote(topicId: string, topicTitle: string) {
  trackEvent('topic_vote', {
    event_category: 'engagement',
    topic_id: topicId,
    topic_title: topicTitle.slice(0, 100), // Truncate for GA limits
  });
}

export function trackTopicSearch(query: string, resultsCount: number) {
  trackEvent('search', {
    event_category: 'engagement',
    search_term: query,
    results_count: resultsCount,
  });
}

export function trackTopicView(topicId: string, topicTitle: string) {
  trackEvent('topic_view', {
    event_category: 'content',
    topic_id: topicId,
    topic_title: topicTitle.slice(0, 100),
  });
}

// ============== Debate Events ==============

export function trackDebateView(
  debateId: string,
  topicTitle: string,
  proModel: string,
  conModel: string
) {
  trackEvent('debate_view', {
    event_category: 'content',
    debate_id: debateId,
    topic_title: topicTitle.slice(0, 100),
    pro_model: proModel,
    con_model: conModel,
  });
}

export function trackDebateVote(
  debateId: string,
  votedForModel: string,
  position: 'pro' | 'con'
) {
  trackEvent('debate_vote', {
    event_category: 'engagement',
    debate_id: debateId,
    voted_for: votedForModel,
    position: position,
  });
}

export function trackDebateShare(debateId: string, method: string) {
  trackEvent('share', {
    event_category: 'engagement',
    content_type: 'debate',
    item_id: debateId,
    method: method,
  });
}

export function trackTranscriptExpand(debateId: string, phase: string) {
  trackEvent('transcript_expand', {
    event_category: 'engagement',
    debate_id: debateId,
    phase: phase,
  });
}

export function trackTranscriptCollapse(debateId: string, phase: string) {
  trackEvent('transcript_collapse', {
    event_category: 'engagement',
    debate_id: debateId,
    phase: phase,
  });
}

// ============== Model/Leaderboard Events ==============

export function trackModelView(modelSlug: string, modelName: string) {
  trackEvent('model_view', {
    event_category: 'content',
    model_slug: modelSlug,
    model_name: modelName,
  });
}

export function trackLeaderboardView(tab: 'debaters' | 'judges') {
  trackEvent('leaderboard_view', {
    event_category: 'content',
    tab: tab,
  });
}

export function trackLeaderboardSort(column: string, direction: 'asc' | 'desc') {
  trackEvent('leaderboard_sort', {
    event_category: 'engagement',
    column: column,
    direction: direction,
  });
}

// ============== Navigation Events ==============

export function trackNavClick(destination: string) {
  trackEvent('nav_click', {
    event_category: 'navigation',
    destination: destination,
  });
}

export function trackTabChange(tabName: string, context: string) {
  trackEvent('tab_change', {
    event_category: 'navigation',
    tab_name: tabName,
    context: context,
  });
}

export function trackPagination(page: number, context: string) {
  trackEvent('pagination', {
    event_category: 'navigation',
    page_number: page,
    context: context,
  });
}

export function trackExternalLink(url: string, context: string) {
  trackEvent('external_link_click', {
    event_category: 'navigation',
    url: url,
    context: context,
  });
}

// ============== UI Interaction Events ==============

export function trackModalOpen(modalName: string) {
  trackEvent('modal_open', {
    event_category: 'ui_interaction',
    modal_name: modalName,
  });
}

export function trackModalClose(modalName: string) {
  trackEvent('modal_close', {
    event_category: 'ui_interaction',
    modal_name: modalName,
  });
}

export function trackTooltipView(tooltipId: string) {
  trackEvent('tooltip_view', {
    event_category: 'ui_interaction',
    tooltip_id: tooltipId,
  });
}

export function trackCopyToClipboard(contentType: string) {
  trackEvent('copy_to_clipboard', {
    event_category: 'engagement',
    content_type: contentType,
  });
}

// ============== Error Events ==============

export function trackError(errorType: string, errorMessage: string, context?: string) {
  trackEvent('error', {
    event_category: 'error',
    error_type: errorType,
    error_message: errorMessage.slice(0, 100),
    context: context,
  });
}

// ============== Performance Events ==============

export function trackPageLoadTime(pageName: string, loadTimeMs: number) {
  trackEvent('page_load_time', {
    event_category: 'performance',
    page_name: pageName,
    load_time_ms: loadTimeMs,
  });
}

// ============== User Profile Events ==============

export function trackProfileView(isOwnProfile: boolean) {
  trackEvent('profile_view', {
    event_category: 'content',
    is_own_profile: isOwnProfile,
  });
}

export function trackProfileTabChange(tab: string) {
  trackEvent('profile_tab_change', {
    event_category: 'navigation',
    tab: tab,
  });
}
