export const Config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  },
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
} as const;