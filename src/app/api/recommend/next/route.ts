import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { pickNextTrack, buildTasteProfile, type Mood } from "@/lib/recommend"
import type { SaavnSong } from "@/lib/saavn"

async function getOrCreateUser() {
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({ data: { name: "Listener" } })
  }
  return user
}

/**
 * GET /api/recommend/next
 *   ?saavnId=optional  - current song to base theme on
 *   ?exclude=a,b,c     - saavn ids to skip (already in queue/recent)
 *
 * Returns a single track that should play next, based on:
 *   - current song theme (mood + tempo + language)
 *   - user's taste profile (recent history)
 *   - user's style preferences (preferred moods/langs, discovery level)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const currentSaavnId = searchParams.get("saavnId")
  const exclude = (searchParams.get("exclude") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  const user = await getOrCreateUser()

  // Load preferences
  const prefsRow = await db.stylePreference.findUnique({
    where: { userId: user.id },
  })
  const preferredMoods: Mood[] = prefsRow
    ? (JSON.parse(prefsRow.preferredMoods) as Mood[])
    : []
  const preferredLanguages: string[] = prefsRow
    ? JSON.parse(prefsRow.preferredLangs)
    : []
  const discoveryLevel: number = prefsRow?.discoveryLevel ?? 0.3

  // Build taste profile from last 50 plays
  const historyRows = await db.listeningHistory.findMany({
    where: { userId: user.id },
    include: { track: true },
    orderBy: { playedAt: "desc" },
    take: 50,
  })
  const taste = buildTasteProfile(
    historyRows.map((h) => ({
      track: {
        saavnId: h.track.saavnId,
        artist: h.track.artist,
        language: h.track.language,
        mood: h.track.mood,
      },
    })),
  )

  // Current song (if provided) - prefer cached Track row, fall back to API
  let currentSong: SaavnSong | null = null
  if (currentSaavnId) {
    const t = await db.track.findUnique({ where: { saavnId: currentSaavnId } })
    if (t) {
      currentSong = {
        id: t.saavnId,
        title: t.title,
        artist: t.artist,
        album: t.album ?? "",
        albumId: t.albumId ?? undefined,
        image: t.image ?? "",
        streamUrl: t.streamUrl ?? "",
        duration: t.duration,
        language: t.language ?? undefined,
        label: t.label ?? undefined,
        year: t.year ?? undefined,
      }
    }
  }

  try {
    const next = await pickNextTrack({
      currentSong,
      taste,
      discoveryLevel,
      preferredMoods,
      preferredLanguages,
      excludeIds: [...exclude, ...taste.recentlyPlayedIds],
    })

    if (!next) {
      return NextResponse.json({ track: null, theme: null })
    }

    // Cache the recommended track for future use
    try {
      await db.track.upsert({
        where: { saavnId: next.id },
        create: {
          saavnId: next.id,
          title: next.title,
          artist: next.artist,
          album: next.album,
          albumId: next.albumId,
          duration: next.duration,
          image: next.image,
          streamUrl: next.streamUrl,
          language: next.language,
          label: next.label,
          year: next.year,
        },
        update: {
          streamUrl: next.streamUrl,
          image: next.image,
        },
      })
    } catch {}

    return NextResponse.json({
      track: next,
      theme: {
        tasteTopMoods: taste.topMoods,
        tasteTopLanguages: taste.topLanguages,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Recommendation failed" },
      { status: 500 },
    )
  }
}
