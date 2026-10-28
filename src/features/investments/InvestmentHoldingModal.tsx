import { useMemo, useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
  Sparkles,
  Loader2,
  Check,
  RefreshCw,
  Calculator,
  Percent,
  Layers,
  Coins,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { Modal } from "@/components/shared/Modal";
import { marketApi, type InstrumentSearchResult } from "@/services/api";
import { getAccountBalance, type AssetType, type InvestmentHolding, type WealthState } from "@/lib/wealthtrack";
import { calculateInvestmentValuation, getDefaultExpenseRatio } from "@/lib/investment-calculator";
import { currencyService } from "@/lib/currency-service";

const ASSET_TYPES: AssetType[] = [
  "Mutual fund",
  "Stocks & Equity",
  "ETF",
  "Gold & Commodities",
  "Fixed deposit",
  "Crypto",
  "Other",
];

const SEARCH_CATEGORIES = [
  { id: "All", label: "All Instruments" },
  { id: "National Stock", label: "National (NSE)" },
  { id: "International Stock", label: "US / Global" },
  { id: "Mutual Fund", label: "Mutual Funds (AMFI)" },
  { id: "ETF", label: "ETFs" },
  { id: "Gold & Commodities", label: "Gold" },
];

const POPULAR_INSTRUMENTS: InstrumentSearchResult[] = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", category: "National Stock", assetType: "Stocks & Equity", exchange: "NSE", currentPrice: 2890, currency: "INR" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd", category: "National Stock", assetType: "Stocks & Equity", exchange: "NSE", currentPrice: 3840, currency: "INR" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", category: "National Stock", assetType: "Stocks & Equity", exchange: "NSE", currentPrice: 1680, currency: "INR" },
  { symbol: "AAPL", name: "Apple Inc.", category: "International Stock", assetType: "Stocks & Equity", exchange: "NASDAQ", currentPrice: 224, currency: "USD" },
  { symbol: "MSFT", name: "Microsoft Corporation", category: "International Stock", assetType: "Stocks & Equity", exchange: "NASDAQ", currentPrice: 428, currency: "USD" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Google)", category: "International Stock", assetType: "Stocks & Equity", exchange: "NASDAQ", currentPrice: 178, currency: "USD" },
  { symbol: "122639", name: "Parag Parikh Flexi Cap Fund - Direct Growth", category: "Mutual Fund", assetType: "Mutual fund", exchange: "AMFI", currentPrice: 89.28, currency: "INR" },
  { symbol: "120503", name: "Mirae Asset Large Cap Fund - Direct Growth", category: "Mutual Fund", assetType: "Mutual fund", exchange: "AMFI", currentPrice: 124.50, currency: "INR" },
  { symbol: "GOLDBEES", name: "Nippon India ETF Gold BeES", category: "Gold & Commodities", assetType: "Gold & Commodities", exchange: "NSE", currentPrice: 71.50, currency: "INR" },
  { symbol: "NIFTYBEES", name: "Nippon India ETF Nifty BeES", category: "ETF", assetType: "ETF", exchange: "NSE", currentPrice: 268.10, currency: "INR" },
];

