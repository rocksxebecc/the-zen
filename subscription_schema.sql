-- ============================================================
--  Zenspace — Subscription & Payment Schema
--  Run this in your Supabase SQL Editor
-- ============================================================

-- Payments table (raw Razorpay records)
create table if not exists payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) not null,
  razorpay_payment_id text unique,
  razorpay_order_id   text,
  razorpay_signature  text,
  amount              integer not null,          -- in paise (9900 = ₹99)
  currency            text    not null default 'INR',
  status              text    not null default 'captured',
  created_at          timestamptz default now()
);

alter table payments enable row level security;

-- Drop policies if they already exist to make script safe to re-run
drop policy if exists "Users view own payments" on payments;
drop policy if exists "Service role manages payments" on payments;
drop policy if exists "Users view own subscription" on subscriptions;
drop policy if exists "Service role manages subscriptions" on subscriptions;
drop policy if exists "Admins select all subscriptions" on subscriptions;
drop policy if exists "Admins update all subscriptions" on subscriptions;
drop policy if exists "Admins delete all subscriptions" on subscriptions;

create policy "Users view own payments" on payments
  for select using (auth.uid() = user_id);

create policy "Service role manages payments" on payments
  for all using (auth.role() = 'service_role');

-- Subscriptions table (tracks active Pro access)
create table if not exists subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) not null unique,
  plan                text    not null default 'pro',
  status              text    not null default 'active',  -- active | cancelled | expired
  razorpay_payment_id text,
  razorpay_order_id   text,
  amount              integer not null default 9900,
  starts_at           timestamptz default now(),
  expires_at          timestamptz,               -- null = lifetime; or 1 year ahead
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "Users view own subscription" on subscriptions
  for select using (auth.uid() = user_id);

create policy "Service role manages subscriptions" on subscriptions
  for all using (auth.role() = 'service_role');

create policy "Admins select all subscriptions" on subscriptions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins update all subscriptions" on subscriptions
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins delete all subscriptions" on subscriptions
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Helper: check if user is Pro (used in edge functions / server logic)
create or replace function is_pro(uid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from subscriptions
    where user_id = uid
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$;
