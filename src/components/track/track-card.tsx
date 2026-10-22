"use client"

import { Track, usePlayer } from "@/lib/player-store"
import { cn } from "@/lib/utils"
import { Play, Pause } from "lucide-react"
import { EqualizerBars } from "@/components/widgets/equalizer-bars"

interface TrackCardProps {
  track: Track
  contextQueue?: Track[]
  contextName?: string
}

export function TrackCard({ track, contextQueue, contextName }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer()
  const isCurrent = currentTrack?.id === track.id
  const playing = isCurrent && isPlaying

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay()
    } else {
      playTrack(track, contextQueue ?? [track], contextName)
    }
  }

  return (
    <div
      className={cn(
        "group relative rounded-lg p-3 transition-all cursor-pointer",
        "bg-card hover:bg-card/80",
        isCurrent && "ring-1 ring-primary/40",
      )}
      onClick={handlePlay}
    >
      <div className="relative aspect-square mb-3 rounded-md overflow-hidden bg-black/30">
        {track.image ? (
          <img
            src={track.image}
            alt={track.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 to-background" />
        )}
        <button
          className={cn(
            "absolute bottom-2 right-2 h-10 w-10 rounded-full bg-primary text-primary-foreground",
            "shadow-lg shadow-primary/30 flex items-center justify-center",
            "transition-all duration-300",
            playing
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
          )}
          onClick={(e) => {
            e.stopPropagation()
            handlePlay()
          }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current ml-0.5" />
          )}
        </button>
        {playing && (
          <div className="absolute top-2 left-2">
            <EqualizerBars active className="bg-black/40 rounded px-1 py-0.5" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "truncate text-sm font-medium",
            isCurrent && "text-primary",
          )}
        >
          {track.title}
        </div>
        <div className="truncate text-xs text-muted-foreground mt-0.5">
          {track.artist}
        </div>
      </div>
    </div>
  )
}
