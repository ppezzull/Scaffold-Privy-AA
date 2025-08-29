-- Enable required extension for UUID generation
create extension if not exists pgcrypto with schema public;

-- Users table mapped to Privy identities
create table if not exists public.users (
	id uuid primary key default gen_random_uuid(),
	privy_did text unique not null,
	email text,
	created_at timestamptz not null default now()
);

-- Helpful index for lookups by Privy DID
create index if not exists users_privy_did_idx on public.users (privy_did);

-- (Optional) Enable RLS now; policies can be added later when models are defined
alter table public.users enable row level security;
