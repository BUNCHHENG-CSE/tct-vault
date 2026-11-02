"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  ArrowRight,
  Loader2,
  Lock,
  Sparkles,
  RefreshCw,
  Globe,
  Building2,
  ChevronLeft,
  X,
  CreditCard,
  Landmark,
  PiggyBank,
  TrendingUp,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SUPPORTED_INSTITUTIONS,
  type BankInstitution,
} from "@/lib/institutions";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { Account, AccountType } from "@/types/database";
import {
  connectBankAccountAction,
  importUniversalStatementAction,
} from "@/lib/actions/bank-sync";
import { parseUniversalBankStatement } from "@/lib/bank-parsers";

interface ConnectBankDialogProps {
  accounts?: Account[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ConnectBankDialog({
  accounts = [],
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ConnectBankDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOpen !== undefined ? setControlledOpen : setInternalOpen;

  // Active view mode: "feed" | "statement"
  const [viewMode, setViewMode] = React.useState<"feed" | "statement">("feed");

  // Region filter: "kh" (Cambodia default!) | "popular" | "global" | "all"
  const [regionFilter, setRegionFilter] = React.useState<"kh" | "popular" | "global" | "all">("kh");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedInst, setSelectedInst] = React.useState<BankInstitution | null>(null);

  // Connection form state
  const [accountName, setAccountName] = React.useState("");
  const [accountType, setAccountType] = React.useState<AccountType>("checking");
  const [currency, setCurrency] = React.useState("USD");
  const [initialBalance, setInitialBalance] = React.useState("4850.00");
  const [isConnecting, setIsConnecting] = React.useState(false);

  // Statement sync state
  const [selectedTargetAccountId, setSelectedTargetAccountId] = React.useState(accounts[0]?.id || "");
  const [statementFile, setStatementFile] = React.useState<File | null>(null);
  const [statementText, setStatementText] = React.useState<string | null>(null);
  const [parsedPreviewCount, setParsedPreviewCount] = React.useState<number | null>(null);
  const [isImportingStatement, setIsImportingStatement] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filter institutions
  const filteredInstitutions = React.useMemo(() => {
    const list = SUPPORTED_INSTITUTIONS;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter((inst) =>
        inst.name.toLowerCase().includes(q) ||
        (inst.shortName && inst.shortName.toLowerCase().includes(q)) ||
        (inst.logoText && inst.logoText.toLowerCase().includes(q)) ||
        inst.countryName.toLowerCase().includes(q) ||
        inst.defaultCurrency.toLowerCase().includes(q)
      );
    }

    if (regionFilter === "kh") {
      return list.filter((i) => i.country === "KH");
    }
    if (regionFilter === "popular") {
      return list.filter((i) => i.popular);
    }
    if (regionFilter === "global") {
      return list.filter((i) => i.country !== "KH");
    }

    return list;
  }, [regionFilter, searchQuery]);

  // Featured top Cambodian banks for quick 1-click pick
  const featuredCambodianBanks = React.useMemo(() => {
    return SUPPORTED_INSTITUTIONS.filter(
      (inst) => inst.country === "KH" && ["aba", "acleda", "canadia", "wing", "bakong", "chipmong"].includes(inst.id)
    );
  }, []);

  const handleSelectInstitution = (inst: BankInstitution) => {
    setSelectedInst(inst);
    setAccountName(`${inst.shortName || inst.name} Main Account`);
    setCurrency(inst.defaultCurrency || "USD");

    if (inst.defaultCurrency === "KHR") setInitialBalance("14500000");
    else if (inst.defaultCurrency === "VND") setInitialBalance("45000000");
    else if (inst.defaultCurrency === "SGD") setInitialBalance("4200.00");
    else setInitialBalance("4850.00");
  };

  const handleConnectBank = async () => {
    if (!selectedInst) return;
    setIsConnecting(true);

    try {
      const res = await connectBankAccountAction({
        institutionId: selectedInst.id,
        accountName: accountName.trim() || `${selectedInst.name} Account`,
        accountType,
        initialBalance: parseFloat(initialBalance) || 0,
        currency,
        provider: selectedInst.provider,
      });

      if (res.success) {
        toast.success(
          `Connected ${selectedInst.name}! Fetched ${res.transactionsCount} initial transactions.`
        );
        setSelectedInst(null);
        setIsOpen?.(false);
      } else {
        toast.error(res.error || "Failed to link bank account");
      }
    } catch {
      toast.error("An error occurred during bank connection");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatementFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setStatementText(content);
      const parsed = parseUniversalBankStatement(content, file.name);
      if (parsed.success) {
        setParsedPreviewCount(parsed.transactions.length);
        toast.info(`Detected ${parsed.transactions.length} transactions (${parsed.detectedFormat.toUpperCase()})`);
      } else {
        setParsedPreviewCount(null);
        toast.error(parsed.error || "Could not parse bank statement");
      }
    };
    reader.readAsText(file);
  };

  const handleImportStatement = async () => {
    if (!statementText || !statementFile || !selectedTargetAccountId) return;
    setIsImportingStatement(true);

    try {
      const res = await importUniversalStatementAction(
        selectedTargetAccountId,
        statementText,
        statementFile.name
      );

      if (res.success) {
        toast.success(
          `Imported ${res.importedCount} transactions (${res.skippedCount} duplicates skipped)!`
        );
        setStatementFile(null);
        setStatementText(null);
        setParsedPreviewCount(null);
        setIsOpen?.(false);
      } else {
        toast.error(res.error || "Failed to import bank statement");
      }
    } catch {
      toast.error("An unexpected error occurred during statement sync");
    } finally {
      setIsImportingStatement(false);
    }
  };

  const handleClose = () => {
    setSelectedInst(null);
    setSearchQuery("");
    setIsOpen?.(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="font-medium text-xs gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer rounded-xl h-9 px-3.5"
          >
            <Building2 className="h-4 w-4" />
            <span>Connect Bank</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[700px] max-h-[88vh] overflow-hidden p-0 gap-0 rounded-3xl border border-border/80 bg-card shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-gradient-to-b from-muted/30 to-transparent shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground font-sans">
                  Connect Bank Account
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-sans mt-0.5">
                  Link your real-time bank feeds or import universal bank statements.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 mr-8 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium font-sans shrink-0">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">256-Bit SSL Encrypted</span>
              </span>
            </div>
          </div>

          {/* Segmented Mode Switcher */}
          {!selectedInst && (
            <div className="mt-4 flex p-1 bg-muted/60 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setViewMode("feed")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  viewMode === "feed"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Landmark className="h-3.5 w-3.5" />
                <span>Direct Bank Connection</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("statement")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  viewMode === "statement"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Statement Sync (OFX / CSV)</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {viewMode === "feed" && (
            <div>
              {selectedInst ? (
                /* Step 2: Selected Institution Configuration Screen */
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <button
                    type="button"
                    onClick={() => setSelectedInst(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Choose a different bank</span>
                  </button>

                  {/* Institution Banner Card */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-muted/20">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-extrabold text-sm tracking-wider shadow-sm shrink-0"
                        style={{ backgroundColor: selectedInst.badgeBg }}
                      >
                        {selectedInst.logoText || selectedInst.flag}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-foreground font-sans">
                            {selectedInst.name}
                          </h3>
                          <Badge variant="outline" className="text-[10px] font-sans px-2 py-0 border-primary/30 text-primary bg-primary/5">
                            {selectedInst.countryName}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">
                          {selectedInst.subLabel || "Direct live feed & automated reconciliation"}
                        </p>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Ready</span>
                    </div>
                  </div>

                  {/* Configuration Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">
                        Account Nickname
                      </Label>
                      <Input
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="e.g. Primary Checking"
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">
                        Account Type
                      </Label>
                      <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
                        <SelectTrigger className="h-10 text-xs rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="checking" className="text-xs">
                            Checking & Cash Liquidity
                          </SelectItem>
                          <SelectItem value="savings" className="text-xs">
                            High-Yield & Savings
                          </SelectItem>
                          <SelectItem value="credit" className="text-xs">
                            Credit Line & Card
                          </SelectItem>
                          <SelectItem value="investment" className="text-xs">
                            Brokerage & Investment
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">
                        Currency
                      </Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="h-10 text-xs rounded-xl font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                            <SelectItem key={c.code} value={c.code} className="text-xs font-sans">
                              {c.code} - {c.name} ({c.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">
                        Current Balance
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        value={initialBalance}
                        onChange={(e) => setInitialBalance(e.target.value)}
                        placeholder="0.00"
                        className="h-10 text-xs rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                      <Lock className="h-3.5 w-3.5 text-primary" />
                      <span>Read-Only Cryptographic Connection</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Connecting this bank enables automated transaction imports and balance reconciliation. tctVault operates strictly in read-only mode and can never withdraw or move funds.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedInst(null)}
                      className="text-xs rounded-xl h-9"
                      disabled={isConnecting}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={handleConnectBank}
                      disabled={isConnecting}
                      className="text-xs gap-2 rounded-xl h-9 bg-primary text-primary-foreground hover:bg-primary/90 px-4"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Authorizing & Syncing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Link & Authorize Bank</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Step 1: Search & Bank Directory */
                <div className="space-y-5">
                  {/* Clean Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by bank name or currency (e.g. ABA, ACLEDA, Canadia, Wing, Chase)..."
                      className="pl-10 pr-9 h-11 text-xs rounded-xl bg-muted/30 border-border/80 font-sans focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Clean Filter Pills */}
                  {!searchQuery && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-1">
                      <button
                        type="button"
                        onClick={() => setRegionFilter("kh")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                          regionFilter === "kh"
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <span>🇰🇭</span>
                        <span>Cambodia</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegionFilter("popular")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                          regionFilter === "popular"
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <span>⭐</span>
                        <span>Popular</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegionFilter("global")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                          regionFilter === "global"
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <span>🌐</span>
                        <span>Global & US</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegionFilter("all")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          regionFilter === "all"
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        All Banks
                      </button>
                    </div>
                  )}

                  {/* Featured Cambodian Quick Picks (shown when on Cambodia filter without search) */}
                  {!searchQuery && regionFilter === "kh" && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span>Featured in Cambodia</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground/80">Instant Live Feed</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {featuredCambodianBanks.map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => handleSelectInstitution(bank)}
                            className="p-3 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:bg-accent/40 transition-all text-left flex flex-col justify-between gap-3 group cursor-pointer shadow-xs hover:shadow-sm"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div
                                className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xs tracking-wider shadow-2xs"
                                style={{ backgroundColor: bank.badgeBg }}
                              >
                                {bank.logoText || bank.flag}
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
                            </div>

                            <div>
                              <p className="font-bold text-xs text-foreground truncate font-sans group-hover:text-primary transition-colors">
                                {bank.shortName || bank.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate font-sans mt-0.5">
                                {bank.defaultCurrency} • Bakong
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Matching Banks Grid */}
                  <div className="space-y-2">
                    {!searchQuery && regionFilter === "kh" && (
                      <p className="text-xs font-medium text-muted-foreground pt-1">
                        All Cambodian Institutions
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                      {filteredInstitutions.map((inst) => (
                        <button
                          key={inst.id}
                          type="button"
                          onClick={() => handleSelectInstitution(inst)}
                          className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 transition-all text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0"
                              style={{ backgroundColor: inst.badgeBg }}
                            >
                              {inst.logoText || inst.flag}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-foreground truncate font-sans group-hover:text-primary transition-colors">
                                {inst.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate font-sans">
                                {inst.countryName} • {inst.defaultCurrency}
                              </p>
                            </div>
                          </div>

                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                        </button>
                      ))}

                      {filteredInstitutions.length === 0 && (
                        <div className="col-span-2 py-10 text-center text-xs text-muted-foreground space-y-2">
                          <Building2 className="h-8 w-8 mx-auto text-muted-foreground/40" />
                          <p className="font-medium text-foreground">No matching banks found for &quot;{searchQuery}&quot;</p>
                          <p className="text-[11px] max-w-sm mx-auto">
                            You can upload an OFX, QFX, or CSV statement directly using the Statement Sync tab.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statement Sync View */}
          {viewMode === "statement" && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-1">
                <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Universal Statement Importer</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Upload transaction statements directly exported from any Cambodian or international bank app (e.g. ABA Mobile, ACLEDA, Canadia, etc.).
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Destination Vault Account</Label>
                  <Select
                    value={selectedTargetAccountId}
                    onValueChange={setSelectedTargetAccountId}
                  >
                    <SelectTrigger className="text-xs h-10 rounded-xl">
                      <SelectValue placeholder="Select target account" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">
                          {acc.name} ({acc.type} • {acc.currency || "USD"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Upload Zone */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ofx,.qfx,.qbo,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/20 transition-all rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer group"
                >
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    {statementFile ? statementFile.name : "Click or drag bank statement file here"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Accepts <strong>.OFX</strong>, <strong>.QFX</strong>, <strong>.QBO</strong>, and <strong>.CSV</strong> statements
                  </p>
                </div>

                {parsedPreviewCount !== null && (
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Ready to sync {parsedPreviewCount} valid transactions</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/40">
                      Validated
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen?.(false)}
                  className="text-xs rounded-xl h-9"
                  disabled={isImportingStatement}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleImportStatement}
                  disabled={!statementFile || !parsedPreviewCount || isImportingStatement || !selectedTargetAccountId}
                  className="text-xs gap-2 rounded-xl h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isImportingStatement ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Importing Statement...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Import & Reconcile</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
