import { Role } from "@prisma/client";
import { testConnection } from "@/lib/firebird";
import { guardErrorToResponse, requireRole } from "@/lib/guards";

export async function POST() {
  try {
    await requireRole(Role.ADMIN);
  } catch (error) {
    const response = guardErrorToResponse(error);
    if (response) return response;
    throw error;
  }

  const result = await testConnection();
  return Response.json(result);
}
