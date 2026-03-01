import { defineCommand, runMain } from "citty";
import { loadConfig } from "@devtask/config";
import { setBaseUrl } from "./api-client.ts";
import { createCommand } from "./commands/create.ts";
import { listCommand } from "./commands/list.ts";
import { showCommand } from "./commands/show.ts";
import { logsCommand } from "./commands/logs.ts";
import { pauseCommand } from "./commands/pause.ts";
import { resumeCommand } from "./commands/resume.ts";
import { cancelCommand } from "./commands/cancel.ts";

const config = loadConfig();
setBaseUrl(`http://localhost:${config.controlPlane.port}`);

const main = defineCommand({
  meta: {
    name: "devtask",
    description: "DevTask CLI — manage parallel AI task sessions",
    version: "0.0.0",
  },
  subCommands: {
    create: createCommand,
    list: listCommand,
    show: showCommand,
    logs: logsCommand,
    pause: pauseCommand,
    resume: resumeCommand,
    cancel: cancelCommand,
  },
});

runMain(main);
