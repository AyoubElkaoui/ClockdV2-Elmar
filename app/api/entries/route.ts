import { TimeEntryStatus } from "@prisma/client";
import { z } from "zod";
import { listEntries, reviewEntries } from "@/lib/entries";
import { guardErrorToResponse, requireRole, requireSession } from "@/lib/guards";

const listQuerySchema = z.object({
  status: z.nativeEnum(TimeEntryStatus).optional(),
  employeeId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

export async function GET(request: Request) {
  try {
    await requireSession();
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { from, to, ...rest } = parsed.data;
  const result = await listEntries({
    ...rest,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });
  return Response.json(result);
}

const bulkSchema = z.object({
  entryIds: z.array(z.string().cuid()).min(1).max(500),
  action: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(500).optional(),
});

export async function PATCH(request: Request) {
  let session;
  try {
    session = await requireRole("ADMIN", "REVIEWER");
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const result = await reviewEntries({
    entryIds: parsed.data.entryIds,
    action: parsed.data.action,
    reason: parsed.data.reason,
    reviewerId: session.user.id,
  });
  return Response.json(result);
}
