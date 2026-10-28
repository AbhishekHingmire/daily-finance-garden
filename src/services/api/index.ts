import { LocalStorageWealthRepository } from "./local-storage-repository";
import { RestWealthRepository } from "./rest-repository";
import type { WealthRepository } from "./types";

export * from "./config";
export * from "./types";
export * from "./auth-api";
export * from "./institutions-api";
export * from "./market-api";
export * from "./local-storage-repository";
export * from "./rest-repository";

// Default singleton instance using RestWealthRepository for live .NET 10 API integration
let defaultRepository: WealthRepository = new RestWealthRepository();

/**
 * Retrieve the active WealthRepository instance.
 */
export function getWealthRepository(): WealthRepository {
  return defaultRepository;
}

/**
 * Configure or swap the active WealthRepository implementation (e.g. switch to REST API).
 */
export function setWealthRepository(repo: WealthRepository): void {
  defaultRepository = repo;
}
