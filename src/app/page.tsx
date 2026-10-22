"use client"

import { useEffect, useState, useCallback } from "react"
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
import {
  getPlaylists,
  getSavedAlbums,
  getPreferences,
  getRecentTracks,
  onStorageChange,
  type Playlist,
  type SavedAlbum,
  type Preferences,
} from "@/lib/storage"

export default function Home() {
  useAudioEngine()

  const { view, setPreferences } = usePlayer()

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [savedAlbums, setSavedAlbums] = useState<SavedAlbum[]>([])
  const [recent, setRecent] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [queueOpen, setQueueOpen] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(false)

  const refresh = useCallback(() => {
    setPlaylists(getPlaylists())
    setSavedAlbums(getSavedAlbums())
    setRecent(getRecentTracks(30))
    const prefs = getPreferences()
    setPreferences({
      preferredMoods: prefs.moods,
      preferredLangs: prefs.languages,
      discoveryLevel: prefs.discoveryLevel,
      autoPlayNext: prefs.autoPlayNext,
    })
    setLoading(false)
  }, [setPreferences])

  useEffect(() => {
    // Defer to avoid the set-state-in-effect rule
    Promise.resolve().then(refresh)
    const unsubscribe = onStorageChange(refresh)
    return unsubscribe
  }, [refresh])

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="flex-1 flex min-h-0">
        <Sidebar playlists={playlists} savedAlbums={savedAlbums} />
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
                <CurrentView recent={recent} savedAlbums={savedAlbums} />
              )}
            </div>
          </div>
        </main>
      </div>

      <PlayerBar
        onOpenLyrics={() => setLyricsOpen(true)}
        onOpenQueue={() => setQueueOpen(true)}
      />

      <QueuePanel open={queueOpen} onOpenChange={setQueueOpen} />
      <LyricsPanel open={lyricsOpen} onOpenChange={setLyricsOpen} />
    </div>
  )
}

function CurrentView({
  recent,
  savedAlbums,
}: {
  recent: Track[]
  savedAlbums: SavedAlbum[]
}) {
  const { view } = usePlayer()
  switch (view.kind) {
    case "home":
      return <HomeView recent={recent} savedAlbums={savedAlbums} />
    case "search":
      return <SearchView />
    case "library":
      return <LibraryView savedAlbums={savedAlbums} recent={recent} />
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
