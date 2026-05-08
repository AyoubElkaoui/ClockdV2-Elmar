import { Role } from "@prisma/client";
import { exportApprovedEntries } from "@/lib/firebird";
import { guardErrorToResponse, requireRole } from "@/lib/guards";

export const maxDuration = 120;

export async function POST() {
  let session;
  try {
    session = await requireRole(Role.ADMIN, Role.REVIEWER);
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  try {
    const result = await exportApprovedEntries({ userId: session.user.id });
    const status = result.failed > 0 ? 207 : 200;
    return Response.json(result, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
