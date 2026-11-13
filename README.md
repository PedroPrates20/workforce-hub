# Workforce Hub

**A workforce operations platform prototype for coordinating people, locations, and daily service delivery.**

Workforce Hub brings staff scheduling and site operations into one interface. It is designed to help operations teams plan shifts across multiple locations, give employees a clear view of their work, and help supervisors and HR follow requests and compliance information.

## What the project does

The prototype brings together the main workflows used to coordinate a distributed workforce:

- **Shift planning:** build and review two-week rosters by site or employee, grouped by cleaning and security teams.
- **Team and site management:** browse staff records, work locations, site details, and operational coverage.
- **Employee requests:** review shift swaps, holiday requests, and supply requests, with role-based review steps represented in the interface.
- **Attendance:** clock in and out using the device’s location and configured site geofences.
- **Reports:** preview operational summaries and prepare filtered PDF reports.
- **Certificates and audits:** view certificate information and submit photo-based visual audit records.
- **Multiple languages:** switch between English, Portuguese, Russian, and Romanian.

The project is intended as a **demonstration prototype**. It illustrates user flows and interface behavior; it is not yet a complete workforce management service or a source of authoritative HR records.

## Who it is for

- **Employees** can see their schedules and submit requests.
- **Supervisors** can coordinate teams, sites, and shift coverage.
- **HR staff** can review employee information and requests.
- **Directors** can see broader operational summaries and approval workflows.

Development preview builds include demonstration profiles. Production mode uses a D1-backed sign-in with an employee's registered e-mail and a six-digit numeric PIN. HR or an administrator provisions and resets employee PINs.

## Run the project locally

### Requirements

- Node.js 20 or newer
- npm

### Install and start

```bash
npm install
npm run dev
```

Vite prints the local development address in the terminal. Open that address in a browser.

### Create a production build

```bash
npm run build
```

### Configure roster email delivery

The roster preview can send its rendered HTML directly from the site through Resend. To enable delivery:

1. Create a Resend account and verify a sending domain that you control.
2. In Cloudflare, open **Workers & Pages** and select the Workforce Hub Worker.
3. Under **Settings → Variables and Secrets**, add:
   - Secret `RESEND_API_KEY`: the API key from Resend.
   - Variable `RESEND_FROM_EMAIL`: a sender on the verified domain, for example `Workforce Hub <roster@your-domain.ie>`.
   - Variable `ROSTER_EMAIL_ALLOWED_DOMAINS`: the employee email domains allowed to receive rosters, separated by commas and without `@`.
4. Save the settings and redeploy the Worker.

The demo directory uses fictional names, locations, and `example.com` email addresses. Those addresses cannot receive mail; replace them with valid employee addresses in a secured, production data store before enabling delivery for real staff.

## Shared demo directory (Cloudflare D1)

This project is connected to a Cloudflare D1 database in the EU, already populated with 59 fictional employees and 55 fictional sites. The D1 binding is recorded in `wrangler.jsonc`. To set up a separate Cloudflare account or fork:

1. Install Wrangler if needed and sign in with `npx wrangler login`.
2. Replace or remove this project's existing `d1_databases` entry in `wrangler.jsonc`, then run `npm run db:create` to create your own database and binding (`DB`).
3. Run `npm run db:migrate:remote` to create the tables and load the fictional records into the remote database.
4. Push the updated `wrangler.jsonc`, `migrations/`, and app code to GitHub and wait for the Cloudflare deployment.

When the Worker has the `DB` binding, the app loads its employee and site directory from D1. Without a binding, demo-mode local and preview builds use the bundled fictional records. The D1 directory currently provides shared reads; application edits and workflow requests still use the prototype's browser storage and are not yet synchronized to D1. This demo uses fictional `example.com` emails and must not be used for real employee information.

## Production sign-in setup

Production sign-in requires the Cloudflare D1 binding and the authentication migration. After deploying the code, run `npm run db:migrate:remote` to create the account and session tables. In **Workers & Pages → workforce-hub → Settings → Variables and Secrets**, configure:

- `AUTH_ADMIN_EMAIL`: the initial administrator's e-mail address.
- `AUTH_ADMIN_PIN`: a secret containing a six-digit PIN that is not sequential or all the same digit.
- Optional `AUTH_ADMIN_NAME`: the administrator's display name.

The first successful sign-in creates the administrator account. Keep `AUTH_ADMIN_EMAIL` configured. Once the administrator account exists, the bootstrap PIN secret can be removed. The administrator or HR can then expand an employee in **Team Status** and choose **Set or reset login PIN**. The employee must be active and have a unique registered e-mail address in D1. The e-mail shown in Team Status is saved to D1 when the PIN is provisioned.

PINs are stored as salted PBKDF2 hashes, sessions use a secure HttpOnly cookie, and five failed attempts temporarily lock an account. This login is a prototype foundation: other workforce workflows still use browser-side state and need server-side authorization and persistence before the app is suitable for sensitive production records.

## Technology

- React and TypeScript
- TanStack Start and TanStack Router
- Vite
- Tailwind CSS
- Radix UI and Lucide icons

## Project layout

```text
public/             Brand assets and static files
src/components/     Shared interface components
src/routes/         Application routes and page metadata
src/workforce/      Workforce workflows, pages, data, and translations
src/lib/             Shared utilities
```

## Important prototype limitations

The current demonstration uses browser-local data and development profiles. Data saved in one browser is not a central company record and may not be available on another device. The production login protects access to the D1 directory and PIN management, but does not yet authorize and persist every workforce workflow on the server. Roster emails are sent only after Resend is configured, and the service restricts recipients to the configured email domains.

Before handling real employee information or operating this system in a business environment, the project needs, at minimum:

1. Server-side authorization for every role and operation, beyond the sign-in, directory, and PIN-management endpoints.
2. A protected, persistent database with backups and appropriate retention rules.
3. A configured email service with delivery tracking for request and approval notices.
4. Server-side validation and audit logs for changes to schedules, employee records, and requests.
5. A privacy and security review covering employee, location, immigration, and attendance data.

Use fictional records for public demos. Keep the GitHub repository private until any demonstration names, phone numbers, site details, and other identifying data have been removed or replaced.

## License

No open-source license has been selected yet. Unless a license is added, the code is not granted for reuse by others.
