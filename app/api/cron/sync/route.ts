import { SyncStatus } from "@prisma/client";
import { syncEntries } from "@/lib/clockwise";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncEntries();
  const status = result.status === SyncStatus.FAILED ? 500 : 200;
  return Response.json(result, { status });
}
