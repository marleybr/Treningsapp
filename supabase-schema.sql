-- FitTrack Database Schema for Supabase
-- Run this in Supabase SQL Editor (Database -> SQL Editor)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  total_workouts integer default 0,
  total_volume integer default 0,
  current_streak integer default 0,
  level integer default 1,
  xp integer default 0,
  workouts_per_week integer default 3,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Friendships table
create table public.friendships (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, friend_id)
);

-- Workout shares (public workout feed)
create table public.workout_shares (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  workout_name text not null,
  duration_minutes integer not null,
  volume integer default 0,
  workout_type text check (workout_type in ('weights', 'cardio')) default 'weights',
  distance_km decimal,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Challenges between users
create table public.challenges (
  id uuid default uuid_generate_v4() primary key,
  challenger_id uuid references public.profiles(id) on delete cascade not null,
  challenged_id uuid references public.profiles(id) on delete cascade not null,
  challenge_type text check (challenge_type in ('workouts', 'volume', 'streak')) not null,
  target_value integer not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  challenger_progress integer default 0,
  challenged_progress integer default 0,
  winner_id uuid references public.profiles(id),
  status text check (status in ('pending', 'active', 'completed')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workout likes
create table public.workout_likes (
  id uuid default uuid_generate_v4() primary key,
  workout_id uuid references public.workout_shares(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workout_id, user_id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.workout_shares enable row level security;
alter table public.challenges enable row level security;
alter table public.workout_likes enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Friendships policies
create policy "Users can view their friendships" on public.friendships
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can create friend requests" on public.friendships
  for insert with check (auth.uid() = user_id);

create policy "Users can update friendships they're part of" on public.friendships
  for update using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can delete their friend requests" on public.friendships
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- Workout shares policies
create policy "Workout shares are viewable by everyone" on public.workout_shares
  for select using (true);

create policy "Users can insert own workout shares" on public.workout_shares
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own workout shares" on public.workout_shares
  for delete using (auth.uid() = user_id);

-- Challenges policies
create policy "Users can view challenges they're part of" on public.challenges
  for select using (auth.uid() = challenger_id or auth.uid() = challenged_id);

create policy "Users can create challenges" on public.challenges
  for insert with check (auth.uid() = challenger_id);

create policy "Users can update challenges they're part of" on public.challenges
  for update using (auth.uid() = challenger_id or auth.uid() = challenged_id);

-- Workout likes policies
create policy "Workout likes are viewable by everyone" on public.workout_likes
  for select using (true);

create policy "Users can like workouts" on public.workout_likes
  for insert with check (auth.uid() = user_id);

create policy "Users can unlike workouts" on public.workout_likes
  for delete using (auth.uid() = user_id);

-- Create indexes for performance
create index friendships_user_id_idx on public.friendships(user_id);
create index friendships_friend_id_idx on public.friendships(friend_id);
create index workout_shares_user_id_idx on public.workout_shares(user_id);
create index workout_shares_created_at_idx on public.workout_shares(created_at desc);
create index challenges_challenger_id_idx on public.challenges(challenger_id);
create index challenges_challenged_id_idx on public.challenges(challenged_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
