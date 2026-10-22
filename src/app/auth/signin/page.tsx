"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Music4, Loader2, Mail, ArrowLeft } from "lucide-react"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn("email", {
      email,
      redirect: false,
      callbackUrl: "/",
    })
    setLoading(false)
    if (res?.error) {
      setError(
        "Could not send magic link. Make sure you're using a campus email.",
      )
    } else if (res?.ok) {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto pulse-ring">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Check your inbox</h1>
          <p className="text-muted-foreground">
            We sent a magic sign-in link to
            <br />
            <span className="text-foreground font-medium">{email}</span>
          </p>
          <p className="text-xs text-muted-foreground pt-3">
            The link expires in 24 hours. Check your spam folder if you don&apos;t
            see it within a minute.
          </p>
          <Button
            variant="ghost"
            onClick={() => setSent(false)}
            className="mt-2 text-xs"
          >
            Use a different email
          </Button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-primary text-sm font-semibold tracking-wide">
            <Music4 className="h-4 w-4" /> Resonate
          </div>
          <h1 className="text-3xl font-black">Welcome back</h1>
          <p className="text-muted-foreground text-sm">
            Sign in with your campus email to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Campus email
            </label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourcampus.edu"
              className="bg-card"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading || !email}
            className="w-full h-11 text-base font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending link...
              </>
            ) : (
              "Send magic link"
            )}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          We&apos;ll email you a one-time link — no password to remember.
          Only verified campus email domains can sign up.
        </p>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute inset-0 gradient-hero opacity-50 pointer-events-none" />
      <div className="relative w-full max-w-sm bg-card/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl">
        {children}
      </div>
    </div>
  )
}
