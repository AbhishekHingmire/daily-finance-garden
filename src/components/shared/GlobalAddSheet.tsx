import React, { useState, useEffect } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  Landmark,
  PiggyBank,
  Plus,
  RefreshCw,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import {
  type Account,
  type Category,
  type Entry,
  type EntryKind,
  type EntrySubtype,
  type Holding,
  type Loan,
  type NeedWant,
  type Schedule,
} from "@/lib/domain-model";
import { toast } from "sonner";

export interface GlobalAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  holdings: Holding[];
  loans: Loan[];
  defaultAccount?: string;
  onSaveEntry: (entry: Entry, newSchedule?: Schedule) => void;
  initialPreset?: Partial<Entry>;
}

export const GlobalAddSheet: React.FC<GlobalAddSheetProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  holdings,
  loans,
  defaultAccount,
  onSaveEntry,
  initialPreset,
}) => {
  const [activeTab, setActiveTab] = useState<EntryKind>("expense");
  const [subtype, setSubtype] = useState<EntrySubtype>("none");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [merchant, setMerchant] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>(defaultAccount || accounts[0]?.id || "");
  const [toRefKind, setToRefKind] = useState<"account" | "holding" | "loan" | "person">("account");
  const [toRefId, setToRefId] = useState<string>("");
  const [toRefName, setToRefName] = useState<string>("");
  const [date, setDate] = useState<string>("2026-10-26");
  const [needWant, setNeedWant] = useState<NeedWant>("Need");
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [repeatFrequency, setRepeatFrequency] = useState<"Weekly" | "Monthly" | "Yearly">("Monthly");
  const [showMoreActions, setShowMoreActions] = useState<boolean>(false);

  // Initialize or reset form when modal opens or preset changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialPreset) {
      if (initialPreset.kind) setActiveTab(initialPreset.kind);
      if (initialPreset.subtype) setSubtype(initialPreset.subtype);
      if (initialPreset.amount) setAmount(String(initialPreset.amount));
      if (initialPreset.note) setNote(initialPreset.note);
      if (initialPreset.merchant) setMerchant(initialPreset.merchant);
      if (initialPreset.category_id) setCategoryId(initialPreset.category_id);
      if (initialPreset.account_id) setAccountId(initialPreset.account_id);
      if (initialPreset.need_want) setNeedWant(initialPreset.need_want);
      if (initialPreset.date) setDate(initialPreset.date);
    } else {
      setActiveTab("expense");
      setSubtype("none");
      setAmount("");
      setNote("");
      setMerchant("");
      const firstExp = categories.find((c) => c.kind === "expense");
      setCategoryId(firstExp?.id || "");
      setAccountId(defaultAccount || accounts[0]?.id || "");
      setDate("2026-10-26");
      setNeedWant("Need");
      setIsRepeat(false);
      setShowMoreActions(false);
    }
  }, [isOpen, initialPreset, accounts, categories, defaultAccount]);

  // When category changes, inherit default Need/Want
  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat?.default_need_want) {
      setNeedWant(cat.default_need_want);
    }
  };

  const handleQuickSpecialAction = (type: "invest" | "pay_loan" | "lend" | "recover" | "borrow") => {
    if (type === "invest") {
      setActiveTab("transfer");
      setSubtype("sip");
      setToRefKind("holding");
      setToRefId(holdings[0]?.id || "");
      setToRefName(holdings[0]?.name || "");
      setNote("Investment SIP/Purchase");
    } else if (type === "pay_loan") {
      setActiveTab("expense");
      setSubtype("emi");
      const loanCat = categories.find((c) => c.id === "cat-loan-emi");
      if (loanCat) setCategoryId(loanCat.id);
      if (loans[0]) {
        setToRefKind("loan");
        setToRefId(loans[0].id);
        setToRefName(loans[0].name);
        setAmount(String(loans[0].emi));
        setAccountId(loans[0].pay_from_account);
        setNote(`${loans[0].name} EMI`);
      }
    } else if (type === "lend") {
      setActiveTab("transfer");
      setSubtype("lent");
      setToRefKind("person");
      setNote("Money lent");
    } else if (type === "recover") {
      setActiveTab("transfer");
      setSubtype("recovered");
      setToRefKind("person");
      setNote("Advance recovered");
    } else if (type === "borrow") {
      setActiveTab("transfer");
      setSubtype("borrowed");
      setToRefKind("loan");
      setNote("Borrowing disbursed");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!accountId) {
      toast.error("Please select an account");
      return;
    }

    const entryId = `entry-${Date.now()}`;
    const newEntry: Entry = {
      id: entryId,
      date: date.slice(0, 10),
      status: "posted",
      kind: activeTab,
      amount: numAmt,
      category_id: activeTab === "transfer" ? undefined : categoryId,
      account_id: accountId,
      to_ref:
        activeTab === "transfer" || subtype === "emi"
          ? {
              kind: toRefKind,
              id: toRefId || accountId,
              name: toRefName || undefined,
            }
          : undefined,
      need_want: activeTab === "expense" ? needWant : "Need",
      subtype,
      source: "manual",
      note: note.trim() || (activeTab === "expense" ? "Expense" : activeTab === "income" ? "Income" : "Transfer"),
      merchant: merchant.trim() || undefined,
      tags: [],
    };

    let newSchedule: Schedule | undefined;
    if (isRepeat) {
      newSchedule = {
        id: `sched-${Date.now()}`,
        name: note.trim() || `${activeTab.toUpperCase()} schedule`,
        kind: activeTab,
        amount: numAmt,
        frequency: repeatFrequency,
        next_date: date.slice(0, 10),
        account: accountId,
        category: categoryId || "cat-bills",
        auto_post: true,
        active: true,
        need_want: needWant,
        subtype,
      };
    }

    onSaveEntry(newEntry, newSchedule);
    toast.success(`${activeTab === "expense" ? "Expense" : activeTab === "income" ? "Income" : "Transfer"} recorded`, {
      description: `₹${numAmt.toLocaleString("en-IN")} on ${date}`,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-xs p-0 sm:items-center sm:p-4 animate-in fade-in-50 duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl wt-scrollbar animate-in slide-in-from-bottom duration-200"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          {/* Segmented Control */}
          <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/60">
            {(["expense", "income", "transfer"] as EntryKind[]).map((tab) => {
              const isSelected = activeTab === tab;
              const label = tab === "expense" ? "Expense" : tab === "income" ? "Income" : "Transfer";
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setSubtype("none");
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? tab === "expense"
                        ? "bg-rose-500 text-white shadow-2xs"
                        : tab === "income"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </Button>
        </div>

        {/* More Actions Shortcut Strip */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 wt-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
            Shortcuts:
          </span>
          <button
            type="button"
            onClick={() => handleQuickSpecialAction("invest")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer shrink-0 ${
              subtype === "sip" ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30" : "bg-muted/40 text-muted-foreground border-border/70 hover:bg-muted"
            }`}
          >
            <TrendingUp size={12} /> Invest (SIP)
          </button>
          <button
            type="button"
            onClick={() => handleQuickSpecialAction("pay_loan")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer shrink-0 ${
              subtype === "emi" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" : "bg-muted/40 text-muted-foreground border-border/70 hover:bg-muted"
            }`}
          >
            <Landmark size={12} /> Pay Loan EMI
          </button>
          <button
            type="button"
            onClick={() => handleQuickSpecialAction("lend")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer shrink-0 ${
              subtype === "lent" ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/40 text-muted-foreground border-border/70 hover:bg-muted"
            }`}
          >
            <Users size={12} /> Lend Money
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Hero Amount Input */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 text-center focus-within:border-primary focus-within:bg-card transition-all">
            <span className="text-xs font-semibold text-muted-foreground block mb-1">
              Amount to {activeTab === "expense" ? "Pay" : activeTab === "income" ? "Receive" : "Transfer"}
            </span>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">₹</span>
              <input
                autoFocus
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-48 sm:w-56 text-3xl sm:text-4xl font-extrabold text-foreground bg-transparent text-center outline-none tabular-nums placeholder:text-muted-foreground/30"
              />
            </div>
          </div>

          {/* Description & Merchant */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="wt-label">Description / Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Dinner with team, Groceries…"
                className="wt-field"
                required
              />
            </div>
            <div>
              <label className="wt-label">Merchant / Payee</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g. Swiggy, Uber, Decathlon…"
                className="wt-field"
              />
            </div>
          </div>

          {/* Account Selection */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="wt-label">{activeTab === "transfer" ? "From Account" : "Account"}</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="wt-field cursor-pointer"
                required
              >
                {accounts.filter((a) => !a.archived).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.institution || a.type})
                  </option>
                ))}
              </select>
            </div>

            {activeTab === "transfer" ? (
              <div>
                <label className="wt-label">To Destination</label>
                {toRefKind === "holding" ? (
                  <select
                    value={toRefId}
                    onChange={(e) => {
                      setToRefId(e.target.value);
                      const h = holdings.find((x) => x.id === e.target.value);
                      setToRefName(h?.name || "");
                    }}
                    className="wt-field cursor-pointer"
                  >
                    {holdings.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.broker})
                      </option>
                    ))}
                  </select>
                ) : toRefKind === "person" ? (
                  <input
                    type="text"
                    value={toRefName}
                    onChange={(e) => setToRefName(e.target.value)}
                    placeholder="Contact name (e.g. Rohan)"
                    className="wt-field"
                    required
                  />
                ) : (
                  <select
                    value={toRefId}
                    onChange={(e) => {
                      setToRefId(e.target.value);
                      const a = accounts.find((x) => x.id === e.target.value);
                      setToRefName(a?.name || "");
                    }}
                    className="wt-field cursor-pointer"
                  >
                    <option value="">Select destination account</option>
                    {accounts.filter((a) => a.id !== accountId && !a.archived).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.institution || a.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div>
                <label className="wt-label">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="wt-field cursor-pointer"
                  required
                >
                  {categories.filter((c) => !c.archived && c.kind === activeTab).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date & Need/Want Row */}
          <div className="grid gap-3 sm:grid-cols-2 items-center">
            <div>
              <label className="wt-label">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="wt-field"
                required
              />
            </div>

            {activeTab === "expense" && (
              <div>
                <label className="wt-label">50/30/20 Classification</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNeedWant("Need")}
                    className={`h-9 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      needWant === "Need"
                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/40 shadow-2xs"
                        : "border-border/70 text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    Need (Essential)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNeedWant("Want")}
                    className={`h-9 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      needWant === "Want"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-2xs"
                        : "border-border/70 text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    Want (Lifestyle)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Repeat Schedule Toggle */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <RefreshCw size={15} className={isRepeat ? "text-primary" : "text-muted-foreground"} />
              <div>
                <span className="text-xs font-bold text-foreground block">Repeat this transaction</span>
                <span className="text-[11px] text-muted-foreground">Creates an auto-recurring schedule</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isRepeat && (
                <select
                  value={repeatFrequency}
                  onChange={(e) => setRepeatFrequency(e.target.value as any)}
                  className="wt-field h-7 text-xs py-0 pl-2 pr-7 font-semibold"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              )}
              <input
                type="checkbox"
                checked={isRepeat}
                onChange={(e) => setIsRepeat(e.target.checked)}
                className="size-4 rounded accent-primary cursor-pointer"
                id="repeat-checkbox"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-11 text-xs font-bold shadow-md gap-2"
            >
              <Check size={16} /> Save {activeTab === "expense" ? "Expense" : activeTab === "income" ? "Income" : "Transfer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
