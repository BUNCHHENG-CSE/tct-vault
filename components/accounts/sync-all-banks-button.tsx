"use client";

import * as React from "react";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncAllConnectedAccountsAction } from "@/lib/actions/bank-sync";

interface SyncAllBanksButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SyncAllBanksButton({
  className,
  variant = "outline",
  size = "sm",
}: SyncAllBanksButtonProps) {
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Connecting to bank institutions and fetching live ledger data...");

    try {
      const res = await syncAllConnectedAccountsAction();
      if (res.success) {
        const syncedCount = res.syncedAccounts ?? 0;
        const newTxCount = res.totalNewTransactions ?? 0;

        if (syncedCount === 0) {
          toast.info("No connected bank accounts found to sync. Connect an institution first!", { id: toastId });
        } else if (newTxCount === 0) {
          toast.success(
            `Checked ${syncedCount} bank account${syncedCount > 1 ? "s" : ""}. Balances reconciled and up to date!`,
            { id: toastId }
          );
        } else {
          toast.success(
            `Reconciled ${syncedCount} bank${syncedCount > 1 ? "s" : ""}! Fetched ${newTxCount} new transaction${newTxCount > 1 ? "s" : ""}.`,
            { id: toastId }
          );
        }
      } else {
        toast.error(res.error || "Failed to sync bank accounts", { id: toastId });
      }
    } catch {
      toast.error("An unexpected error occurred while syncing banks", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSyncAll}
      disabled={isSyncing}
      className={`font-mono text-xs gap-2 cursor-pointer transition-all ${className || ""}`}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
      <span>{isSyncing ? "Syncing Banks..." : "Sync All Banks"}</span>
    </Button>
  );
}
