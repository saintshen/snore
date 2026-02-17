-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Public Profile / Settings)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  subscription_tier text check (subscription_tier in ('free', 'premium')) default 'free',
  settings jsonb default '{"sensitivity": 5, "notify": false}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for profiles
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on profiles
  for update using (auth.uid() = id);

-- SLEEP SESSIONS (Nightly Records)
create table sleep_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  end_time timestamp with time zone,
  noise_log jsonb default '[]'::jsonb, -- Array of {t: timestamp, db: number}
  snore_count integer default 0,
  quality_score integer,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for sleep_sessions
alter table sleep_sessions enable row level security;

create policy "Users can view their own sleep sessions." on sleep_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own sleep sessions." on sleep_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own sleep sessions." on sleep_sessions
  for update using (auth.uid() = user_id);

-- SNORE EVENTS (Audio Clips)
create table snore_events (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references sleep_sessions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null, -- Denormalized for easier RLS
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  audio_path text not null, -- Path in Storage: {uid}/{session_id}/{event_id}.mp3
  duration_seconds integer,
  peak_db integer,
  confidence_score float,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for snore_events
alter table snore_events enable row level security;

create policy "Users can view their own snore events." on snore_events
  for select using (auth.uid() = user_id);

create policy "Users can insert their own snore events." on snore_events
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own snore events." on snore_events
  for delete using (auth.uid() = user_id);

-- STORAGE BUCKET SETUP (To be run in SQL Editor or Storage UI)
-- Note: You'll need to create a bucket named 'snore-clips' in your Supabase dashboard.

-- Storage Policies (assuming 'snore-clips' bucket exists)
-- Policy: "Give users access to own folder 1ok22a_0"
-- format: {uid}/{session_id}/{filename}

-- INSERT bucket if not exists (only works if you have permissions, usually done via UI)
insert into storage.buckets (id, name, public)
values ('snore-clips', 'snore-clips', false)
on conflict (id) do nothing;

create policy "Users can upload their own audio" on storage.objects
  for insert with check (
    bucket_id = 'snore-clips' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their own audio" on storage.objects
  for select using (
    bucket_id = 'snore-clips' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own audio" on storage.objects
  for delete using (
    bucket_id = 'snore-clips' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- TRIGGER: Create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
