"use client"

import { useEffect, useState } from "react"
import { usePlayer } from "@/lib/player-store"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Mic2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface LyricsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ParsedLine {
  time: number // seconds, -1 = unsynced
  text: string
}

export function LyricsPanel({ open, onOpenChange }: LyricsPanelProps) {
  const { currentTrack, progress } = usePlayer()
  const [plain, setPlain] = useState<string | null>(null)
  const [synced, setSynced] = useState<ParsedLine[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentTrack?.id) {
      return
    }
    let cancelled = false
    // Defer the loading-state set so we don't trigger a synchronous re-render
    // from inside the effect body (which React's lint rule warns against).
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true)
    })
    fetch(`/api/songs/${currentTrack.id}/lyrics`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setPlain(d.plainLyrics ?? null)
        if (d.syncLyrics) {
          setSynced(parseLrc(d.syncLyrics))
        } else {
          setSynced(null)
        }
      })
      .catch(() => {
        if (cancelled) return
        setPlain(null)
        setSynced(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentTrack?.id])

  // Find active line for synced lyrics
  const activeIdx = synced
    ? synced.findIndex((l, i) => {
        const next = synced[i + 1]
        return progress >= l.time && (!next || progress < next.time)
      })
    : -1

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[460px] bg-gradient-to-b from-card to-background border-l border-white/5 p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b border-white/5">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Mic2 className="h-4 w-4 text-primary" /> Lyrics
          </SheetTitle>
          {currentTrack && (
            <div className="mt-1 text-xs text-muted-foreground truncate">
              {currentTrack.title} • {currentTrack.artist}
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-6 pb-24">
            {!currentTrack && (
              <div className="text-center py-12 text-muted-foreground">
                <Mic2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                Play a song to see lyrics.
              </div>
            )}

            {currentTrack && loading && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Loading lyrics...
              </div>
            )}

            {currentTrack && !loading && !plain && !synced && (
              <div className="text-center py-12 text-muted-foreground">
                <Mic2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                No lyrics available for this track.
              </div>
            )}

            {synced && synced.length > 0 ? (
              <div className="space-y-3">
                {synced.map((line, i) => {
                  const isActive = i === activeIdx
                  const isPast = i < activeIdx
                  return (
                    <div
                      key={i}
                      className={`text-lg font-medium transition-all duration-300 ${
                        isActive
                          ? "text-primary scale-[1.02]"
                          : isPast
                            ? "text-muted-foreground/40"
                            : "text-muted-foreground"
                      }`}
                      style={{ transformOrigin: "left center" }}
                    >
                      {line.text || "♪"}
                    </div>
                  )
                })}
              </div>
            ) : plain ? (
              <pre className="whitespace-pre-wrap font-sans text-base text-foreground leading-relaxed">
                {plain}
              </pre>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

/** Parse a .lrc file into timed lines. */
function parseLrc(lrc: string): ParsedLine[] {
  const lines = lrc.split("\n")
  const out: ParsedLine[] = []
  const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/g
  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)]
    if (matches.length === 0) {
      const text = line.trim()
      if (text) out.push({ time: -1, text })
      continue
    }
    const text = line.replace(timeRegex, "").trim()
    for (const m of matches) {
      const min = parseInt(m[1], 10)
      const sec = parseFloat(m[2])
      out.push({ time: min * 60 + sec, text })
    }
  }
  return out.sort((a, b) => a.time - b.time)
}
