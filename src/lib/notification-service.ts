/**
 * Unified Notification & Audio Bell System
 * Handles in-app notifications from the backend background service,
 * pleasant non-irritating audio chime using Web Audio API,
 * and permanent read-state persistence.
 */

import { authStorage, getApiBaseUrl } from "@/services/api";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "budget" | "recurring" | "info" | "warning";
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const STORAGE_KEYS = {
  PLAYED_IDS: "wt_played_notification_ids",
  READ_IDS: "wt_read_notification_ids",
  LOCAL_NOTIFICATIONS: "wt_local_notifications",
};

/**
 * Plays a soft, crystal-clear, non-irritating fintech chime using Web Audio API.
 * Uses two gentle harmonic sine frequencies with smooth exponential decay.
 */
export function playNotificationChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic 1 (Bell Fundamental ~880 Hz A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Harmonic 2 (High shimmer ~1318.5 Hz E6) with 80ms delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);
    gain2.gain.setValueAtTime(0.06, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.7);
  } catch {
    // Autoplay policy or audio device unavailable; gracefully ignore
  }
}

function getStoredIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveStoredIdSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
}

export const notificationService = {
  /**
   * Fetches latest notifications from backend or local-first store.
   * If any brand-new unread notification is detected, triggers the chime once.
   */
  async fetchNotifications(): Promise<AppNotification[]> {
    const token = authStorage.getAccessToken();
    let remoteNotifications: AppNotification[] = [];

    if (token) {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/v1/notifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            remoteNotifications = json.data;
          }
        }
      } catch {
        // Fallback to local store
      }
    }

    // Merge with local fallback notifications
    const localRaw = localStorage.getItem(STORAGE_KEYS.LOCAL_NOTIFICATIONS);
    const localNotifications: AppNotification[] = localRaw ? JSON.parse(localRaw) : [];

    const map = new Map<string, AppNotification>();
    for (const item of [...remoteNotifications, ...localNotifications]) {
      map.set(item.id, item);
    }
    const combined = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply permanent read state filter
    const readIds = getStoredIdSet(STORAGE_KEYS.READ_IDS);
    const playedIds = getStoredIdSet(STORAGE_KEYS.PLAYED_IDS);

    const finalized = combined.map((n) => ({
      ...n,
      isRead: n.isRead || readIds.has(n.id),
    }));

    // Detect if there are new unread notifications that haven't chimed yet
    let shouldChime = false;
    for (const n of finalized) {
      if (!n.isRead && !playedIds.has(n.id)) {
        playedIds.add(n.id);
        shouldChime = true;
      }
    }

    if (shouldChime) {
      saveStoredIdSet(STORAGE_KEYS.PLAYED_IDS, playedIds);
      playNotificationChime();
    }

    return finalized;
  },

  /**
   * Marks a single notification as read permanently
   */
  async markAsRead(id: string): Promise<void> {
    const readIds = getStoredIdSet(STORAGE_KEYS.READ_IDS);
    readIds.add(id);
    saveStoredIdSet(STORAGE_KEYS.READ_IDS, readIds);

    // Update backend asynchronously
    const token = authStorage.getAccessToken();
    if (token) {
      try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/v1/notifications/${id}/read`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
      } catch {}
    }
  },

  /**
   * Marks all notifications as read permanently
   */
  async markAllAsRead(notifications: AppNotification[]): Promise<void> {
    const readIds = getStoredIdSet(STORAGE_KEYS.READ_IDS);
    notifications.forEach((n) => readIds.add(n.id));
    saveStoredIdSet(STORAGE_KEYS.READ_IDS, readIds);

    const token = authStorage.getAccessToken();
    if (token) {
      try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/v1/notifications/read-all`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
      } catch {}
    }
  },

  /**
   * Adds an immediate client-side notification (e.g. on budget overrun during manual transaction add)
   */
  addLocalNotification(notif: Omit<AppNotification, "id" | "createdAt" | "isRead">): void {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const full: AppNotification = {
      ...notif,
      id,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const playedIds = getStoredIdSet(STORAGE_KEYS.PLAYED_IDS);
    playedIds.add(id);
    saveStoredIdSet(STORAGE_KEYS.PLAYED_IDS, playedIds);

    try {
      const localRaw = localStorage.getItem(STORAGE_KEYS.LOCAL_NOTIFICATIONS);
      const list: AppNotification[] = localRaw ? JSON.parse(localRaw) : [];
      list.unshift(full);
      localStorage.setItem(STORAGE_KEYS.LOCAL_NOTIFICATIONS, JSON.stringify(list.slice(0, 50)));
    } catch {}

    playNotificationChime();
  },
};
