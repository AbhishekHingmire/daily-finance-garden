import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("navigates to categories & fund allocation step", () => {
    const data = createInitialState();
    render(
      <OnboardingFlow
        data={data}
        onComplete={vi.fn()}
        onUpdatePreferences={vi.fn()}
        onUpdateState={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("Total Monthly Budget Allocation")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(screen.getByText("Food & dining")).toBeInTheDocument();
  });

  it("navigates to recurring expenses step and final launch step", async () => {
    const data = createInitialState();
    const handleComplete = vi.fn();

    render(
      <OnboardingFlow
        data={data}
        onComplete={handleComplete}
        onUpdatePreferences={vi.fn()}
        onUpdateState={vi.fn()}
      />
    );

    // Step 0 -> Step 1
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    // Step 1 -> Step 2 (Recurring)
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("Monthly Recurring Outflows")).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();

    // Step 2 -> Step 3 (Review & Launch)
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("Ready to launch your expense tracker!")).toBeInTheDocument();
    expect(screen.getByText("Total Monthly Budget")).toBeInTheDocument();
    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();

    const launchButton = screen.getByRole("button", { name: /launch wealthtrack/i });
    expect(launchButton).toBeInTheDocument();
    fireEvent.click(launchButton);

    await waitFor(() => {
      expect(handleComplete).toHaveBeenCalled();
    });
  });
});
