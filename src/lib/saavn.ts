/**
 * Music catalog client.
 *
 * Originally built against the unofficial JioSaavn API (saavn.dev), but
 * that host is blocked in many sandboxed environments. This client now
 * uses a multi-source strategy so the app keeps working:
 *
 *   - iTunes Search API     -> search, song lookup, album lookup (no API key)
 *   - LRCLIB                -> synced + plain lyrics (no API key)
 *
 * All functions return the same shapes the rest of the app expects
 * (SaavnSong / SaavnAlbum / SaavnLyrics) so callers don't care which
 * upstream source produced the data.
 *
 * Notes:
 *   - iTunes previewUrl is a 30-second m4a clip; the player UI treats it
 *     as the streamable URL. For full tracks, swap this client for a
 *     JioSaavn wrapper when running outside a restricted sandbox.
 *   - iTunes track IDs are integers; we stringify them so the rest of
 *     the app's `saavnId` string field works unchanged.
 */

const ITUNES_BASE = "https://itunes.apple.com"
const LRCLIB_BASE = "https://lrclib.net/api"

export interface SaavnSong {
  id: string
  title: string
  artist: string
  album: string
  albumId?: string
  image: string
  streamUrl: string
  duration: number
  language?: string
  label?: string
  year?: string
  url?: string
}

export interface SaavnAlbum {
  id: string
  name: string
  artist: string
  image: string
  year?: string
  language?: string
  songCount?: number
  url?: string
  songs?: SaavnSong[]
}

