"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { usePlayer } from "@/lib/player-store"
import { MOODS, MOOD_LABELS, LANGUAGES, type Mood } from "@/lib/recommend"
import { cn } from "@/lib/utils"
import { Sparkles, Save, RotateCcw, Brain, Globe, Music4 } from "lucide-react"

interface Prefs {
  preferredMoods: string[]
  preferredLangs: string[]
  preferredGenres: string[]
  discoveryLevel: number
  autoPlayNext: boolean
}

const DEFAULT_PREFS: Prefs = {
  preferredMoods: [],
  preferredLangs: [],
  preferredGenres: [],
  discoveryLevel: 0.3,
  autoPlayNext: true,
}

export function PreferencesView() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const setPreferences = usePlayer((s) => s.setPreferences)

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((d) => {
        setPrefs({
          preferredMoods: d.preferredMoods ?? [],
          preferredLangs: d.preferredLangs ?? [],
          preferredGenres: d.preferredGenres ?? [],
          discoveryLevel: typeof d.discoveryLevel === "number" ? d.discoveryLevel : 0.3,
          autoPlayNext: d.autoPlayNext ?? true,
        })
        setPreferences({
          preferredMoods: d.preferredMoods ?? [],
          preferredLangs: d.preferredLangs ?? [],
          discoveryLevel: typeof d.discoveryLevel === "number" ? d.discoveryLevel : 0.3,
          autoPlayNext: d.autoPlayNext ?? true,
        })
      })
      .finally(() => setLoading(false))
  }, [setPreferences])

  const toggleMood = (mood: Mood) => {
    setPrefs((p) => ({
      ...p,
      preferredMoods: p.preferredMoods.includes(mood)
        ? p.preferredMoods.filter((m) => m !== mood)
        : [...p.preferredMoods, mood],
    }))
  }

  const toggleLang = (lang: string) => {
    setPrefs((p) => ({
      ...p,
      preferredLangs: p.preferredLangs.includes(lang)
        ? p.preferredLangs.filter((l) => l !== lang)
        : [...p.preferredLangs, lang],
    }))
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
        preferredMoods: prefs.preferredMoods,
        preferredLangs: prefs.preferredLangs,
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
          Tune the auto-play-next algorithm. These settings shape which tracks
          get suggested when your playlist ends or queue runs dry.
        </p>
      </header>

      {/* Auto-play-next toggle */}
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" /> Auto-play next
          </CardTitle>
          <CardDescription>
            When enabled, the player fetches a track matching the current song's
            mood (your taste + theme) when nothing else is queued.
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
              const active = prefs.preferredMoods.includes(m)
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
              const active = prefs.preferredLangs.includes(l)
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
