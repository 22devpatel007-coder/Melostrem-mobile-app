import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, inMemoryPersistence } from 'firebase/auth';
import { Config } from './index';

const firebaseConfig = {
  apiKey: Config.firebase.apiKey,
  authDomain: Config.firebase.authDomain,
  projectId: Config.firebase.projectId,
};

const isNew = getApps().length === 0;
const app = isNew ? initializeApp(firebaseConfig) : getApp();
export const auth = isNew

  ? initializeAuth(app, { persistence: inMemoryPersistence })
  : getAuth(app);
console.log('[firebase] auth initialized:', !!auth);
export default app;
