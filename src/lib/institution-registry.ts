/**
 * Authentic Financial Institution & Bank Registry
 * Normalizes bank, wallet, broker, and institution names to authentic branding metadata.
 */

export interface InstitutionMeta {
  id: string;
  name: string;
  shortName: string;
  category: "Bank" | "Wallet" | "Broker" | "Cash" | "Credit";
  primaryColor: string;
  accentColor: string;
  textColor: string;
  aliases: string[];
}

export const INSTITUTIONS: Record<string, InstitutionMeta> = {
  HDFC: {
    id: "HDFC",
    name: "HDFC Bank",
    shortName: "HDFC",
    category: "Bank",
    primaryColor: "#004c8f",
    accentColor: "#ed1c24",
    textColor: "#ffffff",
    aliases: ["hdfc", "hdfc bank", "hdfc bank ltd", "hdfc-bank"],
  },
  SBI: {
    id: "SBI",
    name: "State Bank of India",
    shortName: "SBI",
    category: "Bank",
    primaryColor: "#0082c9",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    aliases: ["sbi", "state bank of india", "state bank", "sbi bank"],
  },
  ICICI: {
    id: "ICICI",
    name: "ICICI Bank",
    shortName: "ICICI",
    category: "Bank",
    primaryColor: "#9c1f24",
    accentColor: "#f37021",
    textColor: "#ffffff",
    aliases: ["icici", "icici bank", "icici bank ltd", "icici-bank"],
  },
  AXIS: {
    id: "AXIS",
    name: "Axis Bank",
    shortName: "Axis",
    category: "Bank",
    primaryColor: "#97144d",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    aliases: ["axis", "axis bank", "axis bank ltd", "uti bank"],
  },
  KOTAK: {
    id: "KOTAK",
    name: "Kotak Mahindra Bank",
    shortName: "Kotak",
    category: "Bank",
    primaryColor: "#ed1c24",
    accentColor: "#003366",
    textColor: "#ffffff",
    aliases: ["kotak", "kotak mahindra", "kotak bank", "kotak 811"],
  },
  PNB: {
    id: "PNB",
    name: "Punjab National Bank",
    shortName: "PNB",
    category: "Bank",
    primaryColor: "#a21d22",
    accentColor: "#ffcb05",
    textColor: "#ffffff",
    aliases: ["pnb", "punjab national bank", "punjab national"],
  },
  BOB: {
    id: "BOB",
    name: "Bank of Baroda",
    shortName: "BOB",
    category: "Bank",
    primaryColor: "#f26522",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    aliases: ["bob", "bank of baroda", "baroda"],
  },
  CANARA: {
    id: "CANARA",
    name: "Canara Bank",
    shortName: "Canara",
    category: "Bank",
    primaryColor: "#0091df",
    accentColor: "#ffb81c",
    textColor: "#ffffff",
    aliases: ["canara", "canara bank"],
  },
  UNION: {
    id: "UNION",
    name: "Union Bank of India",
    shortName: "Union Bank",
    category: "Bank",
    primaryColor: "#e31e24",
    accentColor: "#0054a6",
    textColor: "#ffffff",
    aliases: ["union bank", "union bank of india", "ubi"],
  },
  INDUSIND: {
    id: "INDUSIND",
    name: "IndusInd Bank",
    shortName: "IndusInd",
    category: "Bank",
    primaryColor: "#981e32",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    aliases: ["indusind", "indusind bank"],
  },
  YES_BANK: {
    id: "YES_BANK",
    name: "Yes Bank",
    shortName: "Yes Bank",
    category: "Bank",
    primaryColor: "#005ba6",
    accentColor: "#ed1b24",
    textColor: "#ffffff",
    aliases: ["yes bank", "yes-bank"],
  },
  IDFC: {
    id: "IDFC",
    name: "IDFC FIRST Bank",
    shortName: "IDFC FIRST",
    category: "Bank",
    primaryColor: "#9d1d27",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    aliases: ["idfc", "idfc first", "idfc bank", "idfc first bank"],
  },
  PAYTM: {
    id: "PAYTM",
    name: "Paytm Payments Bank",
    shortName: "Paytm",
    category: "Wallet",
    primaryColor: "#002e6e",
    accentColor: "#00b9f5",
    textColor: "#ffffff",
    aliases: ["paytm", "paytm wallet", "paytm payments bank", "paytm bank"],
  },
  PHONEPE: {
    id: "PHONEPE",
    name: "PhonePe Wallet",
    shortName: "PhonePe",
    category: "Wallet",
    primaryColor: "#5f259f",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    aliases: ["phonepe", "phone pe", "phonepe wallet"],
  },
  GPAY: {
    id: "GPAY",
    name: "Google Pay",
    shortName: "GPay",
    category: "Wallet",
    primaryColor: "#4285f4",
    accentColor: "#34a853",
    textColor: "#ffffff",
    aliases: ["gpay", "google pay", "tez", "googlepay"],
  },
  AMAZON_PAY: {
    id: "AMAZON_PAY",
    name: "Amazon Pay",
    shortName: "Amazon Pay",
    category: "Wallet",
    primaryColor: "#232f3e",
    accentColor: "#ff9900",
    textColor: "#ffffff",
    aliases: ["amazon pay", "amazonpay", "amazon"],
  },
  ZERODHA: {
    id: "ZERODHA",
    name: "Zerodha Kite",
    shortName: "Zerodha",
    category: "Broker",
    primaryColor: "#387ed1",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    aliases: ["zerodha", "kite", "zerodha kite"],
  },
  GROWW: {
    id: "GROWW",
    name: "Groww",
    shortName: "Groww",
    category: "Broker",
    primaryColor: "#00d09c",
    accentColor: "#5367ff",
    textColor: "#ffffff",
    aliases: ["groww", "groww app", "groww invest"],
  },
  CRED: {
    id: "CRED",
    name: "CRED",
    shortName: "CRED",
    category: "Credit",
    primaryColor: "#171717",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    aliases: ["cred", "cred cash", "cred pay"],
  },
  CASH: {
    id: "CASH",
    name: "Physical Cash",
    shortName: "Cash",
    category: "Cash",
    primaryColor: "#059669",
    accentColor: "#10b981",
    textColor: "#ffffff",
    aliases: ["cash", "cash wallet", "hand cash", "physical cash", "currency", "petty cash"],
  },
  CHASE: {
    id: "CHASE",
    name: "JPMorgan Chase",
    shortName: "Chase",
    category: "Bank",
    primaryColor: "#117aca",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    aliases: ["chase", "jpmorgan", "jpmorgan chase"],
  },
  BOA: {
    id: "BOA",
    name: "Bank of America",
    shortName: "BofA",
    category: "Bank",
    primaryColor: "#002d72",
    accentColor: "#e31837",
    textColor: "#ffffff",
    aliases: ["bank of america", "bofa"],
  },
  CITI: {
    id: "CITI",
    name: "Citibank",
    shortName: "Citi",
    category: "Bank",
    primaryColor: "#003b70",
    accentColor: "#ee2724",
    textColor: "#ffffff",
    aliases: ["citi", "citibank"],
  },
  HSBC: {
    id: "HSBC",
    name: "HSBC Bank",
    shortName: "HSBC",
    category: "Bank",
    primaryColor: "#db0011",
    accentColor: "#ffffff",
    textColor: "#ffffff",
    aliases: ["hsbc", "hsbc bank"],
  },
  BARCLAYS: {
    id: "BARCLAYS",
    name: "Barclays",
    shortName: "Barclays",
    category: "Bank",
    primaryColor: "#00aeef",
    accentColor: "#00395d",
    textColor: "#ffffff",
    aliases: ["barclays", "barclays bank"],
  },
};

/**
 * Normalizes an arbitrary institution or account string to a matched InstitutionMeta
 */
export function resolveInstitution(nameOrQuery?: string): InstitutionMeta | null {
  if (!nameOrQuery || !nameOrQuery.trim()) return null;
  const q = nameOrQuery.toLowerCase().trim();

  // Exact ID match
  const directId = Object.keys(INSTITUTIONS).find((key) => key.toLowerCase() === q);
  if (directId) return INSTITUTIONS[directId];

  // Alias or name substring match
  for (const meta of Object.values(INSTITUTIONS)) {
    if (meta.name.toLowerCase() === q || meta.shortName.toLowerCase() === q) {
      return meta;
    }
    for (const alias of meta.aliases) {
      if (alias === q || q.includes(alias) || alias.includes(q)) {
        return meta;
      }
    }
  }

  return null;
}
