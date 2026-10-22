import { useState } from "react";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLogo } from "@/components/shared/AppLogo";
import { InputField } from "@/components/shared/FormFields";

export type AuthView = "signin" | "signup" | "forgot";

export function AuthPage({
  authView,
  setAuthView,
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  confirmPassword,
  setConfirmPassword,
  remember,
  setRemember,
  showPassword,
  setShowPassword,
  authLoading,
  authErrors,
  onSubmit,
  onQuickLogin,
}: {
  authView: AuthView;
  setAuthView: (v: AuthView) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  fullName: string;
  setFullName: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  remember: boolean;
  setRemember: (v: boolean) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((b: boolean) => boolean)) => void;
  authLoading: boolean;
  authErrors: Record<string, string>;
  onSubmit: () => void;
  onQuickLogin: (address?: string) => void;
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
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
            Your money, in perspective
          </p>
          <h1 className="wt-display text-5xl font-extrabold leading-[1.12]">
            A clearer picture of your financial life.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed opacity-85">
            One calm, unified place to understand your cash flow, stay on top of predictable bills, and make your money work for you.
          </p>
          <div className="mt-12 flex items-center gap-3 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-5 backdrop-blur-xs">
            <div className="grid size-11 place-items-center rounded-xl bg-primary-foreground/15">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">Your demo is ready</p>
              <p className="mt-0.5 text-xs opacity-80">Explore your sample financial snapshot</p>
            </div>
          </div>
        </div>
        <p className="relative text-xs opacity-70">
          Local demo · Sample financial data · 100% offline in browser
        </p>
      </section>

      {/* Form Right Section */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <AppLogo />
          </div>
          <div className="mb-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
              Welcome to WealthTrack
            </p>
            <h2 className="wt-display text-3xl font-extrabold text-foreground">
              {authView === "signin"
                ? "Good to see you."
                : authView === "signup"
                ? "Create your account."
                : "Reset your password."}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {authView === "forgot"
                ? "Enter your email to simulate a password reset."
                : "Sign in to access your personal finance workspace."}
            </p>
          </div>

          <div className="space-y-4">
            {authView === "signup" && (
              <InputField
                label="Full name"
                value={fullName}
                onChange={setFullName}
                placeholder="Your name"
                error={authErrors.fullName}
                required
              />
            )}
            <InputField
              label="Email address"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="you@example.com"
              error={authErrors.email}
              required
              autoComplete="email"
            />
            {authView !== "forgot" && (
              <label className="block">
                <span className="wt-label">
                  Password<span className="ml-1 text-destructive">*</span>
                </span>
                <span className="relative block">
                  <input
                    className="wt-field pr-16"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={authView === "signup" ? "new-password" : "current-password"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 px-2 text-xs font-semibold"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Button>
                </span>
                {authErrors.password && (
                  <span className="mt-1 block text-xs text-destructive">{authErrors.password}</span>
                )}
              </label>
            )}
            {authView === "signup" && (
              <InputField
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                type={showPassword ? "text" : "password"}
                error={authErrors.confirmPassword}
                required
              />
            )}
            {authView === "signin" && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={remember} onCheckedChange={(checked) => setRemember(Boolean(checked))} />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs font-semibold text-primary"
                  onClick={() => setAuthView("forgot")}
                >
                  Forgot password?
                </Button>
              </div>
            )}
            <Button className="h-11 w-full gap-2 font-semibold" disabled={authLoading} onClick={onSubmit}>
              {authLoading
                ? "Please wait…"
                : authView === "signin"
                ? "Sign In"
                : authView === "signup"
                ? "Create Account"
                : "Send Reset Link"}
              <ArrowRight size={16} />
            </Button>

            {authView === "signin" && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">or continue with</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-10 text-xs font-semibold" onClick={() => onQuickLogin()}>
                    ◉ <span>Google</span>
                  </Button>
                  <Button variant="outline" className="h-10 text-xs font-semibold" onClick={() => onQuickLogin()}>
                    ● <span>Apple</span>
                  </Button>
                </div>
              </>
            )}

            {authView === "forgot" && (
              <Button variant="ghost" className="w-full text-xs font-semibold" onClick={() => setAuthView("signin")}>
                <ArrowRight className="rotate-180 mr-1.5" size={15} /> Back to Sign In
              </Button>
            )}

            <p className="pt-2 text-center text-xs text-muted-foreground">
              {authView === "signin" ? "New to WealthTrack?" : "Already have an account?"}{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-xs font-semibold text-primary"
                onClick={() => setAuthView(authView === "signup" ? "signin" : "signup")}
              >
                {authView === "signin" ? "Create an account" : "Sign in"}
              </Button>
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-muted/50 p-3.5 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">Demo Credentials</span> · demo@wealthtrack.app · Demo123!
            <span className="block pt-1 text-[11px]">Any valid email format and password will sign in.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
