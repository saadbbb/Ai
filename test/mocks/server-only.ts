// Stub for the real "server-only" package (which unconditionally throws when
// executed outside Next's webpack build). Aliased in vitest.config.ts so
// service files that start with `import "server-only"` can be imported by
// tests without pulling in Next's build-time bundler magic.
export {};
