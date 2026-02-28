# DevTask — Project Structure

## Overview

pnpm workspace monorepo with three apps and shared packages.

```
devtask/
├── apps/
│   ├── cli/                  # CLI client — talks to control plane over HTTP
│   ├── control-plane/        # standalone server — sessions, providers, relay
│   └── agent-runtime/        # runs inside each node
├── packages/
│   ├── protocol/             # shared message types + codec (node ↔ control plane)
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
├── src/
│   ├── index.ts              # entry point, command registration
│   ├── commands/
│   │   ├── create.ts         # devtask create --brief "..."
│   │   ├── list.ts           # devtask list
│   │   ├── show.ts           # devtask show <id>
│   │   ├── logs.ts           # devtask logs <id> (SSE stream)
│   │   ├── pause.ts          # devtask pause <id>
│   │   ├── resume.ts         # devtask resume <id>
│   │   └── cancel.ts         # devtask cancel <id>
│   ├── api-client.ts         # HTTP client for control plane REST API
│   └── output/
│       ├── table.ts          # session list formatting
│       └── log-stream.ts     # render SSE events to terminal
└── tests/
```

### apps/control-plane

Standalone HTTP server. Manages sessions, provisions nodes, relays messages. Has no knowledge of what the agent is doing (PRs, tests, reviews are the agent's business).

```
control-plane/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # server entry point
│   ├── api/
│   │   ├── router.ts         # route definitions
│   │   ├── sessions.ts       # session CRUD endpoints
│   │   └── events.ts         # SSE endpoint for streaming agent messages
│   ├── session-manager.ts    # create, pause, resume, cancel sessions
│   ├── session-store.ts      # persist/load session state (JSON on disk)
│   ├── dispatcher.ts         # assign sessions to nodes, enforce concurrency
│   └── providers/
│       ├── provider.ts       # NodeProvider, NodeHandle, AgentProcess interfaces
│       ├── codespace.ts      # GitHub Codespace implementation (shipping first)
│       └── ...               # docker.ts, vm.ts (future)
└── tests/
```

### apps/agent-runtime

Runs inside each node (Codespace). Thin wrapper around the Claude Agent SDK. Receives a brief, runs `query()`, streams messages back over stdout/stdin. Owns its entire workflow — planning, coding, testing, git, PRs, reviews.

```
agent-runtime/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # entry point — reads brief, starts query(), streams messages
│   ├── prompts.ts            # system prompt, planner prompt
│   └── stdin-handler.ts      # listens for signals from control plane
└── tests/
```

## Packages

### packages/protocol

Shared between control plane and agent runtime. Defines the JSONL message format for stdin/stdout communication between control plane and nodes.

```
protocol/
├── package.json
├── tsconfig.json
└── src/
    ├── messages.ts           # AgentMessage, Command, StatusUpdate, Question, etc.
    └── codec.ts              # serialize/deserialize newline-delimited JSON
```

### packages/api-types

Shared between clients (CLI, future web UI, bots) and control plane. Defines the REST API request/response types and SSE event types.

```
api-types/
├── package.json
├── tsconfig.json
└── src/
    ├── requests.ts           # CreateSession, PauseSession, Signal, etc.
    ├── responses.ts          # Session, SessionList, etc.
    └── events.ts             # SSE event types (log, status, question, etc.)
```

### packages/config

Shared configuration schema and loading logic.

```
config/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              # load config, merge defaults
    └── types.ts              # config schema
```

## Dependency Graph

```
cli ──────────────► api-types
                  ► config

control-plane ──► api-types
                ► protocol
                ► config

agent-runtime ──► protocol
                ► config
```

- `cli` and `control-plane` share `api-types` (REST API contract)
- `control-plane` and `agent-runtime` share `protocol` (stdin/stdout contract)
- All three share `config`
- `cli` and `agent-runtime` never depend on each other

## Build & Deployment

| Target | Packages included | Runs where |
|---|---|---|
| CLI | cli + api-types + config | User's machine |
| Control plane | control-plane + api-types + protocol + config | Any machine (user's laptop, cloud, shared infra) |
| Agent runtime | agent-runtime + protocol + config | Inside each node (Codespace) |
