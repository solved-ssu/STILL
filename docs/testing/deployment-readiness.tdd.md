# Deployment readiness TDD evidence

## RED

Command:

```text
npx vitest run src/app/api/health/route.test.ts src/lib/ops/runtime-scripts.test.ts
```

Observed before implementation: 2 test files failed, 8 tests failed. The health route returned 200 without checking runtime configuration or SQLite, and the validation/backup scripts did not exist.

## GREEN

The same command passed after adding dependency-aware health checks, fail-fast runtime validation, and verified SQLite online backups:

```text
Test Files  2 passed (2)
Tests       8 passed (8)
```

## Regression scope

- Missing or short `AUTH_PEPPER` fails without echoing the value.
- Partial bootstrap administrator configuration fails.
- A valid database path is writable and passes `PRAGMA quick_check`.
- Health returns 503 for configuration or database integrity failures.
- Online backup preserves data and passes its own integrity check.
- A missing source DB cannot produce an empty, misleading backup.
