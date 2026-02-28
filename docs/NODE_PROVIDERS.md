# Node Providers — Design

## The Problem

DevTask runs on the user's machine. Nodes run elsewhere — Docker containers, Codespaces, cloud VMs. Both sides can be behind NAT. Neither can reliably open a port the other can reach.

We need a communication model that works across all platforms without requiring HTTP servers, port forwarding, or relay infrastructure.

## The Solution

Every platform already provides a way to execute a process remotely and stream its I/O:

| Platform | Command |
|---|---|
| GitHub Codespace | `gh cs ssh -c <name> --` |
| Docker | `docker exec -i <container>` |
| Cloud VM | `ssh user@host` |

The agent runtime runs as a child process on the node. The control plane talks to it through **stdin/stdout over the platform's native transport**. No servers, no ports, no tunnels.

```
Control Plane (server)
│
└── <platform-specific exec> ./agent-runtime
        │
        stdout ◄── agent messages (status, logs, questions)
        stdin  ──► signals (pause, cancel, user answers)
```

## Interface

One interface covers the full lifecycle — provisioning, communication, and teardown. No separate transport abstraction.

```typescript
interface NodeProvider {
  provision(config: NodeConfig): Promise<NodeHandle>;
}

interface NodeHandle {
  readonly nodeId: string;

  // Start the agent runtime, returns a running process
  start(taskBrief: string): AgentProcess;

  // Destroy the node (after agent signals done, or cancellation)
  destroy(): Promise<void>;
}

interface AgentProcess {
  // Stream of structured messages from the agent
  messages: AsyncIterable<AgentMessage>;

  // Send a signal to the agent (pause, cancel, user answer)
  signal(command: Command): Promise<void>;

  // Kill the agent process (not the node — node stays alive for resume)
  kill(): Promise<void>;
}
```

## Message Protocol

Communication between the control plane and agent runtime uses newline-delimited JSON over stdin/stdout.

### Agent → Control Plane (stdout)

```jsonl
{"type":"status","status":"running"}
{"type":"log","text":"Reading auth module..."}
{"type":"log","text":"Writing test file..."}
{"type":"question","id":"q1","text":"Should I use vitest or jest?","options":["vitest","jest"]}
{"type":"log","text":"All tests passing, opening PR..."}
{"type":"log","text":"Addressing review comment on line 23..."}
{"type":"status","status":"done"}
```

The control plane doesn't interpret these messages — it relays them to connected clients via SSE. Status messages (`running`, `done`, `failed`) update the session state. Everything else passes through.

### Control Plane → Agent (stdin)

```jsonl
{"type":"answer","questionId":"q1","value":"vitest"}
{"type":"signal","action":"pause"}
{"type":"signal","action":"cancel"}
```

## Provider Implementations

Each provider maps the `NodeProvider` interface to platform-specific commands. The node stays alive between `start()` and `destroy()` — if the agent goes idle (e.g. during PR review), the process can exit and `start()` is called again with the SDK's session resume.

### CodespaceProvider (shipping first)

```
provision()  → gh cs create --repo <repo> --machine <size>
start()      → gh cs ssh -c <name> -- ./agent-runtime
signal()     → write JSON to stdin of the ssh process
kill()       → gh cs ssh -c <name> -- kill <pid>
destroy()    → gh cs delete -c <name>
```

### DockerProvider (future)

```
provision()  → docker create + docker start
start()      → docker exec -i <container> ./agent-runtime
signal()     → write JSON to stdin of the exec process
kill()       → docker exec <container> kill <pid>
destroy()    → docker rm -f <container>
```

### VMProvider (future)

```
provision()  → cloud API (e.g. EC2 RunInstances) + wait for SSH
start()      → ssh user@host ./agent-runtime
signal()     → write JSON to stdin of the ssh process
kill()       → ssh user@host kill <pid>
destroy()    → cloud API to terminate instance
```

## Agent Runtime Lifecycle

The agent runtime is a small TypeScript process that runs inside the node:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// Read task brief from stdin or args
const brief = await readBrief();

for await (const message of query({
  prompt: brief,
  options: {
    systemPrompt: DEVTASK_AGENT_PROMPT,
    allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep", "Task"],
    permissionMode: "acceptEdits",
    resume: sessionId,  // for resuming after pause or review cycle
    agents: {
      planner: {
        description: "Creates step-by-step plans from task briefs.",
        prompt: PLANNER_PROMPT,
        tools: ["Read", "Glob", "Grep"],
      }
    }
  }
})) {
  // Write structured messages to stdout for the control plane
  emit(toAgentMessage(message));
}
```

It also listens on stdin for signals from the control plane (pause, cancel, review comments).

## Node Lifecycle

The node stays alive between `start()` and `destroy()`. The agent handles its own workflow end-to-end — including PR creation, review cycles, and watching for merges. The control plane only knows:

- `running` — agent is working
- `done` — agent signaled it's finished, node can be torn down
- `failed` — agent encountered an unrecoverable error

```
Control Plane                          Node
     │                                  │
     │  dispatch brief                  │
     ├──► start(brief) ───────────────►│
     │                                  ├── agent works autonomously
     │  ◄── {"type":"log",...}    ◄─────┤  streams logs
     │  ◄── {"type":"question",...} ◄───┤  asks user questions
     │──► {"type":"answer",...}  ──────►│  relay user answers
     │                                  ├── creates PR, handles reviews
     │  ◄── {"type":"status",           │
     │       "status":"done"}    ◄──────┤  agent signals done
     │                                  │
     ├──► destroy() ───────────────────►│  node torn down
     │                                  │
```

## Why This Design

| Decision | Rationale |
|---|---|
| stdin/stdout over native transport | Works behind any NAT. No servers, ports, or relay infra needed. |
| Provider owns provisioning + communication | One interface, no separate transport layer to wire up. |
| Newline-delimited JSON protocol | Simple, streamable, debuggable. Easy to parse in any language. |
| Node stays alive until agent signals done | Agent owns its full lifecycle including PR reviews. |
| SDK session resume | Agent picks up where it left off after pause or review idle. |
