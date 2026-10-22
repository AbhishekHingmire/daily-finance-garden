import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { Modal } from "@/components/shared/Modal";
import { InstitutionLogo } from "@/components/shared/InstitutionLogo";
import type { Account, AccountKind } from "@/lib/wealthtrack";

export const POPULAR_BANKS = [
  "HDFC Bank",
  "State Bank of India (SBI)",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank (PNB)",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "IndusInd Bank",
  "Federal Bank",
  "IDFC FIRST Bank",
  "Yes Bank",
  "Chase",
  "Bank of America",
  "Wells Fargo",
  "Citibank",
  "HSBC",
  "Standard Chartered",
  "Barclays",
];

export const POPULAR_WALLETS = [
  "Paytm",
  "PhonePe",
  "Google Pay",
  "Amazon Pay",
  "Apple Cash",
  "PayPal",
  "MobiKwik",
  "CRED Balance",
  "Sodexo / Pluxee",
];

export const POPULAR_CARDS = [
  "HDFC Bank Card",
  "SBI Card",
  "ICICI Bank Card",
  "Axis Bank Card",
  "American Express (Amex)",
  "OneCard",
  "Kotak Card",
  "Amazon Pay ICICI Card",
  "Tata Neu HDFC Card",
  "Chase Sapphire Card",
  "Citi Card",
];

