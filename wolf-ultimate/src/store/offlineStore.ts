import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface OfflineAction {
  id: string;
  type: 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data: any;
  timestamp: number;
}

interface OfflineState {
  isOffline: boolean;
  queue: OfflineAction[];
  setOffline: (status: boolean) => void;
  addToQueue: (action: OfflineAction) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  loadQueue: () => Promise<void>;
}

const QUEUE_KEY = 'offline_queue_v1';

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOffline: false,
  queue: [],
  
  setOffline: (status) => set({ isOffline: status }),
  
  addToQueue: async (action) => {
    const newQueue = [...get().queue, action];
    set({ queue: newQueue });
    await saveQueue(newQueue);
  },
  
  removeFromQueue: async (id) => {
    const newQueue = get().queue.filter(q => q.id !== id);
    set({ queue: newQueue });
    await saveQueue(newQueue);
  },
  
  clearQueue: async () => {
    set({ queue: [] });
    await SecureStore.deleteItemAsync(QUEUE_KEY);
  },
  
  loadQueue: async () => {
    try {
      const json = await SecureStore.getItemAsync(QUEUE_KEY);
      if (json) {
        set({ queue: JSON.parse(json) });
      }
    } catch (e) {
      console.error('Failed to load offline queue details', e);
    }
  }
}));

// Helper to save queue
const saveQueue = async (queue: OfflineAction[]) => {
  try {
    // Limit queue size to avoid SecureStore limits (approx 2KB safe limit)
    const limitedQueue = queue.slice(-20); 
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(limitedQueue));
  } catch (e) {
    console.error('Failed to persist offline queue', e);
  }
};
