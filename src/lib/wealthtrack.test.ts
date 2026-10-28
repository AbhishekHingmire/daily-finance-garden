import { describe, expect, it } from "vitest";

import { createInitialState, getAccountBalance, getMoneySummary, type Transaction } from "@/lib/wealthtrack";

describe("WealthTrack finance calculations", () => {
  it("moves a ₹1,000 transfer between accounts without changing income, expenses, or total balance", () => {
    const { accounts, transactions } = createInitialState();
    const before = getMoneySummary(accounts, transactions);
    const transfer: Transaction = {
      id: "test-transfer",
      date: "2026-10-22T10:00",
      description: "Move to cash",
      type: "Transfer",
      amount: 1000,
      categoryId: "",
      accountId: "acc-hdfc",
      destinationAccountId: "acc-cash",
      paymentMethod: "Bank transfer",
      need: "Need",
      merchant: "",
      tags: [],
      notes: "",
      recurring: false,
      customValues: {},
    };
    const updated = [transfer, ...transactions];
    const after = getMoneySummary(accounts, updated);
    const source = accounts.find((account) => account.id === "acc-hdfc");
    const destination = accounts.find((account) => account.id === "acc-cash");

    expect(source).toBeDefined();
    expect(destination).toBeDefined();
    if (!source || !destination) return;
    expect(getAccountBalance(source, updated)).toBe(getAccountBalance(source, transactions) - 1000);
    expect(getAccountBalance(destination, updated)).toBe(getAccountBalance(destination, transactions) + 1000);
    expect(after.income).toBe(before.income);
    expect(after.expenses).toBe(before.expenses);
    expect(after.balance).toBe(before.balance);
  });

  it("reports ₹145,911 in net expenses after the seeded ₹650 refund", () => {
    const { accounts, transactions } = createInitialState();

    expect(getMoneySummary(accounts, transactions).expenses).toBe(145911);
  });
});