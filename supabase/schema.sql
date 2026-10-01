-- Hotelify backend schema (run once in Supabase: Project → SQL Editor → New query).
-- Phase 1: profiles + per-account journal entries.
-- Phase 2 (scaffolded now so it doesn't require a later migration): follows,
-- for the Beli-style "see other travelers' journals" competitive layer.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up, so the app never
-- has to handle a logged-in user with no profile.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Journal entries: replaces the old localStorage-only Trip Journal.
-- Private to the owning user.
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hotel_id text not null,
  hotel_name text not null,
  city text not null,
  theme_key text not null,
  score int not null,
  verdict text not null,
  created_at timestamptz not null default now()
);

alter table public.journal_entries enable row level security;

create policy "Users can view their own journal entries"
  on public.journal_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own journal entries"
  on public.journal_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own journal entries"
  on public.journal_entries for delete
  using (auth.uid() = user_id);

-- Phase 2 scaffolding: one-directional follows (Beli-style), not yet
-- used by the app UI. Viewable by everyone so a public leaderboard /
-- "who follows whom" view is possible later without another migration.
create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

create policy "Follows are viewable by everyone"
  on public.follows for select
  using (true);

create policy "Users can create their own follows"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can remove their own follows"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- Customer-written trip plans, shared publicly (no login required to read).
-- `username` is denormalized at insert-time rather than joined from
-- `profiles`, since `user_id` references auth.users (not profiles) and
-- PostgREST can't auto-embed across that relationship.
create table public.shared_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  hotel_name text not null,
  city text not null,
  theme_key text not null,
  score int not null,
  plan_text text not null,
  created_at timestamptz not null default now()
);

alter table public.shared_plans enable row level security;

create policy "Shared plans are viewable by everyone"
  on public.shared_plans for select
  using (true);

create policy "Users can share their own plans"
  on public.shared_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own shared plans"
  on public.shared_plans for delete
  using (auth.uid() = user_id);
