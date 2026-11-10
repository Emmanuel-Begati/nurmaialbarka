# Nurul Qur'an School Admin

School management system for an Islamiyyah school: students, guardians, daily attendance, school fees (restricted), CA + exam results, Qur'an (hifz) progress, printable report cards and receipts, and a parent/student portal.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Prisma · PostgreSQL on Supabase

## Getting started

Create a `.env` file (never commit it) with your Supabase connection strings:

```bash
# Transaction pooler (port 6543), used by the running app
SUPABASE_DATABASE_URL="postgresql://..."
# Direct connection, used by migrations
SUPABASE_DIRECT_URL="postgresql://..."
```

```bash
npm install                # also generates the Prisma client
npm run db:deploy          # creates/updates the tables in Supabase
npm run dev                # http://localhost:3000
```

`npm run db:seed` loads demo data and **wipes existing data**. Only use it on an empty or test database.

### Moving data from the old SQLite version

The app used to keep its data in `prisma/dev.db`. `npm run db:copy-from-sqlite` copies every record from that file into
an empty Supabase database (it refuses if the target already has data). The old SQLite migrations are kept in
`prisma/sqlite-archive/` for reference only.

### Demo logins (from `prisma/seed.ts`)

| Role | Username | Password |
|---|---|---|
| Super Admin | admin@nurulquran.local | admin123 |
| Bursar | bursar@nurulquran.local | bursar123 |
| Class teacher | abdullahi@nurulquran.local | teacher123 |
| Subject teacher (Arabic) | arabic@nurulquran.local | teacher123 |
| Parent | parent@nurulquran.local | parent123 |
| Student | NQ/2026/001 | student123 |

Change or disable these before real use (Staff & Users page).

## Who can do what

| | Admin | Bursar | Class teacher | Subject teacher | Parent | Student |
|---|---|---|---|---|---|---|
| Students & guardians | add, edit, delete (any) | view | add, edit, delete in own class | view own classes | own children | self |
| Classes & staff accounts | add, edit, delete | – | – | – | – | – |
| Attendance | any class | – | own class | – | view | view |
| **School fees** | ✔ | ✔ | ✘ | ✘ | own children's balance and receipts | ✘ |
| Score entry | all | – | subjects assigned | subjects assigned | – | – |
| Qur'an progress, remarks | all | – | own class | Qur'an subject | – | – |
| Publish report cards | ✔ | – | – | – | view once published | view once published |
| Settings, parent/student logins | ✔ | – | – | – | – | – |

Permissions are enforced on the server in `src/lib/auth/guards.ts` and `src/lib/scope.ts`, by every page, server action and export route. Hiding menu items is not relied on.

## Key concepts

- **Classes are named after their class teacher**, e.g. "Ustadh Abdullahi Sani's Class". An optional custom label handles a teacher with two classes.
- **Three terms per session.** Set the current term in Settings. It is the default everywhere.
- **Fees:** fee items per term (per class, or for all classes) → expected amount. Payments can be partial. Each student's status is Paid, Partial or Owing. Payments are never deleted, only voided with a reason, and every change goes to the activity log.
- **Results:** CA1 (20) + CA2 (20) + Exam (60) by default, configurable in Settings. Grades A–F use editable bands. Subject and class positions are computed automatically.
- **Report cards** include academics, Qur'an memorisation (surahs, juz, hifz/tajweed/recitation ratings), attendance, conduct and remarks. Parents only see them after the admin clicks **Publish to parents**. Teachers can't edit published results.
- **Printing:** receipts and report cards have print pages. Use the browser's *Print → Save as PDF*.
- **End of session:** create the new session (Settings), create its classes, then use *Promote / graduate students*.

## Project layout

```
prisma/schema.prisma        data model
prisma/seed.ts              demo data
src/lib/auth/               sessions (cookie + DB), roles, permission guards
src/lib/fees.ts             fee balance calculation, receipt numbers
src/lib/report.ts           broadsheet, positions, report-card data
src/app/(staff)/            staff pages (dashboard, students, attendance, fees, results, quran, reports, staff, settings)
src/app/(portal)/portal     parent / student portal
src/app/print/              printable receipt and report cards
scripts/smoke-test.mjs      access-control checks: run with the app started, `node scripts/smoke-test.mjs http://localhost:3000`
```

## Moving to production later

Data lives in PostgreSQL on Supabase. Set a strong admin password and serve over HTTPS; session cookies become `secure` in production automatically.
