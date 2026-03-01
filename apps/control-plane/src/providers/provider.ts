import type { SpawnedProcess, SpawnOptions } from "@anthropic-ai/claude-agent-sdk";

export type SpawnFn = (options: SpawnOptions) => SpawnedProcess;

export interface NodeConfig {
  sessionId: string;
  provider: string;
}

export interface NodeProvider {
  provision(config: NodeConfig): Promise<NodeHandle>;
}

export interface NodeHandle {
  readonly nodeId: string;
  readonly spawnFn: SpawnFn;
  destroy(): Promise<void>;
}
