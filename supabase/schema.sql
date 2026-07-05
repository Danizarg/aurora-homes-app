-- Aurora Homes Supabase schema.
-- Run this in the Supabase SQL editor (or via `supabase db push`) after
-- creating a project. See .env.example for the client-side variables this
-- schema pairs with, and lib/supabase/client.ts for the client setup.

create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  is_owner boolean not null default false,
  verified_owner boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists listings (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles (id) on delete cascade,
  mode text not null check (mode in ('rent', 'buy', 'stay', 'live')),
  intent text not null check (intent in ('rent_out', 'sell')),
  title text not null,
  description text not null default '',
  city text not null,
  country text not null default 'Spain',
  address_area text not null default '',
  property_type text not null,
  bedrooms int not null default 0,
  bathrooms int not null default 0,
  size_m2 int not null default 0,
  price_monthly numeric,
  price_sale numeric,
  utilities_monthly numeric,
  deposit numeric,
  platform_fee_percent numeric not null default 2,
  total_move_in_cost numeric,
  available_from date,
  minimum_stay text,
  maximum_stay text,
  pets_allowed boolean not null default false,
  pool boolean not null default false,
  sea_view boolean not null default false,
  garage boolean not null default false,
  furnished boolean not null default false,
  verified_owner boolean not null default false,
  verified_property boolean not null default false,
  last_verified_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists listing_images (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings (id) on delete cascade,
  uri text not null,
  position int not null default 0
);

create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings (id) on delete cascade,
  owner_id uuid not null references profiles (id) on delete cascade,
  participant_id uuid references profiles (id) on delete set null,
  qualified_lead boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender text not null check (sender in ('me', 'them', 'ai')),
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists viewing_requests (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings (id) on delete cascade,
  requester_id uuid references profiles (id) on delete set null,
  requested_date date not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  rating int not null check (rating between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists saved_listings (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles (id) on delete cascade,
  listing_id uuid not null references listings (id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (profile_id, listing_id)
);

create table if not exists verification_records (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings (id) on delete cascade,
  owner_verified boolean not null default false,
  property_verified boolean not null default false,
  last_checked_at timestamptz not null default now(),
  notes text
);

create table if not exists ai_generated_content (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings (id) on delete cascade,
  title text,
  short_summary text,
  long_description text,
  feature_bullets text[],
  lifestyle_paragraph text,
  location_paragraph text,
  ideal_profile text,
  price_explanation text,
  faq jsonb not null default '[]',
  agent_knowledge_base text[],
  translations jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists contact_submissions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  reason text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: enable and add owner-scoped policies. Adjust to your
-- auth model before going to production.
alter table profiles enable row level security;
alter table listings enable row level security;
alter table listing_images enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table viewing_requests enable row level security;
alter table reviews enable row level security;
alter table saved_listings enable row level security;
alter table verification_records enable row level security;
alter table ai_generated_content enable row level security;
alter table contact_submissions enable row level security;

create policy "Public listings are viewable by everyone" on listings
  for select using (status = 'published' or owner_id = auth.uid());

create policy "Owners can manage their own listings" on listings
  for all using (owner_id = auth.uid());

create policy "Profiles are viewable by everyone" on profiles
  for select using (true);

create policy "Users can update their own profile" on profiles
  for update using (id = auth.uid());