export function AccountModal({
  account,
  currency = "INR",
  onClose,
  onSave,
}: {
  account: Account | null;
  currency?: string;
  onClose: () => void;
  onSave: (form: Partial<Account>) => void;
}) {
  const [kind, setKind] = useState<AccountKind>(() => account?.kind ?? "Bank account");
  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    if (!account) return "";
    const k = account.kind;
    const inst = account.institution;
    if (k === "Bank account" && POPULAR_BANKS.includes(inst)) return inst;
    if (k === "Digital wallet" && POPULAR_WALLETS.includes(inst)) return inst;
    if (k === "Credit card" && POPULAR_CARDS.includes(inst)) return inst;
    return inst ? "custom" : "";
  });
  const [customInstitution, setCustomInstitution] = useState<string>(() => {
    if (!account) return "";
    const k = account.kind;
    const inst = account.institution;
    if (
      (k === "Bank account" && !POPULAR_BANKS.includes(inst)) ||
      (k === "Digital wallet" && !POPULAR_WALLETS.includes(inst)) ||
      (k === "Credit card" && !POPULAR_CARDS.includes(inst)) ||
      k === "Other"
    ) {
      return inst;
    }
    return "";
  });
  const [name, setName] = useState<string>(() => account?.name ?? "");
  const [nameManuallyEdited, setNameManuallyEdited] = useState<boolean>(() => Boolean(account?.name));
  const [identifier, setIdentifier] = useState<string>(() => account?.identifier ?? "");
  const [openingBalance, setOpeningBalance] = useState<string | number>(() => account?.openingBalance ?? 0);
  const [notes, setNotes] = useState<string>(() => account?.notes ?? "");
  const [showNotes, setShowNotes] = useState<boolean>(() => Boolean(account?.notes));
  const [nameError, setNameError] = useState<string>("");

  const handleKindChange = (newKind: AccountKind) => {
    setKind(newKind);
    setSelectedPreset("");
    setCustomInstitution("");
    setNameError("");

    if (newKind === "Cash") {
      if (!nameManuallyEdited || !name) {
        setName("Cash wallet");
      }
    } else if (!nameManuallyEdited) {
      setName("");
    }
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    setNameError("");

    if (preset === "custom") return;

    if (preset && (!nameManuallyEdited || !name)) {
      if (kind === "Bank account") {
        const shortName = preset.replace(" Bank", "").replace(" (SBI)", "");
        setName(`${shortName} Account`);
      } else if (kind === "Digital wallet") {
        setName(`${preset} wallet`);
      } else if (kind === "Credit card") {
        const shortName = preset.replace(" Card", "");
        setName(`${shortName} Card`);
      }
    }
  };

  const handleCustomInstitutionChange = (val: string) => {
    setCustomInstitution(val);
    if ((!nameManuallyEdited || !name) && val.trim()) {
      setName(kind === "Bank account" ? `${val.trim()} Account` : `${val.trim()} wallet`);
    }
  };

  const handleIdentifierBlur = () => {
    const raw = identifier.trim();
    if (/^\d{4}$/.test(raw)) {
      setIdentifier(`•••• ${raw}`);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setNameError("Please enter an account name");
      return;
    }

    let finalInstitution = "";
    if (kind === "Cash") {
      finalInstitution = "Cash";
    } else if (selectedPreset === "custom") {
      finalInstitution = customInstitution.trim() || name.trim();
    } else if (selectedPreset) {
      finalInstitution = selectedPreset;
    } else {
      finalInstitution = customInstitution.trim() || name.trim();
    }

    onSave({
      name: name.trim(),
      kind,
      institution: finalInstitution,
      identifier: kind === "Cash" ? "" : identifier.trim(),
      openingBalance: Number(openingBalance) || 0,
      notes: notes.trim(),
    });
  };

  const currencySymbol =
    currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";

  const previewInstitutionName =
    kind === "Cash"
      ? "Cash"
      : selectedPreset === "custom"
      ? customInstitution || name
      : selectedPreset || customInstitution || name;

  return (
    <Modal
      title={account ? "Edit Account" : "Add Account"}
      description="Quickly set up your balance and financial accounts."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Type Dropdown */}
        <SelectField
          label="Account Type"
          value={kind}
          onChange={(val) => handleKindChange(val as AccountKind)}
          options={[
            { value: "Bank account", label: "🏦 Bank Account" },
            { value: "Digital wallet", label: "📱 Digital Wallet" },
            { value: "Credit card", label: "💳 Credit Card" },
            { value: "Cash", label: "💵 Cash" },
            { value: "Investment", label: "📈 Investment" },
            { value: "Other", label: "📁 Other" },
          ]}
          required
        />

        {/* Dynamic Institution Dropdown (Bank / Wallet / Card) */}
        {kind === "Bank account" && (
          <div className="space-y-2">
            <SelectField
              label="Select your bank"
              value={selectedPreset}
              onChange={handlePresetChange}
              placeholder="Choose bank from list..."
              options={[
                ...POPULAR_BANKS.map((b) => ({ value: b, label: b })),
                { value: "custom", label: "+ Other Bank (Enter custom name)" },
              ]}
            />
            {selectedPreset === "custom" && (
              <InputField
                label="Custom bank name"
                value={customInstitution}
                onChange={handleCustomInstitutionChange}
                placeholder="e.g. Bandhan Bank, Chase, Revolut"
                required
              />
            )}
          </div>
        )}

        {kind === "Digital wallet" && (
          <div className="space-y-2">
            <SelectField
              label="Select wallet provider"
              value={selectedPreset}
              onChange={handlePresetChange}
              placeholder="Choose wallet..."
              options={[
                ...POPULAR_WALLETS.map((w) => ({ value: w, label: w })),
                { value: "custom", label: "+ Other Wallet (Enter custom name)" },
              ]}
            />
            {selectedPreset === "custom" && (
              <InputField
                label="Custom wallet name"
                value={customInstitution}
                onChange={handleCustomInstitutionChange}
                placeholder="e.g. Freecharge, GrabPay"
                required
              />
            )}
          </div>
        )}

        {kind === "Credit card" && (
          <div className="space-y-2">
            <SelectField
              label="Card issuer / Bank"
              value={selectedPreset}
              onChange={handlePresetChange}
              placeholder="Choose card issuer..."
              options={[
                ...POPULAR_CARDS.map((c) => ({ value: c, label: c })),
                { value: "custom", label: "+ Other Card (Enter custom issuer)" },
              ]}
            />
            {selectedPreset === "custom" && (
              <InputField
                label="Custom card issuer"
                value={customInstitution}
                onChange={handleCustomInstitutionChange}
                placeholder="e.g. Barclays, RBL Bank"
                required
              />
            )}
          </div>
        )}

        {(kind === "Other" || kind === "Investment") && (
          <InputField
            label="Institution / Platform"
            value={customInstitution}
            onChange={setCustomInstitution}
            placeholder={
              kind === "Investment"
                ? "e.g. Zerodha, Groww, Vanguard"
                : "e.g. Crypto Exchange, Brokerage, Co-op"
            }
          />
        )}

        {/* Institution Brand Badge Preview */}
        {previewInstitutionName && (
          <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-xs">
            <InstitutionLogo name={previewInstitutionName} size="sm" />
            <div>
              <span className="font-bold text-foreground block">
                {previewInstitutionName}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                Verified Institution Branding
              </span>
            </div>
          </div>
        )}

        {/* Account Name & Identifier Grid */}
        <div className={`grid gap-3 ${kind === "Cash" ? "grid-cols-1" : "sm:grid-cols-2"}`}>
          <InputField
            label={kind === "Credit card" ? "Card nickname / name" : "Account name"}
            value={name}
            onChange={(val) => {
              setName(val);
              setNameManuallyEdited(true);
              if (nameError) setNameError("");
            }}
            placeholder={
              kind === "Cash"
                ? "Cash wallet"
                : kind === "Credit card"
                ? "e.g. Millennia Card"
                : kind === "Digital wallet"
                ? "e.g. Paytm Daily"
                : "e.g. Salary account"
            }
            error={nameError}
            required
          />

          {kind !== "Cash" && (
            <label className="block min-w-0">
              <span className="wt-label">
                {kind === "Credit card"
                  ? "Last 4 digits"
                  : kind === "Digital wallet"
                  ? "UPI ID / Phone (Optional)"
                  : "Last 4 digits / Acc. No."}
              </span>
              <input
                className="wt-field"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onBlur={handleIdentifierBlur}
                placeholder={
                  kind === "Credit card"
                    ? "•••• 4281"
                    : kind === "Digital wallet"
                    ? "e.g. 98765••••• or @upi"
                    : "e.g. •••• 9016"
                }
              />
            </label>
          )}
        </div>

        {/* Opening Balance */}
        <div>
          <InputField
            label={`Opening balance (${currencySymbol})`}
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(val) => setOpeningBalance(val)}
            placeholder="0.00"
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {kind === "Credit card"
              ? "Current outstanding balance or credit limit"
              : "Starting balance available in this account"}
          </span>
        </div>

        {/* Collapsible Notes */}
        <div>
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              + Add notes (optional)
            </button>
          ) : (
            <div className="space-y-1">
              <span className="wt-label flex items-center justify-between">
                Notes
                <button
                  type="button"
                  onClick={() => setShowNotes(false)}
                  className="text-[11px] font-normal text-muted-foreground hover:underline"
                >
                  Hide
                </button>
              </span>
              <textarea
                className="wt-field min-h-16 resize-y"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add optional notes (e.g. branch, purpose)..."
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{account ? "Save Changes" : "Add Account"}</Button>
        </div>
      </form>
    </Modal>
  );
}
