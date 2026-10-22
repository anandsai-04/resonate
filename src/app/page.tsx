"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { usePlayer } from "@/lib/player-store"
import { Sidebar } from "@/components/sidebar/sidebar"
import { TopBar } from "@/components/sidebar/top-bar"
import { PlayerBar } from "@/components/player/player-bar"
import { QueuePanel } from "@/components/player/queue-panel"
import { LyricsPanel } from "@/components/player/lyrics-panel"
import { HomeView } from "@/components/views/home-view"
import { SearchView } from "@/components/views/search-view"
import { LibraryView } from "@/components/views/library-view"
import { PlaylistView } from "@/components/views/playlist-view"
import { AlbumView } from "@/components/views/album-view"
import { PreferencesView } from "@/components/views/preferences-view"
import { useAudioEngine } from "@/hooks/use-audio-engine"
import type { Track } from "@/lib/player-store"

interface PlaylistSummary {
  id: string
  name: string
  trackCount?: number
  coverImage?: string | null
  mood?: string | null
}

interface SavedAlbum {
  id: string
  saavnId: string
  title: string
  artist: string
  image?: string | null
}

interface InitData {
  playlists: PlaylistSummary[]
  savedAlbums: SavedAlbum[]
  preferences: {
    moods?: string[]
    languages?: string[]
    artists?: string[]
    genres?: string[]
    albums?: string[]
    discoveryLevel: number
    autoPlayNext: boolean
  }
  recentlyPlayed: Track[]
}

export default function Home() {
  // Initialise the audio engine (creates an <audio> element, wires events)
  useAudioEngine()

  const { data: session, status } = useSession()
  const router = useRouter()
  const { view, setPreferences } = usePlayer()

  const [data, setData] = useState<InitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [queueOpen, setQueueOpen] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(false)

  // Redirect to sign-in if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  const refresh = useCallback(async () => {
    if (status !== "authenticated") return
    try {
      const res = await fetch("/api/init")
      if (res.status === 401) {
        router.push("/auth/signin")
        return
      }
      const json = await res.json()
      setData(json)
      setPreferences({
        preferredMoods: json.preferences.moods ?? [],
        preferredLangs: json.preferences.languages ?? [],
        discoveryLevel: json.preferences.discoveryLevel,
        autoPlayNext: json.preferences.autoPlayNext,
      })
      // Also seed the in-memory recent list from history
      if (json.recentlyPlayed) {
        const seen = new Set<string>()
        const recent: Track[] = []
        for (const t of json.recentlyPlayed) {
          if (!seen.has(t.saavnId)) {
            seen.add(t.saavnId)
            recent.push({
              id: t.saavnId,
              title: t.title,
              artist: t.artist,
              album: t.album ?? undefined,
              albumId: t.albumId ?? undefined,
              image: t.image ?? undefined,
              streamUrl: t.streamUrl ?? undefined,
              duration: t.duration,
              language: t.language ?? undefined,
              label: t.label ?? undefined,
              year: t.year ?? undefined,
            })
          }
        }
        // Set recent without going through pushRecent (which dedupes & prepends)
        usePlayer.setState({ recent })
      }
    } catch (e) {
      console.error("Init failed", e)
    } finally {
      setLoading(false)
    }
  }, [setPreferences])

  useEffect(() => {
    refresh()
  }, [refresh, status])

  // Listen for sidebar refresh events
  useEffect(() => {
    const handler = () => refresh()
    window.addEventListener("playlists-changed", handler)
    window.addEventListener("albums-changed", handler)
    return () => {
      window.removeEventListener("playlists-changed", handler)
      window.removeEventListener("albums-changed", handler)
    }
  }, [refresh])

  // While session is loading or user is unauthenticated, show a loading screen
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading Resonate...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Body: sidebar + main content area */}
      <div className="flex-1 flex min-h-0">
        <Sidebar
          playlists={data?.playlists ?? []}
          savedAlbums={data?.savedAlbums ?? []}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="px-4 sm:px-6 pt-2 max-w-[1600px] mx-auto">
              {loading ? (
                <div className="space-y-4">
                  <div className="h-48 rounded-2xl bg-white/5 animate-pulse" />
                  <div className="h-10 w-1/3 bg-white/5 animate-pulse rounded" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg bg-white/5 animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <CurrentView data={data} />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Player bar at bottom */}
      <PlayerBar
        onOpenLyrics={() => setLyricsOpen(true)}
        onOpenQueue={() => setQueueOpen(true)}
      />

      {/* Side panels */}
      <QueuePanel open={queueOpen} onOpenChange={setQueueOpen} />
      <LyricsPanel open={lyricsOpen} onOpenChange={setLyricsOpen} />
    </div>
  )
}

function CurrentView({ data }: { data: InitData | null }) {
  const { view } = usePlayer()
  switch (view.kind) {
    case "home":
      return (
        <HomeView
          recent={data?.recentlyPlayed ?? []}
          savedAlbums={data?.savedAlbums ?? []}
        />
      )
    case "search":
      return <SearchView />
    case "library":
      return (
        <LibraryView
          savedAlbums={data?.savedAlbums ?? []}
          recent={data?.recentlyPlayed ?? []}
        />
      )
    case "playlist":
      return <PlaylistView key={view.id} playlistId={view.id} />
    case "album":
      return <AlbumView key={view.id} albumId={view.id} />
    case "preferences":
      return <PreferencesView />
    default:
      return null
  }
}
