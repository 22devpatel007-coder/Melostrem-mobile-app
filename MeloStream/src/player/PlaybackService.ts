import TrackPlayer, { Event, State } from 'react-native-track-player';

export async function PlaybackService() {
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

  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));

  TrackPlayer.addEventListener(Event.RemoteDuck, (e) => {
    if (e.permanent || e.paused) TrackPlayer.pause();
    else TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
    const { usePlayerStore } = require('@store/playerStore');
    if (e.state === State.Playing) usePlayerStore.setState({ isPlaying: true });
    else if (e.state === State.Paused || e.state === State.Stopped)
      usePlayerStore.setState({ isPlaying: false });
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
    const { usePlayerStore } = require('@store/playerStore');
    usePlayerStore.setState({ currentTime: e.position, duration: e.duration });
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (e) => {
    if (!e.track) return;
    const { usePlayerStore } = require('@store/playerStore');
    const { queue } = require('@store/queueStore').useQueueStore.getState();
    const song = queue.find((s: any) => s.id === e.track?.id);
    if (song) usePlayerStore.setState({ currentSong: song });
  });
}