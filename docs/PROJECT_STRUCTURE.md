# DevTask — Project Structure

## Overview

pnpm workspace monorepo with two apps and shared packages.

```
devtask/
├── apps/
│   ├── cli/                  # CLI client — talks to control plane over HTTP
│   └── control-plane/        # standalone server — sessions, providers, SDK dispatch
├── packages/
│   ├── api-types/            # shared API types (client ↔ control plane)
│   └── config/               # shared configuration schema + loading
├── docs/
│   ├── PRODUCT.md
│   ├── ARCHITECTURE.md
│   ├── NODE_PROVIDERS.md
│   └── PROJECT_STRUCTURE.md
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

## Apps

### apps/cli

Thin, stateless client. Calls the control plane REST API and streams SSE events. No session state, no node knowledge. Any future client (Slack bot, web UI) is a sibling with the same capabilities.

```
cli/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              # entry point — citty command registration
    ├── api-client.ts         # HTTP client for control plane REST API + SSE streaming
    ├── commands/
    │   ├── create.ts         # devtask create --brief "..."
    │   ├── list.ts           # devtask list
    │   ├── show.ts           # devtask show <id>
    │   ├── logs.ts           # devtask logs <id> (SSE stream)
    │   ├── pause.ts          # devtask pause <id>
    │   ├── resume.ts         # devtask resume <id>
    │   └── cancel.ts         # devtask cancel <id>
    └── output/
        ├── table.ts          # session list formatting
        └── log-stream.ts     # render SDK message events to terminal
```

### apps/control-plane

Standalone HTTP server. Manages sessions, provisions nodes, dispatches SDK queries. Has no knowledge of what the agent is doing (PRs, tests, reviews are the agent's business).

```
control-plane/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              # server entry point
    ├── types.ts              # internal types (SessionStore, error classes) + re-exports from api-types
    ├── session-manager.ts    # create, pause, resume, cancel sessions + pub/sub
    ├── session-store.ts      # persist/load session state (JSON on disk)
    ├── dispatcher.ts         # assign sessions to nodes, call SDK query(), consume messages
    ├── api/
    │   ├── router.ts         # route definitions
    │   ├── sessions.ts       # session CRUD + cancel endpoints
    │   └── events.ts         # SSE endpoint for streaming agent messages
    └── providers/
        ├── provider.ts       # NodeProvider, NodeHandle, SpawnFn interfaces
        └── local.ts          # LocalProvider — spawns via child_process.spawn
```

## Packages

### packages/api-types

Shared between clients (CLI, future web UI, bots) and control plane. Defines the REST API types.

```
api-types/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts              # Session, SessionStatus, CreateSessionBody
```

### packages/config

Shared configuration schema and loading logic.

```
config/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts              # DevTaskConfig type + loadConfig()
```

## Dependency Graph

```
cli ──────────────► api-types
                  ► config

control-plane ──► api-types
                ► config
                ► @anthropic-ai/claude-agent-sdk
```

- `cli` and `control-plane` share `api-types` (REST API contract)
- `cli` and `control-plane` share `config`
- `control-plane` depends on the Claude Agent SDK for dispatching queries

## Build & Deployment

| Target        | Packages included                  | Runs where                                       |
| ------------- | ---------------------------------- | ------------------------------------------------ |
| CLI           | cli + api-types + config           | User's machine                                   |
| Control plane | control-plane + api-types + config | Any machine (user's laptop, cloud, shared infra) |
