import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthPage } from "@/features/auth/AuthPage";
import { authApi } from "@/services/api";

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<any>("@/services/api");
  return {
    ...actual,
    authApi: {
      sendOtp: vi.fn(),
      verifyOtp: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    },
  };
});

describe("<AuthPage />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders mobile number input and submits OTP request", async () => {
    vi.mocked(authApi.sendOtp).mockResolvedValueOnce({
      success: true,
      message: "OTP sent",
      data: {
        mobileNumber: "9876543210",
        expiresInSeconds: 300,
        isRegisteredUser: true,
        testOtp: "654321",
      },
    });

    render(
      <AuthPage
        authView="signin"
        setAuthView={vi.fn()}
        authLoading={false}
        onLoginSuccess={vi.fn()}
        onQuickLogin={vi.fn()}
      />
    );

    const getOtpBtn = screen.getByRole("button", { name: /get otp/i });
    expect(getOtpBtn).toBeInTheDocument();

    const mobileInput = screen.getByPlaceholderText("9876543210");
    fireEvent.change(mobileInput, { target: { value: "9876543210" } });

    fireEvent.click(getOtpBtn);

    await waitFor(() => {
      expect(authApi.sendOtp).toHaveBeenCalledWith({
        mobileNumber: "9876543210",
        purpose: "login",
      });
    });

    // Check that test OTP card is rendered on screen
    await waitFor(() => {
      expect(screen.getByText("654321")).toBeInTheDocument();
      expect(screen.getByText(/Test Mode Verification OTP/i)).toBeInTheDocument();
    });
  });

  it("verifies OTP and triggers onLoginSuccess", async () => {
    vi.mocked(authApi.sendOtp).mockResolvedValueOnce({
      success: true,
      message: "OTP sent",
      data: {
        mobileNumber: "9876543210",
        expiresInSeconds: 300,
        isRegisteredUser: true,
        testOtp: "889900",
      },
    });

    const mockOnLoginSuccess = vi.fn();

    vi.mocked(authApi.verifyOtp).mockResolvedValueOnce({
      success: true,
      message: "Login successful",
      data: {
        accessToken: "mock-token",
        refreshToken: "mock-refresh",
        expiresAt: "2026-10-28T23:00:00Z",
        isNewUser: false,
        user: {
          id: "u1",
          mobileNumber: "9876543210",
          fullName: "Abhishek Hingmire",
          isMobileVerified: true,
          createdAt: "2026-10-28T20:00:00Z",
        },
      },
    });

    render(
      <AuthPage
        authView="signin"
        setAuthView={vi.fn()}
        authLoading={false}
        onLoginSuccess={mockOnLoginSuccess}
        onQuickLogin={vi.fn()}
      />
    );

    const mobileInput = screen.getByPlaceholderText("9876543210");
    fireEvent.change(mobileInput, { target: { value: "9876543210" } });

    fireEvent.click(screen.getByRole("button", { name: /get otp/i }));

    await waitFor(() => {
      expect(screen.getByText("889900")).toBeInTheDocument();
    });

    // Click Auto-fill
    fireEvent.click(screen.getByRole("button", { name: /auto-fill/i }));

    // Click Verify & Sign In
    fireEvent.click(screen.getByRole("button", { name: /verify & sign in/i }));

    await waitFor(() => {
      expect(authApi.verifyOtp).toHaveBeenCalledWith({
        mobileNumber: "9876543210",
        otp: "889900",
        fullName: undefined,
        email: undefined,
      });
      expect(mockOnLoginSuccess).toHaveBeenCalledWith("9876543210", expect.anything());
    });
  });
});
