# 🏋️ Gym Dashboard (PWA)

A fully client-side, production-ready Progressive Web App (PWA) for
tracking:

-   🏋️ Workouts & Routines\
-   📊 Progress & Exercise History\
-   ⚖️ Weight Tracking\
-   🍗 Protein Intake\
-   📅 Attendance\
-   💾 Backup & Restore

Built as a single-file SPA powered by localStorage, service workers, and
version-controlled updates.

------------------------------------------------------------------------

# 🚀 Architecture Overview

## Core Files

  File                     Purpose
  ------------------------ -------------------------------------------------------
  `index.html`             Main application (UI, routing, logic, state engine)
  `sw.js`                  Service Worker (offline caching + controlled updates)
  `version.json`           Single source of truth for version + release notes
  `manifest.webmanifest`   PWA install configuration
  `icon.svg`               App icon

------------------------------------------------------------------------

# 🧠 Application Architecture

## State Engine

All data is stored locally using:

``` js
const STORAGE_KEY = "gymdash:v1";
```

The app uses:

-   DefaultState() → base schema
-   migrateState() → safe schema upgrades
-   SCHEMA_VERSION → migration guard
-   Storage.load() / Storage.save() → controlled persistence

### Schema Structure

``` js
{
  schemaVersion,
  profile,
  routines,
  activeRoutineId,
  exerciseLibrary,
  logs: {
    workouts,
    weight,
    protein
  },
  attendance
}
```

------------------------------------------------------------------------

# 📱 PWA & Offline Architecture

## Service Worker Strategy

-   Network-first for navigation
-   Offline shell fallback
-   Versioned cache derived from `version.json`
-   Controlled update activation via `SKIP_WAITING`

When `version.json` changes: - New cache is created - Old caches are
deleted - User taps "Reload to Update"

No user data is cleared during updates.

------------------------------------------------------------------------

# 🔄 Versioning System

`version.json` is the single source of truth.

Example:

``` json
{
  "version": "2.0",
  "buildDate": "2026-02-16",
  "notes": ["App has officially completed build"]
}
```

Rules:

-   Do NOT hardcode version in `index.html`
-   Update only `version.json`
-   Deploy
-   User taps "Reload to Update"

------------------------------------------------------------------------

# 🔐 Data Safety

## Backup / Restore

Users can:

-   Export full JSON snapshot
-   Import validated backup
-   Reset local data safely

Import validation ensures: - schemaVersion exists - required keys
exist - state is migrated before applying

------------------------------------------------------------------------

# 🛠 Development Model

-   No frameworks
-   No build tools
-   No backend
-   Fully static deployment
-   Fully client-side

Ready for: - GitHub Pages - Netlify - Vercel (static) - Any HTTPS host

------------------------------------------------------------------------

# 🏁 Current Release

Version: **2.0**\
Build Date: **2026-02-16**

------------------------------------------------------------------------

Built with precision, performance, and long-term maintainability in
mind.
