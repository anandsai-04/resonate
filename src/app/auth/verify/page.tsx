import Link from "next/link"
import { Mail } from "lucide-react"

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto pulse-ring">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Almost there</h1>
        <p className="text-muted-foreground text-sm">
          We sent a magic link to your campus email. Click the link in that
          email to sign in to Resonate.
        </p>
        <p className="text-xs text-muted-foreground pt-2 border-t border-white/5">
          The link expires in 24 hours. The page will redirect automatically
          once you confirm.
        </p>
        <Link
          href="/auth/signin"
          className="inline-block text-xs text-primary hover:underline mt-2"
        >
          ← Use a different email
        </Link>
      </div>
    </div>
  )
}
