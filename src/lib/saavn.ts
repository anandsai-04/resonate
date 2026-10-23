// Piped API - public YouTube Music proxy
// Stream URLs come from googlevideo.com (never blocked by college firewalls)

const PIPED_INSTANCES = [
  "https://api.piped.private.coffee",
  "https://pipedapi.ducks.party",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
]

// Pick a random instance to spread load
const PIPED = PIPED_INSTANCES[Math.floor(Math.random() * PIPED_INSTANCES.length)]

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
  // Try each instance in order until one works
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}${path}`, {
        headers: { "Accept": "application/json" },
      })
      if (res.ok) return (await res.json()) as T
    } catch {
      // Try next instance
    }
  }
  throw new Error("All Piped instances failed")
}

export async function searchSongs(query: string, limit = 20): Promise<SaavnSong[]> {
  if (!query.trim()) return []
  const data = await pipedFetch<{ items: any[] }>(
    `/search?q=${encodeURIComponent(query)}&filter=music_songs`,
  )
  return (data.items ?? []).slice(0, limit).map((item: any) => ({
    id: item.url.replace("/watch?v=", ""),
    title: item.title,
    artist: item.uploaderName ?? "Unknown",
    album: "",
    image: item.thumbnail,
    streamUrl: "", // Fetched on play
    duration: item.duration ?? 0,
  }))
}

export async function searchAlbums(query: string, limit = 10): Promise<SaavnAlbum[]> {
  if (!query.trim()) return []
  const data = await pipedFetch<{ items: any[] }>(
    `/search?q=${encodeURIComponent(query)}&filter=albums`,
  )
  return (data.items ?? []).slice(0, limit).map((item: any) => ({
    id: item.url.replace("/playlist?list=", ""),
    name: item.name,
    artist: item.uploaderName ?? "Unknown",
    image: item.thumbnail,
  }))
}

export async function getSongDetails(videoId: string): Promise<SaavnSong | null> {
  try {
    const data = await pipedFetch<any>(`/streams/${videoId}`)
    // Pick the best audio stream (lowest bitrate = fastest, m4a preferred)
    const audioStreams = data.audioStreams ?? []
    const preferred =
      audioStreams.find((s: any) => s.mimeType?.includes("mp4") && s.quality <= 128) ??
      audioStreams.find((s: any) => s.quality <= 128) ??
      audioStreams[0]
    return {
      id: videoId,
      title: data.title,
      artist: data.uploader,
      album: "",
      image: data.thumbnailUrl,
      streamUrl: preferred?.url ?? "",
      duration: data.duration ?? 0,
    }
  } catch {
    return null
  }
}

export async function getAlbumDetails(_albumId: string): Promise<SaavnAlbum | null> {
  // Playlists not implemented in this simplified version
  return null
}

export async function getLyrics(videoId: string): Promise<SaavnLyrics> {
  try {
    const data = await pipedFetch<any>(`/streams/${videoId}`)
    return { plainLyrics: data.lyrics ?? undefined }
  } catch {
    return {}
  }
}
