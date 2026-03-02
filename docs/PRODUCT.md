# DevTask

### Parallel AI task sessions for developers

DevTask lets engineers run multiple independent AI-assisted coding tasks in parallel, without losing control or context.

Instead of working with one AI thread at a time, developers can create isolated task sessions that run concurrently in fresh environments. Each session has its own branch, its own discussion thread, and its own lifecycle.

---

## The Problem

AI coding tools today are single-threaded experiences. You work on one task, wait, switch context, re-explain, repeat.

Developers constantly juggle small to medium tasks:

- Add tests to a module
- Refactor a subsystem
- Upgrade dependencies
- Implement a well-scoped feature
- Fix lint or type errors

These tasks are often independent, but current tools force sequential execution and constant babysitting.

---

## The Solution

DevTask introduces structured, parallel AI sessions.

Each task:

- Runs in an isolated environment (Codespace, local, or future providers)
- Has a structured brief and plan
- Follows a deterministic execution loop
- Validates itself using tests or commands
- Creates its own branch and pull request

Developers can:

- Start multiple tasks in parallel
- Switch between sessions instantly
- Send follow-up messages when the agent needs guidance
- Review summaries instead of raw logs
- Merge results independently

It's not fire-and-forget automation. It's organized, scalable AI collaboration.

---

## How It Works

1. Create a task with a structured brief.
2. DevTask provisions an isolated environment via a pluggable provider (Codespace by default, local for development).
3. The AI generates a plan and executes it.
4. The system runs validation commands and iterates until success or timeout.
5. When the agent needs input, the session pauses and waits for your reply.
6. You reply with guidance, and the agent continues — or you mark it complete.
7. A pull request is created with a concise summary.
8. Developers review and merge.

Sessions are interactive. The agent works autonomously but can ask for clarification. You stay in control without being stuck in a single thread.

---

## CLI

```
devtask create "Add unit tests for the auth module"
devtask list
devtask show <id>
devtask logs <id>
devtask reply <id> "Use node:test, not jest"
devtask complete <id>
devtask cancel <id>
```

---

## Why It's Different

- Built for parallelism, not chat.
- Designed for independent, production-ready tasks.
- Multi-turn sessions: the agent works, asks when stuck, you reply in batches.
- Structured execution reduces babysitting.
- Clear lifecycle: brief → plan → execute → validate → PR.
- Pluggable providers: Codespace today, Docker and VMs tomorrow.
- Unified view of all active AI sessions.

---

## Vision

Turn AI coding from a single-threaded assistant into a multitasking development engine.

Developers should be able to offload independent work, manage multiple streams of progress, and move faster without cognitive overload.

DevTask helps engineers achieve more by organizing AI work the way modern development actually happens: in parallel.
