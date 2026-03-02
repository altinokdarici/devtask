export type SessionStatus =
  | "queued"
  | "provisioning"
  | "running"
  | "waiting_for_input"
  | "done"
  | "failed"
  | "cancelled";
