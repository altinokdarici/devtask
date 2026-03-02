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

- Session lifecycle (create, cancel, done, failed, multi-turn interaction)
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
devtask reply <id> --message "Use vitest instead of jest"
devtask complete <id>
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

Sessions support multi-turn interaction. When the agent finishes a turn, the session moves to `waiting_for_input` so the user can review, reply with feedback, or mark the session as complete.

```
    QUEUED ──► PROVISIONING ──► RUNNING ──► WAITING_FOR_INPUT
                                  │               │    │
                                  │          reply ▼    │ complete
                                  │          RUNNING    ▼
                               FAILED                  DONE
                               CANCELLED
```

- `RUNNING` — the agent is actively working (consuming SDK messages)
- `WAITING_FOR_INPUT` — the agent finished a turn (`result` with `subtype: "success"`), awaiting user action
- User calls `/reply` — resumes the SDK with a new `query()` using the same `agentSessionId`, transitions back to `RUNNING`
- User calls `/complete` — tears down the node and transitions to `DONE`
- User calls `/cancel` — aborts and transitions to `CANCELLED` (valid from `RUNNING` or `WAITING_FOR_INPUT`)

The control plane doesn't know or care about PRs, reviews, tests, or any agent-internal states. It just manages session state and relays messages.

## Data Model

```typescript
interface Session {
  id: string;
  brief: string;
  status:
    | "queued"
    | "provisioning"
    | "running"
    | "waiting_for_input"
    | "done"
    | "failed"
    | "cancelled";
  provider: string;
  nodeId?: string;
  agentSessionId?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Control Plane API

REST for commands, SSE for streaming.

| Method | Endpoint                 | Description                                    |
| ------ | ------------------------ | ---------------------------------------------- |
| POST   | `/sessions`              | Create a new task session                      |
| GET    | `/sessions`              | List all sessions                              |
| GET    | `/sessions/:id`          | Get session details                            |
| POST   | `/sessions/:id/reply`    | Send a follow-up message (body: `{ message }`) |
| POST   | `/sessions/:id/complete` | Mark session as done (user accepts the result) |
| POST   | `/sessions/:id/cancel`   | Cancel a session                               |
| GET    | `/sessions/:id/events`   | SSE stream — agent messages, status changes    |

The SSE stream emits `agent_message` events containing raw SDK messages as the agent works. Clients use these for live progress (streaming text, tool calls, etc.). Status change events are emitted when the session transitions between states.

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
