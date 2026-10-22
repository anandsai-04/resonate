import Link from "next/link"
import { AlertCircle } from "lucide-react"

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // Async component - we await searchParams
  return <ErrorBody searchParams={searchParams} />
}

async function ErrorBody({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const message =
    error === "AccessDenied"
      ? "Your campus email isn't on the allowed list. Please use your student email."
      : error === "Verification"
        ? "That magic link is invalid or expired. Please request a new one."
        : "Something went wrong. Please try again."

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Sign-in failed</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
        <Link
          href="/auth/signin"
          className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-primary/90"
        >
          Try again
        </Link>
      </div>
    </div>
  )
}
