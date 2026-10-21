# Mono CRM

A focused, offline-first sales workspace for independent operators. Minimal black / white / grey interface, no account, no server, no tracking, no dependencies.

## Run locally

**Fastest:** Download or clone this repository and open `index.html` in a browser.

**Recommended:** Run a local web server from the project directory, then visit `http://localhost:4173`:

```bash
python3 -m http.server 4173
```

No `npm install`, external service, API key or database setup is required.

## Features

- **Overview** — open pipeline, active deals, due tasks, won value this month, recent activity.
- **Contacts** — name, role, company, email, phone, status, tags, notes; search, filtering, sorting.
- **Companies** — connected accounts with contact counts and open deal counts.
- **Deals** — six-stage draggable sales pipeline, monetary value, linked company/contact, expected close date.
- **Tasks** — due dates, priority, linked records, completed items, overdue and today sections.
- **Import/export** — CSV contact import with email matching, CSV exports for all data views, full-workspace JSON backup and restore.
- **Keyboard** — `/` to search the current view; `N` to create a record; `Esc` to dismiss a dialog.
- **Sample data** — optional fictional workspace via Settings, only while empty.
- **Responsive** — desktop and mobile widths.

## Privacy and data safety

Records are held **only in this browser profile**, in `localStorage` under `mono.crm.workspace.v1`. Nothing is uploaded or synchronized. Export a JSON backup regularly in **Settings → Download backup**, especially before clearing your browser cache, switching devices, or changing browsers. Browser-managed storage is not encrypted by this app, so avoid using it on shared devices with sensitive customer data.

Use a consistent address when launching (`http://localhost:4173`, rather than switching between `file://` and `http://localhost`). Browser storage is separated by origin and by browser profile.

CSV contact import supports columns `Name`, `First Name`, `Last Name`, `Email`, `Phone`, `Title`, `Company`, `Status`, `Tags`, and `Notes` (case-insensitive and common header variants). Imported company names create or reuse company records; email matches update existing contacts. CSV exports guard against spreadsheet formula injection.

## Tech stack

Plain HTML, CSS, and JavaScript. Zero runtime dependencies. `src/core.js` contains the data layer and can be tested using Node.js's built-in test runner:

```bash
node --test tests/*.test.cjs
```

## Project layout

```text
index.html           App shell
styles.css           Grayscale design system and responsive layout
src/core.js          Data model, validation, storage, CSV, calculations
src/app.js           Application views, interactions, dialogs
 tests/core.test.cjs Automated data layer tests
```

## Scope

Mono CRM v1 is a **single-browser, single-user local tool**, not a hosted multi-user SaaS. It has no user authentication, sharing, email integrations, background sync, conflict resolution, or server-side database. Those are deliberate omissions for an immediately usable, inexpensive first product. The workspace format is versioned for future migrations.