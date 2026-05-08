import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const mappingInputSchema = z.object({
  clockwiseProjectId: z.string().min(1).max(200),
  clockwiseProjectName: z.string().min(1).max(300),
  syntessProjectCode: z.string().min(1).max(100),
  syntessProjectName: z.string().max(300).optional().nullable(),
  syntessWorkGcId: z.coerce.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type MappingInput = z.infer<typeof mappingInputSchema>;

export async function listMappings() {
  return prisma.cv2ProjectMapping.findMany({
    orderBy: [{ isActive: "desc" }, { clockwiseProjectName: "asc" }],
  });
}

export async function listUnmappedClockwiseProjects() {
  const [entries, mappings] = await Promise.all([
    prisma.cv2TimeEntry.findMany({
      where: { projectId: { not: null } },
      distinct: ["projectId"],
      select: { projectId: true, projectName: true },
    }),
    prisma.cv2ProjectMapping.findMany({
      where: { isActive: true },
      select: { clockwiseProjectId: true },
    }),
  ]);
  const mappedIds = new Set(mappings.map((m) => m.clockwiseProjectId));
  return entries.filter((e) => e.projectId && !mappedIds.has(e.projectId));
}

export async function createMapping(input: MappingInput, userId: string) {
  const created = await prisma.cv2ProjectMapping.create({ data: input });
  await recordAudit({
    userId,
    action: "MAPPING_CREATED",
    entityType: "Cv2ProjectMapping",
    entityId: created.id,
    newValue: { ...input },
  });
  return created;
}

export async function updateMapping(id: string, input: Partial<MappingInput>, userId: string) {
  const before = await prisma.cv2ProjectMapping.findUnique({ where: { id } });
  if (!before) return null;
  const updated = await prisma.cv2ProjectMapping.update({ where: { id }, data: input });
  await recordAudit({
    userId,
    action: "MAPPING_UPDATED",
    entityType: "Cv2ProjectMapping",
    entityId: id,
    oldValue: {
      clockwiseProjectId: before.clockwiseProjectId,
      clockwiseProjectName: before.clockwiseProjectName,
      syntessProjectCode: before.syntessProjectCode,
      syntessProjectName: before.syntessProjectName,
      isActive: before.isActive,
    },
    newValue: { ...input },
  });
  return updated;
}

export async function deleteMapping(id: string, userId: string) {
  const before = await prisma.cv2ProjectMapping.findUnique({ where: { id } });
  if (!before) return false;
  await prisma.cv2ProjectMapping.delete({ where: { id } });
  await recordAudit({
    userId,
    action: "MAPPING_DELETED",
    entityType: "Cv2ProjectMapping",
    entityId: id,
    oldValue: {
      clockwiseProjectId: before.clockwiseProjectId,
      syntessProjectCode: before.syntessProjectCode,
    },
  });
  return true;
}
