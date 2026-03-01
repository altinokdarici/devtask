# DevTask — Architecture

## Overview

DevTask is a distributed system that orchestrates parallel AI coding sessions. It has three layers:

- **Clients** (CLI, Slack bot, web UI) — user-facing, stateless, talk to the control plane over REST + SSE
- **Control plane** — standalone server that manages sessions, provisions nodes, and relays messages
- **Nodes** — isolated environments (GitHub Codespaces) where Claude Agent SDK agents do all the coding work

The control plane has no knowledge of what the agent is doing (PRs, tests, git, reviews). It just manages sessions and passes messages through. The agent decides when it's done.

```
    CLI          Slack Bot       Web UI        Teams Bot
     │               │             │              │
     └───────────────┴──────┬──────┴──────────────┘
                            │
                    REST + SSE (HTTP)
                            │
                   ┌────────┴────────┐
                   │  Control Plane  │
                   │    (server)     │
                   └────────┬────────┘
                            │
                    NodeProvider interface
                            │
                 ┌──────────┼──────────┐
                 │          │          │
              Node A     Node B     Node C
              Agent      Agent      Agent
              SDK        SDK        SDK
```

## Responsibilities

**Clients own:** presenting information to the user, sending commands.

**Control plane owns:**

- Session lifecycle (create, pause, resume, cancel, done, failed)
- Node provisioning and teardown via the provider interface
- Dispatch and concurrency (queue tasks, enforce limits)
- Message relay — streams SDK messages to clients via SSE
- Does NOT interpret agent messages — just passes them through

**Each node owns:** everything about the actual coding work — cloning the repo, reading code, planning, editing files, running tests, committing, opening PRs, responding to reviews. The agent decides its own workflow and signals when it's done.

## Core Components

### Clients

Any application that talks to the control plane API. The CLI ships first, but Slack bots, web UIs, and other integrations are sibling clients with no special privileges.

```
devtask create --brief "Add unit tests for auth module"
devtask list
devtask show <id>
devtask logs <id>
devtask pause <id>
devtask resume <id>
devtask cancel <id>
```

### Control Plane

Standalone HTTP server. Can run on the user's machine, a cloud box, or shared team infrastructure. Exposes a REST API for commands and SSE endpoints for streaming logs/events.

### Node Provider

Pluggable interface for provisioning isolated environments. Each provider supplies a `SpawnFn` that the SDK calls to launch the Claude process remotely. See [NODE_PROVIDERS.md](./NODE_PROVIDERS.md) for the full design.

The initial implementation is **GitHub Codespaces**. The interface supports adding other providers (Docker, cloud VMs) later.

### SDK Integration

The control plane calls `query()` from `@anthropic-ai/claude-agent-sdk` directly, passing the provider's `spawnFn` as the `spawnClaudeCodeProcess` option. The SDK handles all communication with the Claude process — no custom wire protocol needed. The control plane iterates the SDK's `AsyncGenerator<SDKMessage>` to relay messages and detect completion.

## Session Lifecycle

From the control plane's perspective, sessions are simple:

```
    QUEUED ──► PROVISIONING ──► RUNNING ──► DONE
                                  │
                               PAUSED
                               FAILED
                               CANCELLED
```

The control plane doesn't know or care about PRs, reviews, tests, or any agent-internal states. `RUNNING` means the agent is working. `DONE` means the SDK returned a `result` message with `subtype: "success"`. Everything in between is the agent's business.

## Data Model

```typescript
interface Session {
  id: string;
  brief: string;
  status: "queued" | "provisioning" | "running" | "paused" | "done" | "failed" | "cancelled";
  provider: string;
  nodeId?: string;
  agentSessionId?: string;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}
```

## Control Plane API

REST for commands, SSE for streaming.

| Method | Endpoint               | Description                                       |
| ------ | ---------------------- | ------------------------------------------------- |
| POST   | `/sessions`            | Create a new task session                         |
| GET    | `/sessions`            | List all sessions                                 |
| GET    | `/sessions/:id`        | Get session details                               |
| POST   | `/sessions/:id/pause`  | Pause a session                                   |
| POST   | `/sessions/:id/resume` | Resume a session                                  |
| POST   | `/sessions/:id/cancel` | Cancel a session                                  |
| GET    | `/sessions/:id/events` | SSE stream — agent messages, status changes, logs |

## Tech Stack

| Layer                  | Choice                                                      |
| ---------------------- | ----------------------------------------------------------- |
| Language               | TypeScript                                                  |
| AI runtime             | `@anthropic-ai/claude-agent-sdk` — `query()` with `SpawnFn` |
| Client ↔ Control plane | REST + SSE                                                  |
| Control plane ↔ Nodes  | SDK manages stdin/stdout via provider's `SpawnFn`           |
| State storage          | JSON files on disk (control plane)                          |

## Known Limitations (to improve later)

- **Reconnection** — on restart, the control plane re-runs `query()` with SDK resume on sessions that were `running`. Log messages emitted during the gap are lost. A more robust solution (agent-side buffering, replay) is needed for production.
- **Queuing** — basic in-memory FIFO queue with a concurrency cap. No persistence, no priority, no fairness. Needs a durable queue mechanism as usage scales.

## Project Structure

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).
