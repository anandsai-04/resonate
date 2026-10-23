"use client"

import { useEffect, useState } from "react"
import type { Track } from "@/lib/player-store"
import { usePlayer } from "@/lib/player-store"
import { TrackRow } from "@/components/track/track-row"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatTime } from "@/lib/format"
import { Play, Pause, Heart, Disc3, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { isAlbumSaved, saveAlbum, unsaveAlbum } from "@/lib/storage"
import { getAlbumDetails } from "@/lib/saavn"

interface AlbumViewProps {
  albumId: string
}

export function AlbumView({ albumId }: AlbumViewProps) {
  const [album, setAlbum] = useState<{
    id: string
    name: string
    artist: string
    image?: string
    year?: string
    language?: string
    songs: Track[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const { playQueue, currentTrack, isPlaying, togglePlay } = usePlayer()
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAlbumDetails(albumId)
      .then((albumData) => {
        if (cancelled || !albumData) return
        setAlbum({
          id: albumData.id,
          name: albumData.name,
          artist: albumData.artist,
          image: albumData.image,
          year: albumData.year,
          language: albumData.language,
          songs: (albumData.songs ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: s.album || albumData.name,
            albumId: s.albumId,
            image: s.image,
            streamUrl: s.streamUrl,
            duration: s.duration,
            language: s.language,
            label: s.label,
            year: s.year,
          })) as Track[],
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    Promise.resolve().then(() => {
      if (!cancelled) setSaved(isAlbumSaved(albumId))
    })
    return () => {
      cancelled = true
    }
  }, [albumId])

  const handlePlayAlbum = () => {
    if (!album || album.songs.length === 0) return
    const isThisAlbumPlaying =
      currentTrack && album.songs.some((t) => t.id === currentTrack.id)
    if (isThisAlbumPlaying) {
      togglePlay()
    } else {
      playQueue(album.songs, 0, album.name)
    }
  }

  const handleSaveToggle = () => {
    if (!album) return
    if (saved) {
      unsaveAlbum(album.id)
      setSaved(false)
      toast({ title: "Removed from library" })
    } else {
      saveAlbum({
        saavnId: album.id,
        title: album.name,
        artist: album.artist,
        image: album.image,
        year: album.year,
        language: album.language,
      })
      setSaved(true)
      toast({ title: "Saved to library", description: album.name })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!album) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Album not found
      </div>
    )
  }

  const isThisAlbumPlaying =
    currentTrack && album.songs.some((t) => t.id === currentTrack.id)

  return (
    <div>
      <header
        className={cn(
          "relative -mx-4 px-4 sm:mx-0 sm:px-0 pb-4 mb-4",
          "bg-gradient-to-b from-purple-900/30 via-purple-900/5 to-transparent",
        )}
      >
        <div className="flex items-end gap-5 p-4 sm:p-6">
          <div className="h-44 w-44 md:h-52 md:w-52 rounded-lg overflow-hidden shadow-2xl bg-gradient-to-br from-purple-500/30 to-black flex items-center justify-center flex-shrink-0">
            {album.image ? (
              <img
                src={album.image}
                alt={album.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Disc3 className="h-16 w-16 text-purple-300/60" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Album{album.year ? ` • ${album.year}` : ""}
              {album.language ? ` • ${album.language}` : ""}
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight truncate">
              {album.name}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">{album.artist}</p>
            <div className="text-sm text-muted-foreground mt-3">
              {album.songs.length} song{album.songs.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-3 px-4 sm:px-6 mb-4">
        <Button
          onClick={handlePlayAlbum}
          disabled={album.songs.length === 0}
          className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 hover:scale-105 transition-transform p-0"
          aria-label={isThisAlbumPlaying ? "Pause" : "Play"}
        >
          {isThisAlbumPlaying && isPlaying ? (
            <Pause className="h-5 w-5 fill-primary-foreground" />
          ) : (
            <Play className="h-5 w-5 fill-primary-foreground ml-0.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSaveToggle}
          className={cn(saved && "text-primary")}
          aria-label={saved ? "Remove from library" : "Save to library"}
        >
          <Heart className={cn("h-5 w-5", saved && "fill-current")} />
        </Button>
      </div>

      <div className="px-2 sm:px-4">
        <div className="hidden md:grid grid-cols-[auto_1fr_auto] gap-3 px-2 pb-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-white/5">
          <div className="w-12 text-center">#</div>
          <div>Title</div>
          <div className="flex items-center">
            <Clock className="h-3 w-3" />
          </div>
        </div>
        <div className="py-2">
          {album.songs.map((t, i) => (
            <div
              key={`${t.id}-${i}`}
              className="group grid grid-cols-[1fr_auto] gap-2"
            >
              <TrackRow
                track={t}
                index={i}
                contextQueue={album.songs}
                contextName={album.name}
              />
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs tabular-nums text-muted-foreground mr-2">
                  {formatTime(t.duration)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


