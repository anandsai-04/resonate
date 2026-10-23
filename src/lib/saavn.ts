// Piped API client — YouTube Music proxy
// Stream URLs come from googlevideo.com (never blocked by college firewalls)

const PIPED_INSTANCES = [
  "https://api.piped.private.coffee",
  "https://pipedapi.ducks.party",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
]

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

async function pipedFetch<T>(path: string): Promise<T> {
  let lastError: Error | null = null
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}${path}`, {
        headers: { "Accept": "application/json" },
      })
      if (res.ok) {
        return (await res.json()) as T
      }
      lastError = new Error(`${instance} returned ${res.status}`)
    } catch (e: any) {
      lastError = e
    }
  }
  throw lastError ?? new Error("All Piped instances failed")
}

export async function searchSongs(query: string, limit = 20): Promise<SaavnSong[]> {
  if (!query.trim()) return []
  try {
    const data = await pipedFetch<{ items: any[] }>(
      `/search?q=${encodeURIComponent(query)}&filter=music_songs`,
    )
    return (data.items ?? []).slice(0, limit).map((item: any) => ({
      id: (item.url ?? "").replace("/watch?v=", ""),
      title: item.title ?? "Unknown",
      artist: item.uploaderName ?? "Unknown",
      album: "",
      image: item.thumbnail ?? "",
      streamUrl: "",
      duration: item.duration ?? 0,
    }))
  } catch (e) {
    console.error("searchSongs failed:", e)
    return []
  }
}

export async function searchAlbums(query: string, limit = 10): Promise<SaavnAlbum[]> {
  if (!query.trim()) return []
  try {
    const data = await pipedFetch<{ items: any[] }>(
      `/search?q=${encodeURIComponent(query)}&filter=albums`,
    )
    return (data.items ?? []).slice(0, limit).map((item: any) => ({
      id: (item.url ?? "").replace("/playlist?list=", ""),
      name: item.name ?? "Unknown",
      artist: item.uploaderName ?? "Unknown",
      image: item.thumbnail ?? "",
    }))
  } catch (e) {
    console.error("searchAlbums failed:", e)
    return []
  }
}

export async function getSongDetails(videoId: string): Promise<SaavnSong | null> {
  try {
    const data = await pipedFetch<any>(`/streams/${videoId}`)

    if (!data || !data.audioStreams || data.audioStreams.length === 0) {
      console.warn("No audio streams for", videoId)
      return null
    }

    // Pick best audio stream: prefer m4a/mp4, prefer 128kbps
    const audioStreams = data.audioStreams
    const preferred =
      audioStreams.find((s: any) =>
        s.mimeType?.includes("mp4") && s.quality === 128
      ) ??
      audioStreams.find((s: any) => s.mimeType?.includes("mp4")) ??
      audioStreams.find((s: any) => s.quality === 128) ??
      audioStreams.find((s: any) => s.quality <= 128) ??
      audioStreams[0]

    const streamUrl = preferred?.url ?? ""
    if (!streamUrl) {
      console.warn("No stream URL found for", videoId)
      return null
    }

    return {
      id: videoId,
      title: data.title ?? "Unknown",
      artist: data.uploader ?? "Unknown",
      album: "",
      image: data.thumbnailUrl ?? "",
      streamUrl,
      duration: data.duration ?? 0,
    }
  } catch (e) {
    console.error("getSongDetails failed:", e)
    return null
  }
}

export async function getAlbumDetails(_albumId: string): Promise<SaavnAlbum | null> {
  return null
}

export async function getLyrics(videoId: string): Promise<SaavnLyrics> {
  try {
    const data = await pipedFetch<any>(`/streams/${videoId}`)
    if (!data?.lyrics) return {}
    return { plainLyrics: data.lyrics }
  } catch {
    return {}
  }
}
