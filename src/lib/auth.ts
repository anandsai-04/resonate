import NextAuth, { type DefaultSession } from "next-auth"
import EmailProvider from "next-auth/providers/email"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"

// Campus email domains that are allowed to sign up.
// Comma-separated in env, defaults to a permissive "*" if unset (NOT for production).
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS ?? "*")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean)

const WILDCARD = ALLOWED_DOMAINS.includes("*")

// Augment the session type so we can attach our DB fields.
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "STUDENT" | "MODERATOR" | "ADMIN"
    } & DefaultSession["user"]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter creates User / Account / VerificationToken rows on its own
  adapter: PrismaAdapter(db),
  providers: [
    EmailProvider({
      server: {
        host: "smtp.resend.com",
        port: 465,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY!,
        },
      },
      from: process.env.EMAIL_FROM ?? "Resonate <onboarding@resend.dev>",
      // 24-hour link expiry
      maxAge: 60 * 60 * 24,
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
  callbacks: {
    // Only allow campus emails to sign in
    async signIn({ user }) {
      const email = user.email?.toLowerCase() ?? ""
      const domain = email.split("@")[1] ?? ""
      if (!domain) return false
      if (WILDCARD) return true
      return ALLOWED_DOMAINS.includes(domain)
    },
    // Attach user id + role to every session
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        // @ts-expect-error - role is added by PrismaAdapter
        session.user.role = user.role ?? "STUDENT"
      }
      return session
    },
  },
})
