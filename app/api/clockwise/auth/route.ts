import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import {
  ClockwiseNotConfiguredError,
  buildAuthorizeUrl,
  getClockwiseConfig,
} from "@/lib/clockwise";
import { guardErrorToResponse, requireRole } from "@/lib/guards";

const STATE_COOKIE = "cv2_clockwise_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;

export async function GET() {
  try {
    await requireRole(Role.ADMIN);
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  let config;
  try {
    config = await getClockwiseConfig();
  } catch (error) {
    if (error instanceof ClockwiseNotConfiguredError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });

  return Response.redirect(buildAuthorizeUrl(config, state));
}
