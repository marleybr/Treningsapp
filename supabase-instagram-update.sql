-- Instagram-lignende oppdateringer for FitTrack
-- Kjør denne i Supabase SQL Editor

-- 1. Legg til image_url og caption til workout_shares
ALTER TABLE public.workout_shares 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS caption text;

-- 2. Opprett kommentarer-tabell
CREATE TABLE IF NOT EXISTS public.workout_comments (
  id uuid default uuid_generate_v4() primary key,
  workout_id uuid references public.workout_shares(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Aktiver RLS for kommentarer
ALTER TABLE public.workout_comments ENABLE ROW LEVEL SECURITY;

-- 4. Policies for kommentarer
CREATE POLICY "Comments are viewable by everyone" ON public.workout_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert comments" ON public.workout_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.workout_comments
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Index for ytelse
CREATE INDEX IF NOT EXISTS workout_comments_workout_id_idx ON public.workout_comments(workout_id);
CREATE INDEX IF NOT EXISTS workout_comments_created_at_idx ON public.workout_comments(created_at desc);

-- 6. Opprett storage bucket for bilder (kjør dette separat i Storage-seksjonen)
-- Gå til Storage -> New Bucket -> "avatars" (public)
-- Gå til Storage -> New Bucket -> "workout-images" (public)
