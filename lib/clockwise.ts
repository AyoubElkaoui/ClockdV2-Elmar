import { SyncStatus, TimeEntryStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAtWerkProjects } from "@/lib/firebird";

const REFRESH_LEEWAY_SECONDS = 60;
const SYNC_OVERLAP_DAYS = 1;
const SYNC_DEFAULT_LOOKBACK_DAYS = 7;
const SYNC_FUTURE_WINDOW_DAYS = 1;

// TODO: confirm authorize + token URLs with Clockwise documentation.
// Defaults assume standard `/oauth/authorize` and `/oauth/token` on the same host.
const DEFAULT_AUTHORIZE_URL = "https://elmarservices.clockwise.info/oauth/authorize";
const DEFAULT_TOKEN_URL = "https://elmarservices.clockwise.info/oauth/token";

export type ClockwiseRuntimeConfig = {
  id: string;
  baseUrl: string;
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  lastSyncAt: Date | null;
  syncInterval: number;
  isActive: boolean;
};

export class ClockwiseNotConfiguredError extends Error {
  constructor(message = "Clockwise is nog niet geconfigureerd.") {
    super(message);
    this.name = "ClockwiseNotConfiguredError";
  }
}

export class ClockwiseTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClockwiseTokenError";
  }
}

async function loadDbConfig() {
  return prisma.cv2ClockwiseConfig.findFirst({
    orderBy: { createdAt: "asc" },
  });
}

export async function getClockwiseConfig(): Promise<ClockwiseRuntimeConfig> {
  const dbConfig = await loadDbConfig();

  const clientId = process.env.CLOCKWISE_CLIENT_ID || dbConfig?.clientId || "";
  const clientSecret = process.env.CLOCKWISE_CLIENT_SECRET || dbConfig?.clientSecret || "";
  const baseUrl =
    process.env.CLOCKWISE_BASE_URL ||
    dbConfig?.baseUrl ||
    "https://elmarservices.clockwise.info/api/v2";
  const redirectUri = process.env.CLOCKWISE_REDIRECT_URI || "";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new ClockwiseNotConfiguredError(
      "Ontbrekende Clockwise credentials (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI).",
    );
  }

  if (!dbConfig) {
    throw new ClockwiseNotConfiguredError(
      "Geen Cv2ClockwiseConfig rij gevonden — draai `npm run db:seed`.",
    );
  }

  return {
    id: dbConfig.id,
    baseUrl,
    authorizeUrl: process.env.CLOCKWISE_AUTHORIZE_URL || DEFAULT_AUTHORIZE_URL,
    tokenUrl: process.env.CLOCKWISE_TOKEN_URL || DEFAULT_TOKEN_URL,
    clientId,
    clientSecret,
    redirectUri,
    accessToken: dbConfig.accessToken,
    refreshToken: dbConfig.refreshToken,
    tokenExpiry: dbConfig.tokenExpiry,
    lastSyncAt: dbConfig.lastSyncAt,
    syncInterval: dbConfig.syncInterval,
    isActive: dbConfig.isActive,
  };
}

export function buildAuthorizeUrl(config: ClockwiseRuntimeConfig, state: string): string {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  // TODO: add `scope` if Clockwise requires specific scopes.
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
};

async function postToTokenEndpoint(
  config: ClockwiseRuntimeConfig,
  body: Record<string, string>,
): Promise<TokenResponse> {
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      ...body,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }).toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ClockwiseTokenError(
      `Token endpoint faalde: ${response.status} ${response.statusText} — ${text}`,
    );
  }

  return (await response.json()) as TokenResponse;
}

export async function exchangeCodeForTokens(
  config: ClockwiseRuntimeConfig,
  code: string,
): Promise<void> {
  const tokens = await postToTokenEndpoint(config, {
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });
  await saveTokens(config.id, tokens);
}

