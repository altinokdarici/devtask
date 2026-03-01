export interface DevTaskConfig {
  controlPlane: {
    port: number;
    storeDir: string;
  };
  provider: {
    default: string;
  };
}

export function loadConfig(): DevTaskConfig {
  return {
    controlPlane: {
      port: Number(process.env["DEVTASK_PORT"] ?? 4000),
      storeDir: process.env["DEVTASK_STORE_DIR"] ?? ".devtask/sessions",
    },
    provider: {
      default: process.env["DEVTASK_PROVIDER"] ?? "local",
    },
  };
}
