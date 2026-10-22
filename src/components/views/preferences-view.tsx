"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { usePlayer } from "@/lib/player-store"
import { MOODS, MOOD_LABELS, LANGUAGES, type Mood } from "@/lib/recommend"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  Save,
  RotateCcw,
  Brain,
  Globe,
  Music4,
  User as UserIcon,
  Plus,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

interface Prefs {
  genres: string[]
  languages: string[]
  artists: string[]
  albums: string[]
  moods: string[]
  discoveryLevel: number
  autoPlayNext: boolean
  explicitFilter: boolean
}

const DEFAULT_PREFS: Prefs = {
  genres: [],
  languages: [],
  artists: [],
  albums: [],
  moods: [],
  discoveryLevel: 0.3,
  autoPlayNext: true,
  explicitFilter: false,
}

const COMMON_GENRES = [
  "bollywood", "pop", "rock", "hip-hop", "lo-fi", "edm", "classical",
  "punjabi", "indie", "r&b", "jazz", "folk", "devotional", "k-pop",
]

export function PreferencesView() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newArtist, setNewArtist] = useState("")
  const [newGenre, setNewGenre] = useState("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const { toast } = useToast()
  const setPreferences = usePlayer((s) => s.setPreferences)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/preferences")
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/auth/signin")
          return null
        }
        return r.json()
      })
      .then((d) => {
        if (!d) return
        setPrefs({
          genres: d.genres ?? [],
          languages: d.languages ?? [],
          artists: d.artists ?? [],
          albums: d.albums ?? [],
          moods: d.moods ?? [],
          discoveryLevel: typeof d.discoveryLevel === "number" ? d.discoveryLevel : 0.3,
          autoPlayNext: d.autoPlayNext ?? true,
          explicitFilter: d.explicitFilter ?? false,
        })
        setPreferences({
          preferredMoods: d.moods ?? [],
          preferredLangs: d.languages ?? [],
          discoveryLevel: typeof d.discoveryLevel === "number" ? d.discoveryLevel : 0.3,
          autoPlayNext: d.autoPlayNext ?? true,
        })
      })
      .finally(() => setLoading(false))

    // Fetch user info for the account section
    fetch("/api/init")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.user?.email && setUserEmail(d.user.email))
      .catch(() => {})
  }, [setPreferences, router])

  const toggleMood = (mood: Mood) => {
    setPrefs((p) => ({
      ...p,
      moods: p.moods.includes(mood)
        ? p.moods.filter((m) => m !== mood)
        : [...p.moods, mood],
    }))
  }

  const toggleLang = (lang: string) => {
    setPrefs((p) => ({
      ...p,
      languages: p.languages.includes(lang)
        ? p.languages.filter((l) => l !== lang)
        : [...p.languages, lang],
    }))
  }

  const toggleGenre = (genre: string) => {
    setPrefs((p) => ({
      ...p,
      genres: p.genres.includes(genre)
        ? p.genres.filter((g) => g !== genre)
        : [...p.genres, genre],
    }))
  }

  const addArtist = () => {
    const a = newArtist.trim()
    if (!a) return
    if (!prefs.artists.includes(a)) {
      setPrefs((p) => ({ ...p, artists: [...p.artists, a] }))
    }
    setNewArtist("")
  }

  const removeArtist = (artist: string) => {
    setPrefs((p) => ({ ...p, artists: p.artists.filter((a) => a !== artist) }))
  }

  const addGenre = () => {
    const g = newGenre.trim().toLowerCase()
    if (!g) return
    if (!prefs.genres.includes(g)) {
      setPrefs((p) => ({ ...p, genres: [...p.genres, g] }))
    }
    setNewGenre("")
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      })
      setPreferences({
        preferredMoods: prefs.moods,
        preferredLangs: prefs.languages,
        discoveryLevel: prefs.discoveryLevel,
        autoPlayNext: prefs.autoPlayNext,
      })
      toast({ title: "Preferences saved" })
    } catch (e: any) {
      toast({
        title: "Failed to save",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setPrefs(DEFAULT_PREFS)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-1/3 bg-white/5 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-white/5 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6 pb-6">
      <header>
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          Style Preferences
        </h1>
        <p className="text-muted-foreground text-sm">
          Tune the auto-play-next algorithm. These preferences shape which
          tracks get suggested when your playlist ends.
        </p>
      </header>

      {/* Account section */}
      {userEmail && (
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="h-4 w-4 text-primary" /> Account
            </CardTitle>
            <CardDescription>
              You&apos;re signed in as <span className="text-foreground font-medium">{userEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Auto-play-next toggle */}
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" /> Auto-play next
          </CardTitle>
          <CardDescription>
            When enabled, the player fetches a track matching the current song&apos;s
            mood when nothing else is queued.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {prefs.autoPlayNext ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={prefs.autoPlayNext}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, autoPlayNext: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Discovery slider */}
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Discovery level
          </CardTitle>
          <CardDescription>
            How adventurous the algorithm should be when picking the next track.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Slider
            value={[Math.round(prefs.discoveryLevel * 100)]}
            onValueChange={(v) =>
              setPrefs((p) => ({ ...p, discoveryLevel: v[0] / 100 }))
            }
            max={100}
            step={5}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Safe (stick to current mood)</span>
            <span className="font-semibold text-primary">
              {Math.round(prefs.discoveryLevel * 100)}%
            </span>
            <span>Wild (explore broadly)</span>
          </div>
        </CardContent>
      </Card>

      {/* Mood preferences */}
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Music4 className="h-4 w-4 text-primary" /> Preferred moods
          </CardTitle>
          <CardDescription>
            Pick moods you gravitate toward. The algorithm biases recommendations
            toward these even when the current song suggests otherwise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => {
              const active = prefs.moods.includes(m)
              return (
                <button
                  key={m}
                  onClick={() => toggleMood(m)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
                  )}
                >
                  {MOOD_LABELS[m]}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Language preferences */}
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" /> Preferred languages
          </CardTitle>
          <CardDescription>
            Languages to prioritise in the auto-play-next search.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const active = prefs.languages.includes(l)
              return (
                <button
                  key={l}
                  onClick={() => toggleLang(l)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
                  )}
                >
                  {l}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Genre preferences */}
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Music4 className="h-4 w-4 text-primary" /> Preferred genres
          </CardTitle>
          <CardDescription>
            Genres you enjoy. Click to toggle, or add your own.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {COMMON_GENRES.map((g) => {
              const active = prefs.genres.includes(g)
              return (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
                  )}
                >
                  {g}
                </button>
              )
            })}
            {/* Custom genres */}
            {prefs.genres
              .filter((g) => !COMMON_GENRES.includes(g))
              .map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground"
                >
                  {g}
                  <button onClick={() => toggleGenre(g)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGenre())}
              placeholder="Add custom genre..."
              className="bg-card"
            />
            <Button onClick={addGenre} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Artist preferences */}
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Music4 className="h-4 w-4 text-primary" /> Favorite artists
          </CardTitle>
          <CardDescription>
            Artists you love. The algorithm will bias recommendations toward them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {prefs.artists.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                No favorite artists yet. Add a few below.
              </span>
            )}
            {prefs.artists.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-foreground"
              >
                {a}
                <button
                  onClick={() => removeArtist(a)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newArtist}
              onChange={(e) => setNewArtist(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArtist())}
              placeholder="Add artist name..."
              className="bg-card"
            />
            <Button onClick={addArtist} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action row */}
      <div className="flex items-center gap-2 pt-2 sticky bottom-24 bg-background/80 backdrop-blur py-3 -mx-2 px-2 border-t border-white/5">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving..." : "Save preferences"}
        </Button>
        <Button variant="ghost" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset to defaults
        </Button>
      </div>
    </div>
  )
}
