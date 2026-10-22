import { NextResponse } from "next/server"
import { getAlbumDetails, searchAlbums } from "@/lib/saavn"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const query = searchParams.get("q")

  try {
    // /api/album?id=XYZ -> fetch full album
    if (id) {
      const album = await getAlbumDetails(id)
      if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json({ album })
    }
    // /api/album?q=XYZ -> search
    if (query) {
      const albums = await searchAlbums(query, 12)
      return NextResponse.json({ albums })
    }
    return NextResponse.json({ error: "Provide id or q" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}

// Save an album to user's library
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { saavnId, title, artist, image, year, language } = body
    if (!saavnId || !title) {
      return NextResponse.json({ error: "saavnId and title required" }, { status: 400 })
    }
    const user = await getOrCreateUser()
    const saved = await db.savedAlbum.upsert({
      where: { userId_saavnId: { userId: user.id, saavnId } },
      create: { userId: user.id, saavnId, title, artist, image, year, language },
      update: { title, artist, image, year, language },
    })
    return NextResponse.json({ saved })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Remove album from library
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const saavnId = searchParams.get("saavnId")
  if (!saavnId) return NextResponse.json({ error: "saavnId required" }, { status: 400 })
  const user = await getOrCreateUser()
  await db.savedAlbum.deleteMany({ where: { userId: user.id, saavnId } })
  return NextResponse.json({ ok: true })
}

// Single user helper
async function getOrCreateUser() {
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({ data: { name: "Listener" } })
  }
  return user
}
