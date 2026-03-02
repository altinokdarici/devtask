import type { createApiClient } from "./create-api-client.ts";

export type ApiClient = ReturnType<typeof createApiClient>;
