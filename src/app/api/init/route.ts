import { NextResponse } from "next/server"
import { db } from "@/lib/db"

async function getOrCreateUser() {
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({ data: { name: "Listener" } })
  }
  return user
}

// GET /api/init - bootstrap user + load everything needed at app start
export async function GET() {
  const user = await getOrCreateUser()

  const [playlists, savedAlbums, prefsRow, historyRows] = await Promise.all([
    db.playlist.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    db.savedAlbum.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    db.stylePreference.findUnique({ where: { userId: user.id } }),
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
    user,
    playlists: playlistsWithCounts,
    savedAlbums,
    preferences: prefsRow
      ? {
          preferredMoods: JSON.parse(prefsRow.preferredMoods),
          preferredLangs: JSON.parse(prefsRow.preferredLangs),
          preferredGenres: JSON.parse(prefsRow.preferredGenres),
          discoveryLevel: prefsRow.discoveryLevel,
          autoPlayNext: prefsRow.autoPlayNext,
        }
      : {
          preferredMoods: [],
          preferredLangs: [],
          preferredGenres: [],
          discoveryLevel: 0.3,
          autoPlayNext: true,
        },
    recentlyPlayed: historyRows.map((h) => h.track),
  })
}
