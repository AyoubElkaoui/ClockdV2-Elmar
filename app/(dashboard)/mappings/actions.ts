"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import {
  createMapping,
  deleteMapping,
  mappingInputSchema,
  updateMapping,
} from "@/lib/mappings";

export type MappingFormState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

function parseFromForm(formData: FormData) {
  const rawGcId = formData.get("syntessWorkGcId");
  return mappingInputSchema.safeParse({
    clockwiseProjectId: formData.get("clockwiseProjectId"),
    clockwiseProjectName: formData.get("clockwiseProjectName"),
    syntessProjectCode: formData.get("syntessProjectCode"),
    syntessProjectName: formData.get("syntessProjectName") || null,
    syntessWorkGcId: rawGcId ? Number(rawGcId) : null,
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

export async function saveMapping(
  _prev: MappingFormState | undefined,
  formData: FormData,
): Promise<MappingFormState> {
  const session = await requireRole(Role.ADMIN, Role.REVIEWER);
  const id = formData.get("id") as string | null;

  const parsed = parseFromForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { ok: false, message: "Controleer de invoer.", fieldErrors };
  }

  try {
    if (id) {
      await updateMapping(id, parsed.data, session.user.id);
    } else {
      await createMapping(parsed.data, session.user.id);
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, message: "Er bestaat al een mapping voor dit Clockwise project." };
    }
    throw error;
  }

  revalidatePath("/mappings");
  revalidatePath("/dashboard");
  return { ok: true, message: id ? "Mapping bijgewerkt." : "Mapping toegevoegd." };
}

export async function removeMapping(id: string) {
  const session = await requireRole(Role.ADMIN);
  await deleteMapping(id, session.user.id);
  revalidatePath("/mappings");
  revalidatePath("/dashboard");
}

export async function toggleMapping(id: string, isActive: boolean) {
  const session = await requireRole(Role.ADMIN, Role.REVIEWER);
  await updateMapping(id, { isActive }, session.user.id);
  revalidatePath("/mappings");
  revalidatePath("/dashboard");
}
