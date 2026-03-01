import type { NodeProvider } from "./provider.ts";

export class ProviderRegistry {
  private providers = new Map<string, NodeProvider>();

  register(name: string, provider: NodeProvider): void {
    this.providers.set(name, provider);
  }

  get(name: string): NodeProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Unknown provider: ${name}`);
    }
    return provider;
  }
}
