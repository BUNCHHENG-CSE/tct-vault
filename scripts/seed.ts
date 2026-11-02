import { resetLocalDbWithSeed } from "../lib/supabase/local-db";
import { convertCurrency } from "../lib/currency";

const seeded = resetLocalDbWithSeed();

const netWorth = seeded.accounts.reduce(
  (sum, a) => sum + convertCurrency(Number(a.balance), a.currency || "USD", "USD"),
  0
);

console.log("✅ tctVault test data seeded successfully!");
console.log(`   • Accounts:      ${seeded.accounts.length} (Normalized Net Worth: $${netWorth.toLocaleString("en-US", { minimumFractionDigits: 2 })})`);
console.log(`   • Transactions:  ${seeded.transactions.length} (6-month cashflow history & transfers)`);
console.log(`   • Subscriptions: ${seeded.subscriptions.length} (6 active, 1 paused)`);
console.log(`   • Budgets:       ${seeded.budgets.length} (On Track, Near 80%, and Exceeded states)`);
console.log(`   • Savings Goals: ${seeded.goals.length} (Emergency fund, Workstation, Tokyo Tour)`);
console.log(`   • Storage:       supabase/.local-db.json`);
