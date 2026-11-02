"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileCode } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Transaction, Account } from "@/types/database";

interface ExportDialogProps {
  transactions: (Transaction & { accounts?: Pick<Account, "name" | "type"> })[];
}

export function ExportDialog({ transactions }: ExportDialogProps) {
  const exportToCSV = () => {
    if (!transactions || transactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const headers = ["ID", "Date", "Description", "Amount", "Type", "Category", "Account", "Currency"];
    const rows = transactions.map((tx) => [
      `"${tx.id}"`,
      `"${tx.date}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.amount,
      `"${tx.type}"`,
      `"${tx.category}"`,
      `"${(tx.accounts?.name || "").replace(/"/g, '""')}"`,
      `"${tx.currency || "USD"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = format(new Date(), "yyyy-MM-dd");

    link.setAttribute("href", url);
    link.setAttribute("download", `tctvault-ledger-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${transactions.length} records to CSV`);
  };

  const exportToJSON = () => {
    if (!transactions || transactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const jsonContent = JSON.stringify(transactions, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = format(new Date(), "yyyy-MM-dd");

    link.setAttribute("href", url);
    link.setAttribute("download", `tctvault-ledger-${today}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${transactions.length} records to JSON`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 font-mono text-xs border-border/80 hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Ledger</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl border-border bg-card">
        <DropdownMenuLabel className="text-xs font-mono text-muted-foreground">
          Select Export Format
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={exportToCSV}
          className="text-xs font-mono gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          <span>Export as CSV (.csv)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={exportToJSON}
          className="text-xs font-mono gap-2 cursor-pointer"
        >
          <FileCode className="h-4 w-4 text-cyan-500" />
          <span>Export as JSON (.json)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
