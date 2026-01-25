'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, DBProfile } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: DBProfile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<DBProfile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  syncLocalStats: (stats: { totalWorkouts: number; totalVolume: number; currentStreak: number; xp: number; level: number }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DBProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data && !error) {
      setProfile(data);
    }
    return { data, error };
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sign up
  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (data.user && !error) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          username,
          display_name: username,
          total_workouts: 0,
          total_volume: 0,
          current_streak: 0,
          level: 1,
          xp: 0,
          workouts_per_week: 3,
        });

      if (profileError) {
        return { error: profileError };
      }

      await fetchProfile(data.user.id);
    }

    return { error };
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data.user && !error) {
      await fetchProfile(data.user.id);
    }

    return { error };
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  // Update profile
  const updateProfile = async (updates: Partial<DBProfile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (!error) {
      await fetchProfile(user.id);
    }

    return { error };
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Sync local stats to Supabase profile
  const syncLocalStats = async (stats: { totalWorkouts: number; totalVolume: number; currentStreak: number; xp: number; level: number }) => {
    if (!user) return;

    // Only sync if local stats are higher (merge strategy)
    const currentProfile = profile;
    if (!currentProfile) return;

    const updates: Partial<DBProfile> = {};

    if (stats.totalWorkouts > currentProfile.total_workouts) {
      updates.total_workouts = stats.totalWorkouts;
    }
    if (stats.totalVolume > currentProfile.total_volume) {
      updates.total_volume = stats.totalVolume;
    }
    if (stats.currentStreak > currentProfile.current_streak) {
      updates.current_streak = stats.currentStreak;
    }
    if (stats.xp > currentProfile.xp) {
      updates.xp = stats.xp;
    }
    if (stats.level > currentProfile.level) {
      updates.level = stats.level;
    }

    if (Object.keys(updates).length > 0) {
      await updateProfile(updates);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
      syncLocalStats,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
