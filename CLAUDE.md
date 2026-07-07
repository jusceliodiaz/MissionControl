# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mission Control is a Chrome Extension (Manifest V3) — a personal cockpit combining a kanban task board, a daily diary, an "AI Radar" feed of real signals from public APIs, and a Google Calendar agenda viewer. It's a single-user, no-build, vanilla JS app (no framework, no bundler, no package.json). All UI copy and comments are in Portuguese (pt-BR).

## Running / developing

There is no build step. To develop:
1. Open `chrome://extensions`, enable Developer mode, "Load unpacked", select this folder.
2. Click the extension icon to open `dashboard.html` in a full tab (handled by `background.js`, which focuses an existing dashboard tab instead of opening duplicates).
3. After editing any file, click the reload icon for the extension on `chrome://extensions`, then reload the dashboard tab.

There are no tests, linter, or build/package scripts in this repo.

## Architecture

**Script load order matters** (see bottom of `dashboard.html`): `report.js` → `radar.js` → `calendar.js` → `trends.js` → `dashboard.js`. All five share the global scope — there is no module system, so functions/consts defined in one file (e.g. `RADAR_CATS`, `fetchRadar`, `fetchAllCalendars`, `buildEventURL`, `fetchAllTrends`, `DEFAULT_REPORT`) are consumed directly by `dashboard.js` without imports.

- **`dashboard.js`** is the app core: state, storage, rendering, and event wiring for all views (Overview / Board / Radar / Agenda) plus the diary modal. It holds a single in-memory `state` object (hydrated from storage at init) and re-renders whole sections imperatively (no virtual DOM/diffing) — every mutation calls `store.set(...)` then a `render*()` function directly. The topbar (`.topbar` in `dashboard.html`) holds centered nav tabs; `gotoView(v)` toggles `.view` sections and triggers each view's fetch-on-enter (`updateTrends()`/`renderRadar()`/`renderAgenda()`).
- **`store`** wraps persistence: uses `chrome.storage.local` when available, falling back to `localStorage` (prefixed `mc_`) when opened outside the extension context (e.g. as a plain file/tab for quick iteration).
- **`radar.js`** fetches "real" signals from public, keyless APIs in parallel (`Promise.allSettled`): Hacker News (Algolia) and Reddit JSON. Each source fails independently; results are deduped, capped per category (max 14), and categorized via `RADAR_CATS` (modelos / ferramentas / mercado / homeassistant / negocios).
- **`calendar.js`** fetches and parses Google Calendar's "secret iCal" URLs client-side — no OAuth. Implements its own minimal ICS parser and RRULE expansion (DAILY/WEEKLY/MONTHLY/YEARLY with INTERVAL/BYDAY/UNTIL/COUNT/EXDATE and RECURRENCE-ID overrides). `fetchAllCalendars(calendars, winStart, winEnd)` takes an explicit date window (defaults to −7d/+21d); `dashboard.js`'s month-grid navigation (`monthWindow()`, `ensureMonthData()`) requests a rolling 3-month window and only refetches when the viewed month falls outside what's cached (`state.agendaWinStart`/`agendaWinEnd`). Also builds Google Calendar "create event" URLs (`buildEventURL`) as a template-link workaround instead of using the Calendar API.
- **`trends.js`** fetches Google Trends' public daily-trending-searches RSS feed (`trends.google.com/trending/rss?geo=XX`, XML parsed via `DOMParser`) per country code, driven by the `TRENDS_GEOS` list (Brazil/Germany/Portugal/Spain/UK). No true push/realtime API exists — freshness comes from refetching on every Overview-tab entry (`updateTrends()`, called from `gotoView`), not from a persistent connection.
- **`report.js`** is static seed content (`DEFAULT_REPORT`): a pre-written news brief shown in the Radar view until the user pastes a new one (stored as `customReport` and persisted).

### State shape (see `DEFAULTS` in `dashboard.js`)
`tasks`, `diaryNotes`, `customReport(+Date)`, `radarItems`/`radarAt`/`radarIgnored`/`radarUsed`/`radarSeen`, `calendars`, `agendaEvents`/`agendaAt`/`agendaWinStart`/`agendaWinEnd`, `trends` (`{brasil, alemanha, portugal, espanha, uk, at}`). All reads/writes go through `store.get`/`store.set`.

### Manifest / permissions
`manifest.json` declares `host_permissions` for the exact external hosts used by `radar.js`/`calendar.js`/`trends.js` (hn.algolia.com, reddit.com, trends.google.com, calendar.google.com). Adding a new external data source requires adding its host here too.

## Conventions

- No frameworks, no npm, no TypeScript — plain ES modules-less JS, DOM APIs, template strings for HTML injection (escaped via the local `escapeHtml` helper — always use it when injecting user-controlled or fetched text into `innerHTML`).
- Views are plain `<section class="view">` blocks toggled via `gotoView()`; each view has a corresponding `render*()` function called on navigation and on data updates.
- Keep new UI strings/comments in Portuguese (pt-BR) to match the existing codebase.
