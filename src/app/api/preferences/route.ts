import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// GET /api/preferences
// Returns the user's music preferences (genres, languages, artists, moods, etc.)
export async function GET() {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ensure a preference row exists; create with defaults if missing
  const prefs = await db.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  })

  return NextResponse.json({
    genres: prefs.genres,
    languages: prefs.languages,
    artists: prefs.artists,
    albums: prefs.albums,
    moods: prefs.moods,
    discoveryLevel: prefs.discoveryLevel,
    autoPlayNext: prefs.autoPlayNext,
    explicitFilter: prefs.explicitFilter,
  })
}

// POST /api/preferences -> update
// Body: { genres?, languages?, artists?, albums?, moods?, discoveryLevel?, autoPlayNext?, explicitFilter? }
// All fields are optional - only the ones you send get updated.
export async function POST(req: Request) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()

  // Build the update payload - only fields that were provided
  const data: any = {}
  if (Array.isArray(body.genres)) data.genres = body.genres
  if (Array.isArray(body.languages)) data.languages = body.languages
  if (Array.isArray(body.artists)) data.artists = body.artists
  if (Array.isArray(body.albums)) data.albums = body.albums
  if (Array.isArray(body.moods)) data.moods = body.moods
  if (typeof body.discoveryLevel === "number") data.discoveryLevel = body.discoveryLevel
  if (typeof body.autoPlayNext === "boolean") data.autoPlayNext = body.autoPlayNext
  if (typeof body.explicitFilter === "boolean") data.explicitFilter = body.explicitFilter

  const prefs = await db.userPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...data,
    },
    update: data,
  })

  return NextResponse.json({
    genres: prefs.genres,
    languages: prefs.languages,
    artists: prefs.artists,
    albums: prefs.albums,
    moods: prefs.moods,
    discoveryLevel: prefs.discoveryLevel,
    autoPlayNext: prefs.autoPlayNext,
    explicitFilter: prefs.explicitFilter,
  })
}
