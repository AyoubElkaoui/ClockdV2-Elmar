"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
});

const passwordSchema = z
  .object({
    current: z.string().min(1, "Huidig wachtwoord is verplicht"),
    next: z.string().min(8, "Nieuw wachtwoord moet minstens 8 tekens zijn").max(200),
    confirm: z.string().min(1, "Bevestig je nieuwe wachtwoord"),
  })
  .refine((v) => v.next === v.confirm, {
    message: "Nieuwe wachtwoorden komen niet overeen",
    path: ["confirm"],
  });

export type AccountFormState = {
  ok?: string;
  error?: string;
};

export async function updateProfile(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await requireSession();
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  await prisma.cv2User.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });
  await recordAudit({
    userId: session.user.id,
    action: "PROFILE_UPDATED",
    entityType: "Cv2User",
    entityId: session.user.id,
    newValue: { name: parsed.data.name },
  });
  revalidatePath("/account");
  return { ok: "Profiel bijgewerkt." };
}

export async function changePassword(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await requireSession();
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const user = await prisma.cv2User.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  if (!user) return { error: "Gebruiker niet gevonden" };

  const matches = await bcrypt.compare(parsed.data.current, user.password);
  if (!matches) return { error: "Huidig wachtwoord klopt niet" };

  const hashed = await bcrypt.hash(parsed.data.next, 12);
  await prisma.cv2User.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });
  await recordAudit({
    userId: session.user.id,
    action: "PASSWORD_CHANGED",
    entityType: "Cv2User",
    entityId: session.user.id,
  });
  return { ok: "Wachtwoord gewijzigd." };
}
