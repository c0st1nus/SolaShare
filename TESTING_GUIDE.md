# Testing Guide

Tests must never run against the normal development database.

Required env:

```bash
NODE_ENV=test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solashare_test
```

Notes:

- `DATABASE_URL` is used for normal development.
- `TEST_DATABASE_URL` is used only when `NODE_ENV=test`.
- `src/tests/helpers.ts` now refuses to truncate a database unless its name clearly looks like a test database.
