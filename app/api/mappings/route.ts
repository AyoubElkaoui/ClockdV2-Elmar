import { Role } from "@prisma/client";
import { createMapping, listMappings, mappingInputSchema } from "@/lib/mappings";
import { guardErrorToResponse, requireRole, requireSession } from "@/lib/guards";

export async function GET() {
  try {
    await requireSession();
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }
  return Response.json(await listMappings());
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireRole(Role.ADMIN, Role.REVIEWER);
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = mappingInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }
  try {
    const created = await createMapping(parsed.data, session.user.id);
    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique")) {
      return Response.json({ error: "Mapping bestaat al voor dit Clockwise project" }, { status: 409 });
    }
    throw error;
  }
}
