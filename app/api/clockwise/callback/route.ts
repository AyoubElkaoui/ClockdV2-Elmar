import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import {
  ClockwiseNotConfiguredError,
  ClockwiseTokenError,
  exchangeCodeForTokens,
  getClockwiseConfig,
} from "@/lib/clockwise";
import { guardErrorToResponse, requireRole } from "@/lib/guards";

const STATE_COOKIE = "cv2_clockwise_oauth_state";

export async function GET(request: Request) {
  let session;
  try {
    session = await requireRole(Role.ADMIN);
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (providerError) {
    return Response.json({ error: `Clockwise fout: ${providerError}` }, { status: 400 });
  }
  if (!code || !state) {
    return Response.json({ error: "code of state ontbreekt" }, { status: 400 });
  }
  if (!expectedState || expectedState !== state) {
    return Response.json({ error: "Ongeldige state — mogelijk CSRF" }, { status: 400 });
  }

  try {
    const config = await getClockwiseConfig();
    await exchangeCodeForTokens(config, code);
    await recordAudit({
      userId: session.user.id,
      action: "CLOCKWISE_OAUTH_COMPLETED",
      entityType: "Cv2ClockwiseConfig",
      entityId: config.id,
    });
  } catch (error) {
    if (error instanceof ClockwiseNotConfiguredError || error instanceof ClockwiseTokenError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  redirect("/settings?clockwise=connected");
}
