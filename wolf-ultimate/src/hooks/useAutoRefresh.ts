/**
 * useAutoRefresh — Polling hook for critical real-time data
 * Used by: Vitals, OT Schedule, PACU, Bed Board, Clinical Alerts
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface AutoRefreshOptions {
  /** Polling interval in milliseconds (default: 30000 = 30s) */
  intervalMs?: number;
  /** Whether auto-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Pause when app is in background (default: true) */
  pauseInBackground?: boolean;
  /** Immediate fetch on mount (default: true) */
  fetchOnMount?: boolean;
}

/**
 * Auto-refresh hook with background pause support.
 * 
 * @example
 * const { data, loading, refresh } = useAutoRefresh(
 *   () => vitalsService.getLatest(patientId),
 *   { intervalMs: 15000 }
 * );
 */
export function useAutoRefresh<T>(
  fetchFn: () => Promise<T>,
  options: AutoRefreshOptions = {}
) {
  const {
    intervalMs = 30000,
    enabled = true,
    pauseInBackground = true,
    fetchOnMount = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const refresh = useCallback(async () => {
    if (!isActiveRef.current && pauseInBackground) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFnRef.current();
      setData(result);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Refresh failed'));
    } finally {
      setLoading(false);
    }
  }, [pauseInBackground]);

  // Start/stop polling
  useEffect(() => {
    if (!enabled) return;

    if (fetchOnMount) {
      refresh();
    }

    intervalRef.current = setInterval(refresh, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, refresh, fetchOnMount]);

  // Pause/resume on app state change
  useEffect(() => {
    if (!pauseInBackground) return;

    const handleAppState = (nextState: AppStateStatus) => {
      isActiveRef.current = nextState === 'active';
      
      // Resume immediately when coming back to foreground
      if (nextState === 'active' && enabled) {
        refresh();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [pauseInBackground, enabled, refresh]);

  return { data, loading, error, lastUpdated, refresh };
}
