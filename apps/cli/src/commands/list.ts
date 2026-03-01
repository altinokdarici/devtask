import { defineCommand } from "citty";
import { listSessions } from "../api-client.ts";
import { formatSessionTable } from "../output/table.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List all sessions" },
  async run() {
    const sessions = await listSessions();
    console.log(formatSessionTable(sessions));
  },
});
