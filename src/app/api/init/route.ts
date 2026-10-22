import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// GET /api/init - bootstrap user + load everything needed at app start
export async function GET() {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ensure preference row exists
  const prefs = await db.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  })

  const [playlists, savedAlbums, historyRows] = await Promise.all([
    db.playlist.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    db.savedAlbum.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    db.listeningHistory.findMany({
      where: { userId: user.id },
      include: { track: true },
      orderBy: { playedAt: "desc" },
      take: 20,
    }),
  ])

  // Track counts for each playlist (in parallel)
  const playlistsWithCounts = await Promise.all(
    playlists.map(async (p) => ({
      ...p,
      trackCount: await db.playlistTrack.count({ where: { playlistId: p.id } }),
    })),
  )

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      regdNumber: user.regdNumber,
      course: user.course,
      university: user.university,
      year: user.year,
      role: user.role,
    },
    playlists: playlistsWithCounts,
    savedAlbums,
    preferences: {
      genres: prefs.genres,
      languages: prefs.languages,
      artists: prefs.artists,
      albums: prefs.albums,
      moods: prefs.moods,
      discoveryLevel: prefs.discoveryLevel,
      autoPlayNext: prefs.autoPlayNext,
      explicitFilter: prefs.explicitFilter,
    },
    recentlyPlayed: historyRows.map((h) => h.track),
  })
}
