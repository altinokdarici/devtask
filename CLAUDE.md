# DevTask

Parallel AI task sessions for developers.

## Docs

- [Product](./docs/PRODUCT.md) — product vision and problem statement
- [Architecture](./docs/ARCHITECTURE.md) — system overview, components, session lifecycle, API
- [Node Providers](./docs/NODE_PROVIDERS.md) — provider interface, protocol, stdin/stdout communication
- [Project Structure](./docs/PROJECT_STRUCTURE.md) — monorepo layout, apps, packages, dependency graph

## Tech

- TypeScript, pnpm workspace monorepo, fully ESM (`"type": "module"` everywhere)
- Node 25+ — runs TypeScript natively (type stripping on by default), no transpile step in dev
- Dev loop: `pnpm dev` → `node --watch src/index.ts` (auto-restart on save)
- `erasableSyntaxOnly: true` in tsconfig — no enums, no parameter properties, no namespaces (keeps code compatible with Node's built-in type stripping)
- Production: `pnpm build` → `tsc` for type-checked output, `pnpm start` → `node dist/index.js`
- No tsx, nodemon, ts-node, or any other runtime — just Node
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) for agent runtime
- REST + SSE between clients and control plane
- stdin/stdout over platform-native transport between control plane and nodes

## Engineering rules

- **No speculative code.** Every type, function, and export in a PR must have a caller in that same PR. Don't introduce code "for later" — add it in the PR that first uses it.
- **Verify the dev loop early.** The first PR that adds cross-file imports must prove `pnpm dev` (runtime) and `pnpm build` (type-check) both work. Don't wait until later PRs to discover import resolution or config issues.

## Git conventions

- Single-line commit messages using [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat: add session manager`, `fix: handle missing node ID`)
- No AI attribution in commit messages (no co-authored-by, no tool mentions)
- Prefer small, focused PRs over large ones — stack PRs when needed for better code review experience
- Every change goes on a feature branch — never commit directly to main
- Create a PR after pushing the branch
