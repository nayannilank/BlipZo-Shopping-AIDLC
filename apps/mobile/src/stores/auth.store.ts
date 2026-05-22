import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';

import { setAccessToken, setRefreshToken, clearTokens } from '../api/client';

/**
 * Custom storage adapter using expo-secure-store.
 * Tokens are NEVER stored in plain AsyncStorage.
 */
const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  role: 'Buyer' | 'Seller' | null;
  isHydrated: boolean;
}

interface AuthActions {
  setAuth: (auth: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: 'Buyer' | 'Seller';
  }) => void;
  setAccessTokenAction: (token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  setHydrated: (hydrated: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  role: null,
  isHydrated: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (auth) => {
        set({
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          userId: auth.userId,
          role: auth.role,
        });
        // Also sync tokens to the API client's secure store keys
        void setAccessToken(auth.accessToken);
        void setRefreshToken(auth.refreshToken);
      },

      setAccessTokenAction: (token) => {
        set({ accessToken: token });
        void setAccessToken(token);
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          userId: null,
          role: null,
        });
        void clearTokens();
      },

      isAuthenticated: () => {
        return get().accessToken !== null;
      },

      setHydrated: (hydrated) => {
        set({ isHydrated: hydrated });
      },
    }),
    {
      name: 'blipzo-auth-store',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        userId: state.userId,
        role: state.role,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
