import { useState } from "react";
import { ArrowRight, CheckCircle2, KeyRound, Mail, Phone, RefreshCw, ShieldCheck, Sparkles, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/shared/AppLogo";
import { toast } from "sonner";

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
  onLoginSuccess?: (mobile: string) => void;
  onSignupSuccess?: (info: { fullName: string; email?: string; mobile: string }) => void;
  onQuickLogin: (address?: string) => void;
}) {
  // Common states
  const [mobile, setMobile] = useState("9876543210");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleMobileChange = (val: string) => {
    // Only numbers, max 10 digits
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setMobile(cleaned);
    if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: "" }));
  };

  const handleOtpChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 4);
    setOtp(cleaned);
    if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));
  };

  // Switch view helper
  const handleSwitchView = (view: AuthView) => {
    setAuthView(view);
    setOtpSent(false);
    setOtp("");
    setErrors({});
  };

  // Request OTP
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (authView === "signup" && !fullName.trim()) {
      newErrors.fullName = "Please enter your full name.";
    }

    if (!mobile || mobile.length < 10) {
      newErrors.mobile = "Please enter a valid 10-digit mobile number.";
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setOtpSent(true);
    toast.success("Verification code dispatched!", {
      description: "Demo OTP is: 1234",
      duration: 6000,
    });
  };

  // Verify OTP and complete auth
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== "1234") {
      setErrors({ otp: "Invalid code. Enter demo OTP 1234." });
      return;
    }

    if (authView === "signup") {
      onSignupSuccess?.({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        mobile,
      });
    } else {
      onLoginSuccess?.(mobile);
    }
  };

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
            Log in seamlessly with your mobile number. Real-time cash flow, automated loan tracking, and intuitive net wealth management.
          </p>
          <div className="mt-12 flex items-center gap-3 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-5 backdrop-blur-xs">
            <div className="grid size-11 place-items-center rounded-xl bg-primary-foreground/15">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">Instant OTP Authentication</p>
              <p className="mt-0.5 text-xs opacity-80">Use demo OTP <strong>1234</strong> to sign in or register</p>
            </div>
          </div>
        </div>
        <p className="relative text-xs opacity-70">
          Secure demo session · Sample financial data · 100% offline in browser
        </p>
      </section>

      {/* Form Right Section */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <AppLogo />
          </div>

          <div className="mb-6">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              WealthTrack Access
            </p>
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
                ? `Enter the 4-digit verification code sent to +91 ${mobile}`
                : authView === "signin"
                ? "Enter your mobile number to receive a verification OTP."
                : "Enter your details to register and launch the finance setup stepper."}
            </p>
          </div>

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
                disabled={authLoading}
              >
                {authLoading ? "Please wait…" : "Get OTP"}
                <ArrowRight size={16} />
              </Button>
            </form>
          ) : (
            /* STEP 2: ENTER OTP */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="wt-label mb-0">Enter 4-Digit OTP</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
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
                    maxLength={4}
                    placeholder="1234"
                    className="wt-field pl-9 text-lg font-bold tracking-widest tabular-nums text-center"
                    value={otp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    autoFocus
                  />
                </div>
                {errors.otp && (
                  <span className="mt-1 block text-xs text-destructive">{errors.otp}</span>
                )}
              </div>

              {/* Demo OTP Helper Badge */}
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                <span className="text-muted-foreground">
                  Demo code: <strong className="text-primary font-bold">1234</strong>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] font-semibold px-2"
                  onClick={() => {
                    setOtp("1234");
                    setErrors({});
                  }}
                >
                  Auto-fill 1234
                </Button>
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2 font-semibold shadow-xs"
                disabled={authLoading}
              >
                {authLoading
                  ? "Verifying…"
                  : authView === "signup"
                  ? "Verify & Sign Up"
                  : "Verify & Login"}
                <CheckCircle2 size={16} />
              </Button>

              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    toast.success("New OTP sent!", { description: "Use demo OTP: 1234" });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                >
                  <RefreshCw size={12} /> Resend OTP
                </button>
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

          {/* Quick Demo Login Shortcut */}
          <div className="mt-6 rounded-xl border border-border/80 bg-muted/40 p-3.5 text-xs text-muted-foreground flex items-center justify-between">
            <div>
              <span className="font-bold text-foreground block">Quick Preview Demo</span>
              <span className="text-[11px]">Bypass OTP to test workspace</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold shrink-0"
              onClick={() => onQuickLogin("Demo User")}
            >
              Instant Login
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
