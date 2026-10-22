/**
 * Mood / theme extraction & "play next" recommendation engine.
 *
 * FULLY CLIENT-SIDE — no DB, no API routes needed.
 * Calls iTunes Search API directly from the browser.
 * Uses listening history from localStorage to build the taste profile.
 */

import { searchSongs, type SaavnSong } from "./saavn"
import { getHistory, type HistoryEntry } from "./storage"

// ---------------------------------------------------------------------------
// Mood taxonomy
// ---------------------------------------------------------------------------

export type Mood =
  | "energetic"
  | "happy"
  | "romantic"
  | "chill"
  | "sad"
  | "party"
  | "focused"
  | "soulful"

export const MOOD_LABELS: Record<Mood, string> = {
  energetic: "Energetic",
  happy: "Happy",
  romantic: "Romantic",
  chill: "Chill",
  sad: "Melancholic",
  party: "Party",
  focused: "Focus",
  soulful: "Soulful",
}

export const MOODS: Mood[] = [
  "energetic",
  "happy",
  "romantic",
  "chill",
  "sad",
  "party",
  "focused",
  "soulful",
]

// Keywords that hint at a mood. Used both ways: when classifying a song
// (title/album/language contains a keyword) and when building a search
// query (we feed these terms to iTunes search).
const MOOD_KEYWORDS: Record<Mood, string[]> = {
  energetic: ["dance", "energy", "power", "anthem", "hype", "workout", "running"],
  happy: ["happy", "feel good", "smile", "sunny", "joy", "celebration"],
  romantic: ["love", "romantic", "dil", "pyaar", "ishq", "heart", "valentine"],
  chill: ["chill", "lofi", "lo-fi", "calm", "relax", "acoustic", "evening", "rain"],
  sad: ["sad", "breakup", "tanhai", "dard", "missing", "lonely", "tears"],
  party: ["party", "club", "bhangra", "dance floor", "remix", "dj", "beat"],
  focused: ["focus", "study", "ambient", "instrumental", "meditation", "concentration"],
  soulful: ["soulful", "sufi", "ghazal", "qawwali", "spiritual", "bhajan", "devotional"],
}

export const LANGUAGES = [
  "hindi",
  "english",
  "punjabi",
  "tamil",
  "telugu",
  "marathi",
  "bengali",
  "gujarati",
  "kannada",
  "malayalam",
]

// ---------------------------------------------------------------------------
// Theme extraction
// ---------------------------------------------------------------------------

export interface SongTheme {
  moods: Mood[]
  tempo: "slow" | "mid" | "fast"
  languages: string[]
  seedKeywords: string[]
}

export function extractTheme(song: {
  title: string
  album?: string | null
  label?: string | null
  language?: string | null
  duration: number
}): SongTheme {
  const haystack = `${song.title} ${song.album ?? ""} ${song.label ?? ""}`.toLowerCase()
  const moods: { mood: Mood; score: number }[] = []

  for (const mood of MOODS) {
    let score = 0
    for (const kw of MOOD_KEYWORDS[mood]) {
      if (haystack.includes(kw)) score += 1
    }
    if (score > 0) moods.push({ mood, score })
  }
  moods.sort((a, b) => b.score - a.score || a.mood.localeCompare(b.mood))

  const dur = song.duration
  let tempo: "slow" | "mid" | "fast" = "mid"
  if (dur > 0) {
    if (dur < 150) tempo = "fast"
    else if (dur > 300) tempo = "slow"
  }

  const languages = (song.language ?? "")
    .toLowerCase()
    .split(/[,/]/)
    .map((l) => l.trim())
    .filter((l) => LANGUAGES.includes(l))

  const topMoods = moods.length > 0 ? moods.map((m) => m.mood) : ["chill"]
  const seedKeywords = topMoods
    .slice(0, 2)
    .flatMap((m) => MOOD_KEYWORDS[m].slice(0, 1))

  return {
    moods: topMoods,
    tempo,
    languages,
    seedKeywords,
  }
}

// ---------------------------------------------------------------------------
// Taste profile from localStorage history
// ---------------------------------------------------------------------------

export interface TasteProfile {
  topMoods: Mood[]
  topLanguages: string[]
  topArtists: string[]
  recentlyPlayedIds: string[]
}

export function buildTasteProfile(history: HistoryEntry[]): TasteProfile {
  const moodCount: Record<string, number> = {}
  const langCount: Record<string, number> = {}
  const artistCount: Record<string, number> = {}
  const recent: string[] = []

  for (const entry of history) {
    if (entry.mood) moodCount[entry.mood] = (moodCount[entry.mood] ?? 0) + 1
    if (entry.language) {
      for (const l of entry.language.toLowerCase().split(/[,/]/)) {
        const ll = l.trim()
        if (ll) langCount[ll] = (langCount[ll] ?? 0) + 1
      }
    }
    if (entry.artist) artistCount[entry.artist] = (artistCount[entry.artist] ?? 0) + 1
    if (!recent.includes(entry.trackId)) recent.push(entry.trackId)
  }

  const topMoods = Object.entries(moodCount)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m as Mood)
    .slice(0, 3)

  const topLanguages = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l)
    .slice(0, 3)

  const topArtists = Object.entries(artistCount)
    .sort((a, b) => b[1] - a[1])
    .map(([a]) => a)
    .slice(0, 5)

  return {
    topMoods,
    topLanguages,
    topArtists,
    recentlyPlayedIds: recent.slice(0, 25),
  }
}

// ---------------------------------------------------------------------------
// Play-next picker
// ---------------------------------------------------------------------------

export interface PlayNextInput {
  currentSong?: SaavnSong | null
  taste: TasteProfile
  discoveryLevel: number
  preferredMoods: Mood[]
  preferredLanguages: string[]
  excludeIds: string[]
}

export async function pickNextTrack(input: PlayNextInput): Promise<SaavnSong | null> {
  const {
    currentSong,
    taste,
    discoveryLevel,
    preferredMoods,
    preferredLanguages,
    excludeIds,
  } = input

  const theme = currentSong ? extractTheme(currentSong) : null

  const moodPool: Mood[] = []
  if (theme && theme.moods.length > 0) moodPool.push(theme.moods[0])
  moodPool.push(...preferredMoods, ...taste.topMoods)
  if (discoveryLevel > 0.5) {
    for (const m of MOODS) if (!moodPool.includes(m)) moodPool.push(m)
  }
  const chosenMood = moodPool[0] ?? "chill"
  const moodKeyword = MOOD_KEYWORDS[chosenMood]?.[0] ?? "music"

  const parts: string[] = [moodKeyword]
  if (currentSong && discoveryLevel < 0.4) {
    parts.push(currentSong.artist.split(",")[0])
  } else if (taste.topArtists.length > 0 && discoveryLevel < 0.7) {
    parts.push(taste.topArtists[0])
  }
  const query = parts.slice(0, 2).join(" ")

  const lang = taste.topLanguages[0] ?? preferredLanguages[0] ?? "hindi"

  const results = await searchSongs(`${query} ${lang}`, 20)

  const eligible = results.filter((s) => !excludeIds.includes(s.id))
  if (eligible.length === 0) return results[0] ?? null

  const weights = eligible.map((_, i) => 1 / (i + 1))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i]
    if (r <= 0) return eligible[i]
  }
  return eligible[0]
}

// ---------------------------------------------------------------------------
// Convenience: build taste profile from localStorage
// ---------------------------------------------------------------------------

export function getTasteProfileFromStorage(): TasteProfile {
  return buildTasteProfile(getHistory())
}
