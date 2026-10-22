/**
 * Global player & app state store.
 *
 * Holds:
 *  - the audio element + current track
 *  - queue (array of tracks) with index pointer
 *  - shuffle / repeat modes
 *  - history (for the "Recently played" rail)
 *  - app-level view state (sidebar selection, current playlist/album, search query, etc.)
 *  - style preferences
 *
 * Hooks that hit the recommendation API live in src/hooks/usePlayer.ts.
 */

import { create } from "zustand"

export interface Track {
  id: string           // saavn id
  title: string
  artist: string
  album?: string
  albumId?: string
  image?: string
  streamUrl?: string
  duration: number
  language?: string
  label?: string
  year?: string
}

export type RepeatMode = "off" | "all" | "one"

export type AppView =
  | { kind: "home" }
  | { kind: "search" }
  | { kind: "library" }
  | { kind: "playlist"; id: string }
  | { kind: "album"; id: string }
  | { kind: "preferences" }

interface PlayerState {
  // --- audio ---
  currentTrack: Track | null
  queue: Track[]
  queueIndex: number
  isPlaying: boolean
  progress: number       // seconds
  duration: number        // seconds (of current track)
  volume: number          // 0..1
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  // session-side recently played (in-memory; persisted via /api/history POST)
  recent: Track[]
  // --- app view ---
  view: AppView
  // sidebar collapse on mobile / small screens
  sidebarOpen: boolean
  // active playlist context (e.g. where the queue came from) - used for "back to playlist"
  contextName: string | null
  // --- preferences ---
  preferredMoods: string[]
  preferredLangs: string[]
  discoveryLevel: number  // 0..1
  autoPlayNext: boolean
  // --- actions ---
  setView: (v: AppView) => void
  setSidebarOpen: (open: boolean) => void
  playTrack: (track: Track, queue?: Track[], contextName?: string) => void
  playQueue: (tracks: Track[], startIndex?: number, contextName?: string) => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  setProgress: (seconds: number) => void
  setDuration: (seconds: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  appendRecommendation: (track: Track) => void // when autoplay-next fetches a new track
  pushRecent: (track: Track) => void
  setPreferences: (p: Partial<{
    preferredMoods: string[]
    preferredLangs: string[]
    discoveryLevel: number
    autoPlayNext: boolean
  }>) => void
}

export const usePlayer = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",
  recent: [],
  view: { kind: "home" },
  sidebarOpen: false,
  contextName: null,
  preferredMoods: [],
  preferredLangs: [],
  discoveryLevel: 0.3,
  autoPlayNext: true,

  setView: (v) => set({ view: v, sidebarOpen: false }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  playTrack: (track, queue, contextName) => {
    const q = queue && queue.length > 0 ? queue : [track]
    const idx = Math.max(0, q.findIndex((t) => t.id === track.id))
    set({
      currentTrack: track,
      queue: q,
      queueIndex: idx,
      isPlaying: true,
      progress: 0,
      duration: track.duration ?? 0,
      contextName: contextName ?? null,
    })
    // Track recent (dedupe by id, keep most recent at front, max 30)
    get().pushRecent(track)
  },

  playQueue: (tracks, startIndex = 0, contextName) => {
    if (tracks.length === 0) return
    const idx = Math.min(Math.max(0, startIndex), tracks.length - 1)
    const track = tracks[idx]
    set({
      currentTrack: track,
      queue: tracks,
      queueIndex: idx,
      isPlaying: true,
      progress: 0,
      duration: track.duration ?? 0,
      contextName: contextName ?? null,
    })
    get().pushRecent(track)
  },

  addToQueue: (track) => {
    const q = [...get().queue, track]
    set({ queue: q })
    // If nothing is currently playing, start this track
    if (!get().currentTrack) {
      get().playTrack(track, q)
    }
  },

  removeFromQueue: (index) => {
    const q = get().queue.filter((_, i) => i !== index)
    let idx = get().queueIndex
    if (index < idx) idx -= 1
    if (idx >= q.length) idx = q.length - 1
    set({ queue: q, queueIndex: idx })
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, queueIndex, repeat, shuffle } = get()
    if (queue.length === 0) return
    if (repeat === "one") {
      // restart same track
      set({ progress: 0, isPlaying: true })
      return
    }
    let nextIdx: number
    if (shuffle) {
      // random different from current
      nextIdx = Math.floor(Math.random() * queue.length)
      if (queue.length > 1) {
        while (nextIdx === queueIndex) nextIdx = Math.floor(Math.random() * queue.length)
      }
    } else {
      nextIdx = queueIndex + 1
      if (nextIdx >= queue.length) {
        if (repeat === "all") nextIdx = 0
        else {
          // End of queue -> signal to caller (auto-play-next will fetch a rec)
          set({ isPlaying: false })
          return
        }
      }
    }
    const track = queue[nextIdx]
    set({
      currentTrack: track,
      queueIndex: nextIdx,
      isPlaying: true,
      progress: 0,
      duration: track.duration ?? 0,
    })
    get().pushRecent(track)
  },

  prev: () => {
    const { queue, queueIndex } = get()
    if (queue.length === 0) return
    // If we're >3s into the track, restart it instead of going back
    if (get().progress > 3) {
      set({ progress: 0 })
      return
    }
    let prevIdx = queueIndex - 1
    if (prevIdx < 0) prevIdx = 0
    const track = queue[prevIdx]
    set({
      currentTrack: track,
      queueIndex: prevIdx,
      isPlaying: true,
      progress: 0,
      duration: track.duration ?? 0,
    })
  },

  seek: (seconds) => set({ progress: seconds }),
  setProgress: (seconds) => set({ progress: seconds }),
  setDuration: (seconds) => set({ duration: seconds }),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: false }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({
      repeat:
        s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
    })),

  appendRecommendation: (track) => {
    // Add the auto-recommended track to the queue and start playing it
    const q = [...get().queue, track]
    const idx = q.length - 1
    set({
      queue: q,
      queueIndex: idx,
      currentTrack: track,
      isPlaying: true,
      progress: 0,
      duration: track.duration ?? 0,
    })
    get().pushRecent(track)
  },

  pushRecent: (track) => {
    const recent = [
      track,
      ...get().recent.filter((t) => t.id !== track.id),
    ].slice(0, 30)
    set({ recent })
  },

  setPreferences: (p) => set((s) => ({ ...s, ...p })),
}))
