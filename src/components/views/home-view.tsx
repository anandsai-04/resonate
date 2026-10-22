"use client"

import { Track } from "@/lib/player-store"
import { TrackCard } from "@/components/track/track-card"
import { MOODS, MOOD_LABELS, type Mood } from "@/lib/recommend"
import { cn } from "@/lib/utils"
import { Sparkles, Flame, Clock, Radio } from "lucide-react"
import { useState, useEffect } from "react"
import type { SaavnSong } from "@/lib/saavn"
import { usePlayer } from "@/lib/player-store"
import { Skeleton } from "@/components/ui/skeleton"
import type { SavedAlbum } from "@/lib/storage"

interface HomeViewProps {
  recent: Track[]
  savedAlbums: SavedAlbum[]
}

export function HomeView({ recent, savedAlbums }: HomeViewProps) {
  const { setView } = usePlayer()
  const [moodTracks, setMoodTracks] = useState<Record<string, Track[]>>({})
  const [loadingMood, setLoadingMood] = useState<Mood | null>(null)
  const [trending, setTrending] = useState<Track[]>([])
  const [loadingTrending, setLoadingTrending] = useState(true)

  // Fetch a small set of trending/popular songs on mount
  useEffect(() => {
    let cancelled = false
    setLoadingTrending(true)
    fetch("/api/search?q=top%20hits&type=songs&limit=12")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const songs: Track[] = (d.songs ?? []).map(mapSaavnToTrack)
        setTrending(songs)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingTrending(false))
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch mood tracks on demand (lazy when mood chip is clicked)
  const loadMood = async (mood: Mood) => {
    if (moodTracks[mood]) return
    setLoadingMood(mood)
    try {
      const keyword = MOOD_LABELS[mood].toLowerCase()
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(keyword + " songs")}&type=songs&limit=12`,
      )
      const data = await res.json()
      const tracks: Track[] = (data.songs ?? []).map(mapSaavnToTrack)
      setMoodTracks((prev) => ({ ...prev, [mood]: tracks }))
    } catch {
      /* ignore */
    } finally {
      setLoadingMood(null)
    }
  }

  return (
    <div className="space-y-10 pb-6">
      {/* Hero greeting */}
      <section className="gradient-hero rounded-2xl p-8 pt-12 -mt-2 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl float-slow" />
        <div className="relative">
          <div className="text-xs uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
            <Sparkles className="h-3 w-3" /> Your music, your mood
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Good evening
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            Pick up where you left off, or let the algorithm take over.
            Your queue auto-continues with tracks matching the current theme.
          </p>
        </div>
      </section>

      {/* Mood quick-pick chips */}
      <section>
        <h2 className="text-xl font-bold mb-3">Browse by mood</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MOODS.map((mood) => (
            <MoodChip key={mood} mood={mood} />
          ))}
        </div>
      </section>

      {/* Recently played */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Recently played</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {recent.slice(0, 12).map((t) => (
              <TrackCard
                key={t.id}
                track={t}
                contextQueue={recent}
                contextName="Recently played"
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Trending now</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {loadingTrending
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))
            : trending.slice(0, 12).map((t) => (
                <TrackCard
                  key={t.id}
                  track={t}
                  contextQueue={trending}
                  contextName="Trending"
                />
              ))}
        </div>
      </section>

      {/* Saved albums quick access */}
      {savedAlbums.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Radio className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Your saved albums</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {savedAlbums.slice(0, 12).map((a) => (
              <div
                key={a.id}
                className="group relative rounded-lg p-3 bg-card hover:bg-card/80 cursor-pointer transition-all"
                onClick={() => setView({ kind: "album", id: a.saavnId })}
              >
                <div className="aspect-square mb-3 rounded-md overflow-hidden bg-black/30">
                  {a.image && (
                    <img
                      src={a.image}
                      alt={a.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="truncate text-sm font-medium">{a.title}</div>
                <div className="truncate text-xs text-muted-foreground mt-0.5">
                  {a.artist}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MoodChip({ mood }: { mood: Mood }) {
  // Per-mood gradient + emoji-free icon
  const colors: Record<Mood, string> = {
    energetic: "from-orange-500 to-red-600",
    happy: "from-yellow-400 to-orange-500",
    romantic: "from-pink-500 to-rose-600",
    chill: "from-cyan-500 to-blue-600",
    sad: "from-indigo-500 to-purple-700",
    party: "from-fuchsia-500 to-pink-600",
    focused: "from-emerald-500 to-teal-700",
    soulful: "from-amber-500 to-yellow-700",
  }

  const { currentTrack, playQueue } = usePlayer()
  const [tracks, setTracks] = useState<Track[] | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePlay = async () => {
    if (tracks && tracks.length > 0) {
      playQueue(tracks, 0, `${MOOD_LABELS[mood]} mood`)
      return
    }
    setLoading(true)
    try {
      const keyword = MOOD_LABELS[mood].toLowerCase()
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(keyword + " songs")}&type=songs&limit=20`,
      )
      const data = await res.json()
      const mapped: Track[] = (data.songs ?? []).map(mapSaavnToTrack)
      setTracks(mapped)
      playQueue(mapped, 0, `${MOOD_LABELS[mood]} mood`)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePlay}
      disabled={loading}
      className={cn(
        "relative h-20 rounded-lg overflow-hidden p-3 text-left",
        "bg-gradient-to-br text-white font-bold capitalize",
        "transition-transform hover:scale-[1.02] active:scale-95",
        colors[mood],
      )}
    >
      <span className="text-lg drop-shadow">{MOOD_LABELS[mood]}</span>
      <span className="absolute -bottom-2 -right-2 text-5xl opacity-30">
        ♪
      </span>
      {loading && (
        <span className="absolute inset-0 bg-black/30 flex items-center justify-center text-xs">
          Loading...
        </span>
      )}
    </button>
  )
}

// Helper: convert Saavn API song shape to our Track shape
function mapSaavnToTrack(s: SaavnSong): Track {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist,
    album: s.album,
    albumId: s.albumId,
    image: s.image,
    streamUrl: s.streamUrl,
    duration: s.duration,
    language: s.language,
    label: s.label,
    year: s.year,
  }
}
