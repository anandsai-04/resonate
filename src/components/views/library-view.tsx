"use client"

import { useEffect, useState } from "react"
import type { Track } from "@/lib/player-store"
import { TrackCard } from "@/components/track/track-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Disc3, Heart, Music2, ListMusic } from "lucide-react"
import { usePlayer } from "@/lib/player-store"

interface Album {
  id: string
  saavnId: string
  title: string
  artist: string
  image?: string | null
  year?: string | null
}

interface LibraryViewProps {
  savedAlbums: Album[]
  recent: Track[]
}

export function LibraryView({ savedAlbums, recent }: LibraryViewProps) {
  const [tab, setTab] = useState<"albums" | "recent">("albums")
  const { setView } = usePlayer()

  return (
    <div className="space-y-6 pb-6">
      <header>
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
          <Music2 className="h-7 w-7 text-primary" /> Your Library
        </h1>
        <p className="text-muted-foreground text-sm">
          Albums you've saved, songs you've recently played.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5">
        <TabButton active={tab === "albums"} onClick={() => setTab("albums")}>
          <Disc3 className="h-4 w-4" /> Saved Albums ({savedAlbums.length})
        </TabButton>
        <TabButton active={tab === "recent"} onClick={() => setTab("recent")}>
          <Heart className="h-4 w-4" /> Recently Played ({recent.length})
        </TabButton>
      </div>

      {tab === "albums" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {savedAlbums.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Disc3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              No saved albums yet. Search for one and tap "Save".
            </div>
          ) : (
            savedAlbums.map((a) => (
              <div
                key={a.id}
                onClick={() => setView({ kind: "album", id: a.saavnId })}
                className="group relative rounded-lg p-3 bg-card hover:bg-card/80 cursor-pointer transition-all"
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
            ))
          )}
        </div>
      )}

      {tab === "recent" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {recent.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <ListMusic className="h-12 w-12 mx-auto mb-3 opacity-50" />
              No plays yet. Hit play on a song to start your history.
            </div>
          ) : (
            recent.map((t) => (
              <TrackCard
                key={t.id}
                track={t}
                contextQueue={recent}
                contextName="Recently played"
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? "border-primary text-white"
          : "border-transparent text-muted-foreground hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}
