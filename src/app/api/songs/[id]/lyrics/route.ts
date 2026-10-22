import { NextResponse } from "next/server"
import { getLyrics } from "@/lib/saavn"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }
  try {
    const lyrics = await getLyrics(id)
    return NextResponse.json(lyrics)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
