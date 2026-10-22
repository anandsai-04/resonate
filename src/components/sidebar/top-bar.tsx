"use client"

import { usePlayer } from "@/lib/player-store"
import { Button } from "@/components/ui/button"
import { Menu, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export function TopBar() {
  const { setSidebarOpen, view, setView } = usePlayer()

  const titleMap: Record<string, string> = {
    home: "Home",
    search: "Search",
    library: "Your Library",
    playlist: "Playlist",
    album: "Album",
    preferences: "Preferences",
  }
  const title = titleMap[view.kind] ?? ""

  return (
    <header
      className={cn(
        "sticky top-0 z-30",
        "h-14 flex items-center gap-2 px-4",
        "backdrop-blur-md bg-background/70 border-b border-white/5",
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Back / forward (visual only — purely client-side view state) */}
      <div className="hidden md:flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60"
          onClick={() => setView({ kind: "home" })}
          aria-label="Back to home"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60"
          onClick={() => setView({ kind: "library" })}
          aria-label="Library"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <h2 className="text-sm font-semibold ml-1 hidden sm:block">{title}</h2>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex border-white/10 bg-transparent hover:bg-white/5"
          onClick={() => setView({ kind: "preferences" })}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Tune algorithm
        </Button>
      </div>
    </header>
  )
}
