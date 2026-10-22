import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// POST /api/history  body: { saavnId, completed?, skipped? }
// Records a play event for taste profiling
export async function POST(req: Request) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { saavnId, completed = false, skipped = false } = body
  if (!saavnId) {
    return NextResponse.json({ error: "saavnId required" }, { status: 400 })
  }

  const track = await db.track.findUnique({ where: { saavnId } })
  if (!track) {
    return NextResponse.json({ ok: false, reason: "track not cached" })
  }

  const entry = await db.listeningHistory.create({
    data: {
      userId: user.id,
      trackId: track.id,
      completed,
      skipped,
    },
  })
  return NextResponse.json({ ok: true, entry })
}

// GET /api/history?limit=N
export async function GET(req: Request) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 50)
  const history = await db.listeningHistory.findMany({
    where: { userId: user.id },
    include: { track: true },
    orderBy: { playedAt: "desc" },
    take: limit,
  })
  return NextResponse.json({ history })
}
