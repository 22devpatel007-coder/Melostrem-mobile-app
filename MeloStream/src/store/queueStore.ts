import { create } from 'zustand';
import usePlayerStore, { registerQueueStore } from './playerStore';
import { QueueManager } from '../player/QueueManager';

interface QueueState {
  queue: any[];
  currentIndex: number;
  setQueueFromContext: (songs: any[], startIndex?: number, contextType?: string) => void;
  setQueue: (songs: any[], startIndex?: number) => void;
  appendSongs: (newSongs: any[]) => void;
  addToQueue: (song: any) => void;
  removeFromQueue: (songId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  nextSong: () => void;
  prevSong: () => void;
  clearQueue: () => void;
}

const useQueueStore = create<QueueState>((set, get) => ({
  queue: [],
  currentIndex: 0,

  setQueueFromContext: (songs, startIndex = 0, contextType = 'library') => {
    if (!songs || songs.length === 0) return;
    const idx = Math.max(0, Math.min(startIndex, songs.length - 1));
    set({ queue: songs, currentIndex: idx });
    QueueManager.setQueue(songs, idx);
    usePlayerStore.getState().resetShuffleSession();
    usePlayerStore.setState({ currentSong: songs[idx], isPlaying: true });
  },

  setQueue: (songs, startIndex = 0) => {
    if (!songs || songs.length === 0) return;
    const idx = Math.max(0, Math.min(startIndex, songs.length - 1));
    set({ queue: songs, currentIndex: idx });
    QueueManager.setQueue(songs, idx);
    usePlayerStore.getState().resetShuffleSession();
    usePlayerStore.getState().playSong(songs[idx]);
  },

  appendSongs: (newSongs) => {
    if (!Array.isArray(newSongs) || newSongs.length === 0) return;
    set((s) => {
      const existingIds = new Set(s.queue.map((song) => song.id));
      const unique = newSongs.filter((song) => song?.id && !existingIds.has(song.id));
      if (unique.length === 0) return s;
      return { queue: [...s.queue, ...unique] };
    });
  },

  addToQueue: (song) => {
    if (!song) return;
    set((s) => ({ queue: [...s.queue, song] }));
    QueueManager.addToQueue(song);

    const playerState = usePlayerStore.getState();
    if (playerState.shuffleMode === 'classic') {
      const { shuffledOrder, shuffledIndex } = playerState;
      if (shuffledOrder.length > 0) {
        const remaining = shuffledOrder.length - (shuffledIndex + 1);
        const insertAt = shuffledIndex + 1 + Math.floor(Math.random() * (remaining + 1));
        const newOrder = [
          ...shuffledOrder.slice(0, insertAt),
          song,
          ...shuffledOrder.slice(insertAt),
        ];
        usePlayerStore.setState({ shuffledOrder: newOrder });
      } else {
        usePlayerStore.setState({ shuffledOrder: [song] });
      }
    }
  },

  removeFromQueue: (songId) => {
    set((s) => ({ queue: s.queue.filter((song) => song.id !== songId) }));
    QueueManager.removeFromQueueById(songId);

    const { shuffleMode, shuffledOrder, shuffledIndex } = usePlayerStore.getState();
    if (shuffleMode === 'classic' && shuffledOrder.length) {
      const removeIdx = shuffledOrder.findIndex((s) => s.id === songId);
      if (removeIdx === -1) return;
      const newOrder = shuffledOrder.filter((s) => s.id !== songId);
      const newIdx = removeIdx < shuffledIndex ? shuffledIndex - 1 : shuffledIndex;
      usePlayerStore.setState({
        shuffledOrder: newOrder,
        shuffledIndex: Math.max(-1, newIdx),
      });
    }
  },

  reorderQueue: (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    set((s) => {
      const next = [...s.queue];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { queue: next };
    });
    QueueManager.reorderQueue(fromIndex, toIndex);

    const { shuffleMode, shuffledOrder, shuffledIndex } = usePlayerStore.getState();
    if (shuffleMode === 'classic' && shuffledOrder.length) {
      const next = [...shuffledOrder];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      let newIdx = shuffledIndex;
      if (fromIndex === shuffledIndex) newIdx = toIndex;
      else if (fromIndex < shuffledIndex && toIndex >= shuffledIndex) newIdx = shuffledIndex - 1;
      else if (fromIndex > shuffledIndex && toIndex <= shuffledIndex) newIdx = shuffledIndex + 1;

      usePlayerStore.setState({ shuffledOrder: next, shuffledIndex: newIdx });
    }
  },

  nextSong: () => {
    const { queue, currentIndex } = get();
    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      set({ currentIndex: nextIndex });
      usePlayerStore.getState().playSong(queue[nextIndex]);
    }
  },

  prevSong: () => {
    const { queue, currentIndex } = get();
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      set({ currentIndex: prevIndex });
      usePlayerStore.getState().playSong(queue[prevIndex]);
    }
  },

  clearQueue: () => {
    set({ queue: [], currentIndex: 0 });
    QueueManager.clear();
    usePlayerStore.setState({ shuffledOrder: [], shuffledIndex: -1, playCountMap: {} });
  },
}));

registerQueueStore(useQueueStore.getState);

export { useQueueStore };
export default useQueueStore;