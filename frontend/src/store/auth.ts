
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Persisted auth store
 *
 * Keeps `token` and `user` in localStorage and mirrors the token into
 * a cookie so server-side middleware can read it.
 */

interface User {
    id: number;
    email: string;
    full_name: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    setToken: (token: string) => void;
    setUser: (user: User) => void;
    logout: () => void;
}

/**
 * Global auth store accessor.
 */
export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            setToken: (token) => {
                set({ token })
                try {
                    if (typeof document !== 'undefined') document.cookie = `assignwell_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`
                } catch {}
            },
            setUser: (user) => set({ user }),
            logout: () => {
                set({ token: null, user: null })
                try {
                    if (typeof document !== 'undefined') document.cookie = 'assignwell_token=; Max-Age=0; path=/'
                } catch {}
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);
