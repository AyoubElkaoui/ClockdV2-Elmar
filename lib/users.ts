import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function listUsers() {
  return prisma.cv2User.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
  role: z.nativeEnum(Role),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export async function createUser(input: CreateUserInput, actorId: string) {
  const hashed = await bcrypt.hash(input.password, 12);
  const user = await prisma.cv2User.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      password: hashed,
      isActive: true,
    },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  await recordAudit({
    userId: actorId,
    action: "USER_CREATED",
    entityType: "Cv2User",
    entityId: user.id,
    newValue: { email: user.email, role: user.role },
  });
  return user;
}

export const updateUserSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(200).optional(),
});

export async function updateUser(id: string, input: z.infer<typeof updateUserSchema>, actorId: string) {
  const before = await prisma.cv2User.findUnique({ where: { id } });
  if (!before) return null;
  const updated = await prisma.cv2User.update({
    where: { id },
    data: input,
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  await recordAudit({
    userId: actorId,
    action: "USER_UPDATED",
    entityType: "Cv2User",
    entityId: id,
    oldValue: { role: before.role, isActive: before.isActive, name: before.name },
    newValue: { ...input },
  });
  return updated;
}
