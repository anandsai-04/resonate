import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * Returns the currently authenticated user (with their preferences),
 * or throws an Error if not signed in.
 *
 * Use inside API route handlers. Catch the error and return 401.
 */
export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Unauthorized")
  }
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: { preference: true },
  })
  if (!user) {
    throw new Error("User not found in database")
  }
  return user
}

/**
 * Returns the currently authenticated user, or null if not signed in.
 * Use inside Server Components where you want to render different UI
 * for logged-in vs anonymous users.
 */
export async function getCurrentUserOrNull() {
  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}

/**
 * Returns the authenticated user's ID or null.
 * Lightweight - just reads the session, no DB hit.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}
