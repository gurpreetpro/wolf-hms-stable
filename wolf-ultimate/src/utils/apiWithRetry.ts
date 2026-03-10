/**
 * apiWithRetry — Wraps API calls with retry logic and offline queuing
 * Provides optimistic updates for form submissions.
 */
import client from '../api/client';
import { useOfflineStore, OfflineAction } from '../store/offlineStore';

interface RetryConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  backoffMultiplier?: number;
}

/**
 * Execute an API call with automatic retry on failure
 */
export async function apiWithRetry<T>(
  requestFn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxRetries = 3, retryDelayMs = 1000, backoffMultiplier = 2 } = config;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on 4xx errors (client errors, auth, etc.)
      const status = error?.response?.status;
      if (status && status >= 400 && status < 500) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = retryDelayMs * Math.pow(backoffMultiplier, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Submit a mutation (POST/PUT/DELETE) with offline queuing fallback
 * If the device is offline, the action is queued for later sync.
 */
export async function submitWithOfflineSupport(
  method: 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any,
  options?: { optimisticUpdate?: () => void; rollback?: () => void }
): Promise<any> {
  const { isOffline } = useOfflineStore.getState();

  // Apply optimistic update immediately
  options?.optimisticUpdate?.();

  if (isOffline) {
    // Queue for later
    const action: OfflineAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: method,
      endpoint,
      data,
      timestamp: Date.now(),
    };
    useOfflineStore.getState().addToQueue(action);
    return { queued: true, actionId: action.id };
  }

  try {
    const response = await apiWithRetry(async () => {
      switch (method) {
        case 'POST': return await client.post(endpoint, data);
        case 'PUT': return await client.put(endpoint, data);
        case 'DELETE': return await client.delete(endpoint);
      }
    });
    return response.data;
  } catch (error) {
    // Roll back optimistic update on failure
    options?.rollback?.();
    throw error;
  }
}
