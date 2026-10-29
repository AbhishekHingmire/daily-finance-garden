import { useMemo, useState, useEffect, useRef, useCallback } from "react";
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
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/shared/FormFields";
import { Modal } from "@/components/shared/Modal";
import { marketApi, type InstrumentSearchResult, type SipValuationResult } from "@/services/api";
import { getAccountBalance, type AssetType, type InvestmentHolding, type WealthState } from "@/lib/wealthtrack";
import {
  calculateInvestmentValuation,
  getDefaultExpenseRatio,
  computeNextSipDate,
  calculateSipHistoricalProgress,
  truncateUnits,
} from "@/lib/investment-calculator";
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

const SIP_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
      ? "nd"
      : day === 3 || day === 23
      ? "rd"
      : "th";
  let tag = "";
  if (day === 10) tag = " (Standard SIP Date)";
  else if ([1, 5, 15, 20, 25].includes(day)) tag = " (Popular)";
  else if (day === 31) tag = " (Month-End)";
  return {
    day,
    label: `${day}${suffix} of every month${tag}`,
  };
});

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
    existing?.startMonthYear ?? ""
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
  const [autoCalcDriver, setAutoCalcDriver] = useState<"current_value" | "units" | "buy_price">("current_value");
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
  const [investmentStyle, setInvestmentStyle] = useState<"LumpSum" | "SIP">(() =>
    existing?.investmentStyle ?? (existing?.isRecurring ? "SIP" : "LumpSum")
  );
  const [sipDay, setSipDay] = useState<number>(existing?.sipDay ?? 10);
  const [sipAmount, setSipAmount] = useState<number | "">(
    existing?.sipAmount !== undefined ? existing.sipAmount : ""
  );
  const [sipFrequency, setSipFrequency] = useState<string>(existing?.sipFrequency ?? "Monthly");
  const [sipAccountId, setSipAccountId] = useState<string>(
    existing?.sipAccountId ?? data.accounts[0]?.id ?? ""
  );

  // Dynamic next SIP debit date calculation & historical progress
  const nextSipSchedule = useMemo(() => {
    return computeNextSipDate(sipDay);
  }, [sipDay]);

  const sipHistory = useMemo(() => {
    return calculateSipHistoricalProgress(startMonthYear, Number(sipAmount) || 0, sipDay);
  }, [startMonthYear, sipAmount, sipDay]);
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
  const [selectedSymbol, setSelectedSymbol] = useState(
    existing?.symbol || existing?.notes?.match(/\[AMFI:(\d+)\]/)?.[1] || ""
  );
  const [isServiceDown, setIsServiceDown] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isCalculatingLumpSum, setIsCalculatingLumpSum] = useState(false);
  const [lumpSumStatusMessage, setLumpSumStatusMessage] = useState<string | null>(null);
  const [isCalculatingSip, setIsCalculatingSip] = useState(false);
  const [sipValuationDetails, setSipValuationDetails] = useState<SipValuationResult | null>(null);
  const [showSipBreakdown, setShowSipBreakdown] = useState(false);
  const [sipStatusMessage, setSipStatusMessage] = useState<string | null>(null);
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
    setSelectedSymbol(item.symbol || "");
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

        // Auto-compute units & purchase price if investedAmount or sipAmount is already entered
        const inv = Number(investedAmount) || 0;
        if (investmentStyle === "SIP" && Number(sipAmount) > 0 && startMonthYear) {
          executeAutonomousSipValuation(Number(sipAmount), startMonthYear, sipDay, item.symbol || item.name, finalPriceInUserCurrency);
        } else if (investmentStyle === "LumpSum" && inv > 0 && startMonthYear) {
          executeAutonomousLumpSumValuation(inv, startMonthYear, item.symbol || item.name, finalPriceInUserCurrency);
        } else if (inv > 0 && (units === "" || Number(units) <= 0)) {
          const derivedUnits = truncateUnits(inv / finalPriceInUserCurrency);
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

  // 2-step Autonomous Lump Sum Valuation Engine (as requested by user):
  // 1. Get that time NAV price and divide by lump sum invested to derive total units
  // 2. Multiply derived units by today's NAV price to compute current valuation & PnL
  const executeAutonomousLumpSumValuation = useCallback(
    async (invAmt: number, startDt: string, holdingName?: string, knownLivePrice?: number) => {
      if (!invAmt || invAmt <= 0 || !startDt) {
        return;
      }

      setIsCalculatingLumpSum(true);
      setLumpSumStatusMessage(null);

      try {
        const liveP = knownLivePrice && knownLivePrice > 0 ? knownLivePrice : Number(currentPrice) || undefined;
        // Step 1: That time NAV price from public AMFI API using exact scheme code or symbol
        const targetId = selectedSymbol || selectedQuote?.symbol || holdingName || name;
        if (!targetId || !targetId.trim()) {
          setIsCalculatingLumpSum(false);
          return;
        }

        const buyNav = await marketApi.getHistoricalNavOrPrice(targetId, startDt, liveP);

        if (buyNav && buyNav > 0) {
          setPurchasePrice(buyNav);

          // Step 1 cont.: Total units = invested capital ÷ that time NAV
          const derivedUnits = truncateUnits(invAmt / buyNav);
          setUnits(derivedUnits);

          // Step 2: Current valuation = total units × today's live NAV
          const todayNav = liveP || buyNav;
          if (todayNav > 0) {
            const todaysValue = Math.round(derivedUnits * todayNav * 100) / 100;
            setCurrentAmount(todaysValue);
          }
          setLumpSumStatusMessage(null);
        } else {
          setLumpSumStatusMessage("Could not retrieve AMFI historical NAV. You can enter Buy Price directly below.");
        }
      } catch {
        setLumpSumStatusMessage("Market quote service temporarily slow. You can enter Buy Price directly below.");
      } finally {
        setIsCalculatingLumpSum(false);
      }
    },
    [currentPrice, selectedSymbol, selectedQuote?.symbol, name]
  );

  // Autonomous Progressive SIP Valuation Engine (as requested by user):
  // Calculates progressive overhead and accumulation across all monthly installment debits,
  // fetches exact public AMFI historical NAVs on each installment date,
  // derives accumulated units, average buy price, live current value, and exact PnL.
  const executeAutonomousSipValuation = useCallback(
    async (sAmt: number, startDt: string, sDay: number, holdingName?: string, knownLivePrice?: number) => {
      if (!sAmt || sAmt <= 0 || !startDt) {
        return;
      }

      setIsCalculatingSip(true);
      setSipStatusMessage(null);

      try {
        const liveP = knownLivePrice && knownLivePrice > 0 ? knownLivePrice : Number(currentPrice) || undefined;
        const targetId = selectedSymbol || selectedQuote?.symbol || holdingName || name;
        if (!targetId || !targetId.trim()) {
          setIsCalculatingSip(false);
          return;
        }

        const sipResult = await marketApi.calculateProgressiveSipValuation({
          symbolOrName: targetId,
          startDate: startDt,
          monthlySipAmount: sAmt,
          sipDay: sDay,
          livePrice: liveP,
        });

        if (sipResult) {
          setSipValuationDetails(sipResult);
          setInvestedAmount(sipResult.totalInvested);
          setUnits(sipResult.totalUnits);
          setPurchasePrice(sipResult.averageBuyPrice);
          setCurrentAmount(sipResult.currentAmount);
          setSipStatusMessage(null);
        }
      } catch {
        setSipStatusMessage("Could not retrieve progressive AMFI history. Standard estimation applied.");
      } finally {
        setIsCalculatingSip(false);
      }
    },
    [currentPrice, selectedSymbol, selectedQuote?.symbol, name]
  );

  // Invested amount change handler (synchronizes units or buy price)
  const handleInvestedAmountChange = (val: string) => {
    if (val === "") {
      setInvestedAmount("");
      return;
    }
    const inv = Number(val);
    setInvestedAmount(inv);
    if (investmentStyle === "LumpSum" && startMonthYear && inv > 0) {
      const targetId = selectedSymbol || selectedQuote?.symbol || name;
      executeAutonomousLumpSumValuation(inv, startMonthYear, targetId, Number(currentPrice) || undefined);
    } else {
      const price = Number(currentPrice);
      if (units !== "" && Number(units) > 0) {
        setPurchasePrice(Math.round((inv / Number(units)) * 100) / 100);
      } else if (purchasePrice !== "" && Number(purchasePrice) > 0) {
        const derivedUnits = truncateUnits(inv / Number(purchasePrice));
        setUnits(derivedUnits);
        if (price > 0) {
          setCurrentAmount(Math.round(derivedUnits * price * 100) / 100);
        }
      }
    }
  };

  // Units input change handler (synchronizes buy price & valuation)
  const handleUnitsChange = (val: string) => {
    setAutoCalcDriver("units");
    if (val === "") {
      setUnits("");
      return;
    }
    const num = Number(val);
    setUnits(num);
    const price = Number(currentPrice);
    if (price > 0 && num > 0) {
      setCurrentAmount(Math.round(num * price * 100) / 100);
    }
    const inv = Number(investedAmount) || 0;
    if (inv > 0 && num > 0) {
      setPurchasePrice(Math.round((inv / num) * 10000) / 10000);
    }
  };

  // Purchase Price change handler (synchronizes units & valuation)
  const handlePurchasePriceChange = (val: string) => {
    setAutoCalcDriver("buy_price");
    if (val === "") {
      setPurchasePrice("");
      return;
    }
    const num = Number(val);
    setPurchasePrice(num);
    const inv = Number(investedAmount) || 0;
    if (inv > 0 && num > 0) {
      const derivedUnits = truncateUnits(inv / num);
      setUnits(derivedUnits);
      const price = Number(currentPrice);
      if (price > 0) {
        setCurrentAmount(Math.round(derivedUnits * price * 100) / 100);
      }
    }
  };

  // Current valuation input handler (derives units & buy price if user doesn't know units)
  const handleCurrentValuationChange = (val: string) => {
    setAutoCalcDriver("current_value");
    if (val === "") {
      setCurrentAmount("");
      return;
    }
    const curNum = Number(val);
    setCurrentAmount(curNum);
    const price = Number(currentPrice);
    if (price > 0 && curNum > 0) {
      const derivedUnits = truncateUnits(curNum / price);
      setUnits(derivedUnits);
      const inv = Number(investedAmount) || 0;
      if (inv > 0) {
        setPurchasePrice(Math.round((inv / derivedUnits) * 100) / 100);
      }
    }
  };

  // SIP Amount change handler (immediately triggers autonomous progressive accumulation)
  const handleSipAmountChange = (val: string) => {
    if (val === "") {
      setSipAmount("");
      return;
    }
    const sNum = Number(val);
    setSipAmount(sNum);
    if (startMonthYear) {
      executeAutonomousSipValuation(sNum, startMonthYear, sipDay);
    } else {
      const progress = calculateSipHistoricalProgress(startMonthYear, sNum, sipDay);
      setInvestedAmount(progress.totalEstimatedInvested);
    }
  };

  // SIP Day change handler
  const handleSipDayChange = (newDay: number) => {
    setSipDay(newDay);
    if (investmentStyle === "SIP" && Number(sipAmount) > 0 && startMonthYear) {
      executeAutonomousSipValuation(Number(sipAmount), startMonthYear, newDay);
    }
  };

  // Start Date change handler
  const handleStartMonthYearChange = (val: string) => {
    setStartMonthYear(val);
    if (investmentStyle === "SIP") {
      let currentDay = sipDay;
      if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const parts = val.split("-").map(Number);
        if (parts[2] >= 1 && parts[2] <= 31) {
          currentDay = parts[2];
          setSipDay(currentDay);
        }
      }
      if (Number(sipAmount) > 0) {
        executeAutonomousSipValuation(Number(sipAmount), val, currentDay);
      } else {
        const progress = calculateSipHistoricalProgress(val, Number(sipAmount), currentDay);
        setInvestedAmount(progress.totalEstimatedInvested);
      }
    } else if (investmentStyle === "LumpSum" && Number(investedAmount) > 0 && val) {
      const targetId = selectedSymbol || selectedQuote?.symbol || name;
      executeAutonomousLumpSumValuation(Number(investedAmount), val, targetId, Number(currentPrice) || undefined);
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
      const derived = truncateUnits(inv / price);
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
    if (investedAmount === "" || investedNum < 0) errs.investedAmount = "Enter a valid invested amount.";
    if (currentNum < 0) errs.currentAmount = "Current valuation cannot be negative.";

    if (investmentStyle === "LumpSum") {
      if (!startMonthYear || !startMonthYear.trim()) {
        errs.startMonthYear = "Purchase Date (DD/MM/YYYY) is required for Lump Sum investment.";
      }
    } else if (investmentStyle === "SIP") {
      if (!startMonthYear || !startMonthYear.trim()) {
        errs.startMonthYear = "SIP Start Date (DD/MM/YYYY) is required to calculate historical accumulation.";
      }
    }

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
      symbol: selectedSymbol || existing?.symbol || selectedQuote?.symbol || undefined,
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
      sipDay: isRecurring ? sipDay : undefined,
      investmentStyle,
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

          {/* Category Chooser Dropdown & Search Input */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="sm:w-48 shrink-0">
              <select
                aria-label="Filter asset category"
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setShowSearchDropdown(true);
                }}
                className="wt-field py-2 text-xs bg-background font-semibold cursor-pointer"
              >
                {SEARCH_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1">
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
              {investmentStyle === "LumpSum" ? "Purchase Date (DD/MM/YYYY) *" : "SIP Start Date (DD/MM/YYYY) *"}{" "}
              <span className="text-destructive font-bold">*</span>
            </span>
            <input
              type="date"
              required
              className="wt-field font-semibold text-xs bg-background"
              value={startMonthYear}
              onChange={(e) => handleStartMonthYearChange(e.target.value)}
            />
            {errors.startMonthYear && (
              <span className="mt-1 block text-xs text-destructive">{errors.startMonthYear}</span>
            )}
          </label>

          <label className="block">
            <span className="wt-label">
              End / Target Date (DD/MM/YYYY) <span className="text-muted-foreground text-[10px] font-normal">(optional)</span>
            </span>
            <input
              type="date"
              className="wt-field font-semibold text-xs"
              value={endMonthYear}
              onChange={(e) => setEndMonthYear(e.target.value)}
            />
          </label>
        </div>

        {/* 1. INVESTMENT STYLE & SCHEDULE (One-Time Lump Sum vs Recurring Monthly SIP) */}
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              <span>Investment Style &amp; Schedule</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`rounded-lg border p-2 text-xs font-semibold text-center transition-all cursor-pointer ${
                investmentStyle === "LumpSum"
                  ? "border-primary bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/60"
              }`}
              onClick={() => {
                setInvestmentStyle("LumpSum");
                setIsRecurring(false);
                let initialDate = startMonthYear;
                if (initialDate && /^\d{4}-\d{2}$/.test(initialDate)) {
                  initialDate = `${initialDate}-01`;
                  setStartMonthYear(initialDate);
                }
                if (investedNum > 0 && initialDate) {
                  const targetId = selectedSymbol || selectedQuote?.symbol || name;
                  executeAutonomousLumpSumValuation(investedNum, initialDate, targetId, Number(currentPrice) || undefined);
                }
              }}
            >
              One-time (Lump Sum)
            </button>
            <button
              type="button"
              className={`rounded-lg border p-2 text-xs font-semibold text-center transition-all cursor-pointer ${
                investmentStyle === "SIP"
                  ? "border-primary bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/60"
              }`}
              onClick={() => {
                setInvestmentStyle("SIP");
                setIsRecurring(true);
                let initialDate = startMonthYear;
                if (initialDate && /^\d{4}-\d{2}$/.test(initialDate)) {
                  initialDate = `${initialDate}-19`;
                  setStartMonthYear(initialDate);
                }
                const sAmt = Number(sipAmount) || (investedNum > 0 ? investedNum : 5000);
                setSipAmount(sAmt);
                if (initialDate) {
                  executeAutonomousSipValuation(sAmt, initialDate, sipDay);
                }
              }}
            >
              Recurring (Monthly SIP)
            </button>
          </div>

          {investmentStyle === "SIP" ? (
            <div className="pt-2 border-t border-border/60 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <span className="wt-label">Monthly SIP Amount ({currencySymbol}) *</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 5000"
                    className="wt-field font-semibold text-xs bg-background"
                    value={sipAmount}
                    onChange={(e) => handleSipAmountChange(e.target.value)}
                  />
                  {errors.sipAmount && (
                    <span className="mt-1 block text-[10px] text-destructive">{errors.sipAmount}</span>
                  )}
                </div>

                <div>
                  <span className="wt-label">SIP Debit Day of Month *</span>
                  <select
                    aria-label="SIP debit day of month"
                    className="wt-field text-xs font-semibold cursor-pointer bg-background"
                    value={sipDay}
                    onChange={(e) => handleSipDayChange(Number(e.target.value))}
                  >
                    {SIP_DAY_OPTIONS.map((opt) => (
                      <option key={opt.day} value={opt.day}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="wt-label">Debit Bank Account *</span>
                  <select
                    className="wt-field text-xs font-semibold cursor-pointer bg-background"
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

              {/* Exact Next SIP Deduction Schedule Alert */}
              <div className="rounded-lg bg-background border border-primary/25 p-2.5 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span>📅 Next Automated Debit:</span>
                    <strong className="text-primary font-bold">{nextSipSchedule.nextDate}</strong>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                    {nextSipSchedule.isSameMonth ? "Deducting This Month" : "Deducting Next Month"} ({nextSipSchedule.daysUntil}d away)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {nextSipSchedule.isSameMonth
                    ? `Target day (${sipDay}th) is upcoming in the current month. Deducting on ${nextSipSchedule.nextDate}.`
                    : `Target day (${sipDay}th) has already passed this month. Deducting on ${nextSipSchedule.nextDate} next month.`}
                </p>
              </div>

              {/* Progressive Autonomous SIP Valuation Cockpit */}
              <div className="rounded-lg bg-background border border-border p-2.5 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-border/50">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <span>⚡ Autonomous Progressive SIP Valuation (Rupee Cost Averaging)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {startMonthYear ? `SIP active since ${startMonthYear}` : "Enter start date above"}
                  </span>
                </div>

                {startMonthYear && Number(sipAmount) > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Invested Capital</span>
                        <strong className="text-foreground">
                          {currencySymbol}{investedNum.toLocaleString("en-IN")}
                        </strong>
                        <span className="block text-[9px] text-muted-foreground">
                          {sipHistory.elapsedInstallments} debits × {currencySymbol}{Number(sipAmount).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Average Purchase NAV</span>
                        <strong className="text-foreground">
                          {purchasePrice
                            ? `${currencySymbol}${Number(purchasePrice).toLocaleString("en-IN")}`
                            : isCalculatingSip
                            ? "Fetching…"
                            : "Auto-calculating…"}
                        </strong>
                        <span className="block text-[9px] text-muted-foreground">
                          Today's NAV: {currencySymbol}{Number(currentPrice || purchasePrice).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Accumulated Units</span>
                        <strong className="text-foreground">
                          {units
                            ? Number(units).toLocaleString("en-IN")
                            : isCalculatingSip
                            ? "Calculating…"
                            : "Ready"}
                        </strong>
                        <span className="block text-[9px] text-muted-foreground">
                          Auto-allotted
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Total Return / PnL</span>
                        <strong className={valuation.absolutePnL >= 0 ? "text-emerald-500" : "text-rose-500"}>
                          {valuation.absolutePnL >= 0 ? "+" : ""}{currencySymbol}{Math.abs(valuation.absolutePnL).toLocaleString("en-IN")} ({valuation.absolutePnLPct}%)
                        </strong>
                        <span className="block text-[9px] text-muted-foreground">
                          Current: {currencySymbol}{currentNum.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {sipStatusMessage && (
                      <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
                        <span>⚠️</span>
                        <span>{sipStatusMessage}</span>
                      </div>
                    )}

                    {/* Collapsible Monthly Installments Breakdown Table */}
                    {sipValuationDetails && sipValuationDetails.installmentsBreakdown.length > 0 && (
                      <div className="pt-1.5 border-t border-border/40 space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setShowSipBreakdown((prev) => !prev)}
                          className="flex items-center justify-between w-full text-[11px] font-semibold text-primary hover:underline cursor-pointer py-1"
                        >
                          <span>
                            {showSipBreakdown ? "Hide" : "View"} Monthly Installment Progression Breakdown ({sipValuationDetails.installmentsBreakdown.length} months)
                          </span>
                          <span className="text-[10px] font-normal text-muted-foreground">
                            {showSipBreakdown ? "▲ Collapse" : "▼ Expand"}
                          </span>
                        </button>

                        {showSipBreakdown && (
                          <div className="max-h-48 overflow-y-auto rounded-md border border-border/60 bg-muted/20 text-[10px]">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-muted/70 text-muted-foreground sticky top-0">
                                <tr>
                                  <th className="py-1 px-2 font-semibold">#</th>
                                  <th className="py-1 px-2 font-semibold">Date</th>
                                  <th className="py-1 px-2 font-semibold">Debit</th>
                                  <th className="py-1 px-2 font-semibold">NAV Price</th>
                                  <th className="py-1 px-2 font-semibold">Allotted</th>
                                  <th className="py-1 px-2 font-semibold">Cum. Units</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40">
                                {sipValuationDetails.installmentsBreakdown.map((row) => (
                                  <tr key={row.cycle} className="hover:bg-muted/40 transition-colors">
                                    <td className="py-1 px-2 font-medium text-muted-foreground">{row.cycle}</td>
                                    <td className="py-1 px-2 font-semibold text-foreground">{row.date}</td>
                                    <td className="py-1 px-2">{currencySymbol}{row.installmentAmount.toLocaleString("en-IN")}</td>
                                    <td className="py-1 px-2 font-mono font-medium">{currencySymbol}{row.nav.toLocaleString("en-IN")}</td>
                                    <td className="py-1 px-2 font-mono text-primary font-semibold">{row.units.toFixed(4)}</td>
                                    <td className="py-1 px-2 font-mono text-muted-foreground">{row.cumulativeUnits.toFixed(4)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-background border border-border/70 p-2 text-xs text-muted-foreground flex items-center gap-2">
                    <span>💡</span>
                    <span>
                      Enter your <strong>SIP Start Date</strong> and <strong>Monthly SIP Amount</strong> above to autonomously calculate historical progressive units and PnL.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-border/60 space-y-2">
              <div className="rounded-lg bg-background border border-border p-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-border/50">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <span>⚡ Autonomous Purchase Valuation</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {startMonthYear ? `Holding since ${startMonthYear}` : "Enter start date above"}
                  </span>
                </div>
                {startMonthYear && investedNum > 0 ? (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Invested Capital</span>
                        <strong className="text-foreground">{currencySymbol}{investedNum.toLocaleString("en-IN")}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Purchase Date NAV</span>
                        <strong className="text-foreground">
                          {purchasePrice
                            ? `${currencySymbol}${Number(purchasePrice).toLocaleString("en-IN")}`
                            : isCalculatingLumpSum
                            ? "Fetching…"
                            : "Auto-fetching…"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Allotted Units</span>
                        <strong className="text-foreground">
                          {units
                            ? Number(units).toLocaleString("en-IN")
                            : isCalculatingLumpSum
                            ? "Calculating…"
                            : "Ready"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Total Return / PnL</span>
                        <strong className={valuation.absolutePnL >= 0 ? "text-emerald-500" : "text-rose-500"}>
                          {valuation.absolutePnL >= 0 ? "+" : ""}{currencySymbol}{Math.abs(valuation.absolutePnL).toLocaleString("en-IN")} ({valuation.absolutePnLPct}%)
                        </strong>
                      </div>
                    </div>

                    {lumpSumStatusMessage && (
                      <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
                        <span>⚠️</span>
                        <span>{lumpSumStatusMessage}</span>
                      </div>
                    )}

                    {purchasePrice && units ? (
                      <div className="text-[10px] text-muted-foreground bg-muted/40 border border-border/50 rounded-md p-1.5 flex flex-wrap items-center justify-between gap-1">
                        <span>
                          <strong>1. Units:</strong> {currencySymbol}{investedNum.toLocaleString("en-IN")} ÷ {currencySymbol}{Number(purchasePrice).toLocaleString("en-IN")} = <strong>{units} units</strong>
                        </span>
                        <span>
                          <strong>2. Current:</strong> {units} × {currencySymbol}{currentPrice || purchasePrice} = <strong>{currencySymbol}{valuation.currentAmount.toLocaleString("en-IN")}</strong>
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Enter your lumpsum invested amount and investment start date above. The engine autonomously calculates historical NAV, allotted units, and live market PnL.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. VALUATION ENGINE COCKPIT */}
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
              <span className="wt-label flex items-center justify-between">
                <span>
                  Invested Amount / Capital ({currencySymbol}) <span className="text-destructive">*</span>
                </span>
                {investmentStyle === "SIP" && Number(sipAmount) > 0 && startMonthYear ? (
                  <span className="text-[10px] text-primary font-semibold">
                    Derived from {sipHistory.elapsedInstallments} SIP installments
                  </span>
                ) : investmentStyle === "SIP" ? (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Enter total capital invested to date
                  </span>
                ) : null}
              </span>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">
                  {currencySymbol}
                </span>
                <input
                  className="wt-field pl-8 font-semibold bg-background"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 50000"
                  value={investedAmount}
                  onChange={(e) => handleInvestedAmountChange(e.target.value)}
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
                <div className="space-y-3">
                  {/* Calculation Basis Tabs: Shown only in SIP/custom mode — completely removed for One-time (Lump Sum) */}
                  {investmentStyle !== "LumpSum" && (
                    <div className="rounded-lg bg-background p-2.5 border border-border/70 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                        <span className="font-semibold text-muted-foreground flex items-center gap-1">
                          <Sparkles size={12} className="text-primary" />
                          <span>Pre-calculate based on what you have:</span>
                        </span>
                        <div className="inline-flex rounded-lg bg-muted/80 p-0.5 border border-border/60">
                          <button
                            type="button"
                            onClick={() => setAutoCalcDriver("current_value")}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                              autoCalcDriver === "current_value"
                                ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            💼 Current Value
                          </button>
                          <button
                            type="button"
                            onClick={() => setAutoCalcDriver("units")}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                              autoCalcDriver === "units"
                                ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            🔢 Total Units
                          </button>
                          <button
                            type="button"
                            onClick={() => setAutoCalcDriver("buy_price")}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                              autoCalcDriver === "buy_price"
                                ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            🏷️ Buy NAV / Price
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        {autoCalcDriver === "current_value"
                          ? "Enter your current portfolio value from your broker (e.g. Zerodha/Groww) · We auto-derive exact units and returns from live market price."
                          : autoCalcDriver === "units"
                          ? "Enter your units held · We compute current valuation and real-time gain/loss from the live quote."
                          : "Enter your starting buy price / purchase NAV · We derive units and valuation."}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2">
                    {/* Ongoing Live Market Price */}
                    <div>
                      <span className="wt-label">Live Price / NAV ({currencySymbol})</span>
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

                    {/* Current Portfolio Valuation */}
                    <div className={autoCalcDriver === "current_value" ? "rounded-lg p-1.5 bg-primary/10 border border-primary/40 shadow-2xs" : ""}>
                      <span className="wt-label flex items-center justify-between">
                        <span>Current Value ({currencySymbol})</span>
                        {autoCalcDriver === "current_value" && (
                          <span className="text-[9px] text-primary font-bold uppercase">Driver</span>
                        )}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 65000"
                        className="wt-field font-semibold text-xs bg-background"
                        value={currentAmount}
                        onChange={(e) => handleCurrentValuationChange(e.target.value)}
                      />
                    </div>

                    {/* Units Held */}
                    <div className={autoCalcDriver === "units" ? "rounded-lg p-1.5 bg-primary/10 border border-primary/40 shadow-2xs" : ""}>
                      <span className="wt-label flex items-center justify-between">
                        <span>Units / Qty Held</span>
                        {autoCalcDriver === "units" && (
                          <span className="text-[9px] text-primary font-bold uppercase">Driver</span>
                        )}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 560"
                        className="wt-field font-semibold text-xs bg-background"
                        value={units}
                        onChange={(e) => handleUnitsChange(e.target.value)}
                      />
                    </div>

                    {/* Buy Price / Average NAV */}
                    <div className={autoCalcDriver === "buy_price" ? "rounded-lg p-1.5 bg-primary/10 border border-primary/40 shadow-2xs" : ""}>
                      <span className="wt-label flex items-center justify-between">
                        <span>Buy Price / NAV ({currencySymbol})</span>
                        {autoCalcDriver === "buy_price" && (
                          <span className="text-[9px] text-primary font-bold uppercase">Driver</span>
                        )}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 70.00"
                        className="wt-field font-semibold text-xs bg-background"
                        value={purchasePrice}
                        onChange={(e) => handlePurchasePriceChange(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Quick one-click derive helper */}
                  {investedNum > 0 && Number(currentPrice) > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      <span className="text-muted-foreground">Quick Helpers:</span>
                      <button
                        type="button"
                        onClick={handleAutoDeriveUnitsFromPrice}
                        className="inline-flex items-center gap-1 rounded bg-muted hover:bg-muted/80 px-2 py-0.5 font-semibold text-primary cursor-pointer border border-border"
                      >
                        <Coins size={12} />
                        Derive units at current price ({investedNum} ÷ {currentPrice} = {Math.round((investedNum / Number(currentPrice)) * 100) / 100} units)
                      </button>
                    </div>
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
                <span className="wt-label">Expense Ratio Preset</span>
                <select
                  aria-label="Expense Ratio Preset Category"
                  className="wt-field text-xs bg-background font-semibold cursor-pointer"
                  value={
                    expenseRatio === 0.65
                      ? "0.65"
                      : expenseRatio === 1.75
                      ? "1.75"
                      : expenseRatio === 0.20
                      ? "0.20"
                      : expenseRatio === 0.15
                      ? "0.15"
                      : expenseRatio === 0
                      ? "0"
                      : "custom"
                  }
                  onChange={(e) => {
                    if (e.target.value !== "custom") {
                      setExpenseRatio(Number(e.target.value));
                    }
                  }}
                >
                  <option value="custom">Custom Percentage</option>
                  <option value="0.65">Direct Mutual Fund (~0.65% p.a.)</option>
                  <option value="1.75">Regular Mutual Fund (~1.75% p.a.)</option>
                  <option value="0.20">Index Fund (~0.20% p.a.)</option>
                  <option value="0.15">ETF (~0.15% p.a.)</option>
                  <option value="0">Zero TER (0% - Stocks, FD, SGB)</option>
                </select>
              </div>

              <div>
                <span className="wt-label">Expense Ratio (% p.a.)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  placeholder="e.g. 0.65"
                  className="wt-field font-semibold text-xs bg-background"
                  value={expenseRatio}
                  onChange={(e) => setExpenseRatio(e.target.value === "" ? "" : Number(e.target.value))}
                />
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
