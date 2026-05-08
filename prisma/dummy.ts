import { PrismaClient, SyncStatus, TimeEntryStatus } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PREFIX = "DEMO-";

const EMPLOYEES = [
  { id: "emp-001", name: "Jeroen van Dijk" },
  { id: "emp-002", name: "Sanne de Vries" },
  { id: "emp-003", name: "Mark Janssen" },
  { id: "emp-004", name: "Lotte Bakker" },
  { id: "emp-005", name: "Ahmed El Idrissi" },
  { id: "emp-006", name: "Femke Visser" },
  { id: "emp-007", name: "Bram Hendriks" },
  { id: "emp-008", name: "Yasmin Ait Hamou" },
  { id: "emp-009", name: "Ruben de Boer" },
  { id: "emp-010", name: "Eva Smit" },
];

const PROJECTS = [
  {
    id: "proj-101",
    name: "Renovatie kantoorpand Utrecht",
    syntessCode: "200.25.7006",
    syntessWorkGcId: 300,
    syntessName: "Testproject 7006",
  },
  {
    id: "proj-102",
    name: "Onderhoud Schiphol Terminal 2",
    syntessCode: "201.26.8002",
    syntessWorkGcId: 311,
    syntessName: "Installatie Schiphol",
  },
  {
    id: "proj-103",
    name: "Nieuwbouw Distributiecentrum Tilburg",
    syntessCode: "202.27.9001",
    syntessWorkGcId: 312,
    syntessName: "Nieuwbouw Tilburg",
  },
  {
    id: "proj-104",
    name: "Renovatie woontoren Zuidas",
    syntessCode: "203.28.1001",
    syntessWorkGcId: 314,
    syntessName: "Onderhoud Zuidas",
  },
  // unmapped — geen koppeling in Syntess
  { id: "proj-105", name: "Spoedklus Den Haag", syntessCode: null, syntessWorkGcId: null, syntessName: null },
  { id: "proj-106", name: "Klein onderhoud Amersfoort", syntessCode: null, syntessWorkGcId: null, syntessName: null },
];

const DESCRIPTIONS = [
  "Bekabeling aangelegd op verdieping 2",
  "Storingsdienst opgeroepen voor gerepareerde meterkast",
  "Verlichting vervangen in centrale hal",
  "Kabeltracé getekend en doorgemeten",
  "Installatie van nieuwe schakelkast",
  "Inmeten en montage groepenkast",
  "Servicebeurt klimaatregeling",
  "Reparatie aan netvoeding na storing",
  "Voorbereiding bouwlocatie en materiaal opgehaald",
  "Werkoverleg met opdrachtgever en planning besproken",
  "Demontage oude installatie",
  "Eindcontrole en oplevering werkpakket",
];

const LOCATIONS = [
  "Kantoorpand Utrecht — verdieping 2",
  "Schiphol Terminal 2 — gate D17",
  "Distributiecentrum Tilburg — bouwplaats Z",
  "Woontoren Zuidas — etage 14",
  "Centrum Den Haag — Lange Voorhout 23",
  "Bedrijfsterrein Amersfoort — hal 4",
];

const MATERIALS = [
  "100m YMVK 5x6mm², 2x groepenkast 12-groeps",
  "Aardlekschakelaar 30mA, krimpkousen, kabelschoenen",
  "LED-armaturen 4× T5, montagerail 3m",
  "Stroomtang, megger, isolatietester",
  "Schakelmateriaal Niko, wandcontactdozen 6×",
  "Pijp/dozen RVS, beugels, isolatieband",
  "Geen extra materiaal — gebruikt voorraad bus",
];

const EXPENSE_DESCRIPTIONS = [
  "Parkeerkosten + lunch",
  "Kleine materialen aangeschaft bij Technische Unie",
  "Tolwegen en parkeren in centrum",
  "Overuren-vergoeding inbegrepen",
  "Lunch met opdrachtgever",
];

