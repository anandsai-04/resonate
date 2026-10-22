import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// List user playlists (optionally include tracks)
export async function GET(req: Request) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const withTracks = searchParams.get("withTracks") === "1"
  const playlists = await db.playlist.findMany({
    where: { userId: user.id },
    include: withTracks
      ? { tracks: { include: { track: true }, orderBy: { position: "asc" } } }
      : false,
    orderBy: { updatedAt: "desc" },
  })
  const result = await Promise.all(
    playlists.map(async (p: any) => {
      if (withTracks) return p
      const count = await db.playlistTrack.count({ where: { playlistId: p.id } })
      return { ...p, trackCount: count }
    }),
  )
  return NextResponse.json({ playlists: result })
}

// Create a new playlist
export async function POST(req: Request) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { name, description, mood, coverImage } = body
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })
  const playlist = await db.playlist.create({
    data: { name, description, mood, coverImage, userId: user.id },
  })
  return NextResponse.json({ playlist })
}
