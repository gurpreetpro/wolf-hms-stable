# Kickoff — WARD-TILE: Fix Admin "Live Operational Modules" Ward Tiles

**Goal:** Admin dashboard tile grid must offer BOTH dashboards distinctly:
- **Nurse Station (Ward Board)** → `/ward` (nurse dashboard)
- **Ward Management (Incharge)** → `/ward-management` (bed/ward/roster management)
And remove the duplicate "Ward Config" tile.

**Executor:** Gemini Flash / Claude Opus
**Scope: ONE file** — `client/src/pages/Dashboard.jsx`. Do NOT touch `App.jsx`, `DashboardHome.jsx`, routes, or any server file.

**Source of truth:** local repo `c:\Users\HP\.gemini\antigravity\scratch\wolf-hms-stable`, branch `main`.

---

## Root cause (already diagnosed by Conductor — do not re-investigate)

- Role landing is already correct (`DashboardHome.jsx`: nurse → WardDashboard, ward_incharge → WardManagement). DO NOT change it.
- `/ward` = nurse station (`WardDashboard.jsx`), `/ward-management` = incharge UI (`WardManagement.jsx`). Both routes exist and work.
- Problem: admin tile grid labels "Wards" as "Bed Management & IPD" but opens the nurse station; the management UI has no tile; "Ward Config" (`/admin/wards`) renders the same `WardManagement` page (duplicate).

## Edit 1 — Relabel the "Wards" tile (line ~210)

Replace exactly:

```jsx
        {
            icon: Bed,
            label: 'Wards',
            desc: 'Bed Management & IPD',
            path: '/ward',
            color: '#10b981',
            bg: '#ecfdf5',
            category: 'clinical',
            tags: ['ward', 'ipd', 'beds', 'admission', 'inpatient', 'nursing'],
            stat: `${stats.bedOccupancy}/${stats.totalBeds}`,
            statLabel: 'Occupancy',
            statColor: stats.bedOccupancy > 45 ? 'text-danger' : 'text-success'
        },
```

with:

```jsx
        {
            icon: Bed,
            label: 'Nurse Station (Ward Board)',
            desc: 'Vitals • Meds • Emergency • Care Tasks',
            path: '/ward',
            color: '#10b981',
            bg: '#ecfdf5',
            category: 'clinical',
            tags: ['ward', 'nurse station', 'ipd', 'admission', 'inpatient', 'nursing', 'vitals'],
            stat: `${stats.bedOccupancy}/${stats.totalBeds}`,
            statLabel: 'Occupancy',
            statColor: stats.bedOccupancy > 45 ? 'text-danger' : 'text-success'
        },
        {
            icon: Building2,
            label: 'Ward Management (Incharge)',
            desc: 'Ward Setup • Beds • Roster • Consumables',
            path: '/ward-management',
            color: '#0891b2',
            bg: '#ecfeff',
            category: 'clinical',
            tags: ['ward management', 'ward incharge', 'beds', 'roster', 'equipment', 'consumables']
        },
```

## Edit 2 — Remove the duplicate "Ward Config" tile (line ~595)

Delete exactly this block (it pointed to `/admin/wards`, which renders the same WardManagement page):

```jsx
        {
            icon: Building2,
            label: 'Ward Config',
            desc: 'Ward Setup & Bed Layout',
            path: '/admin/wards',
            color: '#84cc16',
            bg: '#f7fee7',
            category: 'admin',
            tags: ['ward config', 'bed configuration', 'wards', 'rooms', 'bed types']
        },
```

⚠️ Do NOT delete the `/admin/wards` route in `App.jsx` — only this tile. `Building2` stays used (new tile), so no import changes.

## Hard exclusions

- No edits to any file other than `client/src/pages/Dashboard.jsx`
- No dependency installs
- No test file changes EXCEPT: if `client/src/components/Dashboard.test.jsx` hardcodes "47 modules" and fails, tell the Conductor — do NOT change code to satisfy a stale count (module count net +1 now).

## Verification gate (executor must run and paste output)

```powershell
cd client
npm run build            # must pass
Get-ChildItem dist/assets | Select-Object Name   # note new hashed bundle name
```

Report: build result + new bundle hash name. **Conductor handles commit, deploy, and prod verification.**
