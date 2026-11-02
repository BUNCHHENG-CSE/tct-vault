-- =============================================================================
-- tctVault — Testing & Demo Seed Script (PostgreSQL / Supabase)
-- Run in Supabase SQL Editor after schema.sql to seed demo portfolio data.
-- Automatically attaches to the first existing auth.users row (or creates a demo user).
-- =============================================================================

do $$
declare
  v_user_id uuid;
  v_checking_id uuid := uuid_generate_v4();
  v_savings_id uuid := uuid_generate_v4();
  v_credit_id uuid := uuid_generate_v4();
  v_brokerage_id uuid := uuid_generate_v4();
  v_roth_id uuid := uuid_generate_v4();
  v_curr_month text := to_char(current_date, 'YYYY-MM');
  v_m1 text := to_char(current_date - interval '1 month', 'YYYY-MM');
  v_m2 text := to_char(current_date - interval '2 months', 'YYYY-MM');
  v_m3 text := to_char(current_date - interval '3 months', 'YYYY-MM');
  v_m4 text := to_char(current_date - interval '4 months', 'YYYY-MM');
  v_m5 text := to_char(current_date - interval '5 months', 'YYYY-MM');
begin
  -- Find first existing user or create demo@tctvault.com in auth.users
  select id into v_user_id from auth.users order by created_at asc limit 1;

  if v_user_id is null then
    v_user_id := '00000000-0000-4000-8000-000000000001'::uuid;
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'demo@tctvault.com',
      crypt('demo123456', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Demo User"}',
      now(),
      now()
    ) on conflict (id) do nothing;
  end if;

  -- Clear existing rows for target user to ensure idempotent re-seeding
  delete from public.transactions where user_id = v_user_id;
  delete from public.accounts where user_id = v_user_id;
  delete from public.subscriptions where user_id = v_user_id;
  delete from public.budgets where user_id = v_user_id;

  -- 1. Seed 5 Accounts across all 4 account types
  insert into public.accounts (id, user_id, name, type, balance) values
    (v_checking_id,  v_user_id, 'Chase Sapphire Checking',   'checking',   6420.50),
    (v_savings_id,   v_user_id, 'Marcus High-Yield Savings', 'savings',   28500.00),
    (v_credit_id,    v_user_id, 'Amex Gold Card',            'credit',    -1240.80),
    (v_brokerage_id, v_user_id, 'Vanguard S&P 500 Index',    'investment', 42850.00),
    (v_roth_id,      v_user_id, 'Fidelity Roth IRA',         'investment', 18400.00);

  -- 2. Seed Current Month Transactions
  insert into public.transactions (user_id, account_id, description, amount, type, category, date) values
    (v_user_id, v_checking_id, 'Monthly Tech Salary Direct Deposit',   5200.00, 'income',  'salary',        (v_curr_month || '-01')::date),
    (v_user_id, v_checking_id, 'Freelance Design System Architecture', 1450.00, 'income',  'freelance',     (v_curr_month || '-08')::date),
    (v_user_id, v_checking_id, 'Luxury Loft Rent & Garage',            1650.00, 'expense', 'housing',       (v_curr_month || '-02')::date),
    (v_user_id, v_credit_id,   'Trader Joe''s Weekly Groceries',        148.40, 'expense', 'food',          (v_curr_month || '-04')::date),
    (v_user_id, v_checking_id, 'ConEd Electric & Fiber Internet',       135.00, 'expense', 'utilities',     (v_curr_month || '-06')::date),
    (v_user_id, v_credit_id,   'AMC IMAX Dune Double Feature',           42.00, 'expense', 'entertainment', (v_curr_month || '-09')::date),
    (v_user_id, v_credit_id,   'Whole Foods Organic Market',            112.85, 'expense', 'food',          (v_curr_month || '-11')::date),
    (v_user_id, v_credit_id,   'Keychron Q1 Pro Mechanical Keyboard',   219.99, 'expense', 'shopping',      (v_curr_month || '-13')::date),
    (v_user_id, v_credit_id,   'Blue Bottle Specialty Coffee & Pastry',  24.50, 'expense', 'food',          (v_curr_month || '-14')::date),
    (v_user_id, v_credit_id,   'Vercel Pro & Supabase Cloud Plan',       45.00, 'expense', 'software',      (v_curr_month || '-15')::date),
    (v_user_id, v_credit_id,   'Cursor AI & GitHub Copilot Pro',         30.00, 'expense', 'software',      (v_curr_month || '-16')::date),
    (v_user_id, v_credit_id,   'Nike Running Apparel & Gear',           130.00, 'expense', 'shopping',      (v_curr_month || '-17')::date),
    (v_user_id, v_credit_id,   'Uber Black Airport Terminal Transfer',   64.25, 'expense', 'general',       (v_curr_month || '-18')::date),
    (v_user_id, v_credit_id,   'Sweetgreen Harvest Bowl Lunch',          19.75, 'expense', 'food',          (v_curr_month || '-19')::date);

  -- 3. Seed Historical Transactions (Last 5 Months for Cashflow Chart)
  insert into public.transactions (user_id, account_id, description, amount, type, category, date) values
    (v_user_id, v_checking_id, 'Monthly Tech Salary Direct Deposit', 5200.00, 'income',  'salary',    (v_m1 || '-01')::date),
    (v_user_id, v_checking_id, 'Client Retainer & Advisory Sprint',   950.00, 'income',  'freelance', (v_m1 || '-10')::date),
    (v_user_id, v_checking_id, 'Luxury Loft Rent & Garage',          1650.00, 'expense', 'housing',   (v_m1 || '-02')::date),
    (v_user_id, v_credit_id,   'Whole Foods & Dining Consolidated',   420.50, 'expense', 'food',      (v_m1 || '-12')::date),
    (v_user_id, v_checking_id, 'ConEd Electric & Fiber Internet',     128.00, 'expense', 'utilities', (v_m1 || '-06')::date),
    (v_user_id, v_credit_id,   'Amazon Prime & Retail Gear',          210.00, 'expense', 'shopping',  (v_m1 || '-18')::date),
    (v_user_id, v_credit_id,   'Cloud Infrastructure & Dev Tools',     75.00, 'expense', 'software',  (v_m1 || '-22')::date),

    (v_user_id, v_checking_id, 'Monthly Tech Salary Direct Deposit', 5200.00, 'income',  'salary',    (v_m2 || '-01')::date),
    (v_user_id, v_checking_id, 'Client Retainer & Advisory Sprint',  1800.00, 'income',  'freelance', (v_m2 || '-10')::date),
    (v_user_id, v_checking_id, 'Luxury Loft Rent & Garage',          1650.00, 'expense', 'housing',   (v_m2 || '-02')::date),
    (v_user_id, v_credit_id,   'Whole Foods & Dining Consolidated',   390.20, 'expense', 'food',      (v_m2 || '-12')::date),
    (v_user_id, v_checking_id, 'ConEd Electric & Fiber Internet',     142.00, 'expense', 'utilities', (v_m2 || '-06')::date),
    (v_user_id, v_credit_id,   'Amazon Prime & Retail Gear',          310.00, 'expense', 'shopping',  (v_m2 || '-18')::date),
    (v_user_id, v_credit_id,   'Cloud Infrastructure & Dev Tools',     75.00, 'expense', 'software',  (v_m2 || '-22')::date),

    (v_user_id, v_checking_id, 'Monthly Tech Salary Direct Deposit', 5000.00, 'income',  'salary',    (v_m3 || '-01')::date),
    (v_user_id, v_checking_id, 'Client Retainer & Advisory Sprint',   600.00, 'income',  'freelance', (v_m3 || '-10')::date),
    (v_user_id, v_checking_id, 'Luxury Loft Rent & Garage',          1650.00, 'expense', 'housing',   (v_m3 || '-02')::date),
    (v_user_id, v_credit_id,   'Whole Foods & Dining Consolidated',   445.00, 'expense', 'food',      (v_m3 || '-12')::date),
    (v_user_id, v_checking_id, 'ConEd Electric & Fiber Internet',     138.50, 'expense', 'utilities', (v_m3 || '-06')::date),
    (v_user_id, v_credit_id,   'Amazon Prime & Retail Gear',          145.00, 'expense', 'shopping',  (v_m3 || '-18')::date),
    (v_user_id, v_credit_id,   'Cloud Infrastructure & Dev Tools',     65.00, 'expense', 'software',  (v_m3 || '-22')::date),

    (v_user_id, v_checking_id, 'Monthly Tech Salary Direct Deposit', 5000.00, 'income',  'salary',    (v_m4 || '-01')::date),
    (v_user_id, v_checking_id, 'Client Retainer & Advisory Sprint',  1200.00, 'income',  'freelance', (v_m4 || '-10')::date),
    (v_user_id, v_checking_id, 'Luxury Loft Rent & Garage',          1650.00, 'expense', 'housing',   (v_m4 || '-02')::date),
    (v_user_id, v_credit_id,   'Whole Foods & Dining Consolidated',   380.75, 'expense', 'food',      (v_m4 || '-12')::date),
    (v_user_id, v_checking_id, 'ConEd Electric & Fiber Internet',     122.00, 'expense', 'utilities', (v_m4 || '-06')::date),
    (v_user_id, v_credit_id,   'Amazon Prime & Retail Gear',          260.00, 'expense', 'shopping',  (v_m4 || '-18')::date),
    (v_user_id, v_credit_id,   'Cloud Infrastructure & Dev Tools',     65.00, 'expense', 'software',  (v_m4 || '-22')::date),

    (v_user_id, v_checking_id, 'Monthly Tech Salary Direct Deposit', 5000.00, 'income',  'salary',    (v_m5 || '-01')::date),
    (v_user_id, v_checking_id, 'Client Retainer & Advisory Sprint',   850.00, 'income',  'freelance', (v_m5 || '-10')::date),
    (v_user_id, v_checking_id, 'Luxury Loft Rent & Garage',          1650.00, 'expense', 'housing',   (v_m5 || '-02')::date),
    (v_user_id, v_credit_id,   'Whole Foods & Dining Consolidated',   410.00, 'expense', 'food',      (v_m5 || '-12')::date),
    (v_user_id, v_checking_id, 'ConEd Electric & Fiber Internet',     118.00, 'expense', 'utilities', (v_m5 || '-06')::date),
    (v_user_id, v_credit_id,   'Amazon Prime & Retail Gear',          195.00, 'expense', 'shopping',  (v_m5 || '-18')::date),
    (v_user_id, v_credit_id,   'Cloud Infrastructure & Dev Tools',     65.00, 'expense', 'software',  (v_m5 || '-22')::date);

  -- 4. Seed 7 Subscriptions (6 Active, 1 Paused)
  insert into public.subscriptions (user_id, name, amount, billing_day, category, status) values
    (v_user_id, 'Equinox All-Access Club',   210.00,  1, 'general',       'active'),
    (v_user_id, 'Netflix 4K Ultra HD',        22.99,  5, 'entertainment', 'active'),
    (v_user_id, 'Spotify Duo Premium',        14.99, 12, 'entertainment', 'active'),
    (v_user_id, 'Vercel Pro Developer',       20.00, 15, 'software',      'active'),
    (v_user_id, 'Cursor Pro AI IDE',          20.00, 18, 'software',      'active'),
    (v_user_id, 'GitHub Copilot Individual',  10.00, 22, 'software',      'active'),
    (v_user_id, 'Adobe Creative Cloud',       59.99, 27, 'software',      'paused');

  -- 5. Seed 6 Monthly Category Budgets
  insert into public.budgets (user_id, category, monthly_limit) values
    (v_user_id, 'housing',       1800.00),
    (v_user_id, 'shopping',       300.00),
    (v_user_id, 'food',           600.00),
    (v_user_id, 'software',       120.00),
    (v_user_id, 'utilities',      200.00),
    (v_user_id, 'entertainment',  150.00)
  on conflict (user_id, category) do update set monthly_limit = excluded.monthly_limit;
end $$;
