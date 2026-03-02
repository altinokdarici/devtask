import type { Session } from "./session.ts";

export interface UpdatedSseEvent {
  type: "updated";
  session: Session;
}
