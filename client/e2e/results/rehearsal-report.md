# Demo Rehearsal Report — Fast 4G (150 ms RTT / 4 Mbps down / 1.5 Mbps up)

**Generated:** 2026-10-15T12:45:36.700Z
**Browser:** chromium channel msedge

## Timings

| Metric | Value | Budget | Verdict |
|---|---|---|---|
| First Contentful Paint | 3668 ms | < 3000 ms | WARN |
| DOM interactive (goto → load) | 3696 ms | < 30000 ms | PASS |
| Time to interactive (SPA shell) | 24 ms | < 15000 ms | PASS |
| Requests | 5 | — | — |
| Transfer | 1.28 MB | — | — |

## Bundle budget

| Bundle | Size | Budget | Verdict |
|---|---|---|---|
| index-6sfNt8ER.js | 7.31 MB | < 8 MB | PASS |

## Bucket C neutral state (intentionally disabled modules)

| Route | Neutral badge present | Uncaught React errors |
|---|---|---|
| /admin/infection-control | PASS | 0 |
| /admin/quality | WARN (no explicit badge text found) | 0 |

_TTI definition: navigation start → first interactive nav link visible after hydration. Console warnings are recorded in `zero-error-trap.json`._
