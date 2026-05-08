import {
  CheckCircle2,
  Cable,
  ChevronRight,
  Clock,
  HelpCircle,
  Mail,
  Send,
  Shield,
  XCircle,
} from "lucide-react";
import Link from "next/link";

const FAQ = [
  {
    q: "Wat doet deze applicatie?",
    a: "Clockd v2 is een tussenstap tussen Clockwise (waar medewerkers hun uren registreren) en Syntess Atrium (de boekhouding). Voordat uren in de boekhouding belanden, moet een reviewer ze eerst goedkeuren.",
  },
  {
    q: "Wat betekent “Wacht op review”?",
    a: "Dit is een urenregistratie die nog niet door iemand is goedgekeurd of afgewezen. Zodra je goedkeurt, kan de uur worden geëxporteerd naar Syntess.",
  },
  {
    q: "Wat gebeurt er nadat ik iets goedkeur?",
    a: "De urenregistratie krijgt de status “Goedgekeurd”. Een achtergrondproces stuurt goedgekeurde uren automatisch door naar Syntess Atrium. Daarna staat de status op “Verzonden”.",
  },
  {
    q: "Kan ik een review terugdraaien?",
    a: "Nee, een eenmaal goedgekeurde of afgewezen registratie is definitief. Twijfel je? Neem contact op met een beheerder.",
  },
  {
    q: "Wat doe ik als de medewerker een verkeerd project heeft gekozen?",
    a: "Wijs de registratie af met een korte uitleg. De medewerker corrigeert dan in Clockwise — de gecorrigeerde uur komt bij de volgende sync opnieuw binnen.",
  },
  {
    q: "Waarom kan ik geen mappings of instellingen zien?",
    a: "Die schermen zijn alleen voor beheerders. Reviewers zien Dashboard, Uren reviewen, Geschiedenis, Statistieken en Mijn account.",
  },
  {
    q: "Hoe vaak komen er nieuwe uren binnen?",
    a: "Elke 15 minuten haalt het systeem automatisch nieuwe registraties op uit Clockwise. Je hoeft niets te doen.",
  },
  {
    q: "Mijn wachtwoord werkt niet meer",
    a: "Vraag een beheerder om je wachtwoord te resetten. Daarna kan je hem zelf wijzigen via Mijn account.",
  },
];

const STEPS = [
  {
    icon: Clock,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    title: "1. Uren komen binnen",
    body: "Clockwise stuurt nieuwe registraties automatisch elke 15 minuten naar Clockd v2.",
  },
  {
    icon: CheckCircle2,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    title: "2. Jij reviewt",
    body: "Je keurt elke registratie goed of af, eventueel met een reden.",
  },
  {
    icon: Send,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    title: "3. Export naar Syntess",
    body: "Goedgekeurde uren worden automatisch verzonden naar Syntess Atrium.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Help & veelgestelde vragen
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Een korte uitleg over hoe Clockd v2 werkt.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Hoe werkt het?
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          De volledige flow van Clockwise naar Syntess in drie stappen.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${step.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Veelgestelde vragen
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Korte antwoorden op veelvoorkomende vragen.
            </p>
          </div>
        </header>
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {FAQ.map((item) => (
            <li key={item.q} className="px-5 py-3.5">
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-900 marker:hidden dark:text-slate-100">
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                  {item.q}
                </summary>
                <p className="mt-2 pl-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-800/60">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Vraag niet beantwoord?
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Neem contact op met een beheerder voor hulp.
              </p>
            </div>
          </div>
          <Link
            href="mailto:support@clockd.nl"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Mail className="h-4 w-4" />
            Mail support
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          icon={<Shield className="h-5 w-5" />}
          color="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400"
          title="Privacy & audit"
          body="Elke goedkeuring en afwijzing wordt vastgelegd. Beheerders kunnen achteraf zien wie wat heeft gedaan."
        />
        <InfoCard
          icon={<Cable className="h-5 w-5" />}
          color="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
          title="Project-mappings"
          body="Een uur kan alleen geëxporteerd worden als het Clockwise-project gekoppeld is aan een Syntess-projectcode. Beheerders beheren deze koppelingen."
        />
        <InfoCard
          icon={<XCircle className="h-5 w-5" />}
          color="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
          title="Wat als export mislukt?"
          body="De status wordt “Verzending mislukt”. Beheerders zien een foutmelding in de logs en kunnen de export handmatig opnieuw starten."
        />
        <InfoCard
          icon={<Clock className="h-5 w-5" />}
          color="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
          title="Op tijd reviewen"
          body="Hoe sneller je reviewt, hoe sneller de uren in de boekhouding staan. Probeer dagelijks even te kijken."
        />
      </section>
    </div>
  );
}

function InfoCard({
  icon,
  color,
  title,
  body,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{body}</p>
        </div>
      </div>
    </div>
  );
}
