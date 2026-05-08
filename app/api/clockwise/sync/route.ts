import { Role, SyncStatus } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import { syncEntries } from "@/lib/clockwise";
import { guardErrorToResponse, requireRole } from "@/lib/guards";

export async function POST() {
  let session;
  try {
    session = await requireRole(Role.ADMIN, Role.REVIEWER);
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  const result = await syncEntries();
  await recordAudit({
    userId: session.user.id,
    action: "CLOCKWISE_SYNC_MANUAL",
    entityType: "Cv2SyncLog",
    entityId: result.syncLogId,
    newValue: {
      fetched: result.fetched,
      created: result.created,
      skipped: result.skipped,
      status: result.status,
    },
  });

  const status = result.status === SyncStatus.FAILED ? 500 : 200;
  return Response.json(result, { status });
}
