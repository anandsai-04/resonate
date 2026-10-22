/**
 * Mood / theme extraction & "play next" recommendation engine.
 *
 * The idea: when a playlist ends (or queue is empty), we look at the
 * song that just played, derive a "theme" (mood + tempo + language +
 * genre), and search JioSaavn for tracks that match that theme.
 *
 * The theme is reinforced by the user's recently played history (taste
 * profile) and modulated by the discovery_level preference.
 *
 * Output of `pickNextTrack` is a single track the player can load.
 */

import { searchSongs, type SaavnSong } from "./saavn"

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
// query (we feed these terms to JioSaavn search).
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

// Languages we recognise for the taste profile
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
  moods: Mood[]      // ranked, highest first
  tempo: "slow" | "mid" | "fast"
  languages: string[]
  seedKeywords: string[] // used to build searches
}

/**
 * Derive a theme from a song. We use a hybrid approach:
 *   1. Keyword matching against title + album + label
 *   2. Duration heuristics (very short => interlude/lofi, very long => epic)
 *   3. Language from the song's `language` field (cleaned)
 */
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
  // Sort by score desc, then by mood alphabetical for stability
  moods.sort((a, b) => b.score - a.score || a.mood.localeCompare(b.mood))

  // Tempo from duration (very rough heuristic)
  const dur = song.duration
  let tempo: "slow" | "mid" | "fast" = "mid"
  if (dur > 0) {
    if (dur < 150) tempo = "fast"
    else if (dur > 300) tempo = "slow"
  }

  // Language: saavn returns "hindi" / "english" / etc.
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
// Taste profile from history
// ---------------------------------------------------------------------------

export interface TasteProfile {
  topMoods: Mood[]      // ranked
  topLanguages: string[]
  topArtists: string[]
  recentlyPlayedIds: string[] // last N song ids (saavn ids)
}

export function buildTasteProfile(history: Array<{
  track: {
    saavnId: string
    artist: string
    language?: string | null
    mood?: string | null
  }
}>): TasteProfile {
  const moodCount: Record<string, number> = {}
  const langCount: Record<string, number> = {}
  const artistCount: Record<string, number> = {}
  const recent: string[] = []

  for (const entry of history) {
    const t = entry.track
    if (t.mood) moodCount[t.mood] = (moodCount[t.mood] ?? 0) + 1
    if (t.language) {
      for (const l of t.language.toLowerCase().split(/[,/]/)) {
        const ll = l.trim()
        if (ll) langCount[ll] = (langCount[ll] ?? 0) + 1
      }
    }
    if (t.artist) artistCount[t.artist] = (artistCount[t.artist] ?? 0) + 1
    if (!recent.includes(t.saavnId)) recent.push(t.saavnId)
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
  discoveryLevel: number // 0..1
  preferredMoods: Mood[]
  preferredLanguages: string[]
  excludeIds: string[] // saavn ids already in queue/history this session
}

/**
 * Pick the next track to play when the queue is empty.
 *
 * Strategy:
 *  1. Build a search query from the current song's theme (mood + a
 *     keyword), biased toward the user's preferred languages and
 *     taste profile.
 *  2. If discovery_level is low -> keep close to current artist/album.
 *     If high -> pick from a wider mood pool (more diverse).
 *  3. Filter out recently played songs, then pick a random eligible
 *     track weighted toward the front of results (more relevant).
 */
export async function pickNextTrack(input: PlayNextInput): Promise<SaavnSong | null> {
  const {
    currentSong,
    taste,
    discoveryLevel,
    preferredMoods,
    preferredLanguages,
    excludeIds,
  } = input

  // Compose search query
  const theme = currentSong ? extractTheme(currentSong) : null

  // Choose a mood for the search
  const moodPool: Mood[] = []
  if (theme && theme.moods.length > 0) moodPool.push(theme.moods[0])
  moodPool.push(...preferredMoods, ...taste.topMoods)
  if (discoveryLevel > 0.5) {
    // Add some unrelated moods to widen exploration
    for (const m of MOODS) if (!moodPool.includes(m)) moodPool.push(m)
  }
  const chosenMood = moodPool[0] ?? "chill"
  const moodKeyword = MOOD_KEYWORDS[chosenMood]?.[0] ?? "music"

  // Build query: "<keyword>" OR "<current artist>" if discovery low
  const parts: string[] = [moodKeyword]
  if (currentSong && discoveryLevel < 0.4) {
    parts.push(currentSong.artist.split(",")[0])
  } else if (taste.topArtists.length > 0 && discoveryLevel < 0.7) {
    parts.push(taste.topArtists[0])
  }
  const query = parts.slice(0, 2).join(" ")

  // Preferred language: use taste's top language if present, else pref
  const lang = taste.topLanguages[0] ?? preferredLanguages[0] ?? "hindi"

  const results = await searchSongs(`${query} ${lang}`, 20)

  // Filter out recently played
  const eligible = results.filter((s) => !excludeIds.includes(s.id))
  if (eligible.length === 0) return results[0] ?? null

  // Weighted random pick: weight = 1 / (index + 1)
  const weights = eligible.map((_, i) => 1 / (i + 1))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i]
    if (r <= 0) return eligible[i]
  }
  return eligible[0]
}
