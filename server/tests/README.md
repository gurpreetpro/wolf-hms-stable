# WOLF HMS Test Suite

Test files for API and integration testing.

## Structure

```
tests/
├── test_auth.js         # Authentication tests
├── test_api.js          # General API tests
├── test_lab_*.js        # Lab module tests
├── test_pharmacy_*.js   # Pharmacy tests
├── test_nurse_*.js      # Nursing module tests
└── ...
```

## Running Tests

```bash
cd server
node tests/test_auth.js
node tests/test_api.js
```

## Test Framework
Tests use Node.js assert or simple HTTP requests.
Jest migration recommended for future.
