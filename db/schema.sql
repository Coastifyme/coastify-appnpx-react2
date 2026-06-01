-- Supabase schema for Coastify contacts
-- Run this in Supabase SQL editor or via psql against your Supabase Postgres

create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text,
  company text,
  role text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text,
  phone text,
  note text,
  created_at timestamptz default now()
);
