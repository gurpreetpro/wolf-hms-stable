# System-wide API Probe Report

**Generated:** 15/10/2026, 5:01:35 pm

## Summary

| Metric | Count |
|--------|-------|
| Total Endpoints | 54 |
| ✅ Passed | 30 |
| ❌ Failed | 24 |
| Success Rate | 55.6% |

## ❌ Failed Endpoints

| Endpoint | Status | Error |
|----------|--------|-------|
| `/api/auth/me` | 404 | Endpoint not found |
| `/api/patients/today` | 500 | Internal Server Error |
| `/api/opd/visits/today` | 404 | Endpoint not found |
| `/api/pharmacy/prescriptions` | 404 | Endpoint not found |
| `/api/finance/summary` | 404 | Endpoint not found |
| `/api/finance/transactions` | 404 | Endpoint not found |
| `/api/finance/pending` | 404 | Endpoint not found |
| `/api/finance/revenue` | 404 | Endpoint not found |
| `/api/finance/analytics` | 404 | Endpoint not found |
| `/api/bloodbank/inventory` | 404 | Endpoint not found |
| `/api/bloodbank/donors` | 404 | Endpoint not found |
| `/api/appointments/today` | 404 | Endpoint not found |
| `/api/hospital/profile` | 404 | Endpoint not found |
| `/api/hospital/departments` | 404 | Endpoint not found |
| `/api/staff` | 404 | Endpoint not found |
| `/api/nurse/care-tasks` | 404 | Endpoint not found |
| `/api/nurse/handover` | 404 | Endpoint not found |
| `/api/ipd/rounds` | 404 | Endpoint not found |
| `/api/ipd/vitals` | 500 | Failed to get vitals |
| `/api/reports/daily` | 404 | Endpoint not found |
| `/api/security/patrols` | 404 | Endpoint not found |
| `/api/equipment` | 404 | Endpoint not found |
| `/api/housekeeping/tasks` | 404 | Endpoint not found |
| `/api/dietary/orders` | 404 | Endpoint not found |

## ✅ Passing Endpoints

| Endpoint | Status | Duration | Data Count |
|----------|--------|----------|------------|
| `/api/auth/users` | 200 | 12ms | 1 |
| `/api/patients` | 200 | 8ms | 1 |
| `/api/admissions/active` | 200 | 48ms | 1 |
| `/api/opd/queue` | 200 | 80ms | 1 |
| `/api/lab/queue` | 200 | 82ms | 1 |
| `/api/lab/stats` | 200 | 45ms | 1 |
| `/api/lab/tests` | 200 | 50ms | 1 |
| `/api/lab/reagents` | 200 | 62ms | 1 |
| `/api/lab/qc/materials` | 200 | 49ms | 1 |
| `/api/lab/packages` | 200 | 46ms | 1 |
| `/api/lab/history` | 200 | 51ms | 1 |
| `/api/lab/analytics/revenue` | 200 | 39ms | 1 |
| `/api/lab/analytics/workload` | 200 | 37ms | 1 |
| `/api/lab/pending-payments` | 200 | 41ms | 1 |
| `/api/pharmacy/inventory` | 200 | 58ms | 4 |
| `/api/inventory` | 200 | 7ms | 1 |
| `/api/inventory/categories` | 200 | 6ms | 1 |
| `/api/wards` | 200 | 40ms | 1 |
| `/api/wards/beds` | 200 | 12ms | 1 |
| `/api/wards/consumables` | 200 | 21ms | 1 |
| `/api/finance/invoices` | 200 | 81ms | 1 |
| `/api/billing/pending` | 200 | 38ms | 1 |
| `/api/billing/invoices` | 200 | 40ms | 1 |
| `/api/appointments` | 200 | 38ms | 1 |
| `/api/dashboard/stats` | 200 | 200ms | 1 |
| `/api/dashboard/kpi` | 200 | 9ms | 1 |
| `/api/radiology/queue` | 200 | 8ms | 1 |
| `/api/security/incidents` | 200 | 25ms | 1 |
| `/api/visitors/active` | 200 | 34ms | 1 |
| `/api/health` | 200 | 2ms | 1 |
