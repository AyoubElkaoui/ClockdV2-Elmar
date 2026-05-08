import { auth } from "@/auth";
import { logout } from "@/app/actions/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <DashboardShell
      user={{
        name: session?.user?.name,
        email: session?.user?.email,
        role: session?.user?.role,
      }}
      logoutAction={logout}
    >
      {children}
    </DashboardShell>
  );
}
