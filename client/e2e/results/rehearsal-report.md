# Demo Rehearsal Report — Fast 4G (150 ms RTT / 4 Mbps down / 1.5 Mbps up)

**Generated:** 2026-10-15T13:22:31.316Z
**Browser:** chromium channel msedge

## Timings

| Metric | Value | Budget | Verdict |
|---|---|---|---|
| First Contentful Paint | n/a | < 3000 ms | WARN |
| DOM interactive (goto → load) | 3562 ms | < 30000 ms | PASS |
| Time to interactive (SPA shell) | 34 ms | < 15000 ms | PASS |
| Requests | 250 | — | — |
| Transfer | 20.07 MB | — | — |

## Bundle budget

| Bundle | Size | Budget | Verdict |
|---|---|---|---|
| index-COMwxRFA.js | 7.31 MB | < 8 MB | PASS |

## Bucket C neutral state (intentionally disabled modules)

| Route | Neutral badge present | Uncaught React errors |
|---|---|---|
| /admin/infection-control | PASS | 0 |
| /admin/quality | PASS | 0 |

_TTI definition: navigation start → first interactive nav link visible after hydration. Console warnings are recorded in `zero-error-trap.json`._
