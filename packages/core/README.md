# packages/core (placeholder)

Reserved for `@fateboard/core`: shared, pure code used by the web app, the desktop shell and later the MCP
server / backend. First candidates are the pure domains `src/character` and `src/scene` (minus their Fabric edge
`board.ts`) and `src/lib/seededRandom.ts`. **Empty on purpose** until that move is planned and approved.

Rules once it has code: no React, Fabric, `@store` or `@/lib/storage` imports (add a guard test); ship
TypeScript source through `exports` (no build step); exact dependency versions only.

When it gets code it needs its own `package.json`. Apps then consume it as a local dependency
(`"@fateboard/core": "file:../../packages/core"`), and the `apps/web` Dockerfile build context must include it.
