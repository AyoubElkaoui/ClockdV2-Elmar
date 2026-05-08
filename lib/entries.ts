import { Prisma, TimeEntryStatus } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export type EntryFilters = {
  status?: TimeEntryStatus;
  employeeId?: string;
  from?: Date;
  to?: Date;
  search?: string;
};

export type EntryListOptions = EntryFilters & {
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 50;

function buildWhere(filters: EntryFilters): Prisma.Cv2TimeEntryWhereInput {
  const where: Prisma.Cv2TimeEntryWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = filters.from;
    if (filters.to) where.date.lte = filters.to;
  }
  if (filters.search) {
    where.OR = [
      { employeeName: { contains: filters.search, mode: "insensitive" } },
      { projectName: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listEntries(options: EntryListOptions) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));
  const where = buildWhere(options);

  const [total, rows] = await Promise.all([
    prisma.cv2TimeEntry.count({ where }),
    prisma.cv2TimeEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getEntry(id: string) {
  return prisma.cv2TimeEntry.findUnique({
    where: { id },
    include: {
      reviewActions: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

export type ReviewAction = typeof TimeEntryStatus.APPROVED | typeof TimeEntryStatus.REJECTED;

export async function getDistinctEmployees() {
  const rows = await prisma.cv2TimeEntry.findMany({
    distinct: ["employeeId"],
    select: { employeeId: true, employeeName: true },
    orderBy: { employeeName: "asc" },
  });
  return rows;
}

export async function reviewEntries(input: {
  entryIds: string[];
  action: ReviewAction;
  reason?: string;
  reviewerId: string;
}) {
  const { entryIds, action, reason, reviewerId } = input;
  if (entryIds.length === 0) return { updated: 0, skipped: 0 };

  const entries = await prisma.cv2TimeEntry.findMany({
    where: {
      id: { in: entryIds },
      status: { in: [TimeEntryStatus.PENDING, TimeEntryStatus.REJECTED, TimeEntryStatus.APPROVED] },
    },
    select: { id: true, status: true },
  });

  let updated = 0;
  for (const entry of entries) {
    if (entry.status === TimeEntryStatus.EXPORTED) continue;
    await prisma.$transaction([
      prisma.cv2TimeEntry.update({
        where: { id: entry.id },
        data: { status: action, errorMessage: null },
      }),
      prisma.cv2ReviewAction.create({
        data: {
          entryId: entry.id,
          userId: reviewerId,
          action,
          reason: reason ?? null,
        },
      }),
      prisma.cv2AuditLog.create({
        data: {
          userId: reviewerId,
          action: `ENTRY_${action}`,
          entityType: "Cv2TimeEntry",
          entityId: entry.id,
          oldValue: { status: entry.status },
          newValue: { status: action, reason: reason ?? null },
        },
      }),
    ]);
    updated += 1;
  }

  return { updated, skipped: entryIds.length - updated };
}

export async function recordBulkAudit(input: {
  userId: string;
  action: string;
  affectedIds: string[];
}) {
  await recordAudit({
    userId: input.userId,
    action: input.action,
    entityType: "Cv2TimeEntry",
    newValue: { affectedIds: input.affectedIds, count: input.affectedIds.length },
  });
}
