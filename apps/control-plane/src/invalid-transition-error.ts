import type { SessionStatus } from "@devtask/api-types";

export class InvalidTransitionError extends Error {
  constructor(id: string, from: SessionStatus, to: string) {
    super(`Cannot transition session ${id} from '${from}' to '${to}'`);
    this.name = "InvalidTransitionError";
  }
}
