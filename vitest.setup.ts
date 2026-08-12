/**
 * Test environment defaults.
 *
 * Set before any module reads `process.env`, so `lib/env.ts` parses cleanly and
 * the crypto helpers derive stable keys.
 */
// NODE_ENV is typed read-only by @types/node; vitest already sets it to "test".
process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-characters-long";
process.env.APP_BASE_URL ??= "http://localhost:3000";
process.env.DEFAULT_TIMEZONE ??= "Europe/London";
process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/gathered_test";
