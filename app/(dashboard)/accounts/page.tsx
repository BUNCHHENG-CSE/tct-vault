import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import type { Account, AccountType } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import {
  Landmark,
  PiggyBank,
  CreditCard,
  TrendingUp,
  PlusCircle,
  Wallet,
  Cpu,
  Wifi,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountDialog } from "@/components/accounts/account-dialog";
import { AccountActions } from "@/components/accounts/account-actions";
import { ConnectBankDialog } from "@/components/accounts/connect-bank-dialog";
import { SyncAllBanksButton } from "@/components/accounts/sync-all-banks-button";
import { TransferDialog } from "@/components/transactions/transfer-dialog";
import { convertCurrency } from "@/lib/currency";

const TYPE_CONFIG: Record<
  AccountType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    color: string;
    badgeStyle: string;
  }
> = {
  checking: {
    label: "Checking & Cash Liquidity",
    icon: Landmark,
    description: "Daily transactional accounts and instant checking balances",
    color: "#6366f1",
    badgeStyle: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  savings: {
    label: "High-Yield & Emergency Reserves",
    icon: PiggyBank,
    description: "Emergency funds, high-yield deposits, and short-term capital",
    color: "#10b981",
    badgeStyle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  credit: {
    label: "Credit Cards & Revolving Debt",
    icon: CreditCard,
    description: "Active credit lines, statement liabilities, and reward cards",
    color: "#f43f5e",
    badgeStyle: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  investment: {
    label: "Brokerage & Growth Portfolios",
    icon: TrendingUp,
    description: "Index funds, retirement portfolios, and equities",
    color: "#06b6d4",
    badgeStyle: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
};

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accounts: Account[] = [];
  if (user) {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    accounts = (data as Account[]) || [];
  }

  // Calculate normalized net worth in USD
  const netWorth = accounts.reduce(
    (sum, acc) =>
      sum + convertCurrency(Number(acc.balance), acc.currency || "USD", "USD"),
    0
  );

  const totalAssets = accounts
    .filter((a) => a.type !== "credit" && Number(a.balance) > 0)
    .reduce(
      (sum, a) =>
        sum + convertCurrency(Number(a.balance), a.currency || "USD", "USD"),
      0
    );

  const totalDebt = accounts
    .filter((a) => a.type === "credit" || Number(a.balance) < 0)
    .reduce(
      (sum, a) =>
        sum +
        convertCurrency(
          Math.abs(Number(a.balance)),
          a.currency || "USD",
          "USD"
        ),
      0
    );

  const groupedAccounts: Record<AccountType, Account[]> = {
    checking: [],
    savings: [],
    credit: [],
    investment: [],
  };

  accounts.forEach((acc) => {
    if (groupedAccounts[acc.type]) {
      groupedAccounts[acc.type].push(acc);
    } else {
      groupedAccounts.checking.push(acc);
    }
  });

  const accountTypes: AccountType[] = [
    "checking",
    "savings",
    "credit",
    "investment",
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
              Accounts & Balances
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {accounts.length} linked
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Manage your depository accounts, high-yield reserves, credit cards, and portfolio holdings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SyncAllBanksButton />
          <ConnectBankDialog accounts={accounts} />
          <TransferDialog accounts={accounts} />
          <AccountDialog />
        </div>
      </div>

      {/* Summary KPI Banner */}
      <Card className="border-border bg-card shadow-2xs">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground shadow-2xs">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                  Net Portfolio Valuation
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-foreground">
                  {formatCurrency(netWorth)}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
              <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2">
                <span className="text-muted-foreground text-[10px] block font-semibold uppercase">Gross Assets</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(totalAssets)}</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2">
                <span className="text-muted-foreground text-[10px] block font-semibold uppercase">Revolving Debt</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">-{formatCurrency(totalDebt)}</span>
              </div>
            </div>
          </div>

          {/* Allocation progress strip */}
          {totalAssets > 0 && (
            <div className="mt-5 pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span className="uppercase tracking-wider font-semibold">Liquidity Distribution</span>
                <span>{accounts.length} Total Accounts</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex gap-0.5">
                {accountTypes.map((type) => {
                  const list = groupedAccounts[type];
                  const total = list.reduce((sum, a) => sum + Math.max(0, Number(a.balance)), 0);
                  const pct = totalAssets > 0 ? (total / totalAssets) * 100 : 0;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={type}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: TYPE_CONFIG[type].color,
                      }}
                      className="h-full transition-all"
                      title={`${TYPE_CONFIG[type].label}: ${pct.toFixed(1)}%`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grouped Account Sections */}
      {accounts.length === 0 ? (
        <Card className="border-dashed border-border p-10 text-center bg-card/60">
          <div className="flex flex-col items-center justify-center space-y-3 font-mono">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <Landmark className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              No accounts registered yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Add your checking accounts, emergency savings, or credit cards to start calculating your real-time net worth.
            </p>
            <div className="pt-2">
              <AccountDialog />
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-7">
          {accountTypes.map((type) => {
            const list = groupedAccounts[type];
            if (list.length === 0) return null;

            const config = TYPE_CONFIG[type];
            const Icon = config.icon;
            const groupTotal = list.reduce(
              (sum, acc) => sum + Number(acc.balance),
              0
            );

            return (
              <div key={type} className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-6.5 w-6.5 rounded-md flex items-center justify-center"
                      style={{
                        backgroundColor: `${config.color}15`,
                        color: config.color,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <h2 className="text-sm font-bold tracking-tight text-foreground font-mono">
                      {config.label}
                    </h2>
                    <Badge variant="outline" className={`font-mono text-[10px] px-2 py-0 border ${config.badgeStyle}`}>
                      {list.length} {list.length === 1 ? "account" : "accounts"}
                    </Badge>
                  </div>
                  <span className="font-mono text-xs font-bold text-foreground">
                    Subtotal: {formatCurrency(groupTotal)}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((account) => {
                    const isCredit = account.type === "credit";
                    const balanceNum = Number(account.balance);
                    const maskNumber = `•••• ${(account.id.slice(0, 4) || "8842").toUpperCase()}`;

                    return (
                      <Card
                        key={account.id}
                        className="relative overflow-hidden border border-border bg-card shadow-2xs hover:shadow-md hover:border-border/80 transition-all group rounded-xl"
                      >
                        {/* Virtual Chip & Contactless Icons */}
                        <div className="p-4 pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {/* Metallic Chip Graphic */}
                              <div className="h-6 w-8 rounded-sm bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-400 border border-amber-400/60 shadow-2xs flex items-center justify-center relative overflow-hidden">
                                <Cpu className="h-3.5 w-3.5 text-amber-900/60" />
                              </div>
                              <Wifi className="h-3.5 w-3.5 text-muted-foreground rotate-90" />

                              {account.is_connected && (
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 flex items-center gap-1"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>{account.institution_name || "Live Bank Feed"}</span>
                                </Badge>
                              )}
                            </div>

                            <AccountActions account={account} />
                          </div>

                          <div className="mt-3.5 space-y-1">
                            <h3 className="text-sm font-bold tracking-tight text-foreground truncate font-mono">
                              {account.name}
                            </h3>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                              <span>{maskNumber}</span>
                              <span>•</span>
                              <span className="capitalize">{account.type}</span>
                              <span>•</span>
                              <span className="font-semibold text-primary">{account.currency || "USD"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Balance display area */}
                        <CardContent className="p-4 pt-2.5 border-t border-border bg-muted/20">
                          <div className="flex items-end justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                                {isCredit ? "Statement Balance" : "Available Balance"}
                              </span>
                              <div
                                className={`text-xl font-extrabold font-mono tracking-tight ${
                                  isCredit && balanceNum < 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-foreground"
                                }`}
                              >
                                {formatCurrency(balanceNum, account.currency || "USD")}
                              </div>
                            </div>

                            <Badge
                              variant="outline"
                              className="font-mono text-[9px] uppercase font-semibold text-muted-foreground border-border"
                            >
                              {account.currency || "USD"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
