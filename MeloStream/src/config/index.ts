import * as Sentry from '@sentry/react-native';

export const isDev = __DEV__;

export const Config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  },
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  enableLogging: __DEV__,
  enableSentry: !__DEV__,
} as const;

export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (__DEV__) console.warn(...args);
  },
  error: (...args: any[]) => {
    if (__DEV__) {
      console.error(...args);
    } else {
      Sentry.captureException(args[0] instanceof Error ? args[0] : new Error(String(args[0])));
    }
  },
};