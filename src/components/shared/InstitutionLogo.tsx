import React from "react";
import { resolveInstitution, INSTITUTIONS, type InstitutionMeta } from "@/lib/institution-registry";
import { Landmark } from "lucide-react";

export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface InstitutionLogoProps {
  name?: string;
  institutionId?: string;
  size?: LogoSize;
  className?: string;
  alt?: string;
}

const SIZE_MAP: Record<LogoSize, { box: string; svg: number }> = {
  xs: { box: "size-5 text-[9px] rounded-md", svg: 14 },
  sm: { box: "size-7 text-[11px] rounded-lg", svg: 18 },
  md: { box: "size-9 text-xs rounded-xl", svg: 22 },
  lg: { box: "size-11 text-sm rounded-2xl", svg: 28 },
  xl: { box: "size-14 text-base rounded-2xl", svg: 36 },
};

export const InstitutionLogo: React.FC<InstitutionLogoProps> = ({
  name,
  institutionId,
  size = "md",
  className = "",
  alt,
}) => {
  const meta: InstitutionMeta | null =
    (institutionId && INSTITUTIONS[institutionId]) ||
    resolveInstitution(name) ||
    null;

  const { box, svg: iconSize } = SIZE_MAP[size] || SIZE_MAP.md;

  if (!meta) {
    // Elegant fallback with first letter or Landmark icon
    const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : null;
    return (
      <div
        className={`inline-flex items-center justify-center font-bold shrink-0 bg-muted border border-border text-foreground select-none shadow-2xs ${box} ${className}`}
        title={name || "Financial Account"}
        aria-label={alt || name || "Institution"}
      >
        {initial ? <span>{initial}</span> : <Landmark size={iconSize * 0.8} className="text-muted-foreground" />}
      </div>
    );
  }

  // Render SVG emblems based on verified branding
  const renderEmblem = () => {
    switch (meta.id) {
      case "HDFC":
        // HDFC signature navy square with red border box and white inner geometry
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="8" fill="#004c8f" />
            <rect x="8" y="8" width="32" height="32" rx="4" fill="#ed1c24" />
            <rect x="15" y="15" width="18" height="18" rx="2" fill="#ffffff" />
            <rect x="21" y="7" width="6" height="34" fill="#004c8f" />
            <rect x="7" y="21" width="34" height="6" fill="#004c8f" />
          </svg>
        );

      case "SBI":
        // SBI deep blue circle with keyhole emblem
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <circle cx="24" cy="24" r="23" fill="#0082c9" />
            <circle cx="24" cy="18" r="9" fill="#ffffff" />
            <rect x="21" y="18" width="6" height="24" rx="2" fill="#0082c9" />
          </svg>
        );

      case "ICICI":
        // ICICI maroon background with golden/orange arc & "i" emblem
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#9c1f24" />
            <path
              d="M 12 36 C 12 18, 30 14, 38 18 C 30 20, 20 26, 20 36 Z"
              fill="#f37021"
            />
            <circle cx="34" cy="16" r="4.5" fill="#ffffff" />
            <path d="M 31 23 H 37 V 36 H 31 Z" fill="#ffffff" />
          </svg>
        );

      case "AXIS":
        // Axis Bank burgundy square with the signature burgundy/white pyramid chevron
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#97144d" />
            <polygon points="24,9 38,37 29,37 24,24 19,37 10,37" fill="#ffffff" />
            <polygon points="24,17 31,33 27,33 24,26 21,33 17,33" fill="#97144d" />
          </svg>
        );

      case "KOTAK":
        // Kotak Mahindra red circle with the infinity / infinite shield loop
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#ed1c24" />
            <path
              d="M 15 24 C 15 17, 24 17, 24 24 C 24 31, 33 31, 33 24 C 33 17, 24 17, 24 24 C 24 31, 15 31, 15 24 Z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case "PNB":
        // Punjab National Bank deep crimson red with gold emblem
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#a21d22" />
            <circle cx="24" cy="24" r="14" fill="#ffcb05" />
            <circle cx="24" cy="24" r="8" fill="#a21d22" />
            <rect x="22" y="10" width="4" height="28" fill="#ffcb05" />
          </svg>
        );

      case "BOB":
        // Bank of Baroda bright vermilion-orange with rising sun rays
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#f26522" />
            <circle cx="24" cy="24" r="13" fill="#ffffff" />
            <path
              d="M 24 14 L 27 21 L 34 24 L 27 27 L 24 34 L 21 27 L 14 24 L 21 21 Z"
              fill="#f26522"
            />
          </svg>
        );

      case "CANARA":
        // Canara Bank cyan blue with interlocking gold triangles
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#0091df" />
            <polygon points="12,34 26,12 36,34" fill="#ffb81c" />
            <polygon points="18,34 28,17 38,34" fill="#ffffff" fillOpacity="0.85" />
          </svg>
        );

      case "UNION":
        // Union Bank interlocking red & blue U-arcs
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#ffffff" />
            <path
              d="M 13 14 V 27 C 13 33, 19 37, 24 37 C 29 37, 35 33, 35 27 V 14"
              fill="none"
              stroke="#e31e24"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 19 14 V 24 C 19 27, 21 29, 24 29 C 27 29, 29 27, 29 24 V 14"
              fill="none"
              stroke="#0054a6"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        );

      case "INDUSIND":
        // IndusInd maroon with stylized bull mark
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#981e32" />
            <circle cx="24" cy="24" r="14" fill="#ffffff" fillOpacity="0.15" />
            <path
              d="M 14 28 Q 18 16 28 20 Q 34 22 36 28 Q 28 26 22 28 Z"
              fill="#ffffff"
            />
            <circle cx="31" cy="18" r="2.5" fill="#ffffff" />
          </svg>
        );

      case "YES_BANK":
        // Yes Bank blue shield with red tick
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#005ba6" />
            <path
              d="M 13 24 L 21 32 L 35 15"
              fill="none"
              stroke="#ed1b24"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case "IDFC":
        // IDFC FIRST Bank deep maroon with white interlocking blocks
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#9d1d27" />
            <rect x="12" y="12" width="10" height="10" rx="2" fill="#ffffff" />
            <rect x="26" y="12" width="10" height="10" rx="2" fill="#ffffff" fillOpacity="0.8" />
            <rect x="12" y="26" width="10" height="10" rx="2" fill="#ffffff" fillOpacity="0.8" />
            <rect x="26" y="26" width="10" height="10" rx="2" fill="#ffffff" />
          </svg>
        );

      case "PAYTM":
        // Paytm navy & cyan blue emblem
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#002e6e" />
            <text
              x="24"
              y="32"
              fill="#00b9f5"
              fontSize="24"
              fontWeight="900"
              fontFamily="sans-serif"
              textAnchor="middle"
            >
              P
            </text>
          </svg>
        );

      case "PHONEPE":
        // PhonePe purple rounded square with iconic white "पे" glyph
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="11" fill="#5f259f" />
            <text
              x="24"
              y="32"
              fill="#ffffff"
              fontSize="24"
              fontWeight="bold"
              fontFamily="sans-serif"
              textAnchor="middle"
            >
              पे
            </text>
          </svg>
        );

      case "GPAY":
        // Google Pay 4-color signature badge
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="11" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
            <path d="M 24 12 C 30 12, 34 14.5, 36 17 L 31 21 C 29.5 19.5, 27 18, 24 18 C 19 18, 15 21.5, 14 26 C 13.5 24 13.5 22 14 20 C 16 15, 20 12, 24 12 Z" fill="#ea4335" />
            <path d="M 36 17 L 31 21 C 32 23 32.5 25 32.5 27 C 32.5 28 32.2 29 31.8 30 L 36.5 33.5 C 38 31 39 28 39 25 C 39 22 38 19 36 17 Z" fill="#4285f4" />
            <path d="M 24 36 C 28.5 36, 33 34.5, 36.5 32 L 31.8 28.5 C 30 30, 27 30.5, 24 30.5 C 19.5 30.5, 16 28, 14 24 L 9.5 27.5 C 12.5 33, 18 36, 24 36 Z" fill="#34a853" />
            <path d="M 14 24 C 13.5 22.5, 13.5 20.5, 14 19 L 9.5 15.5 C 8 19 8 24 9.5 27.5 L 14 24 Z" fill="#fbbc05" />
          </svg>
        );

      case "AMAZON_PAY":
        // Amazon Pay dark slate with orange smile
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#232f3e" />
            <text x="24" y="24" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              pay
            </text>
            <path
              d="M 12 30 C 18 36, 30 36, 36 30"
              fill="none"
              stroke="#ff9900"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        );

      case "ZERODHA":
        // Zerodha cyan geometric kite
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#387ed1" />
            <polygon points="24,10 36,24 24,38 12,24" fill="#ffffff" />
            <polygon points="24,14 32,24 24,34 16,24" fill="#387ed1" fillOpacity="0.4" />
          </svg>
        );

      case "GROWW":
        // Groww emerald green with geometric wave
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#00d09c" />
            <path
              d="M 13 32 L 20 22 L 27 28 L 35 16"
              fill="none"
              stroke="#ffffff"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case "CRED":
        // CRED minimal black badge with white keyhole shield
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#171717" stroke="#333333" strokeWidth="1" />
            <path
              d="M 16 16 H 32 V 28 C 32 34, 24 37, 24 37 C 24 37, 16 34, 16 28 Z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
            />
            <circle cx="24" cy="24" r="3" fill="#ffffff" />
          </svg>
        );

      case "CASH":
        // Physical Cash emerald banknote emblem
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#059669" />
            <rect x="8" y="14" width="32" height="20" rx="3" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <circle cx="24" cy="24" r="5" fill="#ffffff" />
          </svg>
        );

      case "CHASE":
        // Chase blue octagon
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#117aca" />
            <rect x="14" y="14" width="20" height="20" rx="2" fill="none" stroke="#ffffff" strokeWidth="5" />
          </svg>
        );

      case "BOA":
        // Bank of America navy with red & white flag bars
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#002d72" />
            <rect x="12" y="16" width="24" height="4" fill="#e31837" />
            <rect x="12" y="22" width="24" height="4" fill="#ffffff" />
            <rect x="12" y="28" width="24" height="4" fill="#e31837" />
          </svg>
        );

      case "CITI":
        // Citibank navy with red arc
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#003b70" />
            <text x="24" y="30" fill="#ffffff" fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
              citi
            </text>
            <path d="M 21 16 Q 25 11 29 16" fill="none" stroke="#ee2724" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );

      case "HSBC":
        // HSBC red & white interlocking triangles
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
            <polygon points="12,24 20,16 20,32" fill="#db0011" />
            <polygon points="36,24 28,16 28,32" fill="#db0011" />
            <polygon points="24,12 16,20 32,20" fill="#db0011" />
            <polygon points="24,36 16,28 32,28" fill="#db0011" />
          </svg>
        );

      case "BARCLAYS":
        // Barclays cyan blue spread eagle
        return (
          <svg viewBox="0 0 48 48" width={iconSize} height={iconSize} className="shrink-0">
            <rect width="48" height="48" rx="10" fill="#00aeef" />
            <path
              d="M 24 12 L 28 20 L 36 22 L 29 28 L 31 36 L 24 31 L 17 36 L 19 28 L 12 22 L 20 20 Z"
              fill="#ffffff"
            />
          </svg>
        );

      default:
        return (
          <div
            className="w-full h-full flex items-center justify-center font-bold text-white select-none rounded-[inherit]"
            style={{ backgroundColor: meta.primaryColor }}
          >
            {meta.shortName.charAt(0)}
          </div>
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden shadow-2xs select-none transition-transform ${box} ${className}`}
      title={meta.name}
      aria-label={alt || meta.name}
    >
      {renderEmblem()}
    </div>
  );
};
