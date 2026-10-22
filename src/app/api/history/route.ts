import { NextResponse } from "next/server"
import { db } from "@/lib/db"

async function getOrCreateUser() {
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({ data: { name: "Listener" } })
  }
  return user
}

// POST /api/history  body: { saavnId, completed?, skipped? }
// Records a play event for taste profiling
export async function POST(req: Request) {
  const body = await req.json()
  const { saavnId, completed = false, skipped = false } = body
  if (!saavnId) {
    return NextResponse.json({ error: "saavnId required" }, { status: 400 })
  }
  const user = await getOrCreateUser()
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
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 50)
  const user = await getOrCreateUser()
  const history = await db.listeningHistory.findMany({
    where: { userId: user.id },
    include: { track: true },
    orderBy: { playedAt: "desc" },
    take: limit,
  })
  return NextResponse.json({ history })
}
