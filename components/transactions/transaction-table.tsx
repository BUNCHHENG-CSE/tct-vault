"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Search,
  Trash2,
  ArrowUpDown,
  ArrowLeftRight,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Briefcase,
  Zap,
  Home,
  Utensils,
  Laptop,
  Tv,
  ShoppingBag,
  Receipt,
} from "lucide-react";
import type { Transaction, Account } from "@/types/database";
import { deleteTransactionAction } from "@/lib/actions/transactions";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { transactionCategories } from "@/lib/validations";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  salary: Briefcase,
  freelance: Zap,
  housing: Home,
  food: Utensils,
  utilities: Zap,
  software: Laptop,
  entertainment: Tv,
  shopping: ShoppingBag,
  transfer: ArrowLeftRight,
  general: Receipt,
};

interface TransactionTableProps {
  transactions: (Transaction & { accounts?: Pick<Account, "name" | "type"> })[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Initialize filters from URL params
  const initialQ = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "all";
  const initialType = searchParams.get("type") || "all";

  const [searchQuery, setSearchQuery] = React.useState(initialQ);
  const [selectedCategory, setSelectedCategory] = React.useState(initialCategory);
  const [selectedType, setSelectedType] = React.useState(initialType);

  // Helper to sync to URL Search Params
  const updateQueryParams = React.useCallback(
    (newParams: { q?: string; category?: string; type?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newParams.q !== undefined) {
        if (newParams.q) params.set("q", newParams.q);
        else params.delete("q");
      }

      if (newParams.category !== undefined) {
        if (newParams.category && newParams.category !== "all") {
          params.set("category", newParams.category);
        } else {
          params.delete("category");
        }
      }

      if (newParams.type !== undefined) {
        if (newParams.type && newParams.type !== "all") {
          params.set("type", newParams.type);
        } else {
          params.delete("type");
        }
      }

      router.push(`${pathname}?${params.toString()}` as Route);
    },
    [pathname, router, searchParams]
  );

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    updateQueryParams({ q: val });
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    updateQueryParams({ category: val });
  };

  const handleTypeChange = (val: string) => {
    setSelectedType(val);
    updateQueryParams({ type: val });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedType("all");
    router.push(pathname as Route);
  };

