import { runMockAgent } from "./mock-agent.ts";
import { listenForSignals } from "./stdin-handler.ts";

const brief = process.argv[2];

if (!brief) {
  console.error("Usage: agent-runtime <task-brief>");
  process.exit(1);
}

listenForSignals(() => {
  process.exit(0);
});

await runMockAgent(brief);
