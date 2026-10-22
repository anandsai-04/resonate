import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// GET /api/playlists/[id] -> playlist + tracks
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const playlist = await db.playlist.findUnique({
    where: { id },
    include: {
      tracks: {
        include: { track: true },
        orderBy: { position: "asc" },
      },
    },
  })
  if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 })
  // Allow read for owner OR for public playlists
  if (playlist.userId !== user.id && !playlist.isPublic) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json({ playlist })
}

// DELETE /api/playlists/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const p = await db.playlist.findUnique({ where: { id } })
  if (!p || p.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  await db.playlist.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// PATCH /api/playlists/[id] -> rename / update
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const p = await db.playlist.findUnique({ where: { id } })
  if (!p || p.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const body = await req.json()
  const updated = await db.playlist.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      mood: body.mood,
      coverImage: body.coverImage,
      isPublic: body.isPublic,
    },
  })
  return NextResponse.json({ playlist: updated })
}
