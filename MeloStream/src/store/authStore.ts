import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { logout as authServiceLogout, verifyWithBackend } from '@services/auth.service';
import { setUserId } from '@services/errorReporter';
import { sendOffline } from '@services/users.service';

let _queryClient: any = null;

export const registerQueryClient = (qc: any) => {
  _queryClient = qc;
};

const USER_QUERY_KEYS = [
  ['likedSongs'],
  ['playlists'],
  ['userPlaylists'],
  ['users'],
];

const clearUserCache = () => {
  if (!_queryClient) return;
  USER_QUERY_KEYS.forEach((key) => {
    _queryClient.removeQueries({ queryKey: key });
  });
  _queryClient.removeQueries({ queryKey: ['playlist'], exact: false });
};

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAdmin?: boolean;
}

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  likedSongs: string[];
  setUser: (user: User | null) => void;
  setAdmin: (isAdmin: boolean) => void;
  setLoading: (loading: boolean) => void;
  setLikedSongs: (likedSongs: string[]) => void;
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  loading: true,
  likedSongs: [],

  setUser: (user) => {
    setUserId(user?.uid ?? null);
    set({ user });
    if (user) {
      verifyWithBackend().catch((err) => console.warn('[authStore] verifyWithBackend failed:', err?.message));
    }
  },

  setAdmin: (isAdmin) => set({ isAdmin }),
  setLoading: (loading) => set({ loading }),
  setLikedSongs: (likedSongs) => set({ likedSongs }),

  logout: async () => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      sendOffline(currentUser.uid).catch((err) => console.warn('[authStore] sendOffline failed:', err?.message));
    }
    try {
      await authServiceLogout();
    } finally {
      await SecureStore.deleteItemAsync('auth_token').catch(() => {});
      clearUserCache();
      set({ user: null, isAdmin: false, likedSongs: [] });
    }
  },
}));

export { useAuthStore };
export default useAuthStore;