export async function refreshAccessToken(
  config: ClockwiseRuntimeConfig,
): Promise<ClockwiseRuntimeConfig> {
  if (!config.refreshToken) {
    throw new ClockwiseTokenError("Geen refresh token beschikbaar — opnieuw autoriseren vereist.");
  }
  const tokens = await postToTokenEndpoint(config, {
    grant_type: "refresh_token",
    refresh_token: config.refreshToken,
  });
  await saveTokens(config.id, tokens, config.refreshToken);
  return getClockwiseConfig();
}

async function saveTokens(
  configId: string,
  tokens: TokenResponse,
  previousRefreshToken?: string,
): Promise<void> {
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);
  await prisma.cv2ClockwiseConfig.update({
    where: { id: configId },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? previousRefreshToken ?? null,
      tokenExpiry: expiry,
      isActive: true,
    },
  });
}

export async function getValidAccessToken(): Promise<string> {
  let config = await getClockwiseConfig();

  if (!config.accessToken || !config.tokenExpiry) {
    throw new ClockwiseTokenError(
      "Nog geen access token — doorloop eerst de OAuth flow via /api/clockwise/auth.",
    );
  }

  const expiresInMs = config.tokenExpiry.getTime() - Date.now();
  if (expiresInMs <= REFRESH_LEEWAY_SECONDS * 1000) {
    config = await refreshAccessToken(config);
  }

  if (!config.accessToken) {
    throw new ClockwiseTokenError("Access token niet beschikbaar na refresh.");
  }
  return config.accessToken;
}

// TODO: confirm Clockwise response field names (id, employee_id, project_id, hours, date).
// Current schema tolerates snake_case + camelCase variants.
const clockwiseEntrySchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    employeeId: z.union([z.string(), z.number()]).transform(String).optional(),
    employee_id: z.union([z.string(), z.number()]).transform(String).optional(),
    employeeName: z.string().optional(),
    employee_name: z.string().optional(),
    projectId: z.union([z.string(), z.number()]).transform(String).optional().nullable(),
    project_id: z.union([z.string(), z.number()]).transform(String).optional().nullable(),
    projectName: z.string().optional().nullable(),
    project_name: z.string().optional().nullable(),
    hours: z.number().optional(),
    duration_minutes: z.number().optional(),
    durationMinutes: z.number().optional(),
    date: z.string(),
    description: z.string().optional().nullable(),
  })
  .transform((raw) => {
    const hours =
      raw.hours ??
      (raw.durationMinutes !== undefined ? raw.durationMinutes / 60 : undefined) ??
      (raw.duration_minutes !== undefined ? raw.duration_minutes / 60 : undefined);
    return {
      clockwiseEntryId: raw.id,
      employeeId: raw.employeeId ?? raw.employee_id ?? "",
      employeeName: raw.employeeName ?? raw.employee_name ?? "",
      projectId: raw.projectId ?? raw.project_id ?? null,
      projectName: raw.projectName ?? raw.project_name ?? null,
      hours: hours ?? 0,
      date: new Date(raw.date),
      description: raw.description ?? null,
    };
  });

export type NormalizedClockwiseEntry = z.infer<typeof clockwiseEntrySchema>;

function extractEntriesArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["data", "items", "entries", "results"]) {
      const value = obj[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}

export async function fetchApprovedEntries(
  from: Date,
  to: Date,
): Promise<NormalizedClockwiseEntry[]> {
  const token = await getValidAccessToken();
  const config = await getClockwiseConfig();

  const url = new URL(`${config.baseUrl.replace(/\/$/, "")}/time-registrations`);
  url.searchParams.set("status", "approved");
  url.searchParams.set("from", from.toISOString().slice(0, 10));
  url.searchParams.set("to", to.toISOString().slice(0, 10));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Clockwise API faalde: ${response.status} ${response.statusText} — ${text}`,
    );
  }

  const payload = await response.json();
  const rawEntries = extractEntriesArray(payload);

  const entries: NormalizedClockwiseEntry[] = [];
  for (const raw of rawEntries) {
    const parsed = clockwiseEntrySchema.safeParse(raw);
    if (parsed.success) {
      entries.push(parsed.data);
    } else {
      console.warn("Clockwise entry faalde op validatie", parsed.error.issues);
    }
  }
  return entries;
}

export type SyncResult = {
  syncLogId: string;
  fetched: number;
  created: number;
  skipped: number;
  status: SyncStatus;
  errorMessage?: string;
};

export async function syncEntries(): Promise<SyncResult> {
  const syncLog = await prisma.cv2SyncLog.create({
    data: { status: SyncStatus.RUNNING },
  });

  try {
    const config = await getClockwiseConfig();

    const now = new Date();
    const to = new Date(now.getTime() + SYNC_FUTURE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const defaultFrom = new Date(
      now.getTime() - SYNC_DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );
    const from = config.lastSyncAt
      ? new Date(config.lastSyncAt.getTime() - SYNC_OVERLAP_DAYS * 24 * 60 * 60 * 1000)
      : defaultFrom;

    const entries = await fetchApprovedEntries(from, to);

    // Auto-mapping: laad AT_WERK projecten en bestaande mappings
    const [atWerkProjects, existingMappings] = await Promise.all([
      getAtWerkProjects().catch(() => []),
      prisma.cv2ProjectMapping.findMany({ where: { isActive: true } }),
    ]);

    const mappingByClockwiseId = new Map(
      existingMappings.map((m) => [m.clockwiseProjectId, m]),
    );
    const atWerkByName = new Map(
      atWerkProjects.map((p) => [
        p.gcOmschrijving.trim().toLowerCase(),
        p,
      ]),
    );

    let created = 0;
    let skipped = 0;

    for (const entry of entries) {
      // Auto-mapping op projectnaam als er nog geen mapping is
      if (
        entry.projectId &&
        entry.projectName &&
        !mappingByClockwiseId.has(entry.projectId)
      ) {
        const normalizedName = entry.projectName.trim().toLowerCase();
        const atWerk = atWerkByName.get(normalizedName);
        if (atWerk) {
          try {
            const newMapping = await prisma.cv2ProjectMapping.upsert({
              where: { clockwiseProjectId: entry.projectId },
              create: {
                clockwiseProjectId: entry.projectId,
                clockwiseProjectName: entry.projectName,
                syntessProjectCode: atWerk.gcCode,
                syntessProjectName: atWerk.gcOmschrijving,
                syntessWorkGcId: atWerk.gcId,
                isActive: true,
              },
              update: {},
            });
            mappingByClockwiseId.set(entry.projectId, newMapping);
          } catch {
            // mapping bestaat al (race condition) — negeer
          }
        }
      }

      const result = await prisma.cv2TimeEntry.upsert({
        where: { clockwiseEntryId: entry.clockwiseEntryId },
        create: {
          clockwiseEntryId: entry.clockwiseEntryId,
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          projectId: entry.projectId,
          projectName: entry.projectName,
          hours: entry.hours,
          date: entry.date,
          description: entry.description,
          status: TimeEntryStatus.PENDING,
        },
        update: {
          employeeName: entry.employeeName,
          projectName: entry.projectName,
        },
        select: { id: true, createdAt: true, updatedAt: true },
      });
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created += 1;
      } else {
        skipped += 1;
      }
    }

    await prisma.cv2ClockwiseConfig.update({
      where: { id: config.id },
      data: { lastSyncAt: now },
    });

    const completed = await prisma.cv2SyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.COMPLETED,
        completedAt: new Date(),
        entriesFetched: entries.length,
        entriesCreated: created,
        entriesSkipped: skipped,
      },
    });

    return {
      syncLogId: completed.id,
      fetched: completed.entriesFetched,
      created: completed.entriesCreated,
      skipped: completed.entriesSkipped,
      status: completed.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.cv2SyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.FAILED,
        completedAt: new Date(),
        errorMessage: message,
      },
    });
    return {
      syncLogId: syncLog.id,
      fetched: 0,
      created: 0,
      skipped: 0,
      status: SyncStatus.FAILED,
      errorMessage: message,
    };
  }
}
