/**
 * LocalStorage-backed persistence layer.
 *
 * Since this is a personal single-user app, we don't need a database.
 * All data lives in the browser's localStorage. Categories:
 *   - playlists (array of Playlist objects)
 *   - savedAlbums (array of SavedAlbum objects)
 *   - preferences (single Preferences object)
 *   - history (array of ListeningHistoryEntry objects)
 *   - recent (array of Track objects, derived from history)
 *
 * Everything is JSON-serializable. We wrap each access in try/catch
 * so a corrupted entry never crashes the app.
 */

import type { Track } from "@/lib/player-store"

export interface Playlist {
  id: string
  name: string
  description?: string
  coverImage?: string
  mood?: string
  isPublic?: boolean
  tracks: Track[]
  createdAt: string
  updatedAt: string
}

export interface SavedAlbum {
  id: string
  saavnId: string
  title: string
  artist: string
  image?: string
  year?: string
  language?: string
  createdAt: string
}

export interface Preferences {
  genres: string[]
  languages: string[]
  artists: string[]
  albums: string[]
  moods: string[]
  discoveryLevel: number
  autoPlayNext: boolean
  explicitFilter: boolean
}

export interface HistoryEntry {
  trackId: string
  title: string
  artist: string
  image?: string
  language?: string
  mood?: string | null
  playedAt: string
  completed: boolean
  skipped: boolean
}

const KEYS = {
  playlists: "resonate:playlists",
  albums: "resonate:albums",
  prefs: "resonate:preferences",
  history: "resonate:history",
} as const

const DEFAULT_PREFS: Preferences = {
  genres: [],
  languages: [],
  artists: [],
  albums: [],
  moods: [],
  discoveryLevel: 0.3,
  autoPlayNext: true,
  explicitFilter: false,
}

// -----------------------------------------------------------------------------
// Low-level helpers
// -----------------------------------------------------------------------------

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
    // Broadcast a custom event so other components (sidebar, etc.) can refresh
    window.dispatchEvent(new CustomEvent("resonate:storage-changed", { detail: { key } }))
  } catch (e) {
    console.warn("Failed to write to localStorage:", e)
  }
}

// -----------------------------------------------------------------------------
// Playlists
// -----------------------------------------------------------------------------

export function getPlaylists(): Playlist[] {
  return read<Playlist[]>(KEYS.playlists, [])
}

export function getPlaylist(id: string): Playlist | null {
  return getPlaylists().find((p) => p.id === id) ?? null
}

export function savePlaylist(playlist: Playlist): void {
  const all = getPlaylists()
  const idx = all.findIndex((p) => p.id === playlist.id)
  if (idx >= 0) {
    all[idx] = { ...playlist, updatedAt: new Date().toISOString() }
  } else {
    all.unshift(playlist)
  }
  write(KEYS.playlists, all)
}

export function createPlaylist(name: string, description?: string, mood?: string): Playlist {
  const now = new Date().toISOString()
  const playlist: Playlist = {
    id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    description,
    mood,
    tracks: [],
    createdAt: now,
    updatedAt: now,
  }
  savePlaylist(playlist)
  return playlist
}

export function deletePlaylist(id: string): void {
  write(
    KEYS.playlists,
    getPlaylists().filter((p) => p.id !== id),
  )
}

export function addTrackToPlaylist(playlistId: string, track: Track): boolean {
  const playlist = getPlaylist(playlistId)
  if (!playlist) return false
  if (playlist.tracks.some((t) => t.id === track.id)) return false
  playlist.tracks.push(track)
  playlist.updatedAt = new Date().toISOString()
  savePlaylist(playlist)
  return true
}

export function removeTrackFromPlaylist(playlistId: string, trackId: string): void {
  const playlist = getPlaylist(playlistId)
  if (!playlist) return
  playlist.tracks = playlist.tracks.filter((t) => t.id !== trackId)
  playlist.updatedAt = new Date().toISOString()
  savePlaylist(playlist)
}

// -----------------------------------------------------------------------------
// Saved albums
// -----------------------------------------------------------------------------

export function getSavedAlbums(): SavedAlbum[] {
  return read<SavedAlbum[]>(KEYS.albums, [])
}

export function isAlbumSaved(saavnId: string): boolean {
  return getSavedAlbums().some((a) => a.saavnId === saavnId)
}

export function saveAlbum(album: Omit<SavedAlbum, "id" | "createdAt">): void {
  const all = getSavedAlbums()
  if (all.some((a) => a.saavnId === album.saavnId)) return
  all.unshift({
    ...album,
    id: `al_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  })
  write(KEYS.albums, all)
}

export function unsaveAlbum(saavnId: string): void {
  write(
    KEYS.albums,
    getSavedAlbums().filter((a) => a.saavnId !== saavnId),
  )
}

// -----------------------------------------------------------------------------
// Preferences
// -----------------------------------------------------------------------------

export function getPreferences(): Preferences {
  return { ...DEFAULT_PREFS, ...read<Partial<Preferences>>(KEYS.prefs, {}) }
}

export function savePreferences(prefs: Preferences): void {
  write(KEYS.prefs, prefs)
}

export function resetPreferences(): void {
  write(KEYS.prefs, DEFAULT_PREFS)
}

// -----------------------------------------------------------------------------
// Listening history
// -----------------------------------------------------------------------------

const MAX_HISTORY = 500

export function getHistory(): HistoryEntry[] {
  return read<HistoryEntry[]>(KEYS.history, [])
}

export function getRecentTracks(limit = 30): Track[] {
  const seen = new Set<string>()
  const out: Track[] = []
  for (const h of getHistory()) {
    if (seen.has(h.trackId)) continue
    seen.add(h.trackId)
    out.push({
      id: h.trackId,
      title: h.title,
      artist: h.artist,
      image: h.image,
      language: h.language,
    })
    if (out.length >= limit) break
  }
  return out
}

export function recordPlay(
  track: Track,
  opts: { completed?: boolean; skipped?: boolean; mood?: string | null } = {},
): void {
  const entry: HistoryEntry = {
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    image: track.image,
    language: track.language,
    mood: opts.mood ?? null,
    playedAt: new Date().toISOString(),
    completed: opts.completed ?? false,
    skipped: opts.skipped ?? false,
  }
  const all = [entry, ...getHistory()].slice(0, MAX_HISTORY)
  write(KEYS.history, all)
}

export function clearHistory(): void {
  write(KEYS.history, [])
}

// -----------------------------------------------------------------------------
// Storage change subscription
// -----------------------------------------------------------------------------

export function onStorageChange(handler: () => void): () => void {
  const listener = () => handler()
  window.addEventListener("resonate:storage-changed", listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener("resonate:storage-changed", listener)
    window.removeEventListener("storage", listener)
  }
}
