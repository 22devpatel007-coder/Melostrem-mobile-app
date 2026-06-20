import TrackPlayer, { Event, PlaybackState, type BackgroundEvent } from '@rntp/player';

// ── Foreground listeners — registered once from PlayerProvider ──────────────
export function PlaybackServiceForeground() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    const { usePlayerStore } = require('@store/playerStore');
    usePlayerStore.getState().playNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    const { usePlayerStore } = require('@store/playerStore');
    usePlayerStore.getState().playPrev();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (e) =>
    TrackPlayer.seekTo(e.position)
  );

  TrackPlayer.addEventListener(Event.IsPlayingChanged, (e) => {
    const { usePlayerStore } = require('@store/playerStore');
    usePlayerStore.setState({ isPlaying: e.playing });
  });

  TrackPlayer.addEventListener(Event.PlaybackStateChanged, (e) => {
    const { usePlayerStore } = require('@store/playerStore');
    if (e.state === PlaybackState.Ended || e.state === PlaybackState.Idle) {
      usePlayerStore.setState({ isPlaying: false });
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
    const { usePlayerStore } = require('@store/playerStore');
    usePlayerStore.setState({ currentTime: e.position, duration: e.duration });
  });

  TrackPlayer.addEventListener(Event.MediaItemTransition, (e) => {
    if (!e.item) return;
    const { usePlayerStore } = require('@store/playerStore');
    const { useQueueStore } = require('@store/queueStore');
    const { queue } = useQueueStore.getState();
    const song = queue.find((s: any) => s.id === e.item?.mediaId);
    if (song) usePlayerStore.setState({ currentSong: song });
  });
}

// ── Background handler — registered once from index.js (Android only) ──────
export function PlaybackServiceBackgroundFactory() {
  return async (event: BackgroundEvent) => {
    const { usePlayerStore } = require('@store/playerStore');

    switch (event.type) {
      case Event.RemoteNext:
        usePlayerStore.getState().playNext();
        break;
      case Event.RemotePrevious:
        usePlayerStore.getState().playPrev();
        break;
    }
  };
}