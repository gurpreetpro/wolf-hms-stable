# System-wide API Probe Report

**Generated:** 3/1/2026, 12:30:21 pm

## Summary

| Metric | Count |
|--------|-------|
| Total Endpoints | 54 |
| ✅ Passed | 17 |
| ❌ Failed | 37 |
| Success Rate | 31.5% |

## ❌ Failed Endpoints

| Endpoint | Status | Error |
|----------|--------|-------|
| `/api/auth/me` | 404 | Not Found |
| `/api/patients` | 404 | Not Found |
| `/api/patients/today` | 500 | Internal Server Error |
| `/api/opd/visits/today` | 404 | Not Found |
| `/api/lab/analytics/workload` | 500 | Internal Server Error |
| `/api/lab/pending-payments` | 500 | Internal Server Error |
| `/api/pharmacy/prescriptions` | 404 | Not Found |
| `/api/inventory` | 404 | Not Found |
| `/api/inventory/categories` | 404 | Not Found |
| `/api/wards` | 404 | Not Found |
| `/api/wards/beds` | 404 | Not Found |
| `/api/wards/consumables` | 404 | Not Found |
| `/api/finance/summary` | 404 | Not Found |
| `/api/finance/transactions` | 404 | Not Found |
| `/api/finance/pending` | 404 | Not Found |
| `/api/finance/revenue` | 404 | Not Found |
| `/api/finance/analytics` | 404 | Not Found |
| `/api/billing/pending` | 404 | Not Found |
| `/api/billing/invoices` | 404 | Not Found |
| `/api/bloodbank/inventory` | 404 | Not Found |
| `/api/bloodbank/donors` | 404 | Not Found |
| `/api/appointments` | 500 | Internal Server Error |
| `/api/appointments/today` | 404 | Not Found |
| `/api/dashboard/stats` | 404 | Not Found |
| `/api/dashboard/kpi` | 404 | Not Found |
| `/api/hospital/profile` | 404 | Not Found |
| `/api/hospital/departments` | 404 | Not Found |
| `/api/staff` | 404 | Not Found |
| `/api/nurse/care-tasks` | 404 | Not Found |
| `/api/nurse/handover` | 404 | Not Found |
| `/api/ipd/rounds` | 404 | Not Found |
| `/api/ipd/vitals` | 404 | Not Found |
| `/api/reports/daily` | 404 | Not Found |
| `/api/security/patrols` | 404 | Not Found |
| `/api/equipment` | 404 | Not Found |
| `/api/housekeeping/tasks` | 404 | Not Found |
| `/api/dietary/orders` | 404 | Not Found |

## ✅ Passing Endpoints

| Endpoint | Status | Duration | Data Count |
|----------|--------|----------|------------|
| `/api/auth/users` | 200 | 99ms | 1 |
| `/api/admissions/active` | 200 | 88ms | 1 |
| `/api/opd/queue` | 200 | 61ms | 1 |
| `/api/lab/queue` | 200 | 58ms | 1 |
| `/api/lab/stats` | 200 | 66ms | 1 |
| `/api/lab/tests` | 200 | 61ms | 1 |
| `/api/lab/reagents` | 200 | 60ms | 1 |
| `/api/lab/qc/materials` | 200 | 66ms | 1 |
| `/api/lab/packages` | 200 | 69ms | 1 |
| `/api/lab/history` | 200 | 65ms | 1 |
| `/api/lab/analytics/revenue` | 200 | 65ms | 1 |
| `/api/pharmacy/inventory` | 200 | 110ms | 1 |
| `/api/finance/invoices` | 200 | 67ms | 1 |
| `/api/radiology/queue` | 200 | 71ms | 1 |
| `/api/security/incidents` | 200 | 61ms | 1 |
| `/api/visitors/active` | 200 | 72ms | 1 |
| `/api/health` | 200 | 60ms | 1 |
