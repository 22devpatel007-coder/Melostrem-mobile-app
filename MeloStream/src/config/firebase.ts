import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, inMemoryPersistence, Auth } from 'firebase/auth';
import { Config } from './index';

const firebaseConfig = {
  apiKey: Config.firebase.apiKey,
  authDomain: Config.firebase.authDomain,
  projectId: Config.firebase.projectId,
};

let app: FirebaseApp;
let auth: Auth;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getApps().length <= 1
    ? initializeAuth(app, { persistence: inMemoryPersistence })
    : getAuth(app);
} catch (e) {
  app = getApp();
  auth = getAuth(app);
}

export { auth };
export default app;