import client from '../api/client';
import { useOfflineStore } from '../store/offlineStore';
import { Alert } from 'react-native';

export const setupNetworkInterceptor = () => {
  // Request Interceptor (Optional: fail fast if known offline)
  client.interceptors.request.use(async (config) => {
    const isOffline = useOfflineStore.getState().isOffline;
    if (isOffline) {
        // We could block requests here, but for now we let them try
        // or potentially route them to the queue immediately if it's a mutation
    }
    return config;
  });

  // Response Interceptor
  client.interceptors.response.use(
    (response) => {
        // If we get a success, we might assume we are online
        const isOffline = useOfflineStore.getState().isOffline;
        if (isOffline) {
            useOfflineStore.getState().setOffline(false);
            // Trigger sync if needed (could be done via a separate sync service)
        }
        return response;
    },
    async (error) => {
        // Check for Network Error
        if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
            console.log('Detected Network Error -> Switching to Offline Mode');
            const store = useOfflineStore.getState();
            store.setOffline(true);

            const { config } = error;
            
            // Queue mutations (POST/PUT/DELETE)
            if (config && ['post', 'put', 'delete'].includes(config.method)) {
                Alert.alert('Offline', 'Action saved to offline queue.');
                store.addToQueue({
                    id: Date.now().toString(),
                    type: config.method.toUpperCase(),
                    endpoint: config.url,
                    data: config.data ? JSON.parse(config.data) : {}, // axios data is stringified
                    timestamp: Date.now()
                });
                // Return a "mock" success allows the UI to continue optimistically? 
                // For now, simpler to reject but let UI handle "Offline" state via store.
            }
        }
        return Promise.reject(error);
    }
  );
};

export const syncOfflineQueue = async () => {
    const store = useOfflineStore.getState();
    const queue = store.queue;

    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} items...`);
    
    for (const item of queue) {
        try {
            console.log(`Replaying: ${item.type} ${item.endpoint}`);
            // Replay request
            await client.request({
                method: item.type.toLowerCase(),
                url: item.endpoint,
                data: item.data
            });
            // Remove from queue on success
            store.removeFromQueue(item.id);
        } catch (error) {
            console.error(`Sync failed for ${item.id}`, error);
            // Keep in queue or move to dead letter?
            // For prototype, keep in queue and stop sync
            return; 
        }
    }
    Alert.alert('Sync Complete', 'All offline actions have been synced.');
};
