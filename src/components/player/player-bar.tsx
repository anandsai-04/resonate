"use client"

import { usePlayer } from "@/lib/player-store"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/format"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Mic2,
  ListMusic,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useState, useEffect } from "react"
import { Visualizer } from "@/components/widgets/visualizer"

interface PlayerBarProps {
  onOpenLyrics?: () => void
  onOpenQueue?: () => void
}

export function PlayerBar({ onOpenLyrics, onOpenQueue }: PlayerBarProps) {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer()

  const [liked, setLiked] = useState(false)

  // Re-render when these change
  const _ = usePlayer()

  // Volume slider value is 0..100
  const volumePct = Math.round((muted ? 0 : volume) * 100)
  const progressPct = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <footer className="h-[88px] bg-black border-t border-white/5 px-4 grid grid-cols-[1fr_2fr_1fr] items-center gap-4">
      {/* Left: current track info */}
      <div className="flex items-center gap-3 min-w-0">
        {currentTrack?.image ? (
          <img
            src={currentTrack.image}
            alt=""
            className="h-14 w-14 rounded-md object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-14 w-14 rounded-md bg-gradient-to-br from-primary/40 to-black flex-shrink-0 flex items-center justify-center">
            <ListMusic className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">
            {currentTrack?.title ?? "Nothing playing"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {currentTrack?.artist ?? "—"}
          </div>
        </div>
        {currentTrack && (
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-8 w-8", liked && "text-primary")}
            onClick={() => setLiked((v) => !v)}
            aria-label="Like"
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          </Button>
        )}
      </div>

      {/* Center: controls + seek */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-8 w-8 text-muted-foreground hover:text-white",
              shuffle && "text-primary",
            )}
            onClick={toggleShuffle}
            aria-label="Shuffle"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-white"
            onClick={prev}
            aria-label="Previous"
          >
            <SkipBack className="h-4 w-4 fill-current" />
          </Button>
          <Button
            size="icon"
            className="h-9 w-9 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 transition-transform"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={!currentTrack}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-white"
            onClick={next}
            aria-label="Next"
          >
            <SkipForward className="h-4 w-4 fill-current" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-8 w-8 text-muted-foreground hover:text-white",
              repeat !== "off" && "text-primary",
            )}
            onClick={cycleRepeat}
            aria-label="Repeat"
          >
            {repeat === "one" ? (
              <Repeat1 className="h-4 w-4" />
            ) : (
              <Repeat className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full">
          <span className="text-[11px] tabular-nums text-muted-foreground w-10 text-right">
            {formatTime(progress)}
          </span>
          <Slider
            value={[progressPct]}
            onValueChange={(v) => {
              if (duration > 0) seek((v[0] / 100) * duration)
            }}
            max={100}
            step={0.1}
            className="flex-1"
          />
          <span className="text-[11px] tabular-nums text-muted-foreground w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: lyrics / queue / volume / mini visualizer */}
      <div className="flex items-center justify-end gap-2">
        <div className="hidden md:flex h-6 w-16 items-end overflow-hidden">
          <Visualizer active={isPlaying} barCount={12} />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-white"
          onClick={onOpenLyrics}
          disabled={!currentTrack}
          aria-label="Lyrics"
        >
          <Mic2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-white"
          onClick={onOpenQueue}
          aria-label="Queue"
        >
          <ListMusic className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-white"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-4 w-4" />
          ) : volume < 0.5 ? (
            <Volume1 className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
        <Slider
          value={[volumePct]}
          onValueChange={(v) => setVolume(v[0] / 100)}
          max={100}
          step={1}
          className="w-24"
        />
      </div>
    </footer>
  )
}
