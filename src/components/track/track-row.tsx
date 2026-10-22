"use client"

import { Track, usePlayer } from "@/lib/player-store"
import { cn } from "@/lib/utils"
import { Play, Pause, MoreHorizontal, Heart, ListPlus } from "lucide-react"
import { EqualizerBars } from "@/components/widgets/equalizer-bars"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface TrackRowProps {
  track: Track
  index?: number
  showArt?: boolean
  showAlbum?: boolean
  showAddButton?: boolean
  contextQueue?: Track[]
  contextName?: string
}

export function TrackRow({
  track,
  index,
  showArt = true,
  showAlbum = true,
  showAddButton = true,
  contextQueue,
  contextName,
}: TrackRowProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer()
  const isCurrent = currentTrack?.id === track.id
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [liked, setLiked] = useState(false)

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay()
    } else {
      playTrack(track, contextQueue ?? [track], contextName)
    }
  }

  const onAddToQueue = () => {
    usePlayer.getState().addToQueue(track)
    setMenuOpen(false)
    toast({ title: "Added to queue", description: track.title })
  }

  const onLike = () => {
    setLiked((v) => !v)
    toast({
      title: liked ? "Removed from Liked" : "Added to Liked",
      description: track.title,
    })
  }

  return (
    <div
      className={cn(
        "group grid items-center gap-3 rounded-md px-2 py-2 transition-colors",
        "grid-cols-[auto_1fr_auto]",
        isCurrent ? "bg-primary/10" : "hover:bg-white/5",
      )}
    >
      {/* index / play button */}
      <div className="flex items-center gap-3 w-12">
        {isCurrent ? (
          <button
            onClick={handlePlay}
            className="text-primary"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <EqualizerBars active />
            ) : (
              <Play className="h-4 w-4 fill-primary" />
            )}
          </button>
        ) : (
          <>
            <span className="text-sm text-muted-foreground group-hover:hidden w-4 text-center">
              {typeof index === "number" ? index + 1 : "•"}
            </span>
            <button
              onClick={handlePlay}
              className="hidden group-hover:flex text-foreground hover:text-primary"
              aria-label="Play"
            >
              <Play className="h-4 w-4 fill-current" />
            </button>
          </>
        )}
      </div>

      {/* title + artist (with optional art) */}
      <div className="flex items-center gap-3 min-w-0">
        {showArt && track.image && (
          <img
            src={track.image}
            alt=""
            className="h-10 w-10 rounded object-cover flex-shrink-0"
            loading="lazy"
          />
        )}
        <div className="min-w-0">
          <div
            className={cn(
              "truncate text-sm font-medium",
              isCurrent && "text-primary",
            )}
          >
            {track.title}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {track.artist}
            {showAlbum && track.album ? ` • ${track.album}` : ""}
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onLike}
          className={cn(
            "p-2 rounded-full hover:bg-white/10",
            liked && "text-primary",
          )}
          aria-label="Like"
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
        </button>
        {showAddButton && (
          <button
            onClick={onAddToQueue}
            className="p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground"
            aria-label="Add to queue"
          >
            <ListPlus className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground"
          aria-label="More"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
