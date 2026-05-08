import { Role } from "@prisma/client";
import { deleteMapping, mappingInputSchema, updateMapping } from "@/lib/mappings";
import { guardErrorToResponse, requireRole } from "@/lib/guards";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(Role.ADMIN, Role.REVIEWER);
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = mappingInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { id } = await params;
  const updated = await updateMapping(id, parsed.data, session.user.id);
  if (!updated) {
    return Response.json({ error: "Mapping niet gevonden" }, { status: 404 });
  }
  return Response.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(Role.ADMIN);
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  const { id } = await params;
  const deleted = await deleteMapping(id, session.user.id);
  if (!deleted) {
    return Response.json({ error: "Mapping niet gevonden" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
