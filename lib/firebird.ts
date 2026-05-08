import Firebird from "node-firebird";
import { TimeEntryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import {
  DOCUMENT_TABLE,
  MEDEW_TABLE,
  URENBREG_COLUMNS,
  URENBREG_TABLE,
  WERK_TABLE,
  assertSchemaConfigured,
} from "@/lib/firebird-schema";

export class FirebirdConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebirdConfigError";
  }
}

export class FirebirdConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebirdConnectionError";
  }
}

function readConnectionOptions(): Firebird.Options {
  const host = process.env.FIREBIRD_HOST;
  const database = process.env.FIREBIRD_DATABASE;
  const user = process.env.FIREBIRD_USER;
  const password = process.env.FIREBIRD_PASSWORD;
  if (!host || !database || !user || !password) {
    throw new FirebirdConfigError(
      "Firebird credentials ontbreken (FIREBIRD_HOST, FIREBIRD_DATABASE, FIREBIRD_USER, FIREBIRD_PASSWORD).",
    );
  }
  return {
    host,
    port: Number(process.env.FIREBIRD_PORT ?? "3050"),
    database,
    user,
    password,
    lowercase_keys: false,
    encoding: "UTF8",
  };
}

function attach(options: Firebird.Options): Promise<Firebird.Database> {
  return new Promise((resolve, reject) => {
    Firebird.attach(options, (err, db) => {
      if (err) reject(new FirebirdConnectionError(err.message));
      else resolve(db);
    });
  });
}

