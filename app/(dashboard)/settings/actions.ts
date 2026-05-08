"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { syncEntries } from "@/lib/clockwise";
import { testConnection as testFirebird } from "@/lib/firebird";
import { prisma } from "@/lib/prisma";
import {
  createUser,
  createUserSchema,
  updateUser,
} from "@/lib/users";

export type SettingsActionState = {
  ok: boolean;
  message: string;
};

export async function runSyncNow(): Promise<SettingsActionState> {
  await requireRole(Role.ADMIN, Role.REVIEWER);
  const result = await syncEntries();
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/entries");
  if (result.status === "FAILED") {
    return { ok: false, message: `Sync mislukt: ${result.errorMessage ?? "onbekende fout"}` };
  }
  return {
    ok: true,
    message: `Sync OK — ${result.created} nieuw, ${result.skipped} overgeslagen, ${result.fetched} totaal.`,
  };
}

export async function testFirebirdConnection(): Promise<SettingsActionState> {
  await requireRole(Role.ADMIN);
  const result = await testFirebird();
  return result.ok
    ? { ok: true, message: "Firebird verbinding OK." }
    : { ok: false, message: `Firebird verbinding mislukt: ${result.error}` };
}

export async function saveClockwiseConfig(
  _prev: SettingsActionState | undefined,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireRole(Role.ADMIN);
  const baseUrl = formData.get("baseUrl");
  const clientId = formData.get("clientId");
  const clientSecret = formData.get("clientSecret");
  const syncInterval = Number(formData.get("syncInterval") ?? "15");

  if (typeof baseUrl !== "string" || typeof clientId !== "string" || typeof clientSecret !== "string") {
    return { ok: false, message: "Ongeldige invoer." };
  }

  const existing = await prisma.cv2ClockwiseConfig.findFirst();
  const data = {
    baseUrl,
    clientId,
    clientSecret: clientSecret || existing?.clientSecret || "",
    syncInterval: Number.isFinite(syncInterval) ? syncInterval : 15,
  };

  if (existing) {
    await prisma.cv2ClockwiseConfig.update({ where: { id: existing.id }, data });
  } else {
    await prisma.cv2ClockwiseConfig.create({ data });
  }
  revalidatePath("/settings");
  return { ok: true, message: "Clockwise config opgeslagen." };
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const session = await requireRole(Role.ADMIN);
  await updateUser(userId, { isActive }, session.user.id);
  revalidatePath("/settings");
}

export async function changeUserRole(userId: string, role: Role) {
  const session = await requireRole(Role.ADMIN);
  await updateUser(userId, { role }, session.user.id);
  revalidatePath("/settings");
}

export async function addUser(
  _prev: SettingsActionState | undefined,
  formData: FormData,
): Promise<SettingsActionState> {
  const session = await requireRole(Role.ADMIN);
  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first ? `${first.path.join(".")}: ${first.message}` : "Ongeldige invoer." };
  }
  try {
    await createUser(parsed.data, session.user.id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, message: "Dit e-mailadres bestaat al." };
    }
    throw error;
  }
  revalidatePath("/settings");
  return { ok: true, message: "Gebruiker aangemaakt." };
}
