import { create } from 'zustand';

interface QueuedMutation {
  id: string;
  execute: () => Promise<void>;
  description: string;
  createdAt: number;
}

interface UiState {
  isOnline: boolean;
  activeModal: string | null;
  mutationQueue: QueuedMutation[];
}

interface UiActions {
  setOnline: (online: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  queueMutation: (mutation: Omit<QueuedMutation, 'createdAt'>) => void;
  removeMutation: (id: string) => void;
  processQueue: () => Promise<void>;
}

type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>()((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  activeModal: null,
  mutationQueue: [],

  setOnline: (online) => {
    set({ isOnline: online });
    if (online) {
      void get().processQueue();
    }
  },

  openModal: (modalId) => {
    set({ activeModal: modalId });
  },

  closeModal: () => {
    set({ activeModal: null });
  },

  queueMutation: (mutation) => {
    set((state) => ({
      mutationQueue: [...state.mutationQueue, { ...mutation, createdAt: Date.now() }],
    }));
  },

  removeMutation: (id) => {
    set((state) => ({
      mutationQueue: state.mutationQueue.filter((m) => m.id !== id),
    }));
  },

  processQueue: async () => {
    const queue = get().mutationQueue;
    for (const mutation of queue) {
      try {
        await mutation.execute();
        get().removeMutation(mutation.id);
      } catch {
        // Keep failed mutations in queue for next retry
        break;
      }
    }
  },
}));

// Set up navigator.onLine listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useUiStore.getState().setOnline(true);
  });

  window.addEventListener('offline', () => {
    useUiStore.getState().setOnline(false);
  });
}
