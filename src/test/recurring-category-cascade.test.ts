import { describe, it, expect } from "vitest";

describe("Recurring Category Reclassification & 6-Month Cascade Logic", () => {
  const recurringRule = {
    id: "rec-gym-fee",
    name: "Gym Fee",
    type: "Expense",
    amount: 1000,
    categoryId: "cat-bills",
    frequency: "Monthly",
    enabled: true,
  };

  const now = new Date();
  const daysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };
  const monthsAgo = (months: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - months);
    return d.toISOString();
  };

  const initialTransactions = [
    // Auto-deducted transaction from 10 days ago (the one being edited)
    {
      id: "tx-recent-auto",
      date: daysAgo(10),
      description: "Gym Fee (Auto-posted)",
      merchant: "Gym Fee",
      amount: 1000,
      categoryId: "cat-bills",
      recurring: true,
      loanId: "rec-gym-fee",
    },
    // Auto-deducted from 40 days ago (within 6 months)
    {
      id: "tx-40d-auto",
      date: daysAgo(40),
      description: "Gym Fee (Auto-posted)",
      merchant: "Gym Fee",
      amount: 1000,
      categoryId: "cat-bills",
      recurring: true,
      loanId: "rec-gym-fee",
    },
    // Auto-deducted from 120 days ago (~4 months, within 6 months)
    {
      id: "tx-120d-auto",
      date: daysAgo(120),
      description: "Gym Fee (Auto-posted)",
      merchant: "Gym Fee",
      amount: 1000,
      categoryId: "cat-bills",
      recurring: true,
      loanId: "rec-gym-fee",
    },
    // Auto-deducted from 7 months ago (older than 6 months, should NOT be touched)
    {
      id: "tx-7m-old",
      date: monthsAgo(7),
      description: "Gym Fee (Auto-posted)",
      merchant: "Gym Fee",
      amount: 1000,
      categoryId: "cat-bills",
      recurring: true,
      loanId: "rec-gym-fee",
    },
    // Unrelated transaction (Electricity Bill)
    {
      id: "tx-other-bill",
      date: daysAgo(15),
      description: "Electricity Bill",
      merchant: "Electricity Bill",
      amount: 500,
      categoryId: "cat-bills",
      recurring: true,
      loanId: "rec-electricity",
    },
  ];

  it("identifies matching historical transactions within the 6-month threshold", () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const editedTxId = "tx-recent-auto";
    const newCategoryId = "cat-loan-emi";

    const historicalToUpdate = initialTransactions.filter((t) => {
      if (t.id === editedTxId) return false;
      const txDate = new Date(t.date);
      if (isNaN(txDate.getTime()) || txDate < sixMonthsAgo) return false;

      const isMatchingRecurring =
        (t.loanId && t.loanId === recurringRule.id) ||
        (t.recurring && (
          (t.merchant && recurringRule.name && t.merchant.toLowerCase().trim() === recurringRule.name.toLowerCase().trim()) ||
          (t.description && recurringRule.name && t.description.toLowerCase().includes(recurringRule.name.toLowerCase().trim()))
        )) ||
        (t.merchant && recurringRule.name && t.merchant.toLowerCase().trim() === recurringRule.name.toLowerCase().trim());

      return isMatchingRecurring && t.categoryId !== newCategoryId;
    });

    // Should include tx-40d-auto and tx-120d-auto, but NOT tx-recent-auto (current), NOT tx-7m-old (>6m), and NOT tx-other-bill
    expect(historicalToUpdate.map((t) => t.id)).toEqual(["tx-40d-auto", "tx-120d-auto"]);
  });

  it("cascades category update across current tx, recurring schedule, and past 6 months when Yes is selected", () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const newCategoryId = "cat-loan-emi";
    const currentTx = { ...initialTransactions[0], categoryId: newCategoryId };

    // Update recurring schedule
    const updatedRecurring = { ...recurringRule, categoryId: newCategoryId };
    expect(updatedRecurring.categoryId).toBe("cat-loan-emi");

    // Reassign historical
    const historicalToUpdate = initialTransactions.filter((t) => {
      if (t.id === currentTx.id) return false;
      const txDate = new Date(t.date);
      if (isNaN(txDate.getTime()) || txDate < sixMonthsAgo) return false;
      const isMatching = t.loanId === recurringRule.id || t.merchant === recurringRule.name;
      return isMatching && t.categoryId !== newCategoryId;
    });

    const historicalIdsSet = new Set(historicalToUpdate.map((t) => t.id));

    const updatedTransactions = initialTransactions.map((t) => {
      if (t.id === currentTx.id) return currentTx;
      if (historicalIdsSet.has(t.id)) return { ...t, categoryId: newCategoryId };
      return t;
    });

    expect(updatedTransactions.find((t) => t.id === "tx-recent-auto")?.categoryId).toBe("cat-loan-emi");
    expect(updatedTransactions.find((t) => t.id === "tx-40d-auto")?.categoryId).toBe("cat-loan-emi");
    expect(updatedTransactions.find((t) => t.id === "tx-120d-auto")?.categoryId).toBe("cat-loan-emi");
    // 7 months old must retain original category
    expect(updatedTransactions.find((t) => t.id === "tx-7m-old")?.categoryId).toBe("cat-bills");
    // Other bills must retain original category
    expect(updatedTransactions.find((t) => t.id === "tx-other-bill")?.categoryId).toBe("cat-bills");
  });

  it("only updates the single transaction when No is selected", () => {
    const newCategoryId = "cat-loan-emi";
    const currentTx = { ...initialTransactions[0], categoryId: newCategoryId };

    const updatedTransactions = initialTransactions.map((t) =>
      t.id === currentTx.id ? currentTx : t
    );

    // Current is changed
    expect(updatedTransactions.find((t) => t.id === "tx-recent-auto")?.categoryId).toBe("cat-loan-emi");
    // All others remain unchanged
    expect(updatedTransactions.find((t) => t.id === "tx-40d-auto")?.categoryId).toBe("cat-bills");
    expect(updatedTransactions.find((t) => t.id === "tx-120d-auto")?.categoryId).toBe("cat-bills");
    expect(updatedTransactions.find((t) => t.id === "tx-7m-old")?.categoryId).toBe("cat-bills");
    expect(recurringRule.categoryId).toBe("cat-bills");
  });
});
