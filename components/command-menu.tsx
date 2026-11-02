"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  CalendarDays,
  Target,
  PlusCircle,
  Moon,
  Sun,
  Search,
  Laptop,
  CreditCard,
  Sparkles,
  PiggyBank,
  Activity,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import { AccountDialog } from "@/components/accounts/account-dialog";
import { TransferDialog } from "@/components/transactions/transfer-dialog";
import type { Account } from "@/types/database";

interface CommandMenuProps {
  accounts?: Account[];
}

export function CommandMenu({ accounts = [] }: CommandMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = React.useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(false);
        setSheetOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative h-9 w-full justify-start rounded-xl bg-card/60 text-xs font-normal text-muted-foreground shadow-2xs sm:pr-12 md:w-56 lg:w-72 border-border/80 hover:bg-card hover:border-border transition-all"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
        <span className="hidden lg:inline-flex">Search or type command...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded-md border border-border/80 bg-background/80 px-1.5 font-mono text-[10px] font-semibold text-muted-foreground sm:flex">
          <span className="text-[11px]">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or jump to page..." />
        <CommandList className="max-h-[380px] p-2">
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => {
                runCommand(() => setSheetOpen(true));
              }}
              className="gap-2.5 py-2.5 rounded-lg cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PlusCircle className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Log Transaction</span>
                <span className="text-[11px] text-muted-foreground">Add income or expense to ledger</span>
              </div>
              <kbd className="ml-auto font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                ⌘N
              </kbd>
            </CommandItem>

            <CommandItem
              onSelect={() => {
                runCommand(() => setAccountDialogOpen(true));
              }}
              className="gap-2.5 py-2.5 rounded-lg cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Add New Account</span>
                <span className="text-[11px] text-muted-foreground">Checking, savings, or card</span>
              </div>
            </CommandItem>

            <CommandItem
              onSelect={() => {
                runCommand(() => setTransferDialogOpen(true));
              }}
              className="gap-2.5 py-2.5 rounded-lg cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                <ArrowLeftRight className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Transfer Between Accounts</span>
                <span className="text-[11px] text-muted-foreground">Move capital without skewing income/expense</span>
              </div>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator className="my-2" />

          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/dashboard"))}
              className="gap-2.5 py-2 rounded-lg cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              <span>Overview Dashboard</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/accounts"))}
              className="gap-2.5 py-2 rounded-lg cursor-pointer"
            >
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <span>Accounts & Balances</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/transactions"))}
              className="gap-2.5 py-2 rounded-lg cursor-pointer"
            >
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              <span>Transaction Ledger</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/subscriptions"))}
              className="gap-2.5 py-2 rounded-lg cursor-pointer"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>Subscription Calendar</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/budgets"))}
              className="gap-2.5 py-2 rounded-lg cursor-pointer"
            >
              <Target className="h-4 w-4 text-muted-foreground" />
              <span>Budgets & Spending Ceilings</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/goals"))}
              className="gap-2.5 py-2 rounded-lg cursor-pointer"
            >
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
              <span>Savings Goals & Target Reserves</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/analytics"))}
              className="gap-2.5 py-2 rounded-lg cursor-pointer"
            >
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span>Vault Intelligence & Runway</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator className="my-2" />

          <CommandGroup heading="Appearance">
            <CommandItem
              onSelect={() => runCommand(() => setTheme("light"))}
              className="gap-2.5 py-2 rounded-lg cursor-pointer"
            >
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Light Mode</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => setTheme("dark"))}
              className="gap-2.5 py-2 rounded-lg cursor-pointer"
            >
              <Moon className="h-4 w-4 text-indigo-400" />
              <span>Dark Mode</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => setTheme("system"))}
              className="gap-2.5 py-2 rounded-lg cursor-pointer"
            >
              <Laptop className="h-4 w-4 text-muted-foreground" />
              <span>System Preference</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <TransactionSheet
        accounts={accounts}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <AccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
      />

      <TransferDialog
        accounts={accounts}
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
      />
    </>
  );
}
