# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mission Control is a Chrome Extension (Manifest V3) — a personal cockpit combining a kanban task board, a daily diary, an "AI Radar" feed of real signals from public APIs, a Google Calendar agenda viewer, and a "Mercados" business-intelligence view (per-country monetization ideas cross-referenced with live Google Trends). It's a single-user, no-build, vanilla JS app (no framework, no bundler, no package.json). All UI copy and comments are in Portuguese (pt-BR).

## Running / developing

There is no build step. To develop:
1. Open `chrome://extensions`, enable Developer mode, "Load unpacked", select this folder.
2. Click the extension icon to open `dashboard.html` in a full tab (handled by `background.js`, which focuses an existing dashboard tab instead of opening duplicates).
3. After editing any file, click the reload icon for the extension on `chrome://extensions`, then reload the dashboard tab.

There are no tests, linter, or build/package scripts in this repo.

## Architecture

**Script load order matters** (see bottom of `dashboard.html`): `report.js` → `radar.js` → `calendar.js` → `trends.js` → `money.js` → `dashboard.js`. All six share the global scope — there is no module system, so functions/consts defined in one file (e.g. `RADAR_CATS`, `fetchRadar`, `fetchAllCalendars`, `buildEventURL`, `fetchAllTrends`, `DEFAULT_REPORT`, `MONEY_GEOS`, `MONEY_INTEL`, `matchTrendOpportunities`) are consumed directly by `dashboard.js` without imports.

- **`dashboard.js`** is the app core: state, storage, rendering, and event wiring for all views (Overview / Board / Radar / Agenda / Mercados) plus the diary modal. It holds a single in-memory `state` object (hydrated from storage at init) and re-renders whole sections imperatively (no virtual DOM/diffing) — every mutation calls `store.set(...)` then a `render*()` function directly. The topbar (`.topbar` in `dashboard.html`) holds centered nav tabs with no logo/brand; a global `.date-strip` (`#dateLine`) sits below it on every view, not just Overview. `gotoView(v)` toggles `.view` sections, scrolls the page to top, and triggers each view's fetch-on-enter (`updateTrends()`/`renderRadar()`/`renderAgenda()`).
- **`store`** wraps persistence: uses `chrome.storage.local` when available, falling back to `localStorage` (prefixed `mc_`) when opened outside the extension context (e.g. as a plain file/tab for quick iteration).
- **Overview** (`renderOverview()`) has no hero/greeting/stat-cards — it's just the bento grid: month mini-calendar, Radar top-items, Board recent-items, Agenda upcoming (past events already filtered out), and the Google Trends box.
- **Board** has a project-suggestion feature: type a free-text project description into `#projectInput` and `matchProjectTasks()` keyword-matches it against `PROJECT_RULES` (Unreal/Houdini/archviz/video/site/curso/Home Assistant/empresa, each with a curated task list) to render clickable suggestion chips that add straight to the backlog. This is a local, deterministic rule engine — not an LLM call.
- **`radar.js`** fetches "real" signals from public, keyless APIs in parallel (`Promise.allSettled`): Hacker News (Algolia), Reddit JSON, and Remotive/RemoteOK for remote job listings (searched by role keyword — Unreal Engine, 3D Artist, VFX Artist, Houdini, Realtime, AI Artist — with no per-country split or location filtering, since that caused problems before). Each source fails independently; results are deduped, capped per category (max 14), and categorized via `RADAR_CATS` (modelos / ferramentas / mercado / negocios / vagas).
- **`calendar.js`** fetches and parses Google Calendar's "secret iCal" URLs client-side — no OAuth. Implements its own minimal ICS parser and RRULE expansion (DAILY/WEEKLY/MONTHLY/YEARLY with INTERVAL/BYDAY/UNTIL/COUNT/EXDATE and RECURRENCE-ID overrides). `fetchAllCalendars(calendars, winStart, winEnd)` takes an explicit date window (defaults to −7d/+21d); `dashboard.js`'s month-grid navigation (`monthWindow()`, `ensureMonthData()`) requests a rolling 3-month window and only refetches when the viewed month falls outside what's cached (`state.agendaWinStart`/`agendaWinEnd`). The Agenda list view filters out events that have already ended (`e.end < Date.now()`). Also builds Google Calendar "create event" URLs (`buildEventURL`) as a template-link workaround instead of using the Calendar API.
- **`trends.js`** fetches Google Trends' public daily-trending-searches RSS feed (`trends.google.com/trending/rss?geo=XX` — note: not the older `/trends/trendingsearches/daily/rss` path, which 404s now — XML parsed via `DOMParser`) per country code, driven by the `TRENDS_GEOS` list (Brazil/Germany/Portugal/Spain/UK). Each item carries Google's own `approx_traffic` search-volume estimate, shown in the UI. No true push/realtime API exists — freshness comes from refetching on every Overview-tab entry (`updateTrends()`, called from `gotoView`), not from a persistent connection. This fetch only works from a loaded unpacked extension (`chrome-extension://` origin) — trends.google.com sends no CORS headers, so it 100% fails outside the extension's `host_permissions` bypass.
- **`money.js`** powers the **Mercados** view (nav tab after Agenda): a per-country "how to make money" intelligence panel for the 5 `TRENDS_GEOS` countries. Two layers, both deterministic (no LLM calls): (1) `MONEY_INTEL` — curated static content per country (market snapshot, business opportunities, product ideas, personal angle), editable seed data in the same spirit as `report.js`; product-idea chips call `addTask()` to push straight to the board backlog with the `empresa` tag. (2) `TREND_MONEY_RULES`/`matchTrendOpportunities()` — keyword regexes (PT/EN/DE/ES) that scan the live Google Trends items of the selected country and surface monetization angles ("⚡ Detectado nos trends de hoje"), same pattern as `PROJECT_RULES`. The view also embeds a full 5-country Google Trends grid (`mTrends*` element IDs) that duplicates the Overview box; `updateTrends()` in `dashboard.js` re-renders both via the shared `renderTrendList()` helper, and `gotoView("money")` triggers a fresh trends fetch. Country selection lives in the module-level `moneyGeo` cursor in `dashboard.js` (not persisted).
- **`report.js`** is static seed content (`DEFAULT_REPORT`): a pre-written news brief shown in the Radar view until the user pastes a new one (stored as `customReport` and persisted).

### State shape (see `DEFAULTS` in `dashboard.js`)
`tasks`, `diaryNotes`, `customReport(+Date)`, `radarItems`/`radarAt`/`radarIgnored`/`radarUsed`/`radarSeen`, `calendars`, `agendaEvents`/`agendaAt`/`agendaWinStart`/`agendaWinEnd`, `trends` (`{brasil, alemanha, portugal, espanha, uk, at}`). All reads/writes go through `store.get`/`store.set`.

### Manifest / permissions
`manifest.json` declares `host_permissions` for the exact external hosts used by `radar.js`/`calendar.js`/`trends.js` (hn.algolia.com, reddit.com, remotive.com, remoteok.com, trends.google.com, calendar.google.com). Adding a new external data source requires adding its host here too.

## Conventions

- No frameworks, no npm, no TypeScript — plain ES modules-less JS, DOM APIs, template strings for HTML injection (escaped via the local `escapeHtml` helper — always use it when injecting user-controlled or fetched text into `innerHTML`).
- Views are plain `<section class="view">` blocks toggled via `gotoView()`; each view has a corresponding `render*()` function called on navigation and on data updates.
- Keep new UI strings/comments in Portuguese (pt-BR) to match the existing codebase.
