"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getInstitutionById } from "@/lib/institutions";
import {
  parseUniversalBankStatement,
  type ParsedBankTransaction,
} from "@/lib/bank-parsers";
import type { Account, AccountType, Transaction, TransactionCategory, TransactionType } from "@/types/database";

export interface ConnectBankInput {
  institutionId: string;
  accountName?: string;
  accountType?: AccountType;
  initialBalance?: number;
  currency?: string;
  provider?: "plaid" | "mock_live" | "statement_sync";
}

/**
 * Connect a bank and pull initial transaction feed.
 */
export async function connectBankAccountAction(input: ConnectBankInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to connect a bank account",
    };
  }

  const institution = getInstitutionById(input.institutionId);
  const instName = institution?.name || input.accountName || "Connected Bank";
  const name = input.accountName || `${institution?.shortName || instName} Main Account`;
  const type = input.accountType || "checking";
  const currency = input.currency || institution?.defaultCurrency || "USD";
  const provider = input.provider || institution?.provider || "mock_live";
  const balance = input.initialBalance !== undefined ? Number(input.initialBalance) : 3500.0;

  // 1. Create the connected account
  const { data: newAccount, error: accError } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name,
      type,
      balance,
      currency,
      institution_id: input.institutionId,
      institution_name: instName,
      institution_logo: input.institutionId,
      is_connected: true,
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
      connection_provider: provider,
    })
    .select()
    .single();

  if (accError || !newAccount) {
    return {
      success: false,
      error: accError?.message || "Failed to create connected bank account",
    };
  }

  const accountId = (newAccount as Account).id;

  // 2. Generate initial simulated recent transactions for this bank account
  const initialTransactions = generateInitialBankTransactions(
    user.id,
    accountId,
    instName,
    currency,
    input.institutionId
  );

  if (initialTransactions.length > 0) {
    await supabase.from("transactions").insert(initialTransactions);
  }

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");

  return {
    success: true,
    account: newAccount,
    transactionsCount: initialTransactions.length,
  };
}

/**
 * Sync a single connected bank account.
 * Pulls latest transactions and updates balance.
 */
export async function syncAccountTransactionsAction(accountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to sync bank accounts",
    };
  }

  // 1. Fetch account details
  const { data: account, error: accError } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (accError || !account) {
    return {
      success: false,
      error: "Account not found",
    };
  }

  const targetAccount = account as Account;

  // 2. Fetch existing transaction external_ids to ensure idempotency / zero duplicates
  const { data: existingTxs } = await supabase
    .from("transactions")
    .select("external_id")
    .eq("account_id", accountId)
    .eq("user_id", user.id);

  const existingIds = new Set(
    (existingTxs as Array<{ external_id?: string | null }> || [])
      .map((t) => t.external_id)
      .filter(Boolean)
  );

  // 3. Generate candidate new transactions from the institution feed
  const candidates = generateFreshLiveTransactions(
    user.id,
    targetAccount.id,
    targetAccount.institution_name || targetAccount.name,
    targetAccount.currency || "USD",
    targetAccount.institution_id || "default"
  );

  const newToInsert = candidates.filter(
    (c) => c.external_id && !existingIds.has(c.external_id)
  );

  let balanceDelta = 0;
  if (newToInsert.length > 0) {
    for (const tx of newToInsert) {
      if (tx.type === "income") {
        balanceDelta += Number(tx.amount);
      } else if (tx.type === "expense") {
        balanceDelta -= Number(tx.amount);
      }
    }

    await supabase.from("transactions").insert(newToInsert);
  }

  // 4. Update account balance and sync status
  const updatedBalance = Number(
    ((Number(targetAccount.balance) || 0) + balanceDelta).toFixed(2)
  );

  await supabase
    .from("accounts")
    .update({
      balance: updatedBalance,
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", targetAccount.id)
    .eq("user_id", user.id);

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");

  return {
    success: true,
    newCount: newToInsert.length,
    newBalance: updatedBalance,
  };
}

/**
 * Sync all connected bank accounts in 1 click.
 */
export async function syncAllConnectedAccountsAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to sync bank accounts",
    };
  }

  const { data: connectedAccounts } = await supabase
    .from("accounts")
    .select("id, name, institution_name, is_connected")
    .eq("user_id", user.id)
    .eq("is_connected", true);

  if (!connectedAccounts || connectedAccounts.length === 0) {
    return {
      success: true,
      syncedAccounts: 0,
      totalNewTransactions: 0,
      message: "No connected bank accounts found to sync",
    };
  }

  let totalNew = 0;
  for (const acc of connectedAccounts) {
    const res = await syncAccountTransactionsAction(acc.id);
    if (res.success && res.newCount) {
      totalNew += res.newCount;
    }
  }

  return {
    success: true,
    syncedAccounts: connectedAccounts.length,
    totalNewTransactions: totalNew,
  };
}

