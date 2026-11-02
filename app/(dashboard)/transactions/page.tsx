import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import type { Account, Transaction } from "@/types/database";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import { TransferDialog } from "@/components/transactions/transfer-dialog";
import { CSVImportDialog } from "@/components/transactions/csv-import-dialog";
import { ExportDialog } from "@/components/transactions/export-dialog";
import { ConnectBankDialog } from "@/components/accounts/connect-bank-dialog";
import { SyncAllBanksButton } from "@/components/accounts/sync-all-banks-button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, ShieldCheck } from "lucide-react";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let transactions: (Transaction & { accounts?: Pick<Account, "name" | "type"> })[] = [];
  let accounts: Account[] = [];

  if (user) {
    const [txRes, accRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*, accounts(name, type)")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    transactions =
      (txRes.data as unknown as (Transaction & {
        accounts?: Pick<Account, "name" | "type">;
      })[]) || [];
    accounts = (accRes.data as Account[]) || [];
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-sans">
              Transaction Ledger
            </h1>
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5">
              {transactions.length} entries
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Complete cryptographic audit log of income streams and categorized debits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SyncAllBanksButton />
          <ConnectBankDialog accounts={accounts} />
          <ExportDialog transactions={transactions} />
          <CSVImportDialog accounts={accounts} />
          <TransferDialog accounts={accounts} />
          <TransactionSheet accounts={accounts} />
        </div>
      </div>

      {/* Transaction Table with TanStack DataTable & URL Search Params sync */}
      <React.Suspense
        fallback={
          <div className="h-64 flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card/60 text-xs text-muted-foreground">
            <ArrowLeftRight className="h-6 w-6 animate-pulse text-primary mb-2" />
            <span>Decrypting ledger entries...</span>
          </div>
        }
      >
        <TransactionTable transactions={transactions} />
      </React.Suspense>
    </div>
  );
}
