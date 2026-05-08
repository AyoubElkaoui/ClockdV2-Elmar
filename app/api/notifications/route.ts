import { NextResponse } from "next/server";
import { TimeEntryStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [pendingCount, items] = await Promise.all([
    prisma.cv2TimeEntry.count({
      where: { status: TimeEntryStatus.PENDING },
    }),
    prisma.cv2TimeEntry.findMany({
      where: { status: TimeEntryStatus.PENDING },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        employeeName: true,
        projectName: true,
        hours: true,
        date: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    pendingCount,
    items: items.map((i) => ({
      id: i.id,
      employeeName: i.employeeName,
      projectName: i.projectName,
      hours: i.hours,
      date: i.date.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
  });
}
