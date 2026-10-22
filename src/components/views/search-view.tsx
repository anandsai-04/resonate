"use client"

import { useEffect, useState } from "react"
import type { SaavnSong, SaavnAlbum } from "@/lib/saavn"
import type { Track } from "@/lib/player-store"
import { usePlayer } from "@/lib/player-store"
import { TrackCard } from "@/components/track/track-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Search as SearchIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function SearchView() {
  const [query, setQuery] = useState("")
  const [songs, setSongs] = useState<Track[]>([])
  const [albums, setAlbums] = useState<SaavnAlbum[]>([])
  const [loading, setLoading] = useState(false)
  const [activeType, setActiveType] = useState<"all" | "songs" | "albums">("all")

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSongs([])
      setAlbums([])
      return
    }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&type=${activeType}&limit=24`,
        )
        const data = await res.json()
        if (cancelled) return
        setSongs((data.songs ?? []).map(mapSaavnToTrack))
        setAlbums(data.albums ?? [])
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, activeType])

  return (
    <div className="space-y-6 pb-6">
      {/* Search input */}
      <div className="relative max-w-xl">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, albums, artists..."
          className="pl-9 pr-9 bg-white text-black placeholder:text-black/50"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-2">
        {(["all", "songs", "albums"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors",
              activeType === t
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {!query.trim() && <EmptySearchHint />}

      {/* Albums */}
      {(activeType === "all" || activeType === "albums") && albums.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {albums.map((a) => (
              <AlbumSearchCard key={a.id} album={a} />
            ))}
          </div>
        </section>
      )}

      {/* Songs */}
      {(activeType === "all" || activeType === "songs") && (
        <section>
          <h2 className="text-xl font-bold mb-3">Songs</h2>
          {loading && songs.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : songs.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {songs.map((s) => (
                <TrackCard
                  key={s.id}
                  track={s}
                  contextQueue={songs}
                  contextName={`Search: ${query}`}
                />
              ))}
            </div>
          ) : !loading && query.trim() ? (
            <div className="text-center text-muted-foreground py-12">
              No songs found for "{query}"
            </div>
          ) : null}
        </section>
      )}
    </div>
  )
}

function EmptySearchHint() {
  const suggestions = [
    "Arijit Singh",
    "Lo-fi beats",
    "Top Bollywood",
    "Romantic Hindi",
    "Punjabi hits",
    "Workout mix",
  ]
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-semibold mb-4">Try searching for</h3>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <span
            key={s}
            className="px-3 py-1.5 rounded-full bg-white/5 text-sm text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

function AlbumSearchCard({ album }: { album: SaavnAlbum }) {
  const setView = usePlayer((s) => s.setView)
  return (
    <div
      onClick={() => setView({ kind: "album", id: album.id })}
      className="group relative rounded-lg p-3 bg-card hover:bg-card/80 cursor-pointer transition-all"
    >
      <div className="aspect-square mb-3 rounded-md overflow-hidden bg-black/30">
        {album.image ? (
          <img
            src={album.image}
            alt={album.name}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="truncate text-sm font-medium">{album.name}</div>
      <div className="truncate text-xs text-muted-foreground mt-0.5">
        {album.artist}
      </div>
    </div>
  )
}

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
