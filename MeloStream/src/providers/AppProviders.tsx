import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@config/queryClient';
import { registerQueryClient } from '@store/authStore';
import AuthProvider from './AuthProvider';
import PlayerProvider from './PlayerProvider';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerQueryClient(queryClient);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlayerProvider>
          {children}
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}