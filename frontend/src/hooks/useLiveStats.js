/**
 * useLiveStats — single shared React Query hook for live stats.
 *
 * Query key : ['liveStats']
 * Endpoints : GET /api/expeditions (for reports + media counts via full endpoint)
 *             GET /api/datasets
 *             GET /api/publications
 *             GET /api/activities
 *
 * Returns: { documents, datasets, publications, activities, byCategory, isLoading, isError, dataUpdatedAt }
 * All consumers (Hero, Dashboard, Repository header) share ONE refetch timer.
 *
 * Verify numeric facts in src/data/facts.js before publishing.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { contentAPI, activitiesAPI } from '../utils/api';

// Shared query key — do not change; used by invalidateQueries in mutations.
export const LIVE_STATS_KEY = ['liveStats'];

async function fetchLiveStats() {
  // Fire all three aggregation calls in parallel — same shape as contentAPI.getAll
  const [contentResult, activitiesResult] = await Promise.allSettled([
    contentAPI.getAll({ page_size: 500 }),  // get everything for accurate counts
    activitiesAPI.getAll(),
  ]);

  // Content items
  let allItems = [];
  if (contentResult.status === 'fulfilled') {
    allItems = contentResult.value.data ?? [];
  }

  // Counts
  const documents   = allItems.length;
  const datasets    = allItems.filter(i => i.content_type === 'dataset').length;
  const publications = allItems.filter(i => i.content_type === 'publication').length;

  // Category breakdown (for Dashboard bars)
  const byCategory = {};
  allItems.forEach(item => {
    const cat = item.category || 'general';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  // Activities
  let activities = [];
  if (activitiesResult.status === 'fulfilled') {
    activities = activitiesResult.value.data ?? [];
  }

  return { documents, datasets, publications, activities, byCategory };
}

/**
 * useLiveStats()
 *
 * Usage:
 *   const { data, isLoading, isError, dataUpdatedAt } = useLiveStats();
 *
 * data shape: { documents, datasets, publications, activities: [], byCategory: {} }
 */
export function useLiveStats() {
  return useQuery({
    queryKey: LIVE_STATS_KEY,
    queryFn: fetchLiveStats,
    // Polling
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Staleness — treat data as fresh for 15 s so fast navigation doesn't re-fetch
    staleTime: 15_000,
    // Keep previous data visible while refetching (no layout flash)
    placeholderData: (prev) => prev,
    // Retry twice with default exponential backoff; never loop on errors
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
    // Structural sharing ON (React Query default — keeps object identity stable)
  });
}

/**
 * Convenience: invalidate liveStats + activities from any mutation success handler.
 * Import this and call it in upload, add-activity, publish, cancel callbacks.
 */
export function useInvalidateLiveStats() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: LIVE_STATS_KEY });
    queryClient.invalidateQueries({ queryKey: ['activities'] });
    queryClient.invalidateQueries({ queryKey: ['content'] });
    queryClient.invalidateQueries({ queryKey: ['publishLog'] });
  };
}