function query(db: Firebird.Database, sql: string, params: unknown[] = []): Promise<unknown> {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function detach(db: Firebird.Database): Promise<void> {
  return new Promise((resolve) => {
    db.detach(() => resolve());
  });
}

export async function getFirebirdConnection(): Promise<Firebird.Database> {
  return attach(readConnectionOptions());
}

export type SyntessProject = {
  gcId: number;
  gcCode: string;
  gcOmschrijving: string;
  werkgrpGcId: number | null;
};

export async function getAtWerkProjects(): Promise<SyntessProject[]> {
  try {
    const db = await getFirebirdConnection();
    try {
      const rows = await query(
        db,
        `SELECT GC_ID, WERKGRP_GC_ID, GC_CODE, GC_OMSCHRIJVING FROM ${WERK_TABLE} ORDER BY GC_CODE`,
        [],
      );
      return (rows as any[]).map((r) => ({
        gcId: r.GC_ID,
        gcCode: r.GC_CODE?.trim() ?? "",
        gcOmschrijving: r.GC_OMSCHRIJVING?.trim() ?? "",
        werkgrpGcId: r.WERKGRP_GC_ID ?? null,
      }));
    } finally {
      await detach(db);
    }
  } catch {
    return [];
  }
}

export async function testConnection(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const db = await getFirebirdConnection();
    try {
      await query(db, "SELECT 1 FROM RDB$DATABASE", []);
      return { ok: true };
    } finally {
      await detach(db);
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

type ExportPlan = {
  db: Firebird.Database;
  sql: string;
  params: unknown[];
};

function buildInsertPlan(
  entry: {
    date: Date;
    hours: number;
    employeeId: string;
    description: string | null;
  },
  syntessWorkGcId: number,
  nextGcId: number,
  documentGcId: number,
  db: Firebird.Database,
): ExportPlan {
  assertSchemaConfigured();
  // AT_URENBREG: GC_ID (PK), DOCUMENT_GC_ID, TAAK_GC_ID, WERK_GC_ID, AANTAL, DATUM, GC_OMSCHRIJVING
  // TAAK_GC_ID 100256 = Montage (standaard taak voor Clockwise-registraties)
  const DEFAULT_TAAK_GC_ID = 100256;
  const sql = `
    INSERT INTO ${URENBREG_TABLE} (
      ${URENBREG_COLUMNS.ID},
      ${URENBREG_COLUMNS.DOCUMENT},
      ${URENBREG_COLUMNS.TAAK},
      ${URENBREG_COLUMNS.WERK},
      ${URENBREG_COLUMNS.AANTAL},
      ${URENBREG_COLUMNS.DATUM},
      ${URENBREG_COLUMNS.OMSCHRIJVING}
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params: unknown[] = [
    nextGcId,
    documentGcId,
    DEFAULT_TAAK_GC_ID,
    syntessWorkGcId,
    entry.hours,
    entry.date,
    entry.description ?? "",
  ];
  return { db, sql, params };
}

export async function exportTimeEntry(entryId: string): Promise<void> {
  const entry = await prisma.cv2TimeEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new Error(`Entry ${entryId} niet gevonden`);
  if (entry.status !== TimeEntryStatus.APPROVED && entry.status !== TimeEntryStatus.EXPORT_FAILED) {
    throw new Error(`Entry ${entryId} heeft status ${entry.status}, alleen APPROVED/EXPORT_FAILED kan geëxporteerd worden.`);
  }
  if (!entry.projectId) {
    throw new Error(`Entry ${entryId} heeft geen Clockwise project — kan niet mappen.`);
  }

  const mapping = await prisma.cv2ProjectMapping.findUnique({
    where: { clockwiseProjectId: entry.projectId },
  });
  if (!mapping || !mapping.isActive) {
    throw new Error(
      `Geen actieve mapping voor Clockwise project ${entry.projectId} (${entry.projectName ?? "?"}).`,
    );
  }

  if (!mapping.syntessWorkGcId) {
    throw new Error(
      `Mapping voor project ${entry.projectId} heeft geen Syntess WERK GC_ID — pas de mapping aan.`,
    );
  }

  const db = await getFirebirdConnection();
  try {
    // Haal de medewerker op via GC_CODE (Clockwise employeeId = AT_MEDEW.GC_CODE)
    const medewRows = await query(
      db,
      `SELECT GC_ID FROM ${MEDEW_TABLE} WHERE GC_CODE = ? AND ACTIEF_JN = 'J'`,
      [entry.employeeId],
    ) as any[];
    if (!medewRows?.length) {
      throw new Error(
        `Medewerker met Clockwise ID '${entry.employeeId}' niet gevonden in AT_MEDEW.`,
      );
    }
    const medewGcId: number = medewRows[0].GC_ID;

    // Zoek of maak een document voor deze medewerker + datum
    const docCode = `DOC_${medewGcId}_${entry.date.getFullYear()}_CW`;
    const existingDoc = await query(
      db,
      `SELECT GC_ID FROM ${DOCUMENT_TABLE} WHERE GC_CODE = ?`,
      [docCode],
    ) as any[];

    let documentGcId: number;
    if (existingDoc?.length) {
      documentGcId = existingDoc[0].GC_ID;
    } else {
      const maxDocRow = await query(
        db,
        `SELECT MAX(GC_ID) AS MAX_ID FROM ${DOCUMENT_TABLE}`,
        [],
      ) as any[];
      documentGcId = (maxDocRow?.[0]?.MAX_ID ?? 400000) + 1;
      await query(
        db,
        `INSERT INTO ${DOCUMENT_TABLE} (GC_ID, ADMINIS_GC_ID, EIG_MEDEW_GC_ID, GC_CODE, GC_BOEKDATUM) VALUES (?, 1, ?, ?, ?)`,
        [documentGcId, medewGcId, docCode, entry.date],
      );
    }

    // Bepaal next GC_ID voor AT_URENBREG
    const maxRow = await query(
      db,
      `SELECT MAX(GC_ID) AS MAX_ID FROM ${URENBREG_TABLE}`,
      [],
    ) as any[];
    const nextGcId = (maxRow?.[0]?.MAX_ID ?? 600000) + 1;

    const plan = buildInsertPlan(entry, mapping.syntessWorkGcId, nextGcId, documentGcId, db);
    await query(db, plan.sql, plan.params);
    await prisma.cv2TimeEntry.update({
      where: { id: entry.id },
      data: {
        status: TimeEntryStatus.EXPORTED,
        exportedAt: new Date(),
        errorMessage: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.cv2TimeEntry.update({
      where: { id: entry.id },
      data: {
        status: TimeEntryStatus.EXPORT_FAILED,
        errorMessage: message,
      },
    });
    throw error;
  } finally {
    await detach(db);
  }
}

export type ExportResult = {
  attempted: number;
  exported: number;
  failed: number;
  errors: { entryId: string; message: string }[];
};

export async function exportApprovedEntries(input: { userId: string }): Promise<ExportResult> {
  const approved = await prisma.cv2TimeEntry.findMany({
    where: { status: TimeEntryStatus.APPROVED },
    select: { id: true },
  });

  const result: ExportResult = {
    attempted: approved.length,
    exported: 0,
    failed: 0,
    errors: [],
  };

  for (const entry of approved) {
    try {
      await exportTimeEntry(entry.id);
      result.exported += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({
        entryId: entry.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await recordAudit({
    userId: input.userId,
    action: "EXPORT_BATCH",
    entityType: "Cv2TimeEntry",
    newValue: {
      attempted: result.attempted,
      exported: result.exported,
      failed: result.failed,
    },
  });

  return result;
}
