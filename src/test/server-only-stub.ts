// Vitest replacement for the `server-only` package (aliased in
// vitest.config.mts): the real module throws outside a React Server
// environment, which unit tests are not. The guarantee it enforces still
// holds in the app — this stub exists only so server modules can be
// imported under test.
export {};
