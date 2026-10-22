import { NextResponse } from "next/server"
import { getSongDetails, getLyrics } from "@/lib/saavn"
import { db } from "@/lib/db"
import { extractTheme } from "@/lib/recommend"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id") ?? ""
  const withLyrics = searchParams.get("lyrics") === "1"

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  try {
    const song = await getSongDetails(id)
    if (!song) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Cache the track locally + attach mood for future recommendations
    const theme = extractTheme(song)
    const mood = theme.moods[0] ?? null

    try {
      await db.track.upsert({
        where: { saavnId: song.id },
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
      })
    } catch {
      // DB cache failure is non-fatal; UI can still play
    }

    let lyrics: { syncLyrics?: string; plainLyrics?: string } | undefined
    if (withLyrics) {
      lyrics = await getLyrics(id)
    }

    return NextResponse.json({ song, lyrics, theme: { mood, tempo: theme.tempo, languages: theme.languages } })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Failed to fetch song" },
      { status: 502 },
    )
  }
}
