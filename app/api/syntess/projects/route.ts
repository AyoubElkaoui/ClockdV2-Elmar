import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAtWerkProjects, type SyntessProject } from "@/lib/firebird";

// Demo-projecten als Firebird niet geconfigureerd is
const DEMO_PROJECTS: SyntessProject[] = [
  { gcId: 300, gcCode: "200.25.7006", gcOmschrijving: "Testproject 7006", werkgrpGcId: 200 },
  { gcId: 301, gcCode: "200.25.7007", gcOmschrijving: "Testproject 7007", werkgrpGcId: 200 },
  { gcId: 302, gcCode: "200.25.7008", gcOmschrijving: "Testproject 7008", werkgrpGcId: 200 },
  { gcId: 303, gcCode: "200.25.7009", gcOmschrijving: "Testproject 7009", werkgrpGcId: 200 },
  { gcId: 304, gcCode: "200.25.7010", gcOmschrijving: "Testproject 7010", werkgrpGcId: 200 },
  { gcId: 305, gcCode: "200.25.7011", gcOmschrijving: "Testproject 7011", werkgrpGcId: 200 },
  { gcId: 306, gcCode: "200.25.7012", gcOmschrijving: "Testproject 7012", werkgrpGcId: 200 },
  { gcId: 307, gcCode: "200.25.7013", gcOmschrijving: "Testproject 7013", werkgrpGcId: 201 },
  { gcId: 308, gcCode: "200.25.7014", gcOmschrijving: "Testproject 7014", werkgrpGcId: 201 },
  { gcId: 309, gcCode: "200.25.7015", gcOmschrijving: "Testproject 7015", werkgrpGcId: 201 },
  { gcId: 310, gcCode: "201.26.8001", gcOmschrijving: "Renovatie Hoofdkantoor", werkgrpGcId: 202 },
  { gcId: 311, gcCode: "201.26.8002", gcOmschrijving: "Installatie Schiphol", werkgrpGcId: 202 },
  { gcId: 312, gcCode: "202.27.9001", gcOmschrijving: "Nieuwbouw Tilburg", werkgrpGcId: 203 },
  { gcId: 313, gcCode: "202.27.9002", gcOmschrijving: "Verbouwing Rotterdam", werkgrpGcId: 203 },
  { gcId: 314, gcCode: "203.28.1001", gcOmschrijving: "Onderhoud Zuidas", werkgrpGcId: 204 },
];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isFirebirdConfigured =
    !!process.env.FIREBIRD_HOST &&
    !!process.env.FIREBIRD_DATABASE &&
    !!process.env.FIREBIRD_USER &&
    !!process.env.FIREBIRD_PASSWORD;

  if (!isFirebirdConfigured) {
    return NextResponse.json({ projects: DEMO_PROJECTS, demo: true });
  }

  const projects = await getAtWerkProjects();
  return NextResponse.json({ projects, demo: false });
}
