import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  role: 'Buyer' | 'Seller' | null;
}

interface AuthActions {
  setAuth: (auth: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: 'Buyer' | 'Seller';
  }) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  role: null,
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
      },

      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      logout: () => {
        set(initialState);
      },

      isAuthenticated: () => {
        return get().accessToken !== null;
      },
    }),
    {
      name: 'blipzo-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        userId: state.userId,
        role: state.role,
      }),
    },
  ),
);
