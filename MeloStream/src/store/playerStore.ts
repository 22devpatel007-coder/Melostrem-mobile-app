import { create } from "zustand";
import TrackPlayer, { RepeatMode, type PlaybackState } from "@rntp/player";
import { MMKV } from "react-native-mmkv";

const storage = new MMKV({ id: "player-storage" });

// ── Lazy queueStore accessor ──────────────────────────────────────────────────
let _getQueueState: (() => any) | null = null;
export function registerQueueStore(getStateFn: () => any) {
  _getQueueState = getStateFn;
}
function getQueueState() {
  if (!_getQueueState) return { queue: [], setQueueFromContext: null };
  return _getQueueState();
}

// ── Pagination bridge ─────────────────────────────────────────────────────────
let _paginationBridge: {
  fetchNextPage: () => void;
  hasNextPage: () => boolean;
  appendSongs: (songs: any[]) => void;
} | null = null;

export function registerPaginationBridge(bridge: typeof _paginationBridge) {
  _paginationBridge = bridge;
}

// ── Playlist pool ─────────────────────────────────────────────────────────────
let _playlistSongIds: string[] = [];
let _playlistSongsLoaded: any[] = [];

export function _setPlaylistSongIds(songIds: string[]) {
  _playlistSongIds = Array.isArray(songIds) ? songIds : [];
  _playlistSongsLoaded = [];
}

export function _appendPlaylistSongs(songs: any[]) {
  if (!Array.isArray(songs)) return;
  const existingIds = new Set(_playlistSongsLoaded.map((s) => s.id));
  for (const s of songs) {
    if (!existingIds.has(s.id)) _playlistSongsLoaded.push(s);
  }
}

let _pendingNextAfterFetch = false;

export function appendSongsToQueue(newSongs: any[]) {
  if (!Array.isArray(newSongs) || newSongs.length === 0) {
    _pendingNextAfterFetch = false;
    return;
  }
  const qs = getQueueState();
  if (typeof qs?.appendSongs === "function") {
    qs.appendSongs(newSongs);
  } else {
    _pendingNextAfterFetch = false;
    return;
  }
  if (_pendingNextAfterFetch) {
    _pendingNextAfterFetch = false;
    setTimeout(() => {
      usePlayerStore.getState().playNext();
    }, 0);
  }
}

// ── VINYL ROLL ────────────────────────────────────────────────────────────────
export function vinylRoll(songs: any[]): any[] {
  if (!Array.isArray(songs) || songs.length <= 1) return [...(songs || [])];

  const arr = [...songs];
  const len = arr.length;
  const variance = Math.floor(len * 0.1);
  const splitPoint =
    Math.floor(len / 2) + Math.floor(Math.random() * variance * 2) - variance;
  const clampedSplit = Math.max(1, Math.min(len - 1, splitPoint));

  let leftIdx = 0;
  let rightIdx = clampedSplit;
  const leftEnd = clampedSplit;
  const rightEnd = len;
  const interleaved: any[] = [];
  let fromLeft = Math.random() > 0.5;

  while (leftIdx < leftEnd || rightIdx < rightEnd) {
    if (fromLeft) {
      if (leftIdx < leftEnd) {
        const drop = Math.min(
          leftEnd - leftIdx,
          Math.floor(Math.random() * 3) + 1,
        );
        for (let i = 0; i < drop; i++) interleaved.push(arr[leftIdx++]);
      } else {
        while (rightIdx < rightEnd) interleaved.push(arr[rightIdx++]);
        break;
      }
    } else {
      if (rightIdx < rightEnd) {
        const drop = Math.min(
          rightEnd - rightIdx,
          Math.floor(Math.random() * 3) + 1,
        );
        for (let i = 0; i < drop; i++) interleaved.push(arr[rightIdx++]);
      } else {
        while (leftIdx < leftEnd) interleaved.push(arr[leftIdx++]);
        break;
      }
    }
    fromLeft = !fromLeft;
  }

  for (let i = 0; i < interleaved.length - 1; i++) {
    if (Math.random() < 0.4) {
      [interleaved[i], interleaved[i + 1]] = [
        interleaved[i + 1],
        interleaved[i],
      ];
      i++;
    }
  }

  const cutMin = Math.floor(interleaved.length * 0.3);
  const cutMax = Math.floor(interleaved.length * 0.7);
  const cutAt = cutMin + Math.floor(Math.random() * (cutMax - cutMin + 1));
  return [...interleaved.slice(cutAt), ...interleaved.slice(0, cutAt)];
}

