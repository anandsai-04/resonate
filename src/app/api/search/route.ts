import { NextResponse } from "next/server"
import { searchSongs, searchAlbums } from "@/lib/saavn"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const type = searchParams.get("type") ?? "songs" // "songs" | "albums" | "all"
  const limit = Number(searchParams.get("limit") ?? 20)

  if (!q.trim()) {
    return NextResponse.json({ songs: [], albums: [] })
  }

  try {
    if (type === "songs") {
      const songs = await searchSongs(q, limit)
      return NextResponse.json({ songs, albums: [] })
    }
    if (type === "albums") {
      const albums = await searchAlbums(q, limit)
      return NextResponse.json({ songs: [], albums })
    }
    // type === "all"
    const [songs, albums] = await Promise.all([
      searchSongs(q, Math.min(limit, 12)),
      searchAlbums(q, 6),
    ])
    return NextResponse.json({ songs, albums })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Search failed" },
      { status: 502 },
    )
  }
}