  // Filter dataset based on search, category, and type
  const filteredData = React.useMemo(() => {
    return transactions.filter((tx) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = tx.description.toLowerCase().includes(query);
        const accountMatch = tx.accounts?.name.toLowerCase().includes(query);
        const catMatch = tx.category.toLowerCase().includes(query);
        if (!descMatch && !accountMatch && !catMatch) return false;
      }

      if (selectedCategory !== "all" && tx.category !== selectedCategory) {
        return false;
      }

      if (selectedType !== "all" && tx.type !== selectedType) {
        return false;
      }

      return true;
    });
  }, [transactions, searchQuery, selectedCategory, selectedType]);

  // Compute live filtered totals
  const filteredTotals = React.useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    filteredData.forEach((tx) => {
      const val = Number(tx.amount) || 0;
      if (tx.type === "income") inflow += val;
      else if (tx.type === "expense") outflow += val;
    });
    return {
      inflow,
      outflow,
      net: inflow - outflow,
      count: filteredData.length,
    };
  }, [filteredData]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await deleteTransactionAction(id);
      if (res.success) {
        toast.success("Transaction deleted & account balance adjusted");
      } else {
        toast.error(res.error || "Failed to delete transaction");
      }
    } catch {
      toast.error("An error occurred while deleting transaction");
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<Transaction & { accounts?: Pick<Account, "name" | "type"> }>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-7.5 text-xs font-semibold hover:bg-transparent hover:text-foreground cursor-pointer font-mono"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        );
      },
      cell: ({ row }) => {
        try {
          const dateStr = row.getValue("date") as string;
          return (
            <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
              {format(parseISO(dateStr), "MMM dd, yyyy")}
            </span>
          );
        } catch {
          return <span className="font-mono text-xs text-muted-foreground">{row.getValue("date")}</span>;
        }
      },
    },
    {
      accessorKey: "description",
      header: "Description & Entity",
      cell: ({ row }) => {
        const tx = row.original;
        const CategoryIcon = CATEGORY_ICONS[tx.category.toLowerCase()] || Receipt;
        const isIncome = tx.type === "income";

        return (
          <div className="flex items-center gap-3">
            <div
              className={`h-8 w-8 rounded-md flex items-center justify-center border shrink-0 ${
                isIncome
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <CategoryIcon className="h-4 w-4" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground text-xs truncate font-mono">
                  {tx.description}
                </span>
                {tx.institution_name && (
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono px-1 py-0 h-3.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0"
                  >
                    Synced
                  </Badge>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground font-mono truncate">
                {tx.accounts?.name || tx.institution_name || "Unassigned Account"}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Classification",
      cell: ({ row }) => {
        const cat = row.getValue("category") as string;
        return (
          <Badge
            variant="outline"
            className="capitalize font-mono text-[10px] font-medium bg-muted/30 border-border text-foreground"
          >
            {cat}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              className="-mr-3 h-7.5 text-xs font-semibold hover:bg-transparent hover:text-foreground cursor-pointer font-mono"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Cashflow
              <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const tx = row.original;
        const isTransfer = tx.type === "transfer";
        const isIncome = tx.type === "income";
        const formatted = formatCurrency(Number(tx.amount), tx.currency || "USD");

        if (isTransfer) {
          return (
            <div className="flex items-center justify-end">
              <Badge
                variant="outline"
                className="font-mono font-bold text-xs px-2 py-0.5 border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25 flex items-center gap-1"
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>{formatted}</span>
              </Badge>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end">
            <Badge
              variant="outline"
              className={`font-mono font-bold text-xs px-2 py-0.5 border ${
                isIncome
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
              }`}
            >
              {isIncome ? `+${formatted}` : `-${formatted}`}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const id = row.original.id;
        const isDeleting = deletingId === id;
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="icon"
              className="h-7.5 w-7.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer"
              onClick={() => handleDelete(id)}
              disabled={isDeleting}
              title="Delete transaction"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const hasActiveFilters =
    searchQuery !== "" || selectedCategory !== "all" || selectedType !== "all";

  return (
    <div className="space-y-4 font-mono">
      {/* Dynamic Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg border border-border bg-card shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-semibold">
            Filtered Entries
          </span>
          <span className="text-xl font-bold text-foreground">
            {filteredTotals.count}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block font-semibold">
            Total Inflow
          </span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(filteredTotals.inflow)}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-rose-500/20 bg-rose-500/5 shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400 block font-semibold">
            Total Outflow
          </span>
          <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
            -{formatCurrency(filteredTotals.outflow)}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-border bg-card shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-semibold">
            Net Cash Flow
          </span>
          <span
            className={`text-xl font-bold ${
              filteredTotals.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {filteredTotals.net >= 0 ? "+" : ""}
            {formatCurrency(filteredTotals.net)}
          </span>
        </div>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search description, account..."
            className="pl-8 text-xs h-8.5 bg-background border-border rounded-lg"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category & Type Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <Tabs
            value={selectedType}
            onValueChange={handleTypeChange}
            className="h-8.5"
          >
            <TabsList className="h-8.5 p-0.5 rounded-lg bg-muted border border-border">
              <TabsTrigger value="all" className="text-xs px-2.5 h-7 rounded-md cursor-pointer">
                All
              </TabsTrigger>
              <TabsTrigger
                value="expense"
                className="text-xs px-2.5 h-7 rounded-md data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 cursor-pointer"
              >
                Expenses
              </TabsTrigger>
              <TabsTrigger
                value="income"
                className="text-xs px-2.5 h-7 rounded-md data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 cursor-pointer"
              >
                Income
              </TabsTrigger>
              <TabsTrigger
                value="transfer"
                className="text-xs px-2.5 h-7 rounded-md data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 cursor-pointer"
              >
                Transfers
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Dropdown */}
          <div className="w-[145px]">
            <Select
              value={selectedCategory}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="h-8.5 text-xs rounded-lg bg-background border-border cursor-pointer">
                <Filter className="h-3 w-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-border">
                <SelectItem value="all" className="rounded-md cursor-pointer text-xs">All Categories</SelectItem>
                {transactionCategories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="rounded-md cursor-pointer text-xs">
                    <span className="capitalize">{cat}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8.5 text-xs text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* TanStack Table Container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
        <Table>
          <TableHeader className="bg-muted/50 border-b border-border">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-bold text-muted-foreground py-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/40 transition-colors border-b border-border"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-36 text-center text-xs text-muted-foreground"
                >
                  <p className="font-semibold text-foreground">No transactions found</p>
                  <p className="mt-1 text-[11px]">Adjust your search query or reset the filter settings above.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground px-1 gap-3">
        <div>
          Showing{" "}
          <span className="font-bold text-foreground">
            {table.getFilteredRowModel().rows.length}
          </span>{" "}
          of {transactions.length} total entries
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-7.5 rounded-md gap-1 text-xs cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
          <span className="text-xs px-1">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-7.5 rounded-md gap-1 text-xs cursor-pointer"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
