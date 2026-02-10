Gym Dashboard (Offline Tracker)

A minimalist, iOS-style gym tracking dashboard that runs entirely in the browser
(no login, no backend).

Tracks weight, protein, attendance, routines, and lift progress with PR history.


FEATURES
--------

ONBOARDING
- Create profile (name, protein goal, week starts on, hide rest days)
- Create routine from templates:
  - PPL
  - Upper / Lower
  - Full Body (3-day)
  - Body Part Split
  - Blank

HOME DASHBOARD
- Today’s workout (auto based on day of week)
- Weekly attendance dots + quick “Check In”
- Protein “grams left” ring + focus text

ROUTINE
- Multiple routines (create / edit / duplicate / delete)
- Template routines converted into saved routines
- Mark days as rest days (hidden if enabled)

LOG SETS
- Log sets per exercise (weight + reps)
- Automatically calculates lifetime max and PR flags
- Exercise history modal

PROGRESS
- Table view + graph view (Chart.js)
- Graph metrics:
  - Top Weight
  - Estimated 1RM (Epley)
  - Volume
- Download current graph as PNG

WEIGHT
- Table view + graph view (Chart.js)
- Latest entry, delta, and 7-day average

ATTENDANCE
- Tap calendar days trained
- Monthly count + clear month

PROTEIN
- Daily meal breakdown + remaining goal
- Home ring updates live while typing (today)

BACKUP / IMPORT
- Export full app data as JSON
- Import backup JSON (overwrites current browser data)


DATA STORAGE (IMPORTANT)
------------------------
This app stores data using localStorage on the device/browser you use.

That means:
- Clearing browser data clears your gym data
- Using a different browser/device starts fresh unless you import a backup

Recommended:
Use Settings → Backup Now regularly.


RUN LOCALLY
-----------

OPTION 1: OPEN DIRECTLY
Open index.html in your browser.

Note:
Some browsers block features when running from file://
If anything behaves oddly, use a local server.


OPTION 2: SIMPLE LOCAL SERVER (RECOMMENDED)

macOS / Linux:
cd <repo-folder>
python3 -m http.server 8000

Windows (PowerShell):
cd <repo-folder>
python -m http.server 8000

Then open:
http://localhost:8000


PROJECT STRUCTURE
-----------------
index.html
assets/
  css/
    styles.css
  js/
    storage.js   (localStorage helper + keys)
    dom.js       (DOM helpers / shared selectors)
    utils.js     (general helpers: dates, formatting, normalization)
    app.js       (main app logic, router, features)


TROUBLESHOOTING
---------------

BLANK SCREEN
- Open DevTools Console
- Check for errors
- Confirm script order in index.html:
  1. Chart.js
  2. storage.js
  3. dom.js
  4. utils.js
  5. app.js

DATA MISSING
- You may be on a different browser/device
- Check Settings → Storage info
- Restore using Import if you have a backup JSON
