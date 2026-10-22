import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSongDetails } from "@/lib/saavn"
import { extractTheme } from "@/lib/recommend"

async function getOrCreateUser() {
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({ data: { name: "Listener" } })
  }
  return user
}

// POST /api/playlists/[id]/tracks
// body: { saavnId: string, title, artist, album, image, streamUrl, duration, language, label, year }
// Adds a track to a playlist (idempotent via unique constraint)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: playlistId } = await params
  const body = await req.json()
  const {
    saavnId,
    title,
    artist,
    album,
    image,
    streamUrl,
    duration,
    language,
    label,
    year,
  } = body
  if (!saavnId || !title) {
    return NextResponse.json({ error: "saavnId and title required" }, { status: 400 })
  }

  // Ensure playlist exists & belongs to user
  const user = await getOrCreateUser()
  const playlist = await db.playlist.findUnique({ where: { id: playlistId } })
  if (!playlist || playlist.userId !== user.id) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
  }

  // Derive mood from incoming track metadata (or fetch fresh)
  let mood: string | null = null
  let tempo: string | null = null
  try {
    // Try a quick theme derivation from the body if possible
    const theme = extractTheme({
      title,
      album,
      label,
      language,
      duration: Number(duration) ?? 0,
    })
    mood = theme.moods[0] ?? null
    tempo = theme.tempo
  } catch {}

  // Upsert track
  const track = await db.track.upsert({
    where: { saavnId },
    create: {
      saavnId,
      title,
      artist,
      album,
      image,
      streamUrl,
      duration: Number(duration) ?? 0,
      language,
      label,
      year,
      mood,
      tempo,
    },
    update: {
      title,
      artist,
      album,
      image,
      streamUrl,
      duration: Number(duration) ?? 0,
      language,
      label,
      year,
      mood,
      tempo,
    },
  })

  // Append at end of playlist
  const count = await db.playlistTrack.count({ where: { playlistId } })
  try {
    const pt = await db.playlistTrack.create({
      data: { playlistId, trackId: track.id, position: count },
    })
    return NextResponse.json({ ok: true, playlistTrack: pt })
  } catch {
    // Unique constraint - track already in playlist
    return NextResponse.json({ ok: true, alreadyExists: true })
  }
}

// GET /api/playlists/[id]/tracks -> list tracks
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: playlistId } = await params
  const playlist = await db.playlist.findUnique({
    where: { id: playlistId },
    include: {
      tracks: {
        include: { track: true },
        orderBy: { position: "asc" },
      },
    },
  })
  if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ tracks: playlist.tracks.map((pt) => pt.track) })
}

// DELETE /api/playlists/[id]/tracks?trackId=...  OR  ?saavnId=...
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: playlistId } = await params
  const { searchParams } = new URL(req.url)
  const trackId = searchParams.get("trackId")
  const saavnId = searchParams.get("saavnId")

  let targetTrackId = trackId
  if (!targetTrackId && saavnId) {
    const t = await db.track.findUnique({ where: { saavnId } })
    if (!t) return NextResponse.json({ ok: true })
    targetTrackId = t.id
  }
  if (!targetTrackId) {
    return NextResponse.json({ error: "trackId or saavnId required" }, { status: 400 })
  }

  await db.playlistTrack.deleteMany({
    where: { playlistId, trackId: targetTrackId },
  })
  // Re-pack positions
  const remaining = await db.playlistTrack.findMany({
    where: { playlistId },
    orderBy: { position: "asc" },
  })
  await Promise.all(
    remaining.map((pt, i) =>
      db.playlistTrack.update({ where: { id: pt.id }, data: { position: i } }),
    ),
  )
  return NextResponse.json({ ok: true })
}

// Helper for fetching song details (used internally if needed)
export async function fetchAndCacheTrack(saavnId: string) {
  const song = await getSongDetails(saavnId)
  if (!song) return null
  const theme = extractTheme(song)
  const mood = theme.moods[0] ?? null
  return db.track.upsert({
    where: { saavnId },
    create: {
      saavnId: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      albumId: song.albumId,
      duration: song.duration,
      image: song.image,
      streamUrl: song.streamUrl,
      language: song.language,
      label: song.label,
      year: song.year,
      mood,
      tempo: theme.tempo,
    },
    update: {
      title: song.title,
      artist: song.artist,
      album: song.album,
      image: song.image,
      streamUrl: song.streamUrl,
      language: song.language,
      mood,
      tempo: theme.tempo,
    },
  })
}
