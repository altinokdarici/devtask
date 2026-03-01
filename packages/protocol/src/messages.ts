// Agent → Control Plane (stdout)

export interface StatusMessage {
  type: "status";
  status: "running" | "done" | "failed";
}

export interface LogMessage {
  type: "log";
  text: string;
}

export interface QuestionMessage {
  type: "question";
  id: string;
  text: string;
  options?: string[];
}

export type AgentMessage = StatusMessage | LogMessage | QuestionMessage;

// Control Plane → Agent (stdin)

export interface AnswerCommand {
  type: "answer";
  questionId: string;
  value: string;
}

export interface SignalCommand {
  type: "signal";
  action: "pause" | "cancel";
}

export type Command = AnswerCommand | SignalCommand;
