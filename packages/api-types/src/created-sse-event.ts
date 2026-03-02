import type { Session } from "./session.ts";

export interface CreatedSseEvent {
  type: "created";
  session: Session;
}
