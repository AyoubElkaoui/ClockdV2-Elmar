import { Role } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClockwiseNotConfiguredError, getClockwiseConfig } from "@/lib/clockwise";
import { requireSession } from "@/lib/guards";
import { listUsers } from "@/lib/users";
import { ClockwiseTab } from "./clockwise-tab";
import { SyntessTab } from "./syntess-tab";
import { UsersTab } from "./users-tab";

export default async function SettingsPage() {
  const session = await requireSession();
  const isAdmin = session.user.role === Role.ADMIN;

  let clockwise:
    | {
        connected: boolean;
        baseUrl: string;
        clientId: string;
        syncInterval: number;
        tokenExpiresAt: Date | null;
        lastSyncAt: Date | null;
      }
    | { error: string };

  try {
    const config = await getClockwiseConfig();
    clockwise = {
      connected: Boolean(config.accessToken && config.tokenExpiry),
      baseUrl: config.baseUrl,
      clientId: config.clientId,
      syncInterval: config.syncInterval,
      tokenExpiresAt: config.tokenExpiry,
      lastSyncAt: config.lastSyncAt,
    };
  } catch (error) {
    clockwise = {
      error:
        error instanceof ClockwiseNotConfiguredError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error),
    };
  }

  const users = isAdmin ? await listUsers() : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Instellingen
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Beheer Clockwise-koppeling, Syntess Atrium en gebruikers.
        </p>
      </div>

      <Tabs defaultValue="clockwise">
        <TabsList className="border-b border-slate-200 bg-transparent p-0 dark:border-slate-700">
          {["clockwise", "syntess", ...(isAdmin ? ["users"] : [])].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:text-slate-400"
            >
              {tab === "clockwise" ? "Clockwise" : tab === "syntess" ? "Syntess Atrium" : "Gebruikers"}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="clockwise" className="mt-5">
          {"error" in clockwise ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              {clockwise.error}
            </div>
          ) : (
            <ClockwiseTab
              connected={clockwise.connected}
              baseUrl={clockwise.baseUrl}
              clientId={clockwise.clientId}
              syncInterval={clockwise.syncInterval}
              tokenExpiresAt={clockwise.tokenExpiresAt}
              lastSyncAt={clockwise.lastSyncAt}
              canManage={isAdmin}
            />
          )}
        </TabsContent>

        <TabsContent value="syntess" className="mt-5">
          <SyntessTab
            host={process.env.FIREBIRD_HOST ?? ""}
            port={process.env.FIREBIRD_PORT ?? "3050"}
            database={process.env.FIREBIRD_DATABASE ?? ""}
            user={process.env.FIREBIRD_USER ?? ""}
            canTest={isAdmin}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="mt-5">
            <UsersTab users={users} currentUserId={session.user.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
