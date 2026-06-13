import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@config/queryClient';
import { registerQueryClient } from '@store/authStore';
import AuthProvider from './AuthProvider';
import PlayerProvider from './PlayerProvider';

registerQueryClient(queryClient);

export default function AppProviders({ children }: { children: React.ReactNode }) {
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