// ── SMART SHUFFLE ─────────────────────────────────────────────────────────────
export function smartPick(
  queue: any[],
  currentSong: any,
  playCountMap: Record<string, number>,
  recentHistory: any[],
): any | null {
  if (!queue.length) return null;

  const recentWindow = Math.max(3, Math.ceil(queue.length * 0.2));
  const recentIds = new Set(
    recentHistory.slice(0, recentWindow).map((s) => s.id),
  );
  const last3Artists = new Set(
    recentHistory
      .slice(0, 3)
      .map((s) => s.artist)
      .filter(Boolean),
  );

  const exhausted = queue.every(
    (s) => s.id === currentSong?.id || (playCountMap[s.id] ?? 0) > 0,
  );
  const effectiveMap = exhausted ? {} : playCountMap;
  const maxPlayCount = Object.values(effectiveMap).reduce(
    (m, v) => Math.max(m, v),
    1,
  );

  const weights = queue.map((song) => {
    if (song.id === currentSong?.id) return 0;
    if (recentIds.has(song.id)) return 0.05;
    const playCount = effectiveMap[song.id] ?? 0;
    const countWeight = (maxPlayCount - playCount + 1) / (maxPlayCount + 1);
    const artistPenalty = last3Artists.has(song.artist) ? 0.15 : 1.0;
    return countWeight * artistPenalty;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    const fallback = queue.filter((s) => s.id !== currentSong?.id);
    return fallback.length
      ? fallback[Math.floor(Math.random() * fallback.length)]
      : queue[0];
  }

  let rand = Math.random() * totalWeight;
  for (let i = 0; i < queue.length; i++) {
    if (weights[i] === 0) continue;
    rand -= weights[i];
    if (rand <= 0) return queue[i];
  }
  for (let i = queue.length - 1; i >= 0; i--) {
    if (weights[i] > 0) return queue[i];
  }
  return queue[queue.length - 1];
}

// ── AFFINITY ──────────────────────────────────────────────────────────────────
const AFFINITY_DECAY = 0.85;
const AFFINITY_INCREMENT = 1.0;

function updateAffinityMap(prevMap: Record<string, number>, song: any) {
  const decayed: Record<string, number> = {};
  for (const [key, val] of Object.entries(prevMap)) {
    const next = val * AFFINITY_DECAY;
    if (next > 0.01) decayed[key] = next;
  }
  if (song.artist) {
    const k = `artist::${song.artist}`;
    decayed[k] = (decayed[k] ?? 0) + AFFINITY_INCREMENT;
  }
  if (song.genre) {
    const k = `genre::${song.genre}`;
    decayed[k] = (decayed[k] ?? 0) + AFFINITY_INCREMENT;
  }
  return decayed;
}

function scoreDynamicPool(
  candidates: any[],
  currentSong: any,
  affinityMap: Record<string, number>,
  recentHistory: any[],
): any[] {
  if (!candidates.length) return [];

  const recentWindow = Math.max(5, Math.ceil(recentHistory.length * 0.3));
  const recentIds = new Set(
    recentHistory.slice(0, recentWindow).map((s) => s.id),
  );
  const last3Artists = new Set(
    recentHistory
      .slice(0, 3)
      .map((s) => s.artist)
      .filter(Boolean),
  );

  const allExhausted = candidates
    .filter((s) => s.id !== currentSong?.id)
    .every((s) => recentIds.has(s.id));
  const effectiveRecentIds = allExhausted ? new Set<string>() : recentIds;

  return candidates
    .filter((s) => s.id !== currentSong?.id)
    .map((song) => {
      let similarityScore = 0;
      if (currentSong) {
        if (song.artist === currentSong.artist) similarityScore += 2;
        if (song.genre === currentSong.genre) similarityScore += 1;
      }
      let affinityScore = 0;
      if (song.artist)
        affinityScore += affinityMap[`artist::${song.artist}`] ?? 0;
      if (song.genre) affinityScore += affinityMap[`genre::${song.genre}`] ?? 0;

      const recentPenalty = effectiveRecentIds.has(song.id) ? 0.1 : 1.0;
      const artistPenalty = last3Artists.has(song.artist) ? 0.3 : 1.0;

      return {
        song,
        score:
          (similarityScore + affinityScore) * recentPenalty * artistPenalty,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((e) => e.song);
}

// ── Session flush ─────────────────────────────────────────────────────────────
const FLUSH_EVERY = 5;

async function flushSessionLog(log: any[], uid: string) {
  if (!log.length || !uid) return;
  try {
    const { default: api } = await import("@services/api");
    await api.post(`/users/${uid}/session-picks`, { picks: log });
  } catch (err: any) {
    console.warn("[playerStore] session-picks flush failed:", err.message);
  }
}

// ── Store interface ───────────────────────────────────────────────────────────
interface PlayerState {
  currentSong: any | null;
  recentlyPlayed: any[];
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  shuffleMode: "none" | "classic" | "smart";
  shuffledOrder: any[];
  shuffledIndex: number;
  playCountMap: Record<string, number>;
  repeatMode: "none" | "all" | "one";
  playbackContext: { type: string; id: string | null; songs: any[] };
  affinityMap: Record<string, number>;
  dynamicPool: any[];
  sessionLog: any[];
  setUser?: (user: any) => void;
  playSong: (song: any) => Promise<void>;
  playNext: () => void;
  playPrev: () => void;
  pauseSong: () => void;
  resumeSong: () => Promise<void>;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  setCurrentTime: (t: number) => void;
  seekBy: (seconds: number) => void;
  setRepeatMode: (mode: "none" | "all" | "one") => void;
  cycleShuffleMode: () => void;
  setShuffleMode: (mode: "none" | "classic" | "smart") => void;
  toggleShuffle: () => void;
  resetShuffleSession: () => void;
  setPlaybackContext: (
    type: string,
    id: string | null,
    songs: any[],
    startIndex?: number,
  ) => void;
  logPick: (song: any, previousSong: any, uid: string) => void;
  stop: () => Promise<void>;
  stopAndClose: () => Promise<void>;
}

const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  recentlyPlayed: [],
  isPlaying: false,
  volume: parseFloat(storage.getString("melostream_volume") ?? "1") || 1,
  currentTime: 0,
  duration: 0,
  shuffleMode: "none",
  shuffledOrder: [],
  shuffledIndex: -1,
  playCountMap: {},
  repeatMode: "none",
  playbackContext: { type: "library", id: null, songs: [] },
  affinityMap: {},
  dynamicPool: [],
  sessionLog: [],

  // ── setPlaybackContext ──────────────────────────────────────────────────────
  setPlaybackContext: (type, id, songs, startIndex = 0) => {
    if (!Array.isArray(songs) || songs.length === 0) return;
    const safeIdx = Math.max(0, Math.min(startIndex, songs.length - 1));
    const { shuffleMode } = get();
    const nextShuffleMode =
      type === "dynamic" && shuffleMode === "classic" ? "smart" : shuffleMode;

    set({
      playbackContext: { type, id, songs },
      shuffleMode: nextShuffleMode,
      shuffledOrder: [],
      shuffledIndex: -1,
      playCountMap: {},
      recentlyPlayed: [],
      dynamicPool: type === "dynamic" ? [...songs] : [],
    });

    const qs = getQueueState();
    if (typeof qs?.setQueueFromContext === "function") {
      qs.setQueueFromContext(songs, safeIdx, type);
    }
  },

  // ── cycleShuffleMode ────────────────────────────────────────────────────────
  cycleShuffleMode: () => {
    const { shuffleMode, playbackContext, setShuffleMode } = get();
    const isDynamic = playbackContext.type === "dynamic";
    let next: "none" | "classic" | "smart";
    if (shuffleMode === "none") next = isDynamic ? "smart" : "classic";
    else if (shuffleMode === "classic") next = "smart";
    else next = "none";
    setShuffleMode(next);
  },

  // ── setShuffleMode ──────────────────────────────────────────────────────────
  setShuffleMode: (mode) => {
    const { playbackContext } = get();
    const isDynamic = playbackContext.type === "dynamic";
    const safeMode = isDynamic && mode === "classic" ? "smart" : mode;

    if (safeMode === "classic") {
      const pool =
        playbackContext.songs.length > 0
          ? playbackContext.songs
          : getQueueState().queue;
      if (pool.length > 0) {
        const { currentSong } = get();
        const rolled = vinylRoll(pool);
        const idx = rolled.findIndex((s) => s.id === currentSong?.id);
        set({
          shuffleMode: "classic",
          shuffledOrder: rolled,
          shuffledIndex: idx >= 0 ? idx : 0,
        });
        return;
      }
    }
    set({ shuffleMode: safeMode, shuffledOrder: [], shuffledIndex: -1 });
  },

  toggleShuffle: () => get().cycleShuffleMode(),

  // ── logPick ─────────────────────────────────────────────────────────────────
  logPick: (song, previousSong, uid) => {
    if (!song) return;
    const newEntry = {
      songId: song.id,
      previousSongId: previousSong?.id ?? null,
      contextType: get().playbackContext.type,
      contextId: get().playbackContext.id,
      ts: Date.now(),
    };
    const newAffinityMap = updateAffinityMap(get().affinityMap, song);
    let newDynamicPool = get().dynamicPool;
    if (get().playbackContext.type === "dynamic") {
      newDynamicPool = scoreDynamicPool(
        get().dynamicPool,
        song,
        newAffinityMap,
        get().recentlyPlayed,
      );
    }
    const newLog = [...get().sessionLog, newEntry];
    set({
      affinityMap: newAffinityMap,
      dynamicPool: newDynamicPool,
      sessionLog: newLog,
    });
    if (newLog.length >= FLUSH_EVERY) {
      const logSnapshot = [...newLog];
      set({ sessionLog: [] });
      flushSessionLog(logSnapshot, uid);
    }
  },

  // ── playSong ────────────────────────────────────────────────────────────────
  playSong: async (song) => {
    if (!song?.id) return;

    let src = song.audioUrl || song.fileUrl || "";
    if (!src) {
      try {
        const { getSongAudioUrl } = await import("@services/songs.service");
        src = await getSongAudioUrl(song.id);
      } catch (err: any) {
        console.warn("[playerStore] getSongAudioUrl failed:", err.message);
      }
    }
    if (!src) return;

    set((state) => ({
      currentSong: song,
      isPlaying: false,
      recentlyPlayed: [
        song,
        ...state.recentlyPlayed.filter((s) => s.id !== song.id),
      ].slice(0, 50),
      playCountMap: {
        ...state.playCountMap,
        [song.id]: (state.playCountMap[song.id] ?? 0) + 1,
      },
    }));

    try {
      TrackPlayer.setMediaItem({
        mediaId: song.id,
        url: src,
        title: song.title,
        artist: song.artist ?? "Unknown Artist",
        artworkUrl: song.coverUrl ?? song.imageUrl ?? undefined,
        duration: song.duration ?? undefined,
      });
      TrackPlayer.play();
      set({ isPlaying: true });
    } catch (err: any) {
      console.error("[playerStore] TrackPlayer error:", err.message);
      set({ isPlaying: false });
    }
  },

  // ── playNext ────────────────────────────────────────────────────────────────
  playNext: () => {
    const {
      currentSong,
      shuffleMode,
      shuffledOrder,
      shuffledIndex,
      repeatMode,
      recentlyPlayed,
      playCountMap,
      playSong,
      playbackContext,
      dynamicPool,
    } = get();

    const { queue } = getQueueState();

    if (playbackContext.type === "dynamic") {
      const pool =
        dynamicPool.length > 0
          ? dynamicPool
          : playbackContext.songs.length > 0
            ? playbackContext.songs
            : queue;
      const nextSong = smartPick(
        pool,
        currentSong,
        playCountMap,
        recentlyPlayed,
      );
      if (nextSong) playSong(nextSong);
      return;
    }

    const pool =
      playbackContext.type === "playlist" && _playlistSongsLoaded.length > 0
        ? _playlistSongsLoaded
        : playbackContext.songs.length > 0
          ? playbackContext.songs
          : queue;
    if (!pool.length) return;

    if (shuffleMode === "classic") {
      let order = shuffledOrder;
      let idx = shuffledIndex;
      if (!order.length || idx >= order.length - 1) {
        order = vinylRoll(pool);
        idx = -1;
        set({ shuffledOrder: order });
      }
      const nextIdx = idx + 1;
      const nextSong = order[nextIdx];
      set({ shuffledIndex: nextIdx });
      if (nextSong) playSong(nextSong);
      return;
    }

    if (shuffleMode === "smart") {
      const smartPool = queue.length > 0 ? queue : pool;
      const nextSong = smartPick(
        smartPool,
        currentSong,
        playCountMap,
        recentlyPlayed,
      );
      if (nextSong) playSong(nextSong);
      return;
    }

    if (!queue.length) return;
    const currentIndex = queue.findIndex((s: any) => s.id === currentSong?.id);
    const nextIndex = currentIndex + 1;

    if (nextIndex < queue.length) {
      playSong(queue[nextIndex]);
      return;
    }

    if (playbackContext.type === "library" && _paginationBridge) {
      if (_paginationBridge.hasNextPage()) {
        _pendingNextAfterFetch = true;
        _paginationBridge.fetchNextPage();
        return;
      }
    }

    if (repeatMode === "all") playSong(queue[0]);
    else set({ isPlaying: false });
  },

  // ── playPrev ────────────────────────────────────────────────────────────────
  playPrev: () => {
    const { currentSong, shuffleMode, recentlyPlayed, playSong, currentTime } =
      get();

    if (currentTime > 3) {
      TrackPlayer.seekTo(0);
      return;
    }

    if (shuffleMode !== "none" && recentlyPlayed.length > 1) {
      const prev = recentlyPlayed[1];
      if (prev) {
        playSong(prev);
        return;
      }
    }

    const { queue } = getQueueState();
    if (!queue.length) return;
    const currentIndex = queue.findIndex((s: any) => s.id === currentSong?.id);
    const prevIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
    playSong(queue[prevIndex]);
  },

  // ── Playback controls ───────────────────────────────────────────────────────
  pauseSong: () => {
    TrackPlayer.pause();
    set({ isPlaying: false });
  },

  resumeSong: async () => {
    try {
      await TrackPlayer.play();
      set({ isPlaying: true });
    } catch (err: any) {
      console.error("[playerStore] Resume error:", err.message);
      set({ isPlaying: false });
    }
  },

  togglePlay: () => {
    const { isPlaying, pauseSong, resumeSong } = get();
    if (isPlaying) pauseSong();
    else resumeSong();
  },

  setVolume: (v) => {
    TrackPlayer.setVolume(v);
    storage.set("melostream_volume", String(v));
    set({ volume: v });
  },

  setCurrentTime: (t) => {
    TrackPlayer.seekTo(t);
    set({ currentTime: t });
  },

  seekBy: (seconds) => {
    const { currentTime, duration } = get();
    const t = Math.max(0, Math.min(duration, currentTime + seconds));
    TrackPlayer.seekTo(t);
    set({ currentTime: t });
  },

  setRepeatMode: (mode) => {
    const rpMap = {
      none: RepeatMode.Off,
      all: RepeatMode.All,
      one: RepeatMode.One,
    };
    TrackPlayer.setRepeatMode(rpMap[mode]);
    set({ repeatMode: mode });
  },

  resetShuffleSession: () => {
    const { shuffleMode, playbackContext } = get();
    const pool =
      playbackContext.songs.length > 0
        ? playbackContext.songs
        : getQueueState().queue;
    set({
      playCountMap: {},
      recentlyPlayed: [],
      shuffledOrder:
        shuffleMode === "classic" && pool.length ? vinylRoll(pool) : [],
      shuffledIndex: -1,
    });
  },

  stop: async () => {
    TrackPlayer.stop();
    TrackPlayer.clear();
    _pendingNextAfterFetch = false;
    set({
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      shuffledOrder: [],
      shuffledIndex: -1,
      playCountMap: {},
      playbackContext: { type: "library", id: null, songs: [] },
      dynamicPool: [],
      sessionLog: [],
    });
  },

  stopAndClose: async () => {
    TrackPlayer.stop();
    TrackPlayer.clear();
    _pendingNextAfterFetch = false;
    set({
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      shuffledOrder: [],
      shuffledIndex: -1,
      playCountMap: {},
      playbackContext: { type: "library", id: null, songs: [] },
      dynamicPool: [],
      sessionLog: [],
    });
    try {
      const qs = getQueueState();
      if (typeof qs?.setQueueFromContext === "function") {
        qs.setQueueFromContext([], 0, "library");
      }
    } catch {}
  },
}));

export { usePlayerStore };
export default usePlayerStore;