/**
 * Disconnect an account from live banking sync.
 */
export async function disconnectBankAccountAction(accountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in",
    };
  }

  const { error } = await supabase
    .from("accounts")
    .update({
      is_connected: false,
      sync_status: "disconnected",
    })
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/accounts");
  return { success: true };
}

/**
 * Smart Universal Statement Import Action (OFX / QFX / CSV).
 */
export async function importUniversalStatementAction(
  accountId: string,
  fileContent: string,
  fileName?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to import bank statements",
    };
  }

  const parseResult = parseUniversalBankStatement(fileContent, fileName);
  if (!parseResult.success || parseResult.transactions.length === 0) {
    return {
      success: false,
      error: parseResult.error || "Failed to parse bank statement file",
    };
  }

  // 1. Fetch existing external_ids for duplicate prevention
  const { data: existingTxs } = await supabase
    .from("transactions")
    .select("external_id")
    .eq("account_id", accountId)
    .eq("user_id", user.id);

  const existingSet = new Set(
    (existingTxs as Array<{ external_id?: string | null }> || [])
      .map((t) => t.external_id)
      .filter(Boolean)
  );

  const toInsert: Array<Record<string, unknown>> = [];
  let delta = 0;
  let skipped = 0;

  for (const item of parseResult.transactions) {
    if (existingSet.has(item.externalId)) {
      skipped++;
      continue;
    }

    toInsert.push({
      user_id: user.id,
      account_id: accountId,
      description: item.description,
      amount: item.amount,
      type: item.type,
      category: item.category,
      date: item.date,
      external_id: item.externalId,
    });

    if (item.type === "income") {
      delta += item.amount;
    } else {
      delta -= item.amount;
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("transactions").insert(toInsert);

    // Update account balance
    const { data: acc } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", accountId)
      .single();

    if (acc) {
      const nextBal = Number(((Number(acc.balance) || 0) + delta).toFixed(2));
      await supabase
        .from("accounts")
        .update({
          balance: nextBal,
          last_synced_at: new Date().toISOString(),
          sync_status: "synced",
        })
        .eq("id", accountId);
    }
  }

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");

  return {
    success: true,
    importedCount: toInsert.length,
    skippedCount: skipped,
  };
}

// -------------------------------------------------------------
// Helpers to generate realistic initial & live bank transaction feeds
// -------------------------------------------------------------

