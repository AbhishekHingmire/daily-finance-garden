/**
 * Feature Flags for WealthTrack (Section 8).
 * Configures navigation mode (hubs_v2) and analytics dispatch.
 */

export interface FeatureFlags {
  hubs_v2: boolean;
}

const STORAGE_FLAG_KEY = "wt_flag_hubs_v2";

export function getFeatureFlag(flag: keyof FeatureFlags): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(`${STORAGE_FLAG_KEY}_${flag}`);
    if (val !== null) return val === "true";
  } catch {}
  return true; // Default ON per Section 8
}

export function setFeatureFlag(flag: keyof FeatureFlags, enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_FLAG_KEY}_${flag}`, String(enabled));
    window.dispatchEvent(new CustomEvent("wt_feature_flags_changed", { detail: { flag, enabled } }));
  } catch {}
}

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: string;
}

export function trackAnalytics(event: string, properties?: Record<string, any>): void {
  const payload: AnalyticsEvent = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    // In local offline mode, record to event buffer for inspection
    try {
      const existingRaw = localStorage.getItem("wt_analytics_events");
      const list = existingRaw ? JSON.parse(existingRaw) : [];
      list.push(payload);
      if (list.length > 200) list.shift();
      localStorage.setItem("wt_analytics_events", JSON.stringify(list));
    } catch {}
    window.dispatchEvent(new CustomEvent("wt_analytics", { detail: payload }));
  }
}
