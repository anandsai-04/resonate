import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Middleware-style: protect all /api routes except the auth endpoints
 * and the iTunes/LRCLIB search endpoints (those are public read-only).
 *
 * For more control we use a per-route guard inside each handler instead
 * of an Edge middleware (which can't easily query the DB).
 *
 * This file exports a thin `requireUser` helper that API routes call.
 */
export async function requireUser() {
  const session = await auth()
  if (!session?.user?.email) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Unauthorized — please sign in" },
        { status: 401 },
      ),
    }
  }
  return { user: session.user, error: null }
}
