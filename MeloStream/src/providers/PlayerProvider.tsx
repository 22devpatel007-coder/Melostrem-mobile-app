  import { useEffect, useRef } from 'react';
  import TrackPlayer, { Capability } from 'react-native-track-player';

  export default function PlayerProvider({ children }: { children: React.ReactNode }) {
    const initialized = useRef(false);

    useEffect(() => {
      if (initialized.current) return;
      initialized.current = true;

      async function setup() {
        try {
          await TrackPlayer.setupPlayer({
            minBuffer: 15,
            maxBuffer: 50,
            playBuffer: 2,
          });
        } catch {
          // Already initialized
        }

        try {
          await TrackPlayer.updateOptions({
            capabilities: [
              Capability.Play,
              Capability.Pause,
              Capability.SkipToNext,
              Capability.SkipToPrevious,
              Capability.SeekTo,
              Capability.Stop,
            ],
            notificationCapabilities: [
              Capability.Play,
              Capability.Pause,
              Capability.SkipToNext,
            ],
            progressUpdateEventInterval: 1,
          });
        } catch (e) {
          console.error('[PlayerProvider] updateOptions failed', e);
        }
      }

      setup();
    }, []);

    return <>{children}</>;
  }