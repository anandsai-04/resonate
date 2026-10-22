import { NextResponse } from "next/server"
import { db } from "@/lib/db"

async function getOrCreateUser() {
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({ data: { name: "Listener" } })
  }
  return user
}

// List user's saved albums
export async function GET() {
  const user = await getOrCreateUser()
  const albums = await db.savedAlbum.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ albums })
}
