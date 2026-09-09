-- Jalankan script ini di Supabase SQL Editor.
-- Script aman untuk database baru dan menggunakan UUID + RLS.

create extension if not exists "pgcrypto";

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  order_date date not null default current_date,
  deadline date not null default current_date,
  status text not null default 'belum_dikirim'
    check (status in ('belum_dikirim','sudah_dikirim','selesai')),
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  description text not null,
  category text not null default 'Lainnya'
    check (category in ('Iklan','Produksi','Operasional','Pengiriman','Lainnya')),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  amount numeric(14,2) not null default 0 check (amount >= 0),
  date date not null default current_date,
  due_date date not null default current_date,
  status text not null default 'belum_dibayar'
    check (status in ('belum_dibayar','sudah_dibayar')),
  created_at timestamptz not null default now()
);

create table if not exists public.balance (
  id uuid primary key default gen_random_uuid(),
  initial_balance numeric(14,2) not null default 0 check (initial_balance >= 0),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
alter table public.expenses enable row level security;
alter table public.debts enable row level security;
alter table public.balance enable row level security;

drop policy if exists "authenticated orders" on public.orders;
create policy "authenticated orders" on public.orders
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated expenses" on public.expenses;
create policy "authenticated expenses" on public.expenses
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated debts" on public.debts;
create policy "authenticated debts" on public.debts
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated balance" on public.balance;
create policy "authenticated balance" on public.balance
for all to authenticated using (true) with check (true);

create index if not exists orders_order_date_idx on public.orders(order_date);
create index if not exists orders_deadline_idx on public.orders(deadline);
create index if not exists expenses_date_idx on public.expenses(date);
create index if not exists debts_date_idx on public.debts(date);