export interface SaavnLyrics {
  syncLyrics?: string
  plainLyrics?: string
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

interface ITunesResult {
  wrapperType: string
  kind?: string
  trackId?: number
  collectionId?: number
  artistId?: number
  artistName?: string
  collectionName?: string
  trackName?: string
  collectionArtistName?: string
  previewUrl?: string
  artworkUrl100?: string
  releaseDate?: string
  trackTimeMillis?: number
  country?: string
  primaryGenreName?: string
  collectionViewUrl?: string
  trackCount?: number
}

function itunesImage(url?: string, size = 300): string {
  if (!url) return ""
  // iTunes gives 100x100 by default; we can request larger via path swap
  return url.replace(/100x100bb\.jpg$/, `${size}x${size}bb.jpg`)
}

function parseItunesTrack(r: ITunesResult): SaavnSong {
  return {
    id: String(r.trackId ?? r.collectionId ?? ""),
    title: r.trackName ?? "",
    artist: r.artistName ?? r.collectionArtistName ?? "Unknown Artist",
    album: r.collectionName ?? "",
    albumId: r.collectionId ? String(r.collectionId) : undefined,
    image: itunesImage(r.artworkUrl100, 300),
    streamUrl: r.previewUrl ?? "",
    duration: r.trackTimeMillis ? Math.floor(r.trackTimeMillis / 1000) : 0,
    language: r.country,
    label: r.primaryGenreName,
    year: r.releaseDate?.slice(0, 4),
    url: r.trackViewUrl ?? r.collectionViewUrl,
  }
}

function parseItunesAlbum(r: ITunesResult): SaavnAlbum {
  return {
    id: String(r.collectionId ?? r.artistId ?? ""),
    name: r.collectionName ?? "",
    artist: r.artistName ?? r.collectionArtistName ?? "Unknown",
    image: itunesImage(r.artworkUrl100, 300),
    year: r.releaseDate?.slice(0, 4),
    language: r.country,
    songCount: r.trackCount,
    url: r.collectionViewUrl,
  }
}

function decodeHtml(s: string): string {
  if (!s) return ""
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

async function itunesFetch<T>(path: string): Promise<T> {
  const url = `${ITUNES_BASE}${path}`
  const res = await fetch(url, {
    headers: { "User-Agent": "ResonatePlayer/1.0" },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`iTunes ${res.status}: ${res.statusText}`)
  return (await res.json()) as T
}

// ------------------------------------------------------------------
// Search
// ------------------------------------------------------------------

export async function searchSongs(query: string, limit = 20): Promise<SaavnSong[]> {
  if (!query.trim()) return []
  const data = await itunesFetch<{ resultCount: number; results: ITunesResult[] }>(
    `/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`,
  )
  return (data.results ?? [])
    .filter((r) => r.wrapperType === "track" && r.kind === "song")
    .map(parseItunesTrack)
}

export async function searchAlbums(query: string, limit = 10): Promise<SaavnAlbum[]> {
  if (!query.trim()) return []
  const data = await itunesFetch<{ resultCount: number; results: ITunesResult[] }>(
    `/search?term=${encodeURIComponent(query)}&entity=album&limit=${limit}`,
  )
  return (data.results ?? [])
    .filter((r) => r.wrapperType === "collection")
    .map(parseItunesAlbum)
}

// ------------------------------------------------------------------
// Lookup
// ------------------------------------------------------------------

export async function getSongDetails(songId: string): Promise<SaavnSong | null> {
  try {
    const data = await itunesFetch<{ resultCount: number; results: ITunesResult[] }>(
      `/lookup?id=${encodeURIComponent(songId)}`,
    )
    const r = (data.results ?? []).find(
      (r) => r.wrapperType === "track" && r.kind === "song",
    )
    if (!r) return null
    return parseItunesTrack(r)
  } catch {
    return null
  }
}

export async function getAlbumDetails(albumId: string): Promise<SaavnAlbum | null> {
  try {
    const data = await itunesFetch<{ resultCount: number; results: ITunesResult[] }>(
      `/lookup?id=${encodeURIComponent(albumId)}&entity=song`,
    )
    if (!data.results || data.results.length === 0) return null
    const albumRow = data.results.find((r) => r.wrapperType === "collection") ?? null
    const songs = data.results
      .filter((r) => r.wrapperType === "track" && r.kind === "song")
      .map(parseItunesTrack)
    const r = albumRow ?? data.results[0]
    const album = parseItunesAlbum(r)
    album.songs = songs
    if (songs.length > 0 && !album.image) {
      album.image = songs[0].image
    }
    return album
  } catch {
    return null
  }
}

// ------------------------------------------------------------------
// Lyrics (via LRCLIB)
// ------------------------------------------------------------------

export async function getLyrics(songId: string): Promise<SaavnLyrics> {
  // LRCLIB searches by artist + track name, not by iTunes ID. Look up
  // the song first to get those identifiers, then hit LRCLIB.
  try {
    const song = await getSongDetails(songId)
    if (!song) return {}
    const params = new URLSearchParams({
      artist_name: song.artist.split(",")[0].trim(),
      track_name: song.title,
    })
    if (song.album) params.set("album_name", song.album)
    const url = `${LRCLIB_BASE}/get?${params.toString()}`
    const res = await fetch(url, {
      headers: { "User-Agent": "ResonatePlayer/1.0" },
      next: { revalidate: 86400 },
    })
    if (!res.ok) {
      // Fall back to search
      const searchUrl = `${LRCLIB_BASE}/search?q=${encodeURIComponent(
        `${song.artist} ${song.title}`,
      )}`
      const sres = await fetch(searchUrl, {
        headers: { "User-Agent": "ResonatePlayer/1.0" },
        next: { revalidate: 86400 },
      })
      if (!sres.ok) return {}
      const arr = (await sres.json()) as any[]
      if (!Array.isArray(arr) || arr.length === 0) return {}
      const hit = arr[0]
      return {
        syncLyrics: hit.syncedLyrics ?? undefined,
        plainLyrics: hit.plainLyrics ?? undefined,
      }
    }
    const data = await res.json()
    return {
      syncLyrics: data.syncedLyrics ?? undefined,
      plainLyrics: data.plainLyrics ?? undefined,
    }
  } catch {
    return {}
  }
}