export function InvestmentHoldingModal({
  data,
  existing,
  onClose,
  onSave,
}: {
  data: WealthState;
  existing: InvestmentHolding | null;
  onClose: () => void;
  onSave: (holding: InvestmentHolding) => void;
}) {
  const currencySymbol =
    data.preferences.currency === "INR"
      ? "₹"
      : data.preferences.currency === "USD"
      ? "$"
      : data.preferences.currency === "EUR"
      ? "€"
      : "£";

  const [name, setName] = useState(existing?.name ?? "");
  const [assetType, setAssetType] = useState<AssetType>(existing?.assetType ?? "Mutual fund");
  const [institution, setInstitution] = useState(existing?.institution ?? "");
  const [startMonthYear, setStartMonthYear] = useState(
    existing?.startMonthYear ?? new Date().toISOString().slice(0, 7)
  );
  const [endMonthYear, setEndMonthYear] = useState(existing?.endMonthYear ?? "");
  const [investedAmount, setInvestedAmount] = useState<number | "">(
    existing?.investedAmount !== undefined ? existing.investedAmount : ""
  );
  const [currentAmount, setCurrentAmount] = useState<number | "">(
    existing?.currentAmount !== undefined ? existing.currentAmount : ""
  );

  // Smart Calculation Engine States
  const [valuationMode, setValuationMode] = useState<"auto" | "manual">(
    existing?.calculationMode === "manual" ? "manual" : "auto"
  );
  const [units, setUnits] = useState<number | "">(
    existing?.units !== undefined ? existing.units : ""
  );
  const [purchasePrice, setPurchasePrice] = useState<number | "">(
    existing?.purchasePrice !== undefined ? existing.purchasePrice : ""
  );
  const [currentPrice, setCurrentPrice] = useState<number | "">(
    existing?.currentPrice !== undefined ? existing.currentPrice : ""
  );
  const [expenseRatio, setExpenseRatio] = useState<number | "">(
    existing?.expenseRatio !== undefined
      ? existing.expenseRatio
      : getDefaultExpenseRatio(existing?.assetType ?? "Mutual fund", existing?.name ?? "")
  );
  const [fdAnnualRate, setFdAnnualRate] = useState<number | "">(
    existing?.interestRate !== undefined ? existing.interestRate : 7.1
  );
  const [fdCompounding, setFdCompounding] = useState<"Quarterly" | "Monthly" | "Annual">("Quarterly");

  const [isRecurring, setIsRecurring] = useState<boolean>(existing?.isRecurring ?? false);
  const [sipAmount, setSipAmount] = useState<number | "">(
    existing?.sipAmount !== undefined ? existing.sipAmount : ""
  );
  const [sipFrequency, setSipFrequency] = useState<string>(existing?.sipFrequency ?? "Monthly");
  const [sipAccountId, setSipAccountId] = useState<string>(
    existing?.sipAccountId ?? data.accounts[0]?.id ?? ""
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Market Asset Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchFilter, setSearchFilter] = useState("All");
  const [selectedQuote, setSelectedQuote] = useState<{
    symbol: string;
    name: string;
    price: number;
    currency: string;
    category: string;
  } | null>(null);
  const [isServiceDown, setIsServiceDown] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [exchangeRateInfo, setExchangeRateInfo] = useState<{
    rate: number;
    fromCurrency: string;
    toCurrency: string;
  } | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Debounced live API search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const cat = searchFilter === "All" ? undefined : searchFilter;
        const results = await marketApi.searchInstruments(searchQuery.trim(), cat);
        setSearchResults(results);
      } catch (err) {
        console.error("Failed to search instruments:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, searchFilter]);

  const displayedList = useMemo(() => {
    if (searchQuery.trim().length >= 2) {
      return searchResults;
    }
    if (searchFilter === "All") return POPULAR_INSTRUMENTS;
    return POPULAR_INSTRUMENTS.filter(
      (item) => item.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
                (searchFilter === "Gold & Commodities" && item.category === "Gold & Commodities")
    );
  }, [searchQuery, searchResults, searchFilter]);

  // When user selects an instrument from the search registry
  const handleSelectInstrument = async (item: InstrumentSearchResult) => {
    setName(item.name);
    setAssetType(item.assetType);
    if (item.exchange) {
      setInstitution(item.exchange);
    }
    const defaultTer = getDefaultExpenseRatio(item.assetType, item.name);
    setExpenseRatio(defaultTer);
    setShowSearchDropdown(false);
    setSearchQuery("");

    setIsFetchingQuote(true);
    setIsServiceDown(false);

    try {
      // 1. Fetch real-time market quote with 3-tier robust public fallbacks
      const { quote, isServiceDown: serviceFailed } = await marketApi.getLiveQuoteWithFallbacks(
        item.symbol || item.name,
        item.category
      );

      const resolvedPrice = quote?.currentPrice ?? item.currentPrice;
      const instrumentCurrency = (quote?.currency || item.currency || "INR").toUpperCase();
      const userCurrency = (data.preferences.currency || "INR").toUpperCase();

      if (serviceFailed && (!resolvedPrice || resolvedPrice <= 0)) {
        setIsServiceDown(true);
        setValuationMode("manual");
        return;
      }

      if (resolvedPrice && resolvedPrice > 0) {
        let finalPriceInUserCurrency = resolvedPrice;

        // 2. International currency conversion: if instrument currency differs from user's chosen currency
        if (instrumentCurrency !== userCurrency) {
          const rateResult = await currencyService.getExchangeRate(instrumentCurrency, userCurrency);
          finalPriceInUserCurrency = Math.round(resolvedPrice * rateResult.rate * 100) / 100;
          setExchangeRateInfo({
            rate: rateResult.rate,
            fromCurrency: instrumentCurrency,
            toCurrency: userCurrency,
          });
        } else {
          setExchangeRateInfo(null);
        }

        setCurrentPrice(finalPriceInUserCurrency);
        setSelectedQuote({
          symbol: quote?.symbol || item.symbol,
          name: quote?.name || item.name,
          price: resolvedPrice,
          currency: instrumentCurrency,
          category: item.category,
        });

        // Auto-compute units & purchase price if investedAmount is already entered
        const inv = Number(investedAmount) || 0;
        if (inv > 0 && (units === "" || Number(units) <= 0)) {
          const derivedUnits = Math.round((inv / finalPriceInUserCurrency) * 10000) / 10000;
          setUnits(derivedUnits);
          setPurchasePrice(finalPriceInUserCurrency);
        } else if (units !== "" && Number(units) > 0 && purchasePrice === "") {
          setPurchasePrice(finalPriceInUserCurrency);
        }
      } else {
        setIsServiceDown(true);
        setValuationMode("manual");
      }
    } catch {
      setIsServiceDown(true);
      setValuationMode("manual");
    } finally {
      setIsFetchingQuote(false);
    }
  };

  // Asset type change handler
  const handleAssetTypeChange = (newType: AssetType) => {
    setAssetType(newType);
    const newTer = getDefaultExpenseRatio(newType, name);
    setExpenseRatio(newTer);
  };

  // Units input change handler (synchronizes buy price)
  const handleUnitsChange = (val: string) => {
    if (val === "") {
      setUnits("");
      return;
    }
    const num = Number(val);
    setUnits(num);
    const inv = Number(investedAmount) || 0;
    if (inv > 0 && num > 0) {
      setPurchasePrice(Math.round((inv / num) * 10000) / 10000);
    }
  };

  // Purchase Price change handler (synchronizes units)
  const handlePurchasePriceChange = (val: string) => {
    if (val === "") {
      setPurchasePrice("");
      return;
    }
    const num = Number(val);
    setPurchasePrice(num);
    const inv = Number(investedAmount) || 0;
    if (inv > 0 && num > 0) {
      setUnits(Math.round((inv / num) * 10000) / 10000);
    }
  };

  // Comprehensive valuation calculations using investment-calculator engine
  const valuation = useMemo(() => {
    return calculateInvestmentValuation({
      investedAmount: Number(investedAmount) || 0,
      currentPrice: currentPrice === "" ? undefined : Number(currentPrice),
      units: units === "" ? undefined : Number(units),
      purchasePrice: purchasePrice === "" ? undefined : Number(purchasePrice),
      assetType,
      calculationMode:
        valuationMode === "manual"
          ? "manual"
          : assetType === "Fixed deposit"
          ? "fixed_deposit"
          : "auto_units",
      startMonthYear,
      endMonthYear,
      expenseRatio: expenseRatio === "" ? 0 : Number(expenseRatio),
      fdAnnualRate: fdAnnualRate === "" ? 7.1 : Number(fdAnnualRate),
      fdCompounding,
      manualCurrentAmount: currentAmount === "" ? undefined : Number(currentAmount),
    });
  }, [
    investedAmount,
    currentPrice,
    units,
    purchasePrice,
    assetType,
    valuationMode,
    startMonthYear,
    endMonthYear,
    expenseRatio,
    fdAnnualRate,
    fdCompounding,
    currentAmount,
  ]);

  // Sync calculated currentAmount into state when in auto mode
  useEffect(() => {
    if (valuationMode === "auto") {
      setCurrentAmount(valuation.currentAmount);
    }
  }, [valuation.currentAmount, valuationMode]);

  // Auto-derive units from current ongoing price if user only entered invested amount
  const handleAutoDeriveUnitsFromPrice = () => {
    const inv = Number(investedAmount) || 0;
    const price = Number(currentPrice) || 0;
    if (inv > 0 && price > 0) {
      const derived = Math.round((inv / price) * 10000) / 10000;
      setUnits(derived);
      setPurchasePrice(price);
    }
  };

  const investedNum = Number(investedAmount) || 0;
  const currentNum = valuationMode === "auto" ? valuation.currentAmount : Number(currentAmount) || 0;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Enter the name of the holding.";
    if (!startMonthYear) errs.startMonthYear = "Start Month & Year is mandatory.";
    if (investedAmount === "" || investedNum < 0) errs.investedAmount = "Enter a valid invested amount.";
    if (currentNum < 0) errs.currentAmount = "Current valuation cannot be negative.";

    if (isRecurring) {
      if (!sipAmount || Number(sipAmount) <= 0) {
        errs.sipAmount = "Enter a valid SIP installment amount.";
      }
      if (!sipAccountId) {
        errs.sipAccountId = "Select a bank account for SIP debit.";
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const holding: InvestmentHolding = {
      id: existing?.id ?? `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      assetType,
      institution: institution.trim() || undefined,
      startMonthYear,
      endMonthYear: endMonthYear || undefined,
      investedAmount: investedNum,
      currentAmount: currentNum,
      isRecurring,
      recurringId: existing?.recurringId,
      sipAmount: isRecurring ? Number(sipAmount) : undefined,
      sipFrequency: isRecurring ? sipFrequency : undefined,
      sipAccountId: isRecurring ? sipAccountId : undefined,
      status: existing?.status ?? "Active",
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
      units: units !== "" ? Number(units) : undefined,
      purchasePrice: purchasePrice !== "" ? Number(purchasePrice) : undefined,
      currentPrice: currentPrice !== "" ? Number(currentPrice) : undefined,
      expenseRatio: expenseRatio !== "" ? Number(expenseRatio) : undefined,
      interestRate: fdAnnualRate !== "" ? Number(fdAnnualRate) : undefined,
      calculationMode: valuationMode === "manual" ? "manual" : "auto_units",
      currency: selectedQuote?.currency || (assetType === "Stocks & Equity" && institution?.includes("NASDAQ") ? "USD" : data.preferences.currency || "INR"),
      originalPrice: selectedQuote?.price ?? (currentPrice !== "" ? Number(currentPrice) : undefined),
      exchangeRate: exchangeRateInfo?.rate ?? 1.0,
    };

    onSave(holding);
  };

  return (
    <Modal
      title={existing ? "Update Investment Holding" : "Add Investment Holding"}
      description="Track and calculate valuation from ongoing market prices, units, compound interest, and expense ratio."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Instant Public Search & Choose Combobox */}
        <div
          ref={searchContainerRef}
          className="relative space-y-2 rounded-xl border border-primary/25 bg-primary/5 p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              <span>Search & Pick Market Asset (National, Global, AMFI, Gold)</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">Public API Autocomplete</span>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-1">
            {SEARCH_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSearchFilter(cat.id);
                  setShowSearchDropdown(true);
                }}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                  searchFilter === cat.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              className="wt-field pl-8.5 pr-8 text-xs placeholder:text-muted-foreground/60"
              placeholder="Search TCS, Apple (AAPL), Parag Parikh, Gold BeES, Nifty 50..."
              value={searchQuery}
              onFocus={() => setShowSearchDropdown(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-2.5 size-3.5 animate-spin text-primary" />
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 flex items-center justify-between">
                <span>
                  {searchQuery.trim().length >= 2
                    ? `Live Results (${displayedList.length})`
                    : `Popular Instruments (${searchFilter})`}
                </span>
                <span className="text-[9px] lowercase font-normal">Click to auto-fill</span>
              </div>

              {displayedList.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {isSearching ? "Searching registry..." : "No instruments found. You can type details manually below."}
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {displayedList.map((item) => (
                    <button
                      key={`${item.symbol}-${item.exchange}-${item.name}`}
                      type="button"
                      onClick={() => handleSelectInstrument(item)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/60 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-foreground group-hover:text-primary">
                            {item.symbol}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-medium ${
                              item.category === "National Stock"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : item.category === "International Stock"
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                                : item.category === "Mutual Fund"
                                ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                                : item.category === "Gold & Commodities"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                            }`}
                          >
                            {item.category}
                          </span>
                          {item.exchange && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({item.exchange})
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                          {item.name}
                        </p>
                      </div>

                      {item.currentPrice !== undefined && item.currentPrice > 0 && (
                        <div className="text-right shrink-0">
                          <span className="text-xs font-semibold text-foreground">
                            {item.currency === "INR" ? "₹" : item.currency === "USD" ? "$" : ""}
                            {item.currentPrice.toLocaleString("en-IN", {
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          <span className="block text-[9px] text-muted-foreground">
                            {item.category === "Mutual Fund" ? "Ongoing NAV" : "Live Price"}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active linked instrument banner */}
          {selectedQuote && (
            <div className="flex flex-col gap-1.5 rounded-lg bg-background p-2.5 border border-border/80 text-xs shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-bold text-foreground truncate">{selectedQuote.symbol}</span>
                  <span className="text-muted-foreground truncate hidden sm:inline text-[11px]">· {selectedQuote.name}</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded shrink-0">
                  Live Sync Active
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span>
                  Quote: <strong className="text-foreground">{selectedQuote.currency === "INR" ? "₹" : selectedQuote.currency === "USD" ? "$" : `${selectedQuote.currency} `}{selectedQuote.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
                </span>
                {exchangeRateInfo && (
                  <span className="inline-flex items-center gap-1 text-primary font-semibold text-[10px] bg-primary/5 px-1.5 py-0.5 rounded">
                    🌐 1 {exchangeRateInfo.fromCurrency} = {exchangeRateInfo.toCurrency === "INR" ? "₹" : "$"}{exchangeRateInfo.rate.toLocaleString("en-IN", { maximumFractionDigits: 2 })} {exchangeRateInfo.toCurrency}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Name, Type & Broker */}
        <InputField
          label="Holding / Asset Name"
          placeholder="e.g. Parag Parikh Flexi Cap, Nifty 50 ETF, Gold BeES"
          value={name}
          onChange={setName}
          error={errors.name}
          required
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Asset Type"
            value={assetType}
            onChange={(v) => handleAssetTypeChange(v as AssetType)}
            options={ASSET_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <InputField
            label="Broker / Platform (optional)"
            placeholder="e.g. Groww, Zerodha, HDFC"
            value={institution}
            onChange={setInstitution}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="wt-label">
              Start Date (Month & Year) <span className="text-destructive">*</span>
            </span>
            <input
              type="month"
              className="wt-field font-semibold text-xs"
              value={startMonthYear}
              onChange={(e) => setStartMonthYear(e.target.value)}
              required
            />
            {errors.startMonthYear && (
              <span className="mt-1 block text-xs text-destructive">{errors.startMonthYear}</span>
            )}
          </label>

          <label className="block">
            <span className="wt-label">
              End / Target Date (Month & Year) <span className="text-muted-foreground text-[10px] font-normal">(optional)</span>
            </span>
            <input
              type="month"
              className="wt-field font-semibold text-xs"
              value={endMonthYear}
              onChange={(e) => setEndMonthYear(e.target.value)}
            />
          </label>
        </div>

        {/* VALUATION ENGINE COCKPIT */}
        <div className="rounded-xl border border-primary/20 bg-muted/20 p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Calculator className="size-3.5 text-primary shrink-0" />
              <span className="text-xs font-bold text-foreground">Valuation Mode</span>
            </div>
            <div className="inline-flex items-center gap-0.5 bg-background p-0.5 rounded-lg border border-border shrink-0">
              <button
                type="button"
                disabled={isServiceDown}
                onClick={() => setValuationMode("auto")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isServiceDown
                    ? "opacity-40 cursor-not-allowed text-muted-foreground"
                    : valuationMode === "auto"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ⚡ Auto
              </button>
              <button
                type="button"
                onClick={() => setValuationMode("manual")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  valuationMode === "manual"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ✏️ Manual
              </button>
            </div>
          </div>

          {/* Compact Service Offline Note if Fallback APIs are unavailable */}
          {isServiceDown && (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
              <span className="shrink-0">⚠️</span>
              <span className="font-medium">Live quotes temporarily offline · Manual entry active.</span>
            </div>
          )}

          {/* Invested Amount (Always required) */}
          <div>
            <label className="block">
              <span className="wt-label">
                Invested Amount / Capital ({currencySymbol}) <span className="text-destructive">*</span>
              </span>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">
                  {currencySymbol}
                </span>
                <input
                  className="wt-field pl-8 font-semibold"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 50000"
                  value={investedAmount}
                  onChange={(e) => setInvestedAmount(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              {errors.investedAmount && (
                <span className="mt-1 block text-xs text-destructive">{errors.investedAmount}</span>
              )}
            </label>
          </div>

          {/* AUTO-CALCULATE CONTROLS */}
          {valuationMode === "auto" ? (
            <div className="space-y-3 pt-2 border-t border-border/60">
              {assetType === "Fixed deposit" ? (
                /* FIXED DEPOSIT ACCRUED INTEREST CONTROLS */
                <div className="space-y-2.5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className="wt-label">Annual Interest Rate (% p.a.) *</span>
                      <input
                        type="number"
                        min="0"
                        step="0.05"
                        placeholder="e.g. 7.10"
                        className="wt-field font-semibold text-xs"
                        value={fdAnnualRate}
                        onChange={(e) => setFdAnnualRate(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <span className="wt-label">Compounding Frequency</span>
                      <select
                        className="wt-field text-xs font-semibold"
                        value={fdCompounding}
                        onChange={(e) => setFdCompounding(e.target.value as any)}
                      >
                        <option value="Quarterly">Quarterly (RBI Standard)</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Annual">Annual</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-lg bg-teal-500/10 border border-teal-500/25 p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-1">
                        <Landmark size={14} /> Accrued Compounded Interest ({valuation.elapsedMonths} mos)
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Compounded {fdCompounding.toLowerCase()} at {fdAnnualRate}% p.a.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-teal-700 dark:text-teal-300">
                        +{currencySymbol}{(valuation.fdAccruedInterest || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </span>
                      {valuation.fdMaturityAmount && (
                        <span className="block text-[10px] text-muted-foreground">
                          Maturity: {currencySymbol}{valuation.fdMaturityAmount.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* STOCKS, MUTUAL FUNDS, ETFS, GOLD & CRYPTO LIVE CONTROLS */
                <div className="space-y-2.5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="wt-label mb-0">Ongoing Market Price / NAV ({currencySymbol})</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 89.28"
                        className="wt-field font-semibold text-xs bg-background"
                        value={currentPrice}
                        onChange={(e) => setCurrentPrice(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <span className="wt-label">Units / Quantity Held</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 560"
                        className="wt-field font-semibold text-xs"
                        value={units}
                        onChange={(e) => handleUnitsChange(e.target.value)}
                      />
                    </div>

                    <div>
                      <span className="wt-label">Buy Price / Average NAV ({currencySymbol})</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 70.00"
                        className="wt-field font-semibold text-xs"
                        value={purchasePrice}
                        onChange={(e) => handlePurchasePriceChange(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* One-click derive button if only invested amount is known */}
                  {investedNum > 0 && Number(currentPrice) > 0 && units === "" && (
                    <button
                      type="button"
                      onClick={handleAutoDeriveUnitsFromPrice}
                      className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      <Coins size={12} />
                      Derive units at current price ({investedNum} ÷ {currentPrice} = {Math.round((investedNum / Number(currentPrice)) * 100) / 100} units)
                    </button>
                  )}
                </div>
              )}

              {/* Calculated Current Valuation Banner */}
              <div className="flex items-center justify-between rounded-xl bg-background p-3 border border-primary/30 shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Auto-Calculated Current Valuation
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {assetType === "Fixed deposit"
                      ? `Principal + ${valuation.elapsedMonths}m Accrued Compound Interest`
                      : valuation.units > 0 && valuation.currentPrice > 0
                      ? `${valuation.units.toLocaleString("en-IN", { maximumFractionDigits: 3 })} units × ${currencySymbol}${valuation.currentPrice}`
                      : "Based on active market holdings"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-foreground">
                    {currencySymbol}{valuation.currentAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* MANUAL VALUATION ENTRY */
            <div className="pt-2 border-t border-border/60">
              <label className="block">
                <span className="wt-label">
                  Manual Current Valuation ({currencySymbol}) <span className="text-destructive">*</span>
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">
                    {currencySymbol}
                  </span>
                  <input
                    className="wt-field pl-8 font-semibold"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
                {errors.currentAmount && (
                  <span className="mt-1 block text-xs text-destructive">{errors.currentAmount}</span>
                )}
              </label>
            </div>
          )}
        </div>

        {/* EXPENSE RATIO (TER) & FUND MANAGEMENT COST */}
        {["Mutual fund", "ETF", "Gold & Commodities"].includes(assetType) && (
          <div className="rounded-xl border border-border/80 bg-muted/15 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Percent className="size-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground">Total Expense Ratio (TER) Analytics</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">AMC Management Fee</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 items-center">
              <div>
                <span className="wt-label">Expense Ratio (% p.a.)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  placeholder="e.g. 0.65"
                  className="wt-field font-semibold text-xs"
                  value={expenseRatio}
                  onChange={(e) => setExpenseRatio(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap gap-1 pt-4">
                <button
                  type="button"
                  onClick={() => setExpenseRatio(0.65)}
                  className="rounded px-2 py-0.5 text-[10px] bg-background border border-border hover:bg-muted font-medium cursor-pointer"
                >
                  Direct Plan (0.65%)
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseRatio(1.75)}
                  className="rounded px-2 py-0.5 text-[10px] bg-background border border-border hover:bg-muted font-medium cursor-pointer"
                >
                  Regular Plan (1.75%)
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseRatio(0.15)}
                  className="rounded px-2 py-0.5 text-[10px] bg-background border border-border hover:bg-muted font-medium cursor-pointer"
                >
                  Index/ETF (0.15%)
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseRatio(0)}
                  className="rounded px-2 py-0.5 text-[10px] bg-background border border-border hover:bg-muted font-medium cursor-pointer"
                >
                  Zero TER (0%)
                </button>
              </div>
            </div>

            {Number(expenseRatio) > 0 && valuation.currentAmount > 0 && (
              <div className="flex items-center justify-between text-xs bg-background/80 rounded-lg p-2 border border-border/60">
                <span className="text-muted-foreground text-[11px]">
                  Estimated annual fund fee drag:
                </span>
                <div className="text-right">
                  <span className="font-semibold text-foreground">
                    ~{currencySymbol}{valuation.annualExpenseFee.toLocaleString("en-IN", { maximumFractionDigits: 2 })}/yr
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    ({expenseRatio}% of {currencySymbol}{valuation.currentAmount.toLocaleString("en-IN")})
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* IN-DEPTH FINANCIAL GAIN / LOSS & CAGR MATRIX */}
        {investedNum > 0 && currentNum >= 0 && (
          <div
            className={`rounded-xl border p-3.5 space-y-2.5 transition-all ${
              valuation.absolutePnL >= 0
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-destructive/30 bg-destructive/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {valuation.absolutePnL >= 0 ? (
                  <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="size-4 text-destructive" />
                )}
                <span className="text-xs font-bold text-foreground">In-Depth Returns Cockpit</span>
              </div>
              <span
                className={`text-sm font-extrabold ${
                  valuation.absolutePnL >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }`}
              >
                {valuation.absolutePnL >= 0 ? "+" : ""}
                {currencySymbol}
                {Math.abs(valuation.absolutePnL).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                {" ("}
                {valuation.absolutePnL >= 0 ? "+" : ""}
                {valuation.absolutePnLPct.toFixed(2)}%
                {")"}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs">
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase font-semibold">
                  Tenure
                </span>
                <span className="font-bold text-foreground">
                  {valuation.elapsedMonths} months ({valuation.elapsedYears.toFixed(1)} yrs)
                </span>
              </div>

              <div>
                <span className="block text-[10px] text-muted-foreground uppercase font-semibold">
                  Annualized CAGR
                </span>
                <span className="font-bold text-foreground">
                  {valuation.cagr !== null ? `${valuation.cagr >= 0 ? "+" : ""}${valuation.cagr.toFixed(2)}% p.a.` : "N/A (<3m)"}
                </span>
              </div>

              <div>
                <span className="block text-[10px] text-muted-foreground uppercase font-semibold">
                  Net CAGR (post-TER)
                </span>
                <span className={`font-bold ${valuation.netCagr !== null && valuation.netCagr >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                  {valuation.netCagr !== null ? `${valuation.netCagr >= 0 ? "+" : ""}${valuation.netCagr.toFixed(2)}% p.a.` : "N/A"}
                </span>
              </div>
            </div>

            {/* Special asset callouts */}
            {valuation.sgbBonusInterest !== undefined && valuation.sgbBonusInterest > 0 && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium pt-1">
                ✨ Sovereign Gold Bond (SGB) Bonus: +2.5% p.a. semi-annual interest = +{currencySymbol}{valuation.sgbBonusInterest.toLocaleString("en-IN")}
              </p>
            )}
          </div>
        )}

        {/* Investment Mode: One-time (Lumpsum) vs Recurring (SIP) */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Contribution Schedule Mode</span>
            <span className="text-[11px] text-muted-foreground">Auto-syncs with Recurring rules</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`rounded-lg border p-2.5 text-xs font-semibold text-center transition-all cursor-pointer ${
                !isRecurring
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
              onClick={() => setIsRecurring(false)}
            >
              One-time (Lumpsum)
            </button>
            <button
              type="button"
              className={`rounded-lg border p-2.5 text-xs font-semibold text-center transition-all cursor-pointer ${
                isRecurring
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
              onClick={() => {
                setIsRecurring(true);
                if (!sipAmount && investedNum > 0) setSipAmount(investedNum);
              }}
            >
              Recurring (SIP Auto-debit)
            </button>
          </div>

          {isRecurring && (
            <div className="pt-2 border-t border-border/60 grid gap-3 sm:grid-cols-3">
              <div>
                <span className="wt-label">SIP Amount ({currencySymbol}) *</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 5000"
                  className="wt-field font-semibold text-xs"
                  value={sipAmount}
                  onChange={(e) => setSipAmount(e.target.value === "" ? "" : Number(e.target.value))}
                />
                {errors.sipAmount && (
                  <span className="mt-1 block text-[10px] text-destructive">{errors.sipAmount}</span>
                )}
              </div>

              <div>
                <span className="wt-label">Cadence Frequency</span>
                <select
                  className="wt-field text-xs font-semibold"
                  value={sipFrequency}
                  onChange={(e) => setSipFrequency(e.target.value)}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
              </div>

              <div>
                <span className="wt-label">Debit Bank Account *</span>
                <select
                  className="wt-field text-xs font-semibold cursor-pointer"
                  value={sipAccountId}
                  onChange={(e) => setSipAccountId(e.target.value)}
                  required
                >
                  <option value="">-- Select Bank Account --</option>
                  {data.accounts
                    .filter((a) => !a.archived)
                    .map((a) => {
                      const bal = getAccountBalance(a, data.transactions);
                      return (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.institution || a.kind}) · {currencySymbol}{bal.toLocaleString("en-IN")}
                        </option>
                      );
                    })}
                </select>
                {errors.sipAccountId && (
                  <span className="mt-1 block text-[10px] text-destructive">{errors.sipAccountId}</span>
                )}
              </div>
            </div>
          )}
        </div>

        <label className="block">
          <span className="wt-label">Notes or Strategy (optional)</span>
          <textarea
            className="wt-field min-h-16 resize-y text-xs"
            placeholder="e.g. SIP of ₹5,000 every 10th, emergency hedge, target ₹2L"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="text-xs font-semibold">
            {existing ? "Update Holding" : "Save Holding"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
