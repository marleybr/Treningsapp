import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DBProfile {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  total_workouts: number;
  total_volume: number;
  current_streak: number;
  level: number;
  xp: number;
  workouts_per_week: number;
  created_at: string;
  updated_at: string;
}

export interface DBFriendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface DBWorkoutShare {
  id: string;
  user_id: string;
  workout_name: string;
  duration_minutes: number;
  volume: number;
  workout_type: 'weights' | 'cardio';
  distance_km?: number;
  created_at: string;
}

export interface DBChallenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  challenge_type: 'workouts' | 'volume' | 'streak';
  target_value: number;
  start_date: string;
  end_date: string;
  challenger_progress: number;
  challenged_progress: number;
  winner_id?: string;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
}
