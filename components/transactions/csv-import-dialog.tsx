"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Database,
} from "lucide-react";
import { importTransactionsAction, type ImportTransactionItem } from "@/lib/actions/transactions";
import type { Account, TransactionCategory } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface CSVImportDialogProps {
  accounts: Account[];
  trigger?: React.ReactNode;
}

// Simple robust CSV line splitter taking care of quoted values
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++; // handle CRLF
      currentRow.push(currentVal.trim());
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

export function CSVImportDialog({ accounts, trigger }: CSVImportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>(
    accounts[0]?.id || ""
  );
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parsedItems, setParsedItems] = React.useState<ImportTransactionItem[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSV(text);
        if (rows.length < 2) {
          setErrorMsg("CSV must contain at least a header row and one data row.");
          return;
        }

        const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
        
        // Find column indices
        const dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("time"));
        const descIdx = headers.findIndex((h) => h.includes("desc") || h.includes("memo") || h.includes("name") || h.includes("merchant"));
        const amtIdx = headers.findIndex((h) => h.includes("amount") || h.includes("value") || h.includes("total") || h.includes("cost"));
        const typeIdx = headers.findIndex((h) => h.includes("type") || h.includes("direction"));
        const catIdx = headers.findIndex((h) => h.includes("cat"));

        if (amtIdx === -1) {
          setErrorMsg("Could not detect an 'Amount' column in the CSV file.");
          return;
        }

        const targetAccount = selectedAccountId || accounts[0]?.id || "";
        const dataRows = rows.slice(1);
        const mapped: ImportTransactionItem[] = [];

        for (const row of dataRows) {
          const rawAmt = amtIdx !== -1 ? row[amtIdx] : "0";
          const cleanAmt = parseFloat(rawAmt.replace(/[^0-9.-]/g, ""));
          if (isNaN(cleanAmt) || cleanAmt === 0) continue;

          const rawDate = dateIdx !== -1 ? row[dateIdx] : "";
          // Format date if possible, else use today
          let dateStr = new Date().toISOString().slice(0, 10);
          if (rawDate) {
            const parsedD = new Date(rawDate);
            if (!isNaN(parsedD.getTime())) {
              dateStr = parsedD.toISOString().slice(0, 10);
            }
          }

          const description = descIdx !== -1 && row[descIdx] ? row[descIdx] : "Bank Import";
          
          let txType: "income" | "expense" = cleanAmt > 0 ? "income" : "expense";
          if (typeIdx !== -1 && row[typeIdx]) {
            const t = row[typeIdx].toLowerCase();
            if (t.includes("in") || t.includes("cr") || t.includes("dep")) txType = "income";
            else if (t.includes("ex") || t.includes("dr") || t.includes("debit")) txType = "expense";
          }

          let category: TransactionCategory = "general";
          if (catIdx !== -1 && row[catIdx]) {
            const c = row[catIdx].toLowerCase();
            if (c.includes("food") || c.includes("grocer") || c.includes("rest")) category = "food";
            else if (c.includes("soft") || c.includes("sub") || c.includes("cloud")) category = "software";
            else if (c.includes("util") || c.includes("elec") || c.includes("water")) category = "utilities";
            else if (c.includes("house") || c.includes("rent")) category = "housing";
            else if (c.includes("shop")) category = "shopping";
            else if (c.includes("ent") || c.includes("movie")) category = "entertainment";
            else if (c.includes("sal") || c.includes("pay")) category = "salary";
          }

          mapped.push({
            date: dateStr,
            description,
            amount: Math.abs(cleanAmt),
            type: txType,
            category,
            account_id: targetAccount,
          });
        }

        if (mapped.length === 0) {
          setErrorMsg("No valid transactions found in file.");
          return;
        }

        setParsedItems(mapped);
      } catch {
        setErrorMsg("Failed to parse CSV file. Ensure valid comma-delimited structure.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedItems.length === 0) return;
    if (!selectedAccountId) {
      toast.error("Please select a target account");
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure target account is attached to all items
      const itemsToImport = parsedItems.map((item) => ({
        ...item,
        account_id: selectedAccountId,
      }));

      const res = await importTransactionsAction(itemsToImport);
      if (res.success) {
        toast.success(`Successfully imported ${res.count} transactions to vault ledger!`);
        setOpen(false);
        setParsedItems([]);
        setFileName(null);
      } else {
        toast.error(res.error || "Failed to import transactions");
      }
    } catch {
      toast.error("An unexpected error occurred during import");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 font-mono text-xs border-border/80 hover:bg-muted"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-xl rounded-2xl border-border bg-card shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-mono">
                Bank Statement CSV Importer
              </DialogTitle>
              <DialogDescription className="text-xs font-mono">
                Bulk ingest statements from Chase, Amex, Wise, or any export into the cryptographic ledger.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 font-mono">
          {/* Target Account selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Destination Account for Ingestion</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-10 rounded-xl text-xs bg-background/60">
                <SelectValue placeholder="Select target account" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="text-xs">
                    {acc.name} ({formatCurrency(Number(acc.balance), acc.currency)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload Drop Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-xl p-6 text-center cursor-pointer bg-muted/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs font-bold text-foreground">
              {fileName ? fileName : "Click or drag bank statement (.csv) here"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Supports standard headers: Date, Description, Amount, Category, Type
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview rows */}
          {parsedItems.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-foreground">
                    Parsed {parsedItems.length} records ready
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Sample Preview
                </Badge>
              </div>

              <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b border-border text-[10px] text-muted-foreground">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">Category</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground">{row.date}</td>
                        <td className="p-2 font-medium truncate max-w-[140px]">
                          {row.description}
                        </td>
                        <td className="p-2 capitalize text-muted-foreground">{row.category}</td>
                        <td className={`p-2 text-right font-bold ${
                          row.type === "income" ? "text-emerald-500" : "text-rose-500"
                        }`}>
                          {row.type === "income" ? "+" : "-"}${row.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedItems.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  + {parsedItems.length - 5} more records will be imported
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            onClick={handleImport}
            disabled={isSubmitting || parsedItems.length === 0}
            className="w-full h-10 rounded-xl gap-2 font-mono text-xs font-bold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Injecting records into vault ledger...</span>
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                <span>Import {parsedItems.length} Transactions</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
