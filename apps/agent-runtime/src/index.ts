import { listenForSignals } from "./stdin-handler.ts";

const brief = process.argv[2];

if (!brief) {
  console.error("Usage: agent-runtime <task-brief>");
  process.exit(1);
}

listenForSignals(() => {
  process.exit(0);
});

if (process.env.DEVTASK_MOCK_AGENT === "1") {
  const { runMockAgent } = await import("./mock-agent.ts");
  await runMockAgent(brief);
} else {
  const { runAgent } = await import("./agent.ts");
  await runAgent(brief);
}
