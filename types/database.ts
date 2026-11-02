export type AccountType = 'checking' | 'savings' | 'credit' | 'investment';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionCategory =
  | 'salary'
  | 'freelance'
  | 'housing'
  | 'food'
  | 'utilities'
  | 'software'
  | 'entertainment'
  | 'shopping'
  | 'transfer'
  | 'general';

export type SubscriptionStatus = 'active' | 'paused';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'disconnected';
export type BankConnectionProvider = 'plaid' | 'mock_live' | 'statement_sync' | 'manual';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency?: string;
  institution_id?: string | null;
  institution_name?: string | null;
  institution_logo?: string | null;
  is_connected?: boolean;
  sync_status?: SyncStatus;
  last_synced_at?: string | null;
  connection_provider?: BankConnectionProvider;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  to_account_id?: string | null;
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  currency?: string;
  date: string;
  external_id?: string | null;
  institution_name?: string | null;
  created_at: string;
  accounts?: Pick<Account, 'name' | 'type'>;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  billing_day: number;
  category: string;
  status: SubscriptionStatus;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
}

export interface BudgetWithSpending extends Budget {
  spent: number;
  percentage: number;
  remaining: number;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  category?: string;
  account_id?: string | null;
  created_at: string;
  accounts?: Pick<Account, 'name' | 'type'>;
}
