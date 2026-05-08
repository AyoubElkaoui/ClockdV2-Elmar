# Deploy — Clockd v2

Doel: `review.clockd.nl` op Vercel, met Supabase als database en een cron die elke 15 min Clockwise synchroniseert.

## 1. Secrets genereren

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # CRON_SECRET
```

## 2. Supabase

1. Nieuw Supabase project (of hergebruik de bestaande Clockd instance — de `cv2_` prefix voorkomt botsingen).
2. **Database → Connection string**:
   - `DATABASE_URL` = Transaction pooler (`...pooler.supabase.com:6543`) met `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` = Direct connection (`...:5432`) — alleen voor migraties
3. Lokaal schema naar Supabase pushen + seed draaien:
   ```bash
   cd clockd-v2
   npm run db:push     # of: npm run db:migrate voor migratie-historie
   npm run db:seed     # admin@clockd.nl / Clockd2024! + reviewer@clockd.nl / Review2024!
   ```

## 3. Clockwise

- Vraag bij de Clockwise-beheerder een OAuth application aan.
- `redirect_uri` = `https://review.clockd.nl/api/clockwise/callback`.
- Bevestig de `authorize` + `token` endpoints (standaard vallen terug op `/oauth/authorize` en `/oauth/token` op de host uit `CLOCKWISE_BASE_URL` — override met `CLOCKWISE_AUTHORIZE_URL` / `CLOCKWISE_TOKEN_URL` als ze anders zijn).

## 4. Syntess Atrium (Firebird)

- Host, poort, database pad, user, password.
- **Vul `lib/firebird-schema.ts` aan** — de kolomnamen voor `AT_URENBREG` staan nu nog als `??_TODO_*`; export faalt hardop tot die ingevuld zijn (fail-fast is bewust).
- Zorg dat de Vercel runtime het Firebird-host kan bereiken (firewall / VPN / IP allowlist).

## 5. Vercel environment variables

Zet in Vercel Project → Settings → Environment Variables (Production):

| Variable                      | Waarde                                                   |
| ----------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`                | Supabase pooler URL                                      |
| `DIRECT_URL`                  | Supabase direct URL                                      |
| `NEXTAUTH_URL`                | `https://review.clockd.nl`                               |
| `AUTH_SECRET`                 | generated                                                |
| `NEXTAUTH_SECRET`             | zelfde waarde als `AUTH_SECRET` (compat)                 |
| `CLOCKWISE_CLIENT_ID`         | van Clockwise                                            |
| `CLOCKWISE_CLIENT_SECRET`     | van Clockwise                                            |
| `CLOCKWISE_BASE_URL`          | `https://elmarservices.clockwise.info/api/v2`            |
| `CLOCKWISE_REDIRECT_URI`      | `https://review.clockd.nl/api/clockwise/callback`        |
| `CLOCKWISE_AUTHORIZE_URL`     | optioneel override                                       |
| `CLOCKWISE_TOKEN_URL`         | optioneel override                                       |
| `FIREBIRD_HOST`               | Syntess host                                             |
| `FIREBIRD_PORT`               | `3050`                                                   |
| `FIREBIRD_DATABASE`           | pad naar de `.fdb` of alias                              |
| `FIREBIRD_USER`               |                                                          |
| `FIREBIRD_PASSWORD`           |                                                          |
| `CRON_SECRET`                 | generated                                                |

## 6. Deploy

```bash
# vanuit clockd-v2/
vercel link
vercel --prod
```

Koppel daarna het domein `review.clockd.nl` aan het Vercel project. Cron wordt automatisch geactiveerd via `vercel.json` (`*/15 * * * *` → `/api/cron/sync`).

## 7. Smoke test na deploy

1. `https://review.clockd.nl/login` → login met `admin@clockd.nl`.
2. **Instellingen → Syntess → Test verbinding** — moet OK zijn (connect only; tabelkolommen worden niet getoetst).
3. **Instellingen → Clockwise → Verbind met Clockwise** — doorloop OAuth, moet terugkomen op `/settings?clockwise=connected`.
4. **Instellingen → Clockwise → Sync nu uitvoeren** — controleer op `/entries` en `/logs`.
5. **Mappings** — koppel eerste Clockwise project → Syntess projectcode.
6. Approve een entry, probeer een enkele export via `POST /api/export/<id>/retry` (of wacht tot UI-knop).
7. Cron verifieert via Vercel → **Settings → Cron Jobs** of er runs verschijnen.

## Rollback

- Revert naar vorige deploy in Vercel dashboard (één klik).
- Database migraties: Prisma heeft geen auto-rollback — voor kritieke wijzigingen eerst `prisma migrate diff` tegen staging.

## Beveiligingsnotities

- `CRON_SECRET` nooit loggen; Vercel stuurt 'm zelf mee via `Authorization: Bearer <CRON_SECRET>` naar geregistreerde cron paths (zie Vercel docs).
- `AUTH_SECRET` roteren betekent alle sessies invalideren — doe dit alleen bij een incident.
- Wachtwoorden worden met bcrypt (12 rounds) gehasht; reset via Prisma Studio / SQL.
