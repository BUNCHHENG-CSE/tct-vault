"use server";

import { createClient } from "@/lib/supabase/server";
import {
  transactionSchema,
  transferSchema,
  type TransactionInput,
  type TransferInput,
} from "@/lib/validations";
import type { TransactionCategory } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function createTransactionAction(data: TransactionInput) {
  const validated = transactionSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Invalid transaction data",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to create a transaction",
    };
  }

  // 1. Fetch current account balance
  const { data: account, error: accError } = await supabase
    .from("accounts")
    .select("id, balance")
    .eq("id", validated.data.account_id)
    .eq("user_id", user.id)
    .single();

  if (accError || !account) {
    return {
      success: false,
      error: "Selected account was not found",
    };
  }

  // 2. Insert transaction
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: validated.data.account_id,
    to_account_id: validated.data.to_account_id || null,
    description: validated.data.description,
    amount: validated.data.amount,
    type: validated.data.type,
    category: validated.data.category,
    date: validated.data.date,
    currency: validated.data.currency || "USD",
  });

  if (txError) {
    return {
      success: false,
      error: txError.message,
    };
  }

  // 3. Update account balance (Income adds, Expense subtracts)
  const currentBalance = Number(account.balance) || 0;
  const delta =
    validated.data.type === "income"
      ? validated.data.amount
      : -validated.data.amount;
  const newBalance = Number((currentBalance + delta).toFixed(2));

  const { error: updateError } = await supabase
    .from("accounts")
    .update({ balance: newBalance })
    .eq("id", validated.data.account_id)
    .eq("user_id", user.id);

  if (updateError) {
    return {
      success: false,
      error: "Transaction logged, but failed to adjust account balance: " + updateError.message,
    };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
  revalidatePath("/analytics");

  return { success: true };
}

export async function transferBetweenAccountsAction(data: TransferInput) {
  const validated = transferSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Invalid transfer parameters",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to perform a transfer",
    };
  }

  // 1. Fetch source and destination accounts
  const [fromRes, toRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, balance")
      .eq("id", validated.data.from_account_id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("accounts")
      .select("id, name, balance")
      .eq("id", validated.data.to_account_id)
      .eq("user_id", user.id)
      .single(),
  ]);

  if (fromRes.error || !fromRes.data) {
    return { success: false, error: "Source account not found" };
  }
  if (toRes.error || !toRes.data) {
    return { success: false, error: "Destination account not found" };
  }

  const fromAcc = fromRes.data;
  const toAcc = toRes.data;
  const amount = validated.data.amount;

  // 2. Adjust balances: Deduct from source, add to destination
  const newFromBal = Number((Number(fromAcc.balance) - amount).toFixed(2));
  const newToBal = Number((Number(toAcc.balance) + amount).toFixed(2));

  await Promise.all([
    supabase
      .from("accounts")
      .update({ balance: newFromBal })
      .eq("id", fromAcc.id)
      .eq("user_id", user.id),
    supabase
      .from("accounts")
      .update({ balance: newToBal })
      .eq("id", toAcc.id)
      .eq("user_id", user.id),
  ]);

  // 3. Log cryptographic ledger record as transfer
  const description =
    validated.data.description ||
    `Vault Transfer: ${fromAcc.name} → ${toAcc.name}`;

  const { error: txError } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: fromAcc.id,
    to_account_id: toAcc.id,
    description,
    amount,
    type: "transfer",
    category: "transfer",
    date: validated.data.date,
  });

  if (txError) {
    return { success: false, error: txError.message };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
  revalidatePath("/analytics");

  return { success: true };
}

export interface ImportTransactionItem {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  category: TransactionCategory;
  account_id: string;
}

export async function importTransactionsAction(items: ImportTransactionItem[]) {
  if (!items || items.length === 0) {
    return { success: false, error: "No transaction records to import" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required for bulk ledger import" };
  }

  // 1. Group balance deltas per account
  const accountDeltas: Record<string, number> = {};
  const validItems = items.map((item) => {
    const amt = Math.abs(Number(item.amount) || 0);
    const type = item.type === "income" ? "income" : "expense";
    const delta = type === "income" ? amt : -amt;

    accountDeltas[item.account_id] =
      (accountDeltas[item.account_id] || 0) + delta;

    return {
      user_id: user.id,
      account_id: item.account_id,
      description: item.description || "Imported transaction",
      amount: amt,
      type,
      category: item.category || "general",
      date: item.date || new Date().toISOString().slice(0, 10),
    };
  });

  // 2. Insert records
  const { error: insertError } = await supabase
    .from("transactions")
    .insert(validItems);

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // 3. Update account balances
  for (const [accountId, netDelta] of Object.entries(accountDeltas)) {
    const { data: acc } = await supabase
      .from("accounts")
      .select("id, balance")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (acc) {
      const nextBal = Number(((Number(acc.balance) || 0) + netDelta).toFixed(2));
      await supabase
        .from("accounts")
        .update({ balance: nextBal })
        .eq("id", accountId)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
  revalidatePath("/analytics");

  return { success: true, count: validItems.length };
}

export async function deleteTransactionAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to delete a transaction",
    };
  }

  // 1. Find transaction to retrieve amount, type, account_id, and to_account_id
  const { data: tx, error: fetchError } = await supabase
    .from("transactions")
    .select("id, account_id, to_account_id, amount, type")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !tx) {
    return {
      success: false,
      error: "Transaction not found",
    };
  }

  // 2. Delete transaction
  const { error: delError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (delError) {
    return {
      success: false,
      error: delError.message,
    };
  }

  // 3. Revert account balance adjustment
  if (tx.type === "transfer") {
    // Revert transfer: refund source account, deduct from destination account
    const { data: sourceAcc } = await supabase
      .from("accounts")
      .select("id, balance")
      .eq("id", tx.account_id)
      .eq("user_id", user.id)
      .single();

    if (sourceAcc) {
      const restored = Number(((Number(sourceAcc.balance) || 0) + Number(tx.amount)).toFixed(2));
      await supabase.from("accounts").update({ balance: restored }).eq("id", tx.account_id);
    }

    if (tx.to_account_id) {
      const { data: destAcc } = await supabase
        .from("accounts")
        .select("id, balance")
        .eq("id", tx.to_account_id)
        .eq("user_id", user.id)
        .single();

      if (destAcc) {
        const restored = Number(((Number(destAcc.balance) || 0) - Number(tx.amount)).toFixed(2));
        await supabase.from("accounts").update({ balance: restored }).eq("id", tx.to_account_id);
      }
    }
  } else {
    const { data: account } = await supabase
      .from("accounts")
      .select("id, balance")
      .eq("id", tx.account_id)
      .eq("user_id", user.id)
      .single();

    if (account) {
      const currentBalance = Number(account.balance) || 0;
      const delta =
        tx.type === "income" ? -Number(tx.amount) : Number(tx.amount);
      const newBalance = Number((currentBalance + delta).toFixed(2));

      await supabase
        .from("accounts")
        .update({ balance: newBalance })
        .eq("id", tx.account_id)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
  revalidatePath("/analytics");

  return { success: true };
}
