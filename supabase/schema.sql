-- Enable extension for UUID generation if available
create extension if not exists pgcrypto;

-- Proxmox hosts table: stores what used to live in .env
create table if not exists public.proxmox_hosts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_url text not null,
  allow_insecure_tls boolean not null default false,
  -- Auth options (use either API token or username/password)
  token_id text,
  token_secret text,
  username text,
  password text,
  -- Defaults for provisioning
  node text not null,
  storage text not null default 'local',
  bridge text not null default 'vmbr0',
  template_vmid integer,
  template_os text,
  -- Networking
  gateway_ip text,
  dns_primary text,
  dns_secondary text,
  is_active boolean not null default true,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_ips (
  id bigserial primary key,
  host_id uuid not null references public.proxmox_hosts(id) on delete cascade,
  ip text not null,
  mac text,
  unique(host_id, ip)
);

create index if not exists idx_public_ips_host on public.public_ips(host_id);

-- Simple trigger to keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'proxmox_hosts_set_updated_at'
  ) then
    create trigger proxmox_hosts_set_updated_at
    before update on public.proxmox_hosts
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Location enum and column (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'proxmox_location') then
    create type public.proxmox_location as enum (
      'india','singapore','uk','sydney','germany','france','poland','us_east','us_west','canada'
    );
  end if;
end $$;

alter table public.proxmox_hosts
  add column if not exists location public.proxmox_location;

-- NOTE: Add RLS policies in your Supabase project to restrict access to these tables.
-- Admin API in this repo uses the service role to read/write.

-- New structured IP pools (one MAC per pool, multiple IPs per pool)
create table if not exists public.public_ip_pools (
  id bigserial primary key,
  host_id uuid not null references public.proxmox_hosts(id) on delete cascade,
  mac text not null,
  label text,
  created_at timestamptz not null default now(),
  unique(host_id, mac)
);

create table if not exists public.public_ip_pool_ips (
  id bigserial primary key,
  pool_id bigint not null references public.public_ip_pools(id) on delete cascade,
  ip text not null,
  created_at timestamptz not null default now(),
  unique(pool_id, ip)
);

create index if not exists idx_ip_pools_host on public.public_ip_pools(host_id);
create index if not exists idx_pool_ips_pool on public.public_ip_pool_ips(pool_id);

-- Multiple templates per host (OS templates)
create table if not exists public.proxmox_templates (
  id bigserial primary key,
  host_id uuid not null references public.proxmox_hosts(id) on delete cascade,
  name text not null,
  vmid integer not null,
  type text default 'qemu' check (type in ('qemu','lxc')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(host_id, name)
);

create index if not exists idx_templates_host on public.proxmox_templates(host_id);

-- Simple role mapping table so admin rights live in SQL instead of auth metadata
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin')),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_user_roles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'user_roles_set_updated_at'
  ) then
    create trigger user_roles_set_updated_at
    before update on public.user_roles
    for each row execute function public.touch_user_roles_updated_at();
  end if;
end $$;

-- Wallet system tables
create table if not exists public.wallets (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  balance decimal(10,2) not null default 0.00,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, currency)
);

create table if not exists public.wallet_transactions (
  id bigserial primary key,
  wallet_id bigint not null references public.wallets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal', 'server_payment', 'refund')),
  amount decimal(10,2) not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  description text,
  reference_id text, -- server_id, payment_id, etc.
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add server pricing and billing info to servers table
alter table public.servers add column if not exists hourly_cost decimal(5,2);
alter table public.servers add column if not exists total_cost decimal(10,2) default 0.00;
alter table public.servers add column if not exists billing_start timestamptz;
alter table public.servers add column if not exists billing_end timestamptz;
alter table public.servers add column if not exists auto_destroy_at timestamptz;

-- Indexes for performance
create index if not exists idx_wallets_user on public.wallets(user_id);
create index if not exists idx_wallet_transactions_wallet on public.wallet_transactions(wallet_id);
create index if not exists idx_wallet_transactions_user on public.wallet_transactions(user_id);
create index if not exists idx_wallet_transactions_type on public.wallet_transactions(type);
create index if not exists idx_wallet_transactions_status on public.wallet_transactions(status);

-- Trigger to update wallet updated_at
create or replace function public.update_wallet_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'wallets_update_updated_at'
  ) then
    create trigger wallets_update_updated_at
    before update on public.wallets
    for each row execute function public.update_wallet_updated_at();
  end if;
end $$;

-- Trigger to update transaction updated_at
create or replace function public.update_transaction_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'wallet_transactions_update_updated_at'
  ) then
    create trigger wallet_transactions_update_updated_at
    before update on public.wallet_transactions
    for each row execute function public.update_transaction_updated_at();
  end if;
end $$;
