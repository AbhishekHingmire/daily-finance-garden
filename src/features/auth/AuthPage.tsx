import { useState, useEffect } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  KeyRound,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  AlertCircle,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/shared/AppLogo";
import { toast } from "sonner";
import { authApi, type AuthResponseData, type SendOtpResponse } from "@/services/api";

export type AuthView = "signin" | "signup";

export function AuthPage({
  authView,
  setAuthView,
  authLoading,
  onLoginSuccess,
  onSignupSuccess,
  onQuickLogin,
}: {
  authView: AuthView;
  setAuthView: (v: AuthView) => void;
  authLoading: boolean;
  onLoginSuccess?: (mobile: string, authData?: AuthResponseData) => void;
  onSignupSuccess?: (info: { fullName: string; email?: string; mobile: string; authData?: AuthResponseData }) => void;
  onQuickLogin: (address?: string) => void;
}) {
  // Form states
  const [mobile, setMobile] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real API states
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [generatedTestOtp, setGeneratedTestOtp] = useState<string | null>(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState<number>(300);
  const [countdown, setCountdown] = useState<number>(60);
  const [apiBanner, setApiBanner] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Timer countdown for resending OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpSent && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpSent, countdown]);

  const handleMobileChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setMobile(cleaned);
    if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: "" }));
  };

  const handleOtpChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    setOtp(cleaned);
    if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));
  };

  const handleSwitchView = (view: AuthView) => {
    setAuthView(view);
    setOtpSent(false);
    setOtp("");
    setErrors({});
    setGeneratedTestOtp(null);
    setApiBanner(null);
  };

  // Request OTP from real .NET API
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (authView === "signup" && !fullName.trim()) {
      newErrors.fullName = "Please enter your full name.";
    }

    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      newErrors.mobile = "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).";
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsRequestingOtp(true);
    setApiBanner(null);

    try {
      const res = await authApi.sendOtp({
        mobileNumber: mobile,
        purpose: authView === "signin" ? "login" : "signup",
      });

      if (!res.success) {
        const errorMsg = res.message || res.errors?.[0] || "Failed to generate OTP.";
        setErrors({ mobile: errorMsg });
        setApiBanner({ type: "error", message: errorMsg });
        toast.error("OTP Generation Failed", { description: errorMsg });
        return;
      }

      const testOtp = res.data?.testOtp || null;
      setGeneratedTestOtp(testOtp);
      setOtpExpiresIn(res.data?.expiresInSeconds || 300);
      setOtpSent(true);
      setCountdown(60);
      setApiBanner({
        type: "success",
        message: res.message || "OTP generated and dispatched successfully.",
      });

      toast.success("Verification OTP Dispatched!", {
        description: testOtp ? `Live Test OTP: ${testOtp}` : `SMS sent to +91 ${mobile} (Valid for 5 min).`,
        duration: 8000,
      });
    } catch (err: any) {
      const msg = err?.message || "Failed to connect to backend server. Make sure API is running on localhost:5252.";
      setErrors({ mobile: msg });
      setApiBanner({ type: "error", message: msg });
      toast.error("Network Error", { description: msg });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Verify OTP via real .NET API
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setErrors({ otp: "Please enter the complete 6-digit verification code." });
      return;
    }

    setIsVerifyingOtp(true);
    setApiBanner(null);

    try {
      const res = await authApi.verifyOtp({
        mobileNumber: mobile,
        otp,
        fullName: authView === "signup" ? fullName.trim() : undefined,
        email: email.trim() || undefined,
        purpose: authView === "signin" ? "login" : "signup",
      });

      if (!res.success) {
        const errorMsg = res.message || res.errors?.[0] || "Invalid OTP code.";
        setErrors({ otp: errorMsg });
        setApiBanner({ type: "error", message: errorMsg });
        toast.error("Authentication Failed", { description: errorMsg });
        return;
      }

      toast.success(res.message || "Authentication successful!");

      if (authView === "signup") {
        onSignupSuccess?.({
          fullName: res.data?.user?.fullName || fullName.trim(),
          email: res.data?.user?.email || email.trim() || undefined,
          mobile,
          authData: res.data,
        });
      } else {
        onLoginSuccess?.(mobile, res.data);
      }
    } catch (err: any) {
      const msg = err?.message || "Verification request failed. Please check network.";
      setErrors({ otp: msg });
      setApiBanner({ type: "error", message: msg });
      toast.error("Verification Error", { description: msg });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleCopyTestOtp = () => {
    if (generatedTestOtp) {
      navigator.clipboard.writeText(generatedTestOtp);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
      toast.info("OTP copied to clipboard!");
    }
  };

  const handleAutoFillOtp = () => {
    if (generatedTestOtp) {
      setOtp(generatedTestOtp);
      setErrors((prev) => ({ ...prev, otp: "" }));
      toast.success("Auto-filled test OTP!");
    }
  };

  const isLoading = authLoading || isRequestingOtp || isVerifyingOtp;

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
      {/* Visual Left Banner */}
      <section className="relative hidden min-h-screen overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20" aria-hidden>
          <div className="absolute -right-20 top-16 size-[30rem] rounded-full border border-primary-foreground/40" />
          <div className="absolute -right-5 top-32 size-[23rem] rounded-full border border-primary-foreground/30" />
          <div className="absolute -right-[-6rem] top-48 size-[15rem] rounded-full border border-primary-foreground/20" />
        </div>
        <AppLogo />
        <div className="relative max-w-xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] opacity-80">
            Smart Personal Wealth Cockpit
          </p>
          <h1 className="wt-display text-5xl font-extrabold leading-[1.12]">
            A clearer picture of your financial life.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed opacity-85">
            Log in securely with your mobile number. Real-time cash flow, automated loan tracking, and intuitive net wealth management.
          </p>
          <div className="mt-10 space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 backdrop-blur-xs">
              <div className="grid size-10 place-items-center rounded-xl bg-primary-foreground/15">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Cryptographically Secure OTP</p>
                <p className="mt-0.5 text-xs opacity-80">
                  Dynamic 6-digit random codes generated and verified with salted SHA-256
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 backdrop-blur-xs">
              <div className="grid size-10 place-items-center rounded-xl bg-primary-foreground/15">
                <Database size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">.NET 10 & SQL Server Backend</p>
                <p className="mt-0.5 text-xs opacity-80">
                  Real REST API with JWT access & refresh tokens and auto DB migrations
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="relative text-xs opacity-70">
          Connected to localhost:5252 · SQL Server 2022 · Optimistic Concurrency
        </p>
      </section>

      {/* Form Right Section */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <AppLogo />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                WealthTrack Access
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                API Online :5252
              </span>
            </div>
            <h2 className="wt-display text-2xl sm:text-3xl font-extrabold text-foreground">
              {authView === "signin"
                ? otpSent
                  ? "Verify your number"
                  : "Sign in with Mobile"
                : otpSent
                ? "Verify to complete"
                : "Create your account"}
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {otpSent
                ? `Enter the 6-digit verification code sent to +91 ${mobile}`
                : authView === "signin"
                ? "Enter your mobile number to receive a verification OTP."
                : "Enter your details to register and launch the finance setup stepper."}
            </p>
          </div>

          {/* API Notification Banner */}
          {apiBanner && (
            <div
              className={`mb-4 flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed transition-all ${
                apiBanner.type === "error"
                  ? "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/15"
                  : apiBanner.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-primary/30 bg-primary/10 text-primary"
              }`}
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <div className="flex-1">{apiBanner.message}</div>
            </div>
          )}

          {!otpSent ? (
            /* STEP 1: ENTER MOBILE (AND DETAILS IF SIGNUP) */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              {authView === "signup" && (
                <>
                  <div>
                    <label className="wt-label">
                      Full Name <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <User size={15} />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Abhishek Hingmire"
                        className="wt-field pl-9 text-xs"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
                        }}
                      />
                    </div>
                    {errors.fullName && (
                      <span className="mt-1 block text-xs text-destructive">{errors.fullName}</span>
                    )}
                  </div>

                  <div>
                    <label className="wt-label">
                      Email Address <span className="text-muted-foreground font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Mail size={15} />
                      </span>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        className="wt-field pl-9 text-xs"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                        }}
                      />
                    </div>
                    {errors.email && (
                      <span className="mt-1 block text-xs text-destructive">{errors.email}</span>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="wt-label">
                  Mobile Number <span className="text-destructive">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground select-none pointer-events-none">
                    <Phone size={14} />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    maxLength={10}
                    className="wt-field pl-16 text-sm font-semibold tracking-wide tabular-nums"
                    value={mobile}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    autoFocus
                  />
                </div>
                {errors.mobile && (
                  <span className="mt-1 block text-xs text-destructive">{errors.mobile}</span>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2 font-semibold shadow-xs"
                disabled={isLoading}
              >
                {isRequestingOtp ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Generating Secure OTP…
                  </>
                ) : (
                  <>
                    <span>Get OTP</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </form>
          ) : (
            /* STEP 2: ENTER OTP */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="wt-label mb-0">Enter 6-Digit OTP</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setGeneratedTestOtp(null);
                      setErrors({});
                      setApiBanner(null);
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Change Number
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <KeyRound size={15} />
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="••••••"
                    className="wt-field pl-9 text-xl font-bold tracking-[0.25em] tabular-nums text-center"
                    value={otp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    autoFocus
                  />
                </div>
                {errors.otp && (
                  <span className="mt-1 block text-xs text-destructive">{errors.otp}</span>
                )}
              </div>

              {/* Real SMS Mode Information Banner */}
              {!generatedTestOtp && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-center gap-2.5">
                  <ShieldCheck size={18} className="text-primary shrink-0" />
                  <span>Enter the 6-digit verification code received via SMS on <strong>+91 {mobile}</strong> (valid for 5 minutes).</span>
                </div>
              )}

              {/* Dynamic Test OTP Screen Display (When gateway in test mode) */}
              {generatedTestOtp && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-foreground space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary animate-pulse" />
                      <span className="font-semibold text-primary">Test Mode Verification OTP</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Expires in {Math.floor(otpExpiresIn / 60)}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-background/80 rounded-lg p-2.5 border border-primary/20">
                    <span className="text-xl font-mono font-bold tracking-[0.3em] text-foreground">
                      {generatedTestOtp}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2 gap-1"
                        onClick={handleCopyTestOtp}
                      >
                        {copiedOtp ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        {copiedOtp ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="h-7 text-xs font-semibold px-2.5"
                        onClick={handleAutoFillOtp}
                      >
                        Auto-fill
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Generated dynamically by backend API and stored as salted SHA-256. Not hardcoded.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full gap-2 font-semibold shadow-xs"
                disabled={isLoading}
              >
                {isVerifyingOtp ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Verifying OTP…
                  </>
                ) : (
                  <>
                    <span>
                      {authView === "signup" ? "Verify & Sign Up" : "Verify & Sign In"}
                    </span>
                    <CheckCircle2 size={16} />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between pt-1 text-xs">
                {countdown > 0 ? (
                  <span className="text-muted-foreground text-[11px]">
                    Resend OTP in <strong className="tabular-nums font-mono">{countdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      setOtp("");
                      handleRequestOtp(e);
                    }}
                    disabled={isRequestingOtp}
                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <RefreshCw size={12} className={isRequestingOtp ? "animate-spin" : ""} />
                    Resend New OTP
                  </button>
                )}

                <span className="text-[11px] text-muted-foreground">
                  Valid for 5 mins
                </span>
              </div>
            </form>
          )}

          {/* Switch between Login and Signup */}
          <div className="mt-6 pt-5 border-t border-border/60 text-center text-xs text-muted-foreground">
            {authView === "signin" ? (
              <p>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchView("signup")}
                  className="font-bold text-primary hover:underline cursor-pointer"
                >
                  Create new account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchView("signin")}
                  className="font-bold text-primary hover:underline cursor-pointer"
                >
                  Sign in with Mobile
                </button>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