function generateInitialBankTransactions(
  userId: string,
  accountId: string,
  institutionName: string,
  currency: string,
  institutionId: string
) {
  const now = new Date();
  const makeDateStr = (daysAgo: number) => {
    const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  };

  const isSea = [
    "aba",
    "acleda",
    "canadia",
    "wing",
    "bakong",
    "chipmong",
    "sathapana",
    "jtrust",
    "vattanac",
    "prince",
    "dbs",
    "ocbc",
    "uob",
    "vietcombank",
    "techcombank",
  ].includes(institutionId);

  const txs: Array<{
    user_id: string;
    account_id: string;
    description: string;
    amount: number;
    type: TransactionType;
    category: TransactionCategory;
    currency: string;
    date: string;
    external_id: string;
    institution_name: string;
  }> = [];

  if (isSea) {
    txs.push(
      {
        user_id: userId,
        account_id: accountId,
        description: `${institutionName}: Direct Deposit Payroll`,
        amount: currency === "KHR" ? 14000000 : currency === "VND" ? 35000000 : 2800,
        type: "income",
        category: "salary",
        currency,
        date: makeDateStr(1),
        external_id: `bank-sync-${accountId}-init-01`,
        institution_name: institutionName,
      },
      {
        user_id: userId,
        account_id: accountId,
        description: "GrabFood Delivery & AEON Supermarket",
        amount: currency === "KHR" ? 120000 : currency === "VND" ? 350000 : 29.5,
        type: "expense",
        category: "food",
        currency,
        date: makeDateStr(2),
        external_id: `bank-sync-${accountId}-init-02`,
        institution_name: institutionName,
      },
      {
        user_id: userId,
        account_id: accountId,
        description: "Bakong KHQR Merchant Payment",
        amount: currency === "KHR" ? 60000 : currency === "VND" ? 180000 : 15.0,
        type: "expense",
        category: "shopping",
        currency,
        date: makeDateStr(3),
        external_id: `bank-sync-${accountId}-init-03`,
        institution_name: institutionName,
      }
    );
  } else {
    txs.push(
      {
        user_id: userId,
        account_id: accountId,
        description: `${institutionName}: Payroll ACH Direct Deposit`,
        amount: 3200.0,
        type: "income",
        category: "salary",
        currency,
        date: makeDateStr(1),
        external_id: `bank-sync-${accountId}-init-01`,
        institution_name: institutionName,
      },
      {
        user_id: userId,
        account_id: accountId,
        description: "Whole Foods Market Organic Groceries",
        amount: 88.4,
        type: "expense",
        category: "food",
        currency,
        date: makeDateStr(2),
        external_id: `bank-sync-${accountId}-init-02`,
        institution_name: institutionName,
      },
      {
        user_id: userId,
        account_id: accountId,
        description: "Apple Services: iCloud+ & Developer Subscription",
        amount: 12.99,
        type: "expense",
        category: "software",
        currency,
        date: makeDateStr(4),
        external_id: `bank-sync-${accountId}-init-03`,
        institution_name: institutionName,
      }
    );
  }

  return txs;
}

function generateFreshLiveTransactions(
  userId: string,
  accountId: string,
  institutionName: string,
  currency: string,
  institutionId: string
) {
  const today = new Date().toISOString().split("T")[0];
  const timeHash = Math.floor(Date.now() / (1000 * 60 * 10)); // new candidate batch every 10 min

  const isSea = [
    "aba",
    "acleda",
    "canadia",
    "wing",
    "bakong",
    "chipmong",
    "sathapana",
    "jtrust",
    "vattanac",
    "prince",
    "dbs",
    "ocbc",
    "uob",
    "vietcombank",
  ].includes(institutionId);

  if (isSea) {
    return [
      {
        user_id: userId,
        account_id: accountId,
        description: "Bakong KHQR: Brown Coffee Specialty Brew",
        amount: currency === "KHR" ? 18000 : currency === "VND" ? 95000 : 4.5,
        type: "expense" as const,
        category: "food" as const,
        currency,
        date: today,
        external_id: `live-tx-${accountId}-${timeHash}-01`,
        institution_name: institutionName,
      },
      {
        user_id: userId,
        account_id: accountId,
        description: "Bakong KHQR Transfer from Client",
        amount: currency === "KHR" ? 600000 : currency === "VND" ? 2500000 : 150.0,
        type: "income" as const,
        category: "freelance" as const,
        currency,
        date: today,
        external_id: `live-tx-${accountId}-${timeHash}-02`,
        institution_name: institutionName,
      },
    ];
  }

  return [
    {
      user_id: userId,
      account_id: accountId,
      description: "Starbucks Reserve Cold Brew",
      amount: 6.85,
      type: "expense" as const,
      category: "food" as const,
      currency,
      date: today,
      external_id: `live-tx-${accountId}-${timeHash}-01`,
      institution_name: institutionName,
    },
    {
      user_id: userId,
      account_id: accountId,
      description: "Incoming Venmo / Zelle Transfer",
      amount: 145.0,
      type: "income" as const,
      category: "general" as const,
      currency,
      date: today,
      external_id: `live-tx-${accountId}-${timeHash}-02`,
      institution_name: institutionName,
    },
  ];
}
