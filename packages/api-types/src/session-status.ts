export type SessionStatus =
  | "queued"
  | "provisioning"
  | "running"
  | "paused"
  | "waiting_for_input"
  | "done"
  | "failed"
  | "cancelled";
