import { getApiBaseUrl } from "./auth-api";

export interface PublicInstitution {
  id: string;
  name: string;
  shortName: string;
  category: "Bank" | "Wallet" | "Broker" | "Credit" | "Cash";
  primaryColor: string;
  accentColor: string;
  textColor: string;
  aliases: string[];
  iconSvg?: string;
  popularOrder: number;
}

export const institutionsApi = {
  /**
   * Fetches the authentic master list of financial institutions from the backend API.
   * Includes scheduled commercial banks, digital wallets, credit cards, and broker platforms.
   */
  async getInstitutions(category?: string): Promise<PublicInstitution[]> {
    try {
      const baseUrl = getApiBaseUrl();
      const url = category
        ? `${baseUrl}/api/v1/institutions?category=${encodeURIComponent(category)}`
        : `${baseUrl}/api/v1/institutions`;

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },
};
