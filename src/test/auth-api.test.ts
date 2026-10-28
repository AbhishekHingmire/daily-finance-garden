import { describe, it, expect, beforeEach, vi } from "vitest";
import { authApi, authStorage } from "@/services/api/auth-api";

describe("authStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves access and refresh tokens", () => {
    authStorage.saveTokens({
      accessToken: "mock-access-token-123",
      refreshToken: "mock-refresh-token-456",
      expiresAt: "2026-10-28T22:00:00Z",
      isNewUser: false,
      user: {
        id: "user-123",
        mobileNumber: "9876543210",
        fullName: "Abhishek Hingmire",
        isMobileVerified: true,
        createdAt: "2026-10-28T20:00:00Z",
      },
    });

    expect(authStorage.getAccessToken()).toBe("mock-access-token-123");
    expect(authStorage.getRefreshToken()).toBe("mock-refresh-token-456");
    expect(authStorage.getUser()?.fullName).toBe("Abhishek Hingmire");
  });

  it("clears stored tokens on logout", () => {
    authStorage.saveTokens({
      accessToken: "token-to-clear",
      refreshToken: "refresh-to-clear",
      expiresAt: "2026-10-28T22:00:00Z",
      isNewUser: false,
      user: {
        id: "u1",
        mobileNumber: "9876543210",
        fullName: "Tester",
        isMobileVerified: true,
        createdAt: "2026-10-28T20:00:00Z",
      },
    });

    authStorage.clear();
    expect(authStorage.getAccessToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
    expect(authStorage.getUser()).toBeNull();
  });
});

describe("authApi", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("sends OTP request to .NET API endpoint", async () => {
    const mockResponse = {
      success: true,
      message: "OTP sent successfully",
      data: {
        mobileNumber: "9876543210",
        expiresInSeconds: 300,
        isRegisteredUser: true,
        testOtp: "749201",
      },
      errors: null,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const res = await authApi.sendOtp({ mobileNumber: "9876543210", purpose: "login" });

    expect(res.success).toBe(true);
    expect(res.data.testOtp).toBe("749201");
    expect(res.data.expiresInSeconds).toBe(300);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5252/api/v1/auth/send-otp",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ mobileNumber: "9876543210", purpose: "login" }),
      })
    );
  });

  it("verifies OTP and automatically saves tokens to storage", async () => {
    const mockAuthResponse = {
      success: true,
      message: "Login successful",
      data: {
        accessToken: "jwt-token-xyz",
        refreshToken: "refresh-xyz",
        expiresAt: "2026-10-28T23:00:00Z",
        isNewUser: false,
        user: {
          id: "u-99",
          mobileNumber: "9876543210",
          fullName: "Abhishek Hingmire",
          isMobileVerified: true,
          createdAt: "2026-10-28T20:00:00Z",
        },
      },
      errors: null,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockAuthResponse,
    } as Response);

    const res = await authApi.verifyOtp({
      mobileNumber: "9876543210",
      otp: "749201",
    });

    expect(res.success).toBe(true);
    expect(authStorage.getAccessToken()).toBe("jwt-token-xyz");
    expect(authStorage.getRefreshToken()).toBe("refresh-xyz");
    expect(authStorage.getUser()?.fullName).toBe("Abhishek Hingmire");
  });

  it("handles verification errors gracefully with server error message", async () => {
    const mockErrorResponse = {
      success: false,
      message: "Invalid OTP. 2 attempt(s) remaining.",
      data: null,
      errors: ["Invalid OTP. 2 attempt(s) remaining."],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => mockErrorResponse,
    } as Response);

    const res = await authApi.verifyOtp({
      mobileNumber: "9876543210",
      otp: "000000",
    });

    expect(res.success).toBe(false);
    expect(res.message).toBe("Invalid OTP. 2 attempt(s) remaining.");
    expect(authStorage.getAccessToken()).toBeNull();
  });
});
