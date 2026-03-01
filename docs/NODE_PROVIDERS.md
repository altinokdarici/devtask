# Node Providers — Design

## The Problem

DevTask runs on the user's machine. Nodes run elsewhere — Docker containers, Codespaces, cloud VMs. Both sides can be behind NAT. Neither can reliably open a port the other can reach.

We need a communication model that works across all platforms without requiring HTTP servers, port forwarding, or relay infrastructure.

## The Solution

Every platform already provides a way to execute a process remotely and stream its I/O:

| Platform         | Command                      |
| ---------------- | ---------------------------- |
| GitHub Codespace | `gh cs ssh -c <name> --`     |
| Docker           | `docker exec -i <container>` |
| Cloud VM         | `ssh user@host`              |

The `@anthropic-ai/claude-agent-sdk` handles all communication with the Claude process through stdin/stdout. Providers just need to supply a `SpawnFn` — a function the SDK calls to launch the process in the target environment.

```
Control Plane (server)
│
└── query({ spawnClaudeCodeProcess: provider.spawnFn })
        │
        SDK manages stdin/stdout automatically
        │
        Node (Codespace / Docker / VM)
        └── Claude Code process
```

## Interface

Each provider implements two interfaces: provisioning the environment and supplying a spawn function.

```typescript
import type { SpawnedProcess, SpawnOptions } from "@anthropic-ai/claude-agent-sdk";

type SpawnFn = (options: SpawnOptions) => SpawnedProcess;

interface NodeProvider {
  provision(config: NodeConfig): Promise<NodeHandle>;
}

interface NodeHandle {
  readonly nodeId: string;
  readonly spawnFn: SpawnFn;
  destroy(): Promise<void>;
}
```

The `SpawnFn` receives `SpawnOptions` from the SDK (command, args, env, signal) and returns a `SpawnedProcess` (stdin, stdout, exit events). For local dev, this is a thin wrapper around `child_process.spawn`. For remote providers, it maps to the platform's exec command (e.g. `gh cs ssh`).

## Provider Implementations

Each provider maps the `NodeProvider` interface to platform-specific commands.

### CodespaceProvider (shipping first)

```
provision()  → gh cs create --repo <repo> --machine <size>
spawnFn()    → gh cs ssh -c <name> -- <command> <args>
destroy()    → gh cs delete -c <name>
```

The `spawnFn` wraps `gh cs ssh` as a `SpawnedProcess`, piping stdin/stdout through the SSH tunnel. The SDK calls this function each time it needs to launch or restart the Claude process.

### DockerProvider (future)

```
provision()  → docker create + docker start
spawnFn()    → docker exec -i <container> <command> <args>
destroy()    → docker rm -f <container>
```

### VMProvider (future)

```
provision()  → cloud API (e.g. EC2 RunInstances) + wait for SSH
spawnFn()    → ssh user@host <command> <args>
destroy()    → cloud API to terminate instance
```

## How It Works

The control plane calls `query()` from the SDK, passing the provider's `spawnFn`:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const handle = await provider.provision({ sessionId, provider: "codespace" });

const q = query({
  prompt: taskBrief,
  options: {
    spawnClaudeCodeProcess: handle.spawnFn,
    abortController,
    permissionMode: "bypassPermissions",
  },
});

for await (const msg of q) {
  // Relay SDK messages to clients via SSE
  sessionManager.emitAgentMessage(sessionId, msg);

  if (msg.type === "result") {
    // Agent finished — transition session to done/failed
    break;
  }
}

await handle.destroy();
```

The SDK handles the full agent lifecycle — launching the process, sending prompts, receiving responses, managing tool use, and signaling completion. The control plane just iterates messages and manages session state.

## Node Lifecycle

```
Control Plane                          Node
     │                                  │
     │  query({ spawnClaudeCodeProcess: spawnFn })
     ├──────────────────────────────►  │
     │   SDK launches process via spawnFn
     │                                  ├── agent works autonomously
     │  ◄── SDKMessage (assistant)  ◄───┤  streams responses
     │  ◄── SDKMessage (system)     ◄───┤  system info
     │                                  ├── creates PR, handles reviews
     │  ◄── SDKMessage (result)     ◄───┤  agent signals done
     │                                  │
     ├──► destroy() ───────────────────►│  node torn down
     │                                  │
```

## Why This Design

| Decision                                  | Rationale                                                       |
| ----------------------------------------- | --------------------------------------------------------------- |
| SDK's `spawnClaudeCodeProcess`            | Eliminates custom wire protocol. SDK handles all communication. |
| stdin/stdout over native transport        | Works behind any NAT. No servers, ports, or relay infra needed. |
| Provider owns provisioning + spawn        | One interface, no separate transport layer to wire up.          |
| Node stays alive until agent signals done | Agent owns its full lifecycle including PR reviews.             |
| SDK session resume                        | Agent picks up where it left off after pause or review idle.    |
