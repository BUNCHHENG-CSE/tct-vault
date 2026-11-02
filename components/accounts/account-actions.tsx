"use client";

import * as React from "react";
import { toast } from "sonner";
import { Edit3, Trash2, MoreHorizontal, Loader2, RefreshCw, Unlink } from "lucide-react";
import type { Account } from "@/types/database";
import { deleteAccountAction } from "@/lib/actions/accounts";
import { syncAccountTransactionsAction, disconnectBankAccountAction } from "@/lib/actions/bank-sync";
import { AccountDialog } from "@/components/accounts/account-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AccountActionsProps {
  account: Account;
}

export function AccountActions({ account }: AccountActionsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    const toastId = toast.loading(`Syncing ${account.institution_name || account.name}...`);
    try {
      const res = await syncAccountTransactionsAction(account.id);
      if (res.success) {
        if (res.newCount && res.newCount > 0) {
          toast.success(
            `Synced! Fetched ${res.newCount} new transaction${res.newCount > 1 ? "s" : ""}. Balance: ${res.newBalance}`,
            { id: toastId }
          );
        } else {
          toast.success("Ledger reconciled. All transactions are up to date!", { id: toastId });
        }
      } else {
        toast.error(res.error || "Failed to sync bank", { id: toastId });
      }
    } catch {
      toast.error("Error connecting to bank feed", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect live bank feed for ${account.name}? Your historical transaction records will remain saved in your vault.`)) {
      return;
    }

    try {
      const res = await disconnectBankAccountAction(account.id);
      if (res.success) {
        toast.success(`Bank feed disconnected for "${account.name}"`);
      } else {
        toast.error(res.error || "Failed to disconnect bank feed");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${account.name}? All associated transactions will also be permanently deleted.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAccountAction(account.id);
      if (res.success) {
        toast.success(`Account "${account.name}" deleted`);
      } else {
        toast.error(res.error || "Failed to delete account");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Account actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/80 p-1">
          {account.is_connected && (
            <>
              <DropdownMenuItem
                onClick={handleSync}
                disabled={isSyncing}
                className="gap-2 rounded-lg cursor-pointer text-xs font-medium text-primary focus:text-primary focus:bg-primary/10"
              >
                {isSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>Sync Bank Feed</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDisconnect}
                className="gap-2 rounded-lg cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Unlink className="h-3.5 w-3.5" />
                <span>Disconnect Bank Feed</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-2 rounded-lg cursor-pointer text-xs font-medium"
          >
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Edit Account</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2 rounded-lg cursor-pointer text-xs font-medium text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>Delete Account</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountDialog
        account={account}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </>
  );
}
