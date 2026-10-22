"use client"

import { usePlayer } from "@/lib/player-store"
import { cn } from "@/lib/utils"
import {
  Home,
  Search,
  Library,
  Plus,
  Heart,
  Music2,
  Disc3,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface Playlist {
  id: string
  name: string
  trackCount?: number
  coverImage?: string | null
  mood?: string | null
}

interface Album {
  id: string
  saavnId: string
  title: string
  artist: string
  image?: string | null
}

export function Sidebar({
  playlists = [],
  savedAlbums = [],
}: {
  playlists?: Playlist[]
  savedAlbums?: Album[]
}) {
  const { view, setView, setSidebarOpen, sidebarOpen } = usePlayer()
  const [createOpen, setCreateOpen] = useState(false)

  const navItem = (
    active: boolean,
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
  ) => (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 px-3 py-2 rounded-md text-sm font-semibold transition-colors w-full",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col gap-2 p-2",
          "bg-black text-white",
          "transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Top: nav buttons */}
        <div className="bg-card rounded-lg p-2 flex flex-col gap-1">
          {navItem(
            view.kind === "home",
            <Home className="h-5 w-5" />,
            "Home",
            () => setView({ kind: "home" }),
          )}
          {navItem(
            view.kind === "search",
            <Search className="h-5 w-5" />,
            "Search",
            () => setView({ kind: "search" }),
          )}
        </div>

        {/* Library section */}
        <div className="bg-card rounded-lg flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between p-3">
            <button
              onClick={() => setView({ kind: "library" })}
              className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors text-sm font-semibold"
            >
              <Library className="h-5 w-5" />
              Your Library
            </button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setCreateOpen(true)}
              aria-label="Create playlist"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 px-2 pb-2 scrollbar-thin">
            <div className="flex flex-col gap-1">
              {/* Quick "Liked" pseudo-playlist */}
              <SidebarItem
                active={false}
                icon={
                  <div className="h-12 w-12 rounded-md bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                    <Heart className="h-5 w-5 fill-white text-white" />
                  </div>
                }
                title="Liked Songs"
                subtitle="Auto-curated"
                onClick={() => setView({ kind: "library" })}
              />

              {/* Playlists */}
              {playlists.map((p) => (
                <SidebarItem
                  key={p.id}
                  active={view.kind === "playlist" && view.id === p.id}
                  icon={
                    <div className="h-12 w-12 rounded-md overflow-hidden bg-black/40 flex items-center justify-center">
                      {p.coverImage ? (
                        <img
                          src={p.coverImage}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Music2 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  }
                  title={p.name}
                  subtitle={`Playlist • ${p.trackCount ?? 0} songs`}
                  onClick={() =>
                    setView({ kind: "playlist", id: p.id })
                  }
                />
              ))}

              {/* Saved albums */}
              {savedAlbums.map((a) => (
                <SidebarItem
                  key={a.id}
                  active={view.kind === "album" && view.id === a.saavnId}
                  icon={
                    <div className="h-12 w-12 rounded-md overflow-hidden bg-black/40 flex items-center justify-center">
                      {a.image ? (
                        <img
                          src={a.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Disc3 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  }
                  title={a.title}
                  subtitle={`Album • ${a.artist}`}
                  onClick={() =>
                    setView({ kind: "album", id: a.saavnId })
                  }
                />
              ))}

              {/* Preferences link */}
              <SidebarItem
                active={view.kind === "preferences"}
                icon={
                  <div className="h-12 w-12 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                  </div>
                }
                title="Style Preferences"
                subtitle="Tune the algorithm"
                onClick={() => setView({ kind: "preferences" })}
              />
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Create playlist dialog */}
      <CreatePlaylistDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          // Tell the parent to refresh playlists
          window.dispatchEvent(new CustomEvent("playlists-changed"))
        }}
      />
    </>
  )
}

function SidebarItem({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-2 rounded-md text-left transition-colors",
        active ? "bg-white/10" : "hover:bg-white/5",
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-sm font-medium",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {title}
        </div>
        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </button>
  )
}

function CreatePlaylistDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) throw new Error("Failed to create playlist")
      toast({
        title: "Playlist created",
        description: name,
      })
      onCreated()
      onOpenChange(false)
      setName("")
      setDescription("")
    } catch (e: any) {
      toast({
        title: "Failed to create playlist",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new playlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Mix"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description (optional)</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this playlist about?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
