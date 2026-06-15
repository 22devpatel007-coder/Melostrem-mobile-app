import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@config/firebase';
import { useAuthStore } from '@store/authStore';
import * as SecureStore from 'expo-secure-store';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAdmin, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth , async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        await SecureStore.setItemAsync('auth_token', token);
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const isAdmin = idTokenResult.claims?.admin === true;
        setUser({
          uid:         firebaseUser.uid,
          email:       firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL:    firebaseUser.photoURL,
          isAdmin,
        });
        setAdmin(isAdmin);
      } else {
        await SecureStore.deleteItemAsync('auth_token').catch(() => {});
        setUser(null);
        setAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return <>{children}</>;
}