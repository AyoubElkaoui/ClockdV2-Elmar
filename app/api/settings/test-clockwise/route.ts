import { Role } from "@prisma/client";
import {
  ClockwiseNotConfiguredError,
  ClockwiseTokenError,
  getValidAccessToken,
  getClockwiseConfig,
} from "@/lib/clockwise";
import { guardErrorToResponse, requireRole } from "@/lib/guards";

export async function POST() {
  try {
    await requireRole(Role.ADMIN);
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  try {
    const config = await getClockwiseConfig();
    const token = await getValidAccessToken();
    const url = new URL(`${config.baseUrl.replace(/\/$/, "")}/ping`);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    }).catch(() => null);
    return Response.json({
      ok: true,
      tokenValid: true,
      tokenExpiresAt: config.tokenExpiry,
      // /ping is a best-guess health endpoint — may 404; the token check above
      // is what actually tells us the auth is healthy.
      pingStatus: response?.status ?? null,
    });
  } catch (error) {
    if (error instanceof ClockwiseNotConfiguredError || error instanceof ClockwiseTokenError) {
      return Response.json({ ok: false, error: error.message }, { status: 200 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
