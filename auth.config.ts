import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isProtected =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/entries") ||
        nextUrl.pathname.startsWith("/mappings") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/logs") ||
        nextUrl.pathname.startsWith("/geschiedenis") ||
        nextUrl.pathname.startsWith("/statistieken") ||
        nextUrl.pathname.startsWith("/medewerkers") ||
        nextUrl.pathname.startsWith("/account") ||
        nextUrl.pathname.startsWith("/help");

      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      if (isProtected && !isLoggedIn) {
        return false;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "REVIEWER" | "VIEWER";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
