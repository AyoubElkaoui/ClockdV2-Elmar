import { Role } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import { exportTimeEntry } from "@/lib/firebird";
import { guardErrorToResponse, requireRole } from "@/lib/guards";

export const maxDuration = 60;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(Role.ADMIN, Role.REVIEWER);
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  const { id } = await params;

  try {
    await exportTimeEntry(id);
    await recordAudit({
      userId: session.user.id,
      action: "EXPORT_RETRY_OK",
      entityType: "Cv2TimeEntry",
      entityId: id,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordAudit({
      userId: session.user.id,
      action: "EXPORT_RETRY_FAILED",
      entityType: "Cv2TimeEntry",
      entityId: id,
      newValue: { error: message },
    });
    return Response.json({ error: message }, { status: 500 });
  }
}
