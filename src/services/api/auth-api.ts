/**
 * WealthTrack Authentication API Client
 * Integrates with .NET 10 Web API auth endpoints:
 * - POST /api/v1/auth/send-otp
 * - POST /api/v1/auth/verify-otp
 * - POST /api/v1/auth/refresh-token
 * - POST /api/v1/auth/logout
 * - GET  /api/v1/auth/me
 */

export interface BackendApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[] | null;
  timestamp?: string;
}

export interface SendOtpRequest {
  mobileNumber: string;
  purpose?: "login" | "signup" | "signin";
}

export interface SendOtpResponse {
  mobileNumber: string;
  expiresInSeconds: number;
  isRegisteredUser: boolean;
  testOtp?: string; // Returned by backend for instant testing
}

export interface VerifyOtpRequest {
  mobileNumber: string;
  otp: string;
  fullName?: string;
  email?: string;
  purpose?: "login" | "signup" | "signin";
}

export interface AuthUser {
  id: string;
  mobileNumber: string;
  fullName: string;
  email?: string;
  isMobileVerified: boolean;
  createdAt: string;
}

export interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthUser;
  isNewUser: boolean;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: "wt_access_token",
  REFRESH_TOKEN: "wt_refresh_token",
  AUTH_USER: "wt_auth_user",
  EXPIRES_AT: "wt_auth_expires_at",
};

/**
 * Resolves the backend API base URL.
 * Defaults to http://onefinancetracker.runasp.net (the live MonsterASP .NET Web API).
 * Can be overridden via VITE_API_BASE_URL in environment files.
 */
export function getApiBaseUrl(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "");
  }
  return "http://onefinancetracker.runasp.net";
}

export const authStorage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  },

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  },

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getExpiresAt(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
    } catch {
      return null;
    }
  },

  isSessionActive(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return true; // Token exists
    const expTime = new Date(expiresAt).getTime();
    return Number.isFinite(expTime) && expTime > Date.now();
  },

  saveTokens(data: AuthResponseData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      // Ensure 72-hour session duration is recorded
      const expiresAt = data.expiresAt || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt);
      if (data.user) {
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(data.user));
      }
    } catch {
      // Ignore localStorage errors (e.g. private mode quota)
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    } catch {
      // Ignore
    }
  },
};

/**
 * Standard fetch helper with timeout and unified error parsing.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<BackendApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data: BackendApiResponse<T> = await res.json().catch(() => ({
      success: false,
      message: `HTTP ${res.status}: ${res.statusText}`,
      data: null as unknown as T,
      errors: [`HTTP error ${res.status}`],
    }));

    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    return {
      success: false,
      message: isTimeout
        ? "Connection timed out. Ensure the backend API is running on localhost:5252."
        : `Network error: ${err?.message || "Failed to connect to backend server"}`,
      data: null as unknown as T,
      errors: [err?.message || "Failed to reach server"],
    };
  }
}

export const authApi = {
  /**
   * Request a 6-digit random verification OTP.
   * Backend generates and stores the OTP hash, and returns `testOtp` for web UI verification.
   */
  async sendOtp(req: SendOtpRequest): Promise<BackendApiResponse<SendOtpResponse>> {
    return request<SendOtpResponse>("/api/v1/auth/send-otp", {
      method: "POST",
      body: JSON.stringify(req),
    });
  },

  /**
   * Verify the 6-digit OTP and authenticate (signup new user or login existing).
   */
  async verifyOtp(req: VerifyOtpRequest): Promise<BackendApiResponse<AuthResponseData>> {
    const res = await request<AuthResponseData>("/api/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(req),
    });

    if (res.success && res.data?.accessToken) {
      authStorage.saveTokens(res.data);
    }

    return res;
  },

  /**
   * Refreshes the JWT access token using the stored refresh token.
   */
  async refreshToken(): Promise<BackendApiResponse<AuthResponseData>> {
    const currentRefreshToken = authStorage.getRefreshToken();
    if (!currentRefreshToken) {
      return {
        success: false,
        message: "No refresh token available",
        data: null as unknown as AuthResponseData,
      };
    }

    const res = await request<AuthResponseData>("/api/v1/auth/refresh-token", {
      method: "POST",
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    if (res.success && res.data?.accessToken) {
      authStorage.saveTokens(res.data);
    }

    return res;
  },

  /**
   * Logout user and revoke refresh token.
   */
  async logout(): Promise<BackendApiResponse<boolean>> {
    const accessToken = authStorage.getAccessToken();
    const refreshToken = authStorage.getRefreshToken();

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await request<boolean>("/api/v1/auth/logout", {
      method: "POST",
      headers,
      body: JSON.stringify({ refreshToken: refreshToken || "" }),
    });

    authStorage.clear();
    return res;
  },

  /**
   * Get currently authenticated user profile from backend.
   */
  async getCurrentUser(): Promise<BackendApiResponse<AuthUser>> {
    const accessToken = authStorage.getAccessToken();
    if (!accessToken) {
      return {
        success: false,
        message: "No active session token",
        data: null as unknown as AuthUser,
      };
    }

    return request<AuthUser>("/api/v1/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};
