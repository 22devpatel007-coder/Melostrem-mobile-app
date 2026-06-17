import { useEffect, useRef } from 'react';
import TrackPlayer from '@rntp/player';

export default function PlayerProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function setup() {
      try {
        await TrackPlayer.setupPlayer({
  contentType: 'music',
  handleAudioBecomingNoisy: true,
  android: { wakeMode: 'network' },
});
      } catch {
        // Already initialized
      }
    }

    setup();
  }, []);

  return <>{children}</>;
}