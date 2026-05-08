import { z } from "zod";
import { getEntry, reviewEntries } from "@/lib/entries";
import { guardErrorToResponse, requireRole, requireSession } from "@/lib/guards";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  const { id } = await params;
  const entry = await getEntry(id);
  if (!entry) {
    return Response.json({ error: "Entry niet gevonden" }, { status: 404 });
  }
  return Response.json(entry);
}

const reviewSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireRole("ADMIN", "REVIEWER");
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { id } = await params;
  const result = await reviewEntries({
    entryIds: [id],
    action: parsed.data.action,
    reason: parsed.data.reason,
    reviewerId: session.user.id,
  });
  if (result.updated === 0) {
    return Response.json({ error: "Entry kon niet worden bijgewerkt" }, { status: 409 });
  }
  return Response.json(result);
}
