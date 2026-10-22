import { NextResponse } from "next/server"
import { db } from "@/lib/db"

async function getOrCreateUser() {
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({ data: { name: "Listener" } })
  }
  return user
}

// GET /api/preferences
export async function GET() {
  const user = await getOrCreateUser()
  const prefs = await db.stylePreference.findUnique({
    where: { userId: user.id },
  })
  if (!prefs) {
    return NextResponse.json({
      preferredMoods: [],
      preferredLangs: [],
      preferredGenres: [],
      discoveryLevel: 0.3,
      autoPlayNext: true,
    })
  }
  return NextResponse.json({
    preferredMoods: JSON.parse(prefs.preferredMoods),
    preferredLangs: JSON.parse(prefs.preferredLangs),
    preferredGenres: JSON.parse(prefs.preferredGenres),
    discoveryLevel: prefs.discoveryLevel,
    autoPlayNext: prefs.autoPlayNext,
  })
}

// POST /api/preferences -> update
export async function POST(req: Request) {
  const body = await req.json()
  const user = await getOrCreateUser()
  const data = {
    preferredMoods: JSON.stringify(body.preferredMoods ?? []),
    preferredLangs: JSON.stringify(body.preferredLangs ?? []),
    preferredGenres: JSON.stringify(body.preferredGenres ?? []),
    discoveryLevel: typeof body.discoveryLevel === "number" ? body.discoveryLevel : 0.3,
    autoPlayNext: typeof body.autoPlayNext === "boolean" ? body.autoPlayNext : true,
  }
  const prefs = await db.stylePreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  })
  return NextResponse.json({
    preferredMoods: JSON.parse(prefs.preferredMoods),
    preferredLangs: JSON.parse(prefs.preferredLangs),
    preferredGenres: JSON.parse(prefs.preferredGenres),
    discoveryLevel: prefs.discoveryLevel,
    autoPlayNext: prefs.autoPlayNext,
  })
}
