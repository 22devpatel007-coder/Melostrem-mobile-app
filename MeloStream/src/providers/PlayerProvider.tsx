import { useEffect, useRef } from 'react';
import TrackPlayer, { PlayerCommand } from '@rntp/player';
import { PlaybackService } from '../player/PlaybackService';

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
      PlaybackService();
      TrackPlayer.setCommands({
        capabilities: [
          PlayerCommand.PlayPause,
          PlayerCommand.Next,
          PlayerCommand.Previous,
          PlayerCommand.Stop,
          PlayerCommand.Seek,
        ],
        handling: 'hybrid',
        perCommandHandling: {
          [PlayerCommand.Next]: 'js',
          [PlayerCommand.Previous]: 'js',
        },
      });
    }

    setup();
  }, []);

  return <>{children}</>;
}