import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface CodespaceProfile {
  repo: string;
  machine?: string;
}

export interface DevTaskConfig {
  controlPlane: {
    port: number;
    storeDir: string;
  };
  provider: {
    default: string;
  };
  codespaceProfiles: Record<string, CodespaceProfile>;
}

interface ConfigFile {
  defaultProvider?: string;
  port?: number;
  storeDir?: string;
  codespaceProfiles?: Record<string, CodespaceProfile>;
}

function readConfigFile(path: string): ConfigFile {
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as ConfigFile;
  } catch {
    return {};
  }
}

export function loadConfig(configPath?: string): DevTaskConfig {
  const file = readConfigFile(configPath ?? resolve(".devtask", "config.json"));

  return {
    controlPlane: {
      port: Number(process.env["DEVTASK_PORT"] ?? file.port ?? 4000),
      storeDir: process.env["DEVTASK_STORE_DIR"] ?? file.storeDir ?? ".devtask/sessions",
    },
    provider: {
      default: process.env["DEVTASK_PROVIDER"] ?? file.defaultProvider ?? "local",
    },
    codespaceProfiles: file.codespaceProfiles ?? {},
  };
}
