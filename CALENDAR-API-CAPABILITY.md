# Calendar Screen – API Capability Report

This document summarizes how well the current backend APIs support the calendar UI (monthly view with phase filters, Mood/Flow/Notes tabs, selected-date detail, add/edit log, yearly view).

---

## 1. UI Requirements (from screens)

| Feature | Requirement |
|--------|-------------|
| **Monthly calendar** | Show every day of the month with predicted phase (for background color) and log indicators (mood emojis, flow droplets, note pencil). |
| **Phase filter pills** | Menstrual, Follicular, Ovulation, Luteal (and “all”). Highlight only days in the selected phase. |
| **Log type tabs** | Mood, Flow, Notes. Show per-day indicators and selected-date detail for the active tab. |
| **Selected date detail** | When user taps a date: show that day’s mood list, flow, note text, temperature, and edit (pencil). |
| **Add / Edit log** | One “Add log” (or edit) action per day: create or update mood, flow, notes, temperature for that date. |
| **Yearly view** | Multiple months (e.g. Sept–Dec 2025), days color-coded by phase; no per-day log icons. |

---

## 2. Backend Support Summary

| Need | Supported? | How |
|------|-------------|-----|
| Monthly calendar with phase + log summaries | ✅ Yes | **GET /api/cycles/calendar/enhanced?month=&year=** returns every day with `phase`, `phaseName`, `isPeriod`, and merged log fields (`mood`, `flow`, `flowIntensity`, `notes`, `temperature`) when present. Use **type** = `mood` \| `flow` \| `notes` \| `all` to limit which log fields are included. |
| Phase filter (Menstrual, etc.) | ✅ Yes | **phase** query: `menstrual`, `follicular`, `ovulation`, `luteal`, or `all`. Backend maps `menstrual` → log phase `period`. Client can also do highlighting only from the `phase` field per day (no need to filter requests). |
| Mood / Flow / Notes per day | ✅ Yes | Log model has `mood` (array), `flow`, `flowIntensity`, `notes`, `temperature`. Enhanced calendar merges these into each day. |
| Selected-date detail | ✅ Yes | **GET /api/logs/by-date?date=YYYY-MM-DD** returns the single log for that date (or `null`). Use this when user selects a date to show mood list, flow, note, temperature, and edit. |
| Add / Edit log | ✅ Yes | **POST /api/logs** with body `{ date, mood, flow, flowIntensity, notes, temperature, … }`. If a log exists for that date, it is updated; otherwise a new log is created. |
| Yearly view (phase colors) | ✅ Yes | **GET /api/cycles/calendar/enhanced?year=2025** (no **month**) returns **data.months[]** with one entry per month, each containing **calendar** (per-day phase and optional log data) for that month. |
| Delete log | ⚠️ Optional | No **DELETE /api/logs/:id** yet. “Edit” can be implemented as POST with updated fields; delete can be added later if needed. |

---

## 3. Recommended API Usage for the Calendar

- **Month grid + phase highlighting + log icons**  
  `GET /api/cycles/calendar/enhanced?month=9&year=2025&type=all`  
  Use **data.calendar[]**: for each day use **phase** / **phaseName** for background color and **mood**, **flow**, **notes**, **temperature** for icons (or use **type** = `mood` / `flow` / `notes` to match the active tab).

- **Phase filter**  
  Either:  
  - Keep the same request and filter highlighting on the client by **phase** (e.g. only highlight days where `day.phase === selectedPhase`), or  
  - Use **phase** in the request, e.g. `&phase=menstrual` (backend maps to `period` for logs; calendar still returns all days, with log data only merged for matching logs).

- **Selected date (detail + edit)**  
  `GET /api/logs/by-date?date=2025-09-12`  
  Use **data.log** (or null) to show mood list, flow, note text, temperature, and feed the edit form.  
  On save: `POST /api/logs` with **date** and the fields to set (creates or updates the log for that date).

- **Yearly view**  
  `GET /api/cycles/calendar/enhanced?year=2025`  
  Use **data.months[].calendar** for each month; color each day by **phase** (no need to show per-day log icons unless you want them).

---

## 4. Data Shape Reference

- **Log (by-date or POST response)**  
  **date**, **mood** (array of: happy, energetic, calm, sleepy, anxious, sad, guilty, angry), **flow** (light, medium, heavy, spotting), **flowIntensity** (A, B, C), **notes** (string), **temperature** (e.g. `{ value: 97.5, unit: 'fahrenheit' }`), **phase** (period, follicular, ovulation, luteal, …), **symptoms**, **customLogs**.

- **Enhanced calendar day**  
  **date**, **day**, **cycleDay**, **phase**, **phaseName**, **isPeriod**, **hasLog**, and when present: **mood**, **flow**, **flowIntensity**, **notes**, **temperature**.

---

## 5. Conclusion

The backend is **capable of supporting the calendar screens**:

- Monthly and yearly views, phase-based highlighting, and Mood/Flow/Notes indicators and detail are covered by **GET /api/cycles/calendar/enhanced** and **GET /api/logs/by-date**.
- Add/Edit log is covered by **POST /api/logs** (upsert by date).
- Phase filter is supported via **phase** query and **menstrual** → **period** mapping; for best flexibility, use **type=all** and do phase highlighting on the client from each day’s **phase** field.

The only optional gap is **DELETE** for a log entry (e.g. **DELETE /api/logs/:id**), which can be added if the UI needs to remove a log for a day.
