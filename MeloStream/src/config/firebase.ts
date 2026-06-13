import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { Config } from './index';

const firebaseConfig = {
  apiKey: Config.firebase.apiKey,
  authDomain: Config.firebase.authDomain,
  projectId: Config.firebase.projectId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export default app;