"use client"

import { usePlayer } from "@/lib/player-store"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { TrackRow } from "@/components/track/track-row"
import { ListMusic, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QueuePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QueuePanel({ open, onOpenChange }: QueuePanelProps) {
  const { queue, queueIndex, currentTrack } = usePlayer()

  const upcoming = queue.slice(queueIndex + 1)
  const previous = queue.slice(0, queueIndex)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[420px] bg-card border-l border-white/5 p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b border-white/5">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ListMusic className="h-4 w-4 text-primary" /> Queue
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-4">
          {queue.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ListMusic className="h-12 w-12 mx-auto mb-3 opacity-50" />
              Queue is empty.
              <br />
              <span className="text-xs">
                When a song ends with no queue, the algorithm picks the next
                one for you.
              </span>
            </div>
          )}

          {/* Now playing */}
          {currentTrack && (
            <section>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 px-2">
                Now playing
              </div>
              <TrackRow track={currentTrack} showArt showAlbum={false} showAddButton={false} />
            </section>
          )}

          {/* Next up */}
          {upcoming.length > 0 && (
            <section>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 px-2">
                Next up ({upcoming.length})
              </div>
              <div className="space-y-1">
                {upcoming.map((t, i) => (
                  <TrackRow
                    key={`${t.id}-${i}`}
                    track={t}
                    showArt
                    showAlbum={false}
                    contextQueue={upcoming}
                    contextName="Queue"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Played */}
          {previous.length > 0 && (
            <section>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 px-2">
                Played ({previous.length})
              </div>
              <div className="space-y-1 opacity-50">
                {previous.map((t, i) => (
                  <TrackRow
                    key={`${t.id}-${i}`}
                    track={t}
                    showArt
                    showAlbum={false}
                    showAddButton={false}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
