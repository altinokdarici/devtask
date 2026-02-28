# DevTask

Parallel AI task sessions for developers.

## Docs

- [Product](./docs/PRODUCT.md) — product vision and problem statement
- [Architecture](./docs/ARCHITECTURE.md) — system overview, components, session lifecycle, API
- [Node Providers](./docs/NODE_PROVIDERS.md) — provider interface, protocol, stdin/stdout communication
- [Project Structure](./docs/PROJECT_STRUCTURE.md) — monorepo layout, apps, packages, dependency graph

## Tech

- TypeScript, pnpm workspace monorepo, fully ESM (`"type": "module"` everywhere)
- Node 22+ — runs TypeScript natively via `--experimental-strip-types`, no transpile step in dev
- Dev loop: `pnpm dev` → `node --watch --experimental-strip-types src/index.ts` (auto-restart on save)
- Production: `pnpm build` → `tsc` for type-checked output, `pnpm start` → `node dist/index.js`
- No tsx, nodemon, ts-node, or any other runtime — just Node
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) for agent runtime
- REST + SSE between clients and control plane
- stdin/stdout over platform-native transport between control plane and nodes

## Git conventions

- Single-line commit messages using [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat: add session manager`, `fix: handle missing node ID`)
- No AI attribution in commit messages (no co-authored-by, no tool mentions)
- Prefer small, focused PRs over large ones — stack PRs when needed for better code review experience
