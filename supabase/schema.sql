-- Enable uuid-ossp extension
create extension if not exists "uuid-ossp";

-- 1. accounts table
create table if not exists public.accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'checking' check (type in ('checking', 'savings', 'credit', 'investment')),
  balance numeric(12,2) not null default 0.00,
  currency text not null default 'USD',
  institution_id text,
  institution_name text,
  institution_logo text,
  is_connected boolean not null default false,
  sync_status text check (sync_status in ('synced', 'syncing', 'error', 'disconnected')),
  last_synced_at timestamptz,
  connection_provider text default 'manual',
  created_at timestamptz not null default now()
);

-- 2. transactions table
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid references public.accounts(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null,
  type text not null default 'expense' check (type in ('income', 'expense', 'transfer')),
  category text not null default 'general' check (category in ('salary', 'freelance', 'housing', 'food', 'utilities', 'software', 'entertainment', 'shopping', 'transfer', 'general')),
  currency text not null default 'USD',
  date date not null default current_date,
  external_id text,
  institution_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_external_id on public.transactions(user_id, external_id);

-- 3. subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(10,2) not null,
  billing_day integer not null check (billing_day >= 1 and billing_day <= 31),
  category text not null default 'software',
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

-- 4. budgets table
create table if not exists public.budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric(10,2) not null,
  created_at timestamptz not null default now(),
  constraint budgets_user_category_unique unique (user_id, category)
);

-- 5. goals table
create table if not exists public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0.00,
  target_date date,
  category text not null default 'general',
  account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS) on all tables
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;

-- RLS Policies
create policy "Accounts owner policy"
  on public.accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Transactions owner policy"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Subscriptions owner policy"
  on public.subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Budgets owner policy"
  on public.budgets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Goals owner policy"
  on public.goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
