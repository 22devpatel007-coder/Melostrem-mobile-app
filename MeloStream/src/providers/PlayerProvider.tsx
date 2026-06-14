import { useEffect } from 'react';
import TrackPlayer, { Capability } from 'react-native-track-player';

export default function PlayerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function setup() {
      try {
        await TrackPlayer.setupPlayer({
          minBuffer: 15,
          maxBuffer: 50,
          playBuffer: 2,
        });
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
        // Player already initialized
      }
    }
    setup();
  }, []);

  return <>{children}</>;
}