/**
 * useNetworkStatus — Monitors device connectivity
 * Updates offlineStore and triggers queue flush on reconnect.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useOfflineStore } from '../store/offlineStore';
import client from '../api/client';

/**
 * Lightweight network monitor that pings the API server
 * to determine real connectivity (not just WiFi connected).
 */
export function useNetworkStatus(checkIntervalMs = 15000) {
  const [isOnline, setIsOnline] = useState(true);
  const { setOffline, queue } = useOfflineStore();
  const prevOnline = useRef(true);

  const checkConnection = useCallback(async () => {
    try {
      await client.get('/health', { timeout: 5000 });
      setIsOnline(true);
      setOffline(false);
    } catch {
      setIsOnline(false);
      setOffline(true);
    }
  }, [setOffline]);

  // Periodic connectivity check
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, checkIntervalMs);
    return () => clearInterval(interval);
  }, [checkConnection, checkIntervalMs]);

  // Check on app resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkConnection();
    });
    return () => sub.remove();
  }, [checkConnection]);

  // Flush offline queue when coming back online
  useEffect(() => {
    if (isOnline && !prevOnline.current && queue.length > 0) {
      flushOfflineQueue();
    }
    prevOnline.current = isOnline;
  }, [isOnline, queue.length]);

  return { isOnline, checkConnection };
}

/**
 * Flush queued offline actions to the server
 */
async function flushOfflineQueue() {
  const { queue, removeFromQueue } = useOfflineStore.getState();
  
  for (const action of queue) {
    try {
      switch (action.type) {
        case 'POST':
          await client.post(action.endpoint, action.data);
          break;
        case 'PUT':
          await client.put(action.endpoint, action.data);
          break;
        case 'DELETE':
          await client.delete(action.endpoint);
          break;
      }
      await removeFromQueue(action.id);
    } catch (error) {
      // Stop flushing on first failure — remaining items stay queued
      console.error('Offline sync failed for:', action.id, error);
      break;
    }
  }
}
