-- =========================================
-- JERSEY PO - SUPABASE DATABASE SETUP
-- Project: jersey-order
-- Jalankan seluruh script ini di SQL Editor.
-- =========================================

create extension if not exists pgcrypto;

-- ---------- PRODUCTS ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  image_url text,
  image_path text,
  design_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- ORDERS ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  order_date date not null default current_date,
  customer_name text not null check (char_length(trim(customer_name)) between 1 and 120),
  whatsapp text,
  product_id uuid not null references public.products(id) on update cascade on delete restrict,
  quantity integer not null check (quantity > 0),
  deadline date not null,
  design_url text,
  receipt_url text,
  status text not null default 'Pending'
    check (status in ('Pending','Diproses','Selesai','Dibatalkan')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_created_at on public.products(created_at desc);
create index if not exists idx_orders_deadline on public.orders(deadline);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_product_id on public.orders(product_id);
create index if not exists idx_orders_customer_name on public.orders(customer_name);

-- ---------- UPDATED_AT ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- ---------- DAILY ORDER COUNTER ----------
-- Atomic upsert prevents duplicate daily sequence numbers under normal
-- concurrent inserts.
create table if not exists public.order_counters (
  order_date date primary key,
  last_number integer not null default 0
);

create or replace function public.generate_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    insert into public.order_counters(order_date, last_number)
    values (new.order_date, 1)
    on conflict (order_date)
    do update set last_number = public.order_counters.last_number + 1
    returning last_number into next_number;

    new.order_number :=
      'PO-' ||
      to_char(new.order_date, 'YYYYMMDD') ||
      '-' ||
      lpad(next_number::text, 3, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_order_number on public.orders;
create trigger trg_orders_order_number
before insert on public.orders
for each row execute function public.generate_order_number();

-- ---------- VALIDATION ----------
create or replace function public.validate_order_urls()
returns trigger
language plpgsql
as $$
begin
  if new.design_url is not null
     and new.design_url !~* '^https?://'
  then
    raise exception 'design_url harus berupa URL http/https';
  end if;

  if new.receipt_url is not null
     and new.receipt_url !~* '^https?://'
  then
    raise exception 'receipt_url harus berupa URL http/https';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_order_urls on public.orders;
create trigger trg_validate_order_urls
before insert or update on public.orders
for each row execute function public.validate_order_urls();

-- ---------- RLS ----------
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_counters enable row level security;

-- Remove/recreate policies so the script can be safely rerun.
drop policy if exists "products_select_authenticated" on public.products;
drop policy if exists "products_insert_authenticated" on public.products;
drop policy if exists "products_update_authenticated" on public.products;
drop policy if exists "products_delete_authenticated" on public.products;

drop policy if exists "orders_select_authenticated" on public.orders;
drop policy if exists "orders_insert_authenticated" on public.orders;
drop policy if exists "orders_update_authenticated" on public.orders;
drop policy if exists "orders_delete_authenticated" on public.orders;

create policy "products_select_authenticated"
on public.products for select
to authenticated
using (true);

create policy "products_insert_authenticated"
on public.products for insert
to authenticated
with check (true);

create policy "products_update_authenticated"
on public.products for update
to authenticated
using (true)
with check (true);

create policy "products_delete_authenticated"
on public.products for delete
to authenticated
using (true);

create policy "orders_select_authenticated"
on public.orders for select
to authenticated
using (true);

create policy "orders_insert_authenticated"
on public.orders for insert
to authenticated
with check (true);

create policy "orders_update_authenticated"
on public.orders for update
to authenticated
using (true)
with check (true);

create policy "orders_delete_authenticated"
on public.orders for delete
to authenticated
using (true);

-- The frontend never accesses order_counters directly.
-- Keep RLS enabled with no public policies.

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_auth_insert" on storage.objects;
drop policy if exists "product_images_auth_update" on storage.objects;
drop policy if exists "product_images_auth_delete" on storage.objects;

create policy "product_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'product-images');

create policy "product_images_auth_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

create policy "product_images_auth_update"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

create policy "product_images_auth_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images');

-- ---------- OPTIONAL: basic URL checks for products ----------
create or replace function public.validate_product_url()
returns trigger
language plpgsql
as $$
begin
  if new.design_url is not null
     and new.design_url !~* '^https?://'
  then
    raise exception 'design_url harus berupa URL http/https';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_product_url on public.products;
create trigger trg_validate_product_url
before insert or update on public.products
for each row execute function public.validate_product_url();
