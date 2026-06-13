import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@config/firebase';
import api from './api';

export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = async (email: string, password: string, name?: string) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(credential.user, { displayName: name });
  return credential;
};

export const logout = () => signOut(auth);

export const getCurrentUserToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

export const sendPasswordReset = (email: string) =>
  sendPasswordResetEmail(auth, email);

export const verifyWithBackend = () => api.post('/auth/verify');