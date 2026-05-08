import { SyncStatus } from "@prisma/client";
import { ClockwiseNotConfiguredError, getClockwiseConfig } from "@/lib/clockwise";
import { guardErrorToResponse, requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireSession();
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  try {
    const config = await getClockwiseConfig();
    const lastSync = await prisma.cv2SyncLog.findFirst({
      orderBy: { startedAt: "desc" },
    });

    const now = Date.now();
    const expiresInMs = config.tokenExpiry ? config.tokenExpiry.getTime() - now : null;

    return Response.json({
      connected: Boolean(config.accessToken && config.tokenExpiry),
      isActive: config.isActive,
      tokenExpiresAt: config.tokenExpiry,
      tokenExpired: expiresInMs !== null && expiresInMs <= 0,
      lastSyncAt: config.lastSyncAt,
      syncInterval: config.syncInterval,
      lastSync: lastSync
        ? {
            id: lastSync.id,
            startedAt: lastSync.startedAt,
            completedAt: lastSync.completedAt,
            status: lastSync.status,
            entriesFetched: lastSync.entriesFetched,
            entriesCreated: lastSync.entriesCreated,
            entriesSkipped: lastSync.entriesSkipped,
            errorMessage: lastSync.errorMessage,
            isRunning: lastSync.status === SyncStatus.RUNNING,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof ClockwiseNotConfiguredError) {
      return Response.json(
        { connected: false, configured: false, error: error.message },
        { status: 200 },
      );
    }
    throw error;
  }
}
