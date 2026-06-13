/**
 * src/hooks/useErrorHandler.ts
 *
 * Mirrors web useErrorHandler.js:
 * - Reports errors to Sentry (errorReporter)
 * - Logs in dev, silent in production
 * - useEffect-based: fires when isError changes
 */

import { useEffect } from 'react';
import { reportError } from '@services/errorReporter';

interface UseErrorHandlerOptions {
  error: Error | null | unknown;
  isError: boolean;
  context?: string;
}

export const useErrorHandler = ({ error, isError, context }: UseErrorHandlerOptions): void => {
  useEffect(() => {
    if (!isError || !error) return;

    if (__DEV__) {
      console.warn(`[useErrorHandler] ${context ?? 'unknown'}:`, error);
    }

    reportError(error instanceof Error ? error : new Error(String(error)), {
      context,
    });
  }, [isError, error, context]);
};