const REJECT_REASONS = [
  "Verkeerd project geselecteerd, graag corrigeren in Clockwise.",
  "Te veel uren voor deze taak — controleer aub.",
  "Omschrijving ontbreekt of is onduidelijk.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomHours() {
  const candidates = [1, 1.5, 2, 2.5, 3, 4, 4.5, 6, 7.5, 8, 8, 8];
  return pick(candidates);
}

function randomStartHour() {
  return pick([7, 7, 8, 8, 8, 9, 9, 13]);
}

function buildTimes(date: Date, hours: number) {
  const start = new Date(date);
  const startHour = randomStartHour();
  start.setHours(startHour, pick([0, 15, 30, 45]), 0, 0);
  const breakMinutes = hours >= 6 ? 30 : 0;
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000 + breakMinutes * 60 * 1000);
  return { start, end, breakMinutes };
}

function daysAgo(n: number, hour = 8) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

async function clearDemoData() {
  console.log("Verwijderen van bestaande DEMO data...");
  const demoEntries = await prisma.cv2TimeEntry.findMany({
    where: { clockwiseEntryId: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  const ids = demoEntries.map((e) => e.id);
  if (ids.length) {
    await prisma.cv2ReviewAction.deleteMany({
      where: { entryId: { in: ids } },
    });
    await prisma.cv2TimeEntry.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.cv2ProjectMapping.deleteMany({
    where: { clockwiseProjectId: { startsWith: "proj-" } },
  });
  await prisma.cv2SyncLog.deleteMany({
    where: { errorMessage: { startsWith: "[DEMO]" } },
  });
}

async function seedMappings() {
  console.log("Aanmaken project-mappings...");
  for (const p of PROJECTS) {
    if (!p.syntessCode) continue;
    await prisma.cv2ProjectMapping.create({
      data: {
        clockwiseProjectId: p.id,
        clockwiseProjectName: p.name,
        syntessProjectCode: p.syntessCode,
        syntessProjectName: p.syntessName,
        syntessWorkGcId: p.syntessWorkGcId,
        isActive: true,
      },
    });
  }
}

async function seedSyncLogs() {
  console.log("Aanmaken sync-logs...");
  // 4 succesvolle, 1 mislukt, 1 lopende
  const logs = [
    {
      startedAt: daysAgo(7, 8),
      completedAt: daysAgo(7, 8),
      status: SyncStatus.COMPLETED,
      entriesFetched: 22,
      entriesCreated: 18,
      entriesSkipped: 4,
      errorMessage: null,
    },
    {
      startedAt: daysAgo(5, 8),
      completedAt: daysAgo(5, 8),
      status: SyncStatus.COMPLETED,
      entriesFetched: 14,
      entriesCreated: 12,
      entriesSkipped: 2,
      errorMessage: null,
    },
    {
      startedAt: daysAgo(3, 8),
      completedAt: daysAgo(3, 8),
      status: SyncStatus.FAILED,
      entriesFetched: 0,
      entriesCreated: 0,
      entriesSkipped: 0,
      errorMessage: "[DEMO] Clockwise API gaf 503 — opnieuw geprobeerd zonder succes.",
    },
    {
      startedAt: daysAgo(2, 8),
      completedAt: daysAgo(2, 8),
      status: SyncStatus.COMPLETED,
      entriesFetched: 19,
      entriesCreated: 17,
      entriesSkipped: 2,
      errorMessage: null,
    },
    {
      startedAt: daysAgo(0, 7),
      completedAt: daysAgo(0, 7),
      status: SyncStatus.COMPLETED,
      entriesFetched: 11,
      entriesCreated: 9,
      entriesSkipped: 2,
      errorMessage: "[DEMO]",
    },
  ];
  for (const l of logs) {
    await prisma.cv2SyncLog.create({ data: l });
  }
}

async function seedEntriesAndReviews() {
  console.log("Ophalen reviewer-accounts...");
  const [admin, reviewer] = await Promise.all([
    prisma.cv2User.findUnique({ where: { email: "admin@clockd.nl" } }),
    prisma.cv2User.findUnique({ where: { email: "reviewer@clockd.nl" } }),
  ]);
  if (!admin || !reviewer) {
    throw new Error(
      "Verwacht admin@clockd.nl en reviewer@clockd.nl — draai eerst `npm run db:seed`.",
    );
  }
  const reviewers = [admin, reviewer];

  console.log("Aanmaken urenregistraties + review-acties...");
  const total = 80;
  let created = 0;

  for (let i = 0; i < total; i++) {
    const employee = pick(EMPLOYEES);
    const project = pick(PROJECTS);
    const dayOffset = Math.floor(Math.random() * 42); // laatste 6 weken
    const date = daysAgo(dayOffset, 0);
    const hours = randomHours();
    const description = pick(DESCRIPTIONS);

    // Verdeling statussen
    const r = Math.random();
    let status: TimeEntryStatus;
    if (r < 0.3) status = TimeEntryStatus.PENDING;
    else if (r < 0.6) status = TimeEntryStatus.APPROVED;
    else if (r < 0.7) status = TimeEntryStatus.REJECTED;
    else if (r < 0.95) status = TimeEntryStatus.EXPORTED;
    else status = TimeEntryStatus.EXPORT_FAILED;

    // Als project geen mapping heeft, kan het niet exported zijn
    if (!project.syntessCode && status === TimeEntryStatus.EXPORTED) {
      status = TimeEntryStatus.PENDING;
    }
    if (!project.syntessCode && status === TimeEntryStatus.EXPORT_FAILED) {
      status = TimeEntryStatus.PENDING;
    }

    const createdAt = daysAgo(dayOffset, 9);
    const exportedAt =
      status === TimeEntryStatus.EXPORTED ? daysAgo(dayOffset, 11) : null;
    const errorMessage =
      status === TimeEntryStatus.EXPORT_FAILED
        ? "Verbinding met Syntess Atrium verbroken — opnieuw proberen."
        : null;

    const { start, end, breakMinutes } = buildTimes(date, hours);
    const hasKm = Math.random() < 0.7;
    const hasExpenses = Math.random() < 0.35;

    const entry = await prisma.cv2TimeEntry.create({
      data: {
        clockwiseEntryId: `${DEMO_PREFIX}${i.toString().padStart(4, "0")}`,
        employeeId: employee.id,
        employeeName: employee.name,
        projectId: project.id,
        projectName: project.name,
        hours,
        date,
        startTime: start,
        endTime: end,
        breakMinutes,
        kilometers: hasKm
          ? Math.round((Math.random() * 80 + 5) * 10) / 10
          : null,
        expenses: hasExpenses
          ? Math.round((Math.random() * 60 + 5) * 100) / 100
          : null,
        expensesDescription: hasExpenses ? pick(EXPENSE_DESCRIPTIONS) : null,
        workLocation: pick(LOCATIONS),
        materials: Math.random() < 0.6 ? pick(MATERIALS) : null,
        description,
        status,
        exportedAt,
        errorMessage,
        createdAt,
        updatedAt: createdAt,
      },
    });
    created++;

    // Maak review actions voor alles behalve PENDING
    if (status !== TimeEntryStatus.PENDING) {
      const actor = pick(reviewers);
      const action =
        status === TimeEntryStatus.REJECTED
          ? TimeEntryStatus.REJECTED
          : TimeEntryStatus.APPROVED;
      const reason =
        action === TimeEntryStatus.REJECTED ? pick(REJECT_REASONS) : null;
      const reviewedAt = daysAgo(dayOffset, 10);
      await prisma.cv2ReviewAction.create({
        data: {
          entryId: entry.id,
          userId: actor.id,
          action,
          reason,
          createdAt: reviewedAt,
        },
      });
    }
  }

  return created;
}

async function main() {
  await clearDemoData();
  await seedMappings();
  await seedSyncLogs();
  const entries = await seedEntriesAndReviews();

  console.log("\n✓ Klaar!");
  console.log(`  ${entries} urenregistraties`);
  console.log(`  ${PROJECTS.filter((p) => p.syntessCode).length} actieve mappings (${PROJECTS.length - PROJECTS.filter((p) => p.syntessCode).length} ongekoppeld)`);
  console.log(`  5 sync-logs`);
  console.log(`  Review-acties verdeeld over admin@clockd.nl en reviewer@clockd.nl`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
