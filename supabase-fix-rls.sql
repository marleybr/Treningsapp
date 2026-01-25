-- FIX: Run this in Supabase SQL Editor to fix profile creation
-- Go to: Database -> SQL Editor -> New Query

-- Step 1: Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- Step 2: Create a more permissive insert policy
-- This allows authenticated users to insert a profile with their own ID
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (
    -- Allow if the id matches the authenticated user's id
    auth.uid() = id
    -- OR allow if no user is authenticated yet (for trigger)
    OR auth.uid() IS NULL
  );

-- Step 3: Make sure the trigger function exists and has correct permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, profiles.username),
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Step 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.friendships TO anon, authenticated;
GRANT ALL ON public.workout_shares TO anon, authenticated;
GRANT ALL ON public.challenges TO anon, authenticated;
GRANT ALL ON public.workout_likes TO anon, authenticated;

-- Verify: Check if trigger exists
SELECT tgname, tgrelid::regclass, tgtype 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
