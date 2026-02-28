import type { AgentMessage, Command } from "../protocol/messages.ts";

export interface NodeConfig {
  sessionId: string;
  provider: string;
}

export interface NodeProvider {
  provision(config: NodeConfig): Promise<NodeHandle>;
}

export interface NodeHandle {
  readonly nodeId: string;
  start(taskBrief: string): AgentProcess;
  destroy(): Promise<void>;
}

export interface AgentProcess {
  messages: AsyncIterable<AgentMessage>;
  signal(command: Command): Promise<void>;
  kill(): Promise<void>;
}
