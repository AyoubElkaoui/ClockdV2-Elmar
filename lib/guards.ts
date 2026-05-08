import type { Session } from "next-auth";
import { Role } from "@prisma/client";
import { auth } from "@/auth";

export type AuthedSession = Session & { user: NonNullable<Session["user"]> };

export async function requireSession(): Promise<AuthedSession> {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session as AuthedSession;
}

export async function requireRole(...roles: Role[]): Promise<AuthedSession> {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new ForbiddenError();
  }
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Niet ingelogd.");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Onvoldoende rechten.");
    this.name = "ForbiddenError";
  }
}

export function guardErrorToResponse(error: unknown): Response | null {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  return null;
}
