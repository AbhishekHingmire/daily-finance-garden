import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { createInitialState } from "@/lib/wealthtrack";

describe("OnboardingFlow", () => {
  it("renders welcome screen at step 0", () => {
    const data = createInitialState();
    render(
      <OnboardingFlow
        data={data}
        onComplete={vi.fn()}
        onUpdatePreferences={vi.fn()}
        onUpdateState={vi.fn()}
      />
    );

    expect(screen.getByText("Welcome to your financial space")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 8")).toBeInTheDocument();
  });

  it("allows navigating to accounts step and deleting pre-added accounts", () => {
    const data = createInitialState();
    const handleUpdateState = vi.fn();

    render(
      <OnboardingFlow
        data={data}
        onComplete={vi.fn()}
        onUpdatePreferences={vi.fn()}
        onUpdateState={handleUpdateState}
      />
    );

    // Click Continue twice to go to Step 2 (Accounts)
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("Review your accounts & balances")).toBeInTheDocument();
    expect(screen.getByText("Everyday account")).toBeInTheDocument();

    // Click delete on first account
    const deleteButtons = screen.getAllByTitle("Delete account");
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    expect(handleUpdateState).toHaveBeenCalledWith(
      expect.objectContaining({
        accounts: expect.not.arrayContaining([expect.objectContaining({ id: "acc-hdfc" })]),
      })
    );
  });

  it("allows adding a new account using the account modal", () => {
    const data = createInitialState();
    const handleUpdateState = vi.fn();

    render(
      <OnboardingFlow
        data={data}
        onComplete={vi.fn()}
        onUpdatePreferences={vi.fn()}
        onUpdateState={handleUpdateState}
      />
    );

    // Navigate to Step 2
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Click "+ Add Account"
    fireEvent.click(screen.getByRole("button", { name: /add account/i }));

    // Account modal should appear with "Account Type"
    expect(screen.getByRole("heading", { name: "Add Account" })).toBeInTheDocument();
    expect(screen.getByText("Account Type")).toBeInTheDocument();
  });

  it("navigates to step 7 and renders comprehensive review cockpit", () => {
    const data = createInitialState();
    render(
      <OnboardingFlow
        data={data}
        onComplete={vi.fn()}
        onUpdatePreferences={vi.fn()}
        onUpdateState={vi.fn()}
      />
    );

    // Advance to Step 7 (Review Cockpit)
    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    }

    expect(screen.getByText("Ready to launch WealthTrack")).toBeInTheDocument();
    expect(screen.getByText("Estimated Net Worth")).toBeInTheDocument();
    expect(screen.getByText("Liquid Cash & Bank")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Valuation")).toBeInTheDocument();
    expect(screen.getByText("Total Debt & Loans")).toBeInTheDocument();
    expect(screen.getByText("Projected Cash Flow")).toBeInTheDocument();
    expect(screen.getByText("Emergency Runway")).toBeInTheDocument();

    // Prominent CTA
    expect(screen.getByRole("button", { name: /launch wealthtrack dashboard/i })).toBeInTheDocument();
  });
});
