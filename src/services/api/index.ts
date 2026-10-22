import { LocalStorageWealthRepository } from "./local-storage-repository";
import { RestWealthRepository } from "./rest-repository";
import type { WealthRepository } from "./types";

export * from "./config";
export * from "./types";
export * from "./local-storage-repository";
export * from "./rest-repository";

// Default singleton instance using LocalStorage for seamless client-side execution
let defaultRepository: WealthRepository = new LocalStorageWealthRepository();

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
