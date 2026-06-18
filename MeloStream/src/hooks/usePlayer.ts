import { useProgress } from "@rntp/player";
import { usePlayerStore } from "@store/playerStore";

export function usePlayer() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);

  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const setRepeatMode = usePlayerStore((s) => s.setRepeatMode);
  const cycleShuffleMode = usePlayerStore((s) => s.cycleShuffleMode);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const seekBy = usePlayerStore((s) => s.seekBy);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const volume = usePlayerStore((s) => s.volume);

  const { position, duration, buffered } = useProgress(250);

  const cycleRepeat = () => {
    const modes: Array<"none" | "all" | "one"> = ["none", "all", "one"];
    const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    setRepeatMode(next);
  };

  return {
    currentSong,
    isPlaying,
    repeatMode,
    shuffleMode,
    position,
    duration,
    buffered,
    volume,
    togglePlay,
    playNext,
    playPrev,
    cycleRepeat,
    cycleShuffleMode,
    seekTo: setCurrentTime,
    seekBy,
    setVolume,
  };
}
