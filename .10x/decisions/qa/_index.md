# QA

| Feature | What | Status |
| --- | --- | --- |
| local-database | Persistence of all office data in SQLite, checked across a restart | Passed 2026-10-18 |

Principle: persistence is checked from a fresh browser after a server restart, never from the browser that wrote it.
