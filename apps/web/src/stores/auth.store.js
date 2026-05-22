import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const initialState = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  role: null,
};
export const useAuthStore = create()(
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
