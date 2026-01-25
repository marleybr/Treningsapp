'use client';

import { useState, useEffect } from 'react';
import { X, Trophy, Flame, Dumbbell, Zap, Star, Calendar, Target, Swords, UserMinus, MessageCircle, Crown, Medal, Award } from 'lucide-react';
import { DBProfile } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  onChallenge?: (user: DBProfile) => void;
  onRemoveFriend?: (userId: string) => void;
  isFriend?: boolean;
}

interface UserStats {
  recentWorkouts: number;
  totalChallengesWon: number;
  friendsCount: number;
}

export default function UserProfileModal({ 
  userId, 
  onClose, 
  onChallenge,
  onRemoveFriend,
  isFriend = false
}: UserProfileModalProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<DBProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        
        // Fetch leaderboard rank
        const { data: higherRanked } = await supabase
          .from('profiles')
          .select('id')
          .gt('total_workouts', profileData.total_workouts);
        
        setLeaderboardRank((higherRanked?.length || 0) + 1);
        
        // Fetch additional stats
        const [challengesResult, friendsResult, workoutsResult] = await Promise.all([
          supabase
            .from('challenges')
            .select('id')
            .eq('winner_id', userId),
          supabase
            .from('friendships')
            .select('id')
            .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
            .eq('status', 'accepted'),
          supabase
            .from('workout_shares')
            .select('id')
            .eq('user_id', userId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        ]);
        
        setStats({
          totalChallengesWon: challengesResult.data?.length || 0,
          friendsCount: friendsResult.data?.length || 0,
          recentWorkouts: workoutsResult.data?.length || 0,
        });
      }
      
      setLoading(false);
    };

    fetchUserProfile();
  }, [userId]);

  const getLevelTitle = (level: number): string => {
    const titles: Record<number, string> = {
      1: 'Nybegynner',
      5: 'Treningsentuisiast',
      10: 'Dedikert Løfter',
      15: 'Styrkebygger',
      20: 'Fitnesskriger',
      25: 'Jernmester',
      30: 'Eliteløfter',
      40: 'Treningslegende',
      50: 'Grandmaster',
    };
    
    const sortedLevels = Object.keys(titles)
      .map(Number)
      .sort((a, b) => b - a);
    
    for (const lvl of sortedLevels) {
      if (level >= lvl) return titles[lvl];
    }
    return 'Nybegynner';
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M kg`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K kg`;
    }
    return `${volume.toLocaleString()} kg`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="text-yellow-400" size={20} />;
    if (rank === 2) return <Medal className="text-gray-400" size={20} />;
    if (rank === 3) return <Award className="text-orange-600" size={20} />;
    return null;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-midnight rounded-2xl p-6 text-center">
          <div className="w-12 h-12 border-4 border-electric border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-soft-white/60">Laster profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-midnight rounded-2xl p-6 text-center">
          <p className="text-soft-white/60">Kunne ikke laste profil</p>
          <button onClick={onClose} className="mt-4 px-6 py-2 bg-white/10 rounded-xl">
            Lukk
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-gradient-to-br from-midnight via-deep-purple to-midnight rounded-2xl overflow-hidden my-4">
        {/* Header with gradient background */}
        <div className="relative h-32 bg-gradient-to-br from-electric/30 via-coral/20 to-neon-green/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/30 backdrop-blur-sm"
          >
            <X size={20} />
          </button>
          
          {/* Leaderboard rank badge */}
          {leaderboardRank && leaderboardRank <= 10 && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm">
              {getRankIcon(leaderboardRank)}
              <span className="text-sm font-bold">#{leaderboardRank}</span>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6 -mt-16">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-electric to-coral flex items-center justify-center text-3xl font-bold border-4 border-midnight">
              {profile.display_name[0].toUpperCase()}
            </div>
            {/* Level Badge */}
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br from-gold to-coral flex items-center justify-center border-2 border-midnight">
              <span className="text-sm font-bold text-midnight">{profile.level}</span>
            </div>
          </div>

          {/* Name & Username */}
          <div className="mb-4">
            <h2 className="text-2xl font-display font-bold">{profile.display_name}</h2>
            <p className="text-soft-white/60">@{profile.username}</p>
            <p className="text-gold font-semibold mt-1">{getLevelTitle(profile.level)}</p>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-soft-white/80 mb-4 p-3 rounded-xl bg-white/5">
              {profile.bio}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="p-3 rounded-xl bg-white/5 text-center">
              <Dumbbell className="mx-auto text-electric mb-1" size={18} />
              <p className="text-lg font-bold">{profile.total_workouts}</p>
              <p className="text-soft-white/50 text-xs">Økter</p>
            </div>
            
            <div className="p-3 rounded-xl bg-white/5 text-center">
              <Flame className="mx-auto text-coral mb-1" size={18} />
              <p className="text-lg font-bold text-coral">{profile.current_streak}</p>
              <p className="text-soft-white/50 text-xs">Streak</p>
            </div>
            
            <div className="p-3 rounded-xl bg-white/5 text-center">
              <Zap className="mx-auto text-gold mb-1" size={18} />
              <p className="text-lg font-bold text-gold">{profile.xp.toLocaleString()}</p>
              <p className="text-soft-white/50 text-xs">XP</p>
            </div>
            
            <div className="p-3 rounded-xl bg-white/5 text-center">
              <Trophy className="mx-auto text-neon-green mb-1" size={18} />
              <p className="text-lg font-bold text-neon-green">{stats?.totalChallengesWon || 0}</p>
              <p className="text-soft-white/50 text-xs">Seire</p>
            </div>
          </div>

          {/* Volume Lifted */}
          {profile.total_volume > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-neon-green/10 to-electric/10 border border-neon-green/20 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-green/20">
                  <Star className="text-neon-green" size={20} />
                </div>
                <div>
                  <p className="text-soft-white/60 text-sm">Total vekt løftet</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-neon-green to-electric bg-clip-text text-transparent">
                    {formatVolume(profile.total_volume)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-white/5 flex items-center gap-3">
              <Calendar className="text-electric" size={18} />
              <div>
                <p className="text-soft-white/50 text-xs">Medlem siden</p>
                <p className="font-medium text-sm">
                  {format(parseISO(profile.created_at), 'MMM yyyy', { locale: nb })}
                </p>
              </div>
            </div>
            
            <div className="p-3 rounded-xl bg-white/5 flex items-center gap-3">
              <Target className="text-coral" size={18} />
              <div>
                <p className="text-soft-white/50 text-xs">Ukentlig mål</p>
                <p className="font-medium text-sm">{profile.workouts_per_week} økter</p>
              </div>
            </div>
          </div>

          {/* Activity */}
          {stats && (
            <div className="p-3 rounded-xl bg-white/5 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-soft-white/60 text-sm">Siste 30 dager</span>
                <span className="font-bold text-electric">{stats.recentWorkouts} økter</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-3">
              {isFriend ? (
                <>
                  <button
                    onClick={() => onChallenge?.(profile)}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-coral to-orange-500 text-white font-bold flex items-center justify-center gap-2"
                  >
                    <Swords size={18} />
                    Utfordre
                  </button>
                  <button
                    onClick={() => onRemoveFriend?.(userId)}
                    className="p-3 rounded-xl bg-white/10 text-soft-white/60"
                  >
                    <UserMinus size={18} />
                  </button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-soft-white font-medium"
                >
                  Lukk
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
