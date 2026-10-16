# Demo Rehearsal Report — Fast 4G (150 ms RTT / 4 Mbps down / 1.5 Mbps up)

**Generated:** 2026-10-16T12:28:46.373Z
**Browser:** chromium channel msedge

## Timings

| Metric | Value | Budget | Verdict |
|---|---|---|---|
| First Contentful Paint | 3640 ms | < 3000 ms | WARN |
| DOM interactive (goto → load) | 3672 ms | < 30000 ms | PASS |
| Time to interactive (SPA shell) | 21 ms | < 15000 ms | PASS |
| Requests | 5 | — | — |
| Transfer | 1.26 MB | — | — |

## Bundle budget

| Bundle | Size | Budget | Verdict |
|---|---|---|---|
| index-ssFgFHKQ.js | 7.25 MB | < 8 MB | PASS |

## Bucket C neutral state (intentionally disabled modules)

| Route | HTTP | Live API | Rows | "Module not enabled" absent |
|---|---|---|---|---|
| /admin/infection-control | 200 | 200 | 0 | PASS |
| /admin/quality | 200 | 200 | 0 | PASS |

_TTI definition: navigation start → first interactive nav link visible after hydration. Console warnings are recorded in `zero-error-trap.json`._
