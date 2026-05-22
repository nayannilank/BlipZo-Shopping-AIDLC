import { AppState, AppStateStatus } from 'react-native';
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
  appState: AppStateStatus;
}

interface UiActions {
  setOnline: (online: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  queueMutation: (mutation: Omit<QueuedMutation, 'createdAt'>) => void;
  removeMutation: (id: string) => void;
  processQueue: () => Promise<void>;
  setAppState: (state: AppStateStatus) => void;
  initListeners: () => () => void;
}

type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>()((set, get) => ({
  isOnline: true,
  activeModal: null,
  mutationQueue: [],
  appState: AppState.currentState,

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

  setAppState: (state) => {
    set({ appState: state });
  },

  initListeners: () => {
    // Monitor app state changes (foreground/background)
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      get().setAppState(nextState);
      // When app comes to foreground, attempt to process queued mutations
      if (nextState === 'active') {
        void get().processQueue();
      }
    });

    return () => {
      appStateSubscription.remove();
    };
  },
}));
