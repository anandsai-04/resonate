"use client"

import { useEffect, useState } from "react"
import type { Track } from "@/lib/player-store"
import { usePlayer } from "@/lib/player-store"
import { TrackRow } from "@/components/track/track-row"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatTime } from "@/lib/format"
import {
  Play,
  Pause,
  Trash2,
  Plus,
  Music2,
  Clock,
  ListMusic,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface PlaylistViewProps {
  playlistId: string
}

interface PlaylistData {
  id: string
  name: string
  description?: string | null
  coverImage?: string | null
  mood?: string | null
  tracks: Track[]
}

export function PlaylistView({ playlistId }: PlaylistViewProps) {
  const [data, setData] = useState<PlaylistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const { playQueue, currentTrack, isPlaying, togglePlay } = usePlayer()
  const { toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/playlists/${playlistId}`)
      if (!res.ok) throw new Error("Not found")
      const json = await res.json()
      // Map DB track rows -> our Track shape
      const tracks: Track[] = (json.playlist.tracks ?? []).map((pt: any) => ({
        id: pt.track.saavnId,
        title: pt.track.title,
        artist: pt.track.artist,
        album: pt.track.album ?? undefined,
        albumId: pt.track.albumId ?? undefined,
        image: pt.track.image ?? undefined,
        streamUrl: pt.track.streamUrl ?? undefined,
        duration: pt.track.duration,
        language: pt.track.language ?? undefined,
        label: pt.track.label ?? undefined,
        year: pt.track.year ?? undefined,
      }))
      setData({
        id: json.playlist.id,
        name: json.playlist.name,
        description: json.playlist.description,
        coverImage: json.playlist.coverImage,
        mood: json.playlist.mood,
        tracks,
      })
    } catch (e: any) {
      toast({
        title: "Failed to load playlist",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [playlistId])

  const handlePlayPlaylist = () => {
    if (!data || data.tracks.length === 0) return
    const isThisPlaylistPlaying = currentTrack && data.tracks.some((t) => t.id === currentTrack.id)
    if (isThisPlaylistPlaying) {
      togglePlay()
    } else {
      playQueue(data.tracks, 0, data.name)
    }
  }

  const handleDeleteTrack = async (trackId: string) => {
    if (!data) return
    try {
      await fetch(
        `/api/playlists/${playlistId}/tracks?saavnId=${encodeURIComponent(trackId)}`,
        { method: "DELETE" },
      )
      setData({
        ...data,
        tracks: data.tracks.filter((t) => t.id !== trackId),
      })
      toast({ title: "Removed from playlist" })
    } catch (e: any) {
      toast({
        title: "Failed to remove",
        description: e.message,
        variant: "destructive",
      })
    }
  }

  const handleDeletePlaylist = async () => {
    try {
      await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" })
      toast({ title: "Playlist deleted" })
      window.dispatchEvent(new CustomEvent("playlists-changed"))
      usePlayer.getState().setView({ kind: "library" })
    } catch (e: any) {
      toast({
        title: "Failed to delete playlist",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setDeleteOpen(false)
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

  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">Playlist not found</div>
  }

  const isThisPlaylistPlaying =
    currentTrack && data.tracks.some((t) => t.id === currentTrack.id)

  return (
    <div>
      {/* Header */}
      <header
        className={cn(
          "relative -mx-4 px-4 sm:mx-0 sm:px-0 pb-4 mb-4",
          "bg-gradient-to-b from-primary/20 via-primary/5 to-transparent",
        )}
      >
        <div className="flex items-end gap-5 p-4 sm:p-6">
          <div className="h-44 w-44 md:h-52 md:w-52 rounded-lg overflow-hidden shadow-2xl bg-gradient-to-br from-primary/30 to-black flex items-center justify-center flex-shrink-0">
            {data.coverImage ? (
              <img
                src={data.coverImage}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Music2 className="h-16 w-16 text-primary/60" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Playlist
              {data.mood ? ` • ${data.mood} mood` : ""}
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight truncate">
              {data.name}
            </h1>
            {data.description && (
              <p className="text-muted-foreground mt-2 text-sm">
                {data.description}
              </p>
            )}
            <div className="text-sm text-muted-foreground mt-3">
              {data.tracks.length} song{data.tracks.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </header>

      {/* Action row */}
      <div className="flex items-center gap-3 px-4 sm:px-6 mb-4">
        <Button
          onClick={handlePlayPlaylist}
          disabled={data.tracks.length === 0}
          className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 hover:scale-105 transition-transform p-0"
          aria-label={isThisPlaylistPlaying ? "Pause" : "Play"}
        >
          {isThisPlaylistPlaying && isPlaying ? (
            <Pause className="h-5 w-5 fill-primary-foreground" />
          ) : (
            <Play className="h-5 w-5 fill-primary-foreground ml-0.5" />
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddOpen(true)}
          className="border-white/10 bg-transparent hover:bg-white/5"
        >
          <Plus className="h-4 w-4 mr-1" /> Add songs
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive ml-auto"
          onClick={() => setDeleteOpen(true)}
          aria-label="Delete playlist"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Track list */}
      <div className="px-2 sm:px-4">
        {data.tracks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Music2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            This playlist is empty. Tap "Add songs" to fill it up.
            <br />
            <span className="text-xs">
              Tip: if Auto-play-next is on, ending a song here will pull tracks
              matching the current mood.
            </span>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[auto_1fr_auto] gap-3 px-2 pb-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-white/5">
              <div className="w-12 text-center">#</div>
              <div>Title</div>
              <div className="flex items-center">
                <Clock className="h-3 w-3" />
              </div>
            </div>
            <div className="py-2">
              {data.tracks.map((t, i) => (
                <div
                  key={`${t.id}-${i}`}
                  className="group grid grid-cols-[1fr_auto] gap-2"
                >
                  <TrackRow
                    track={t}
                    index={i}
                    contextQueue={data.tracks}
                    contextName={data.name}
                  />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs tabular-nums text-muted-foreground mr-2">
                      {formatTime(t.duration)}
                    </span>
                    <button
                      onClick={() => handleDeleteTrack(t.id)}
                      className="p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-destructive"
                      aria-label="Remove from playlist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{data.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the playlist and all its tracks.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlaylist}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add songs dialog */}
      <AddSongsToPlaylistDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        playlistId={playlistId}
        existingTrackIds={data.tracks.map((t) => t.id)}
        onAdded={load}
      />
    </div>
  )
}

function AddSongsToPlaylistDialog({
  open,
  onOpenChange,
  playlistId,
  existingTrackIds,
  onAdded,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  playlistId: string
  existingTrackIds: string[]
  onAdded: () => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&type=songs&limit=20`,
        )
        const data = await res.json()
        if (!cancelled) setResults((data.songs ?? []).map(mapSaavnToTrack))
      } catch {
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  const handleAdd = async (track: Track) => {
    setAdding((s) => ({ ...s, [track.id]: true }))
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saavnId: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          image: track.image,
          streamUrl: track.streamUrl,
          duration: track.duration,
          language: track.language,
          label: track.label,
          year: track.year,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Added", description: track.title })
      onAdded()
    } catch (e: any) {
      toast({
        title: "Failed to add",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setAdding((s) => ({ ...s, [track.id]: false }))
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Add songs to playlist</AlertDialogTitle>
          <AlertDialogDescription>
            Search and add tracks. Already-added songs will be skipped.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs..."
          className="w-full rounded-md bg-white text-black px-3 py-2 text-sm outline-none"
        />
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin mt-2 space-y-1">
          {loading && results.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Searching...
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No results.
            </div>
          )}
          {results.map((t) => {
            const already = existingTrackIds.includes(t.id)
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5"
              >
                <img
                  src={t.image}
                  alt=""
                  className="h-10 w-10 rounded object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t.artist}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={already ? "ghost" : "default"}
                  disabled={already || adding[t.id]}
                  onClick={() => handleAdd(t)}
                  className="h-8"
                >
                  {already ? (
                    "Added"
                  ) : adding[t.id] ? (
                    "..."
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            )
          })}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Done</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function mapSaavnToTrack(s: any): Track {
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
