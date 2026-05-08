"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordBulkAudit, reviewEntries } from "@/lib/entries";
import { requireRole } from "@/lib/guards";

const bulkSchema = z.object({
  entryIds: z.array(z.string()).min(1).max(500),
  action: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(500).optional(),
});

export type BulkReviewState = {
  ok: boolean;
  message: string;
};

export async function bulkReview(
  _prev: BulkReviewState | undefined,
  formData: FormData,
): Promise<BulkReviewState> {
  const session = await requireRole("ADMIN", "REVIEWER");

  const parsed = bulkSchema.safeParse({
    entryIds: formData.getAll("entryIds"),
    action: formData.get("action"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: "Ongeldige invoer." };
  }

  const result = await reviewEntries({
    entryIds: parsed.data.entryIds,
    action: parsed.data.action,
    reason: parsed.data.reason,
    reviewerId: session.user.id,
  });
  await recordBulkAudit({
    userId: session.user.id,
    action: `ENTRY_BULK_${parsed.data.action}`,
    affectedIds: parsed.data.entryIds,
  });

  revalidatePath("/entries");
  revalidatePath("/dashboard");

  const label = parsed.data.action === "APPROVED" ? "goedgekeurd" : "afgewezen";
  return {
    ok: true,
    message: `${result.updated} entries ${label}${result.skipped ? `, ${result.skipped} overgeslagen (al geëxporteerd)` : ""}.`,
  };
}

export async function reviewEntry(formData: FormData) {
  await bulkReview(undefined, formData);
}
