'use client';

import { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Trophy, Swords, Check, X, Crown, Medal, Award, Flame, Dumbbell, Zap, ChevronRight, Clock, Target, LogIn, UserCircle, Share2, Star, Sparkles, LogOut, Camera, Image, Plus, Send, MessageCircle, Heart, Settings, Edit3, ImagePlus } from 'lucide-react';
import { supabase, DBProfile, DBFriendship, DBWorkoutShare, DBChallenge, DBWorkoutComment } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import UserProfileModal from './UserProfileModal';
import AuthScreen from './AuthScreen';

type TabType = 'friends' | 'leaderboard' | 'challenges' | 'feed';

export default function SocialTab() {
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DBProfile[]>([]);
  const [friends, setFriends] = useState<DBProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(DBFriendship & { profile: DBProfile })[]>([]);
  const [leaderboard, setLeaderboard] = useState<DBProfile[]>([]);
  const [challenges, setChallenges] = useState<(DBChallenge & { challenger: DBProfile; challenged: DBProfile })[]>([]);
  const [feed, setFeed] = useState<(DBWorkoutShare & { profile: DBProfile; likes: number; liked: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<DBProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [showShareWorkout, setShowShareWorkout] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, (DBWorkoutComment & { profile: DBProfile })[]>>({});

  // Fetch friends
  const fetchFriends = async () => {
    if (!user) return;

    const { data: friendships } = await supabase
      .from('friendships')
      .select('*, friend:profiles!friendships_friend_id_fkey(*)')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const { data: reverseFriendships } = await supabase
      .from('friendships')
      .select('*, friend:profiles!friendships_user_id_fkey(*)')
      .eq('friend_id', user.id)
      .eq('status', 'accepted');

    const allFriends = [
      ...(friendships?.map(f => f.friend) || []),
      ...(reverseFriendships?.map(f => f.friend) || []),
    ].filter(Boolean) as DBProfile[];

    setFriends(allFriends);
  };

  // Fetch pending friend requests
  const fetchPendingRequests = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('friendships')
      .select('*, profile:profiles!friendships_user_id_fkey(*)')
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    setPendingRequests((data || []) as any);
  };

  // Fetch leaderboard - sorted by XP
  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('xp', { ascending: false })
      .limit(20);

    setLeaderboard(data || []);
  };

  // Fetch challenges
  const fetchChallenges = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('challenges')
      .select(`
        *,
        challenger:profiles!challenges_challenger_id_fkey(*),
        challenged:profiles!challenges_challenged_id_fkey(*)
      `)
      .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    setChallenges((data || []) as any);
  };

  // Fetch activity feed
  const fetchFeed = async () => {
    if (!user) return;

    // Get friend IDs
    const friendIds = friends.map(f => f.id);
    friendIds.push(user.id);

    const { data: workouts } = await supabase
      .from('workout_shares')
      .select(`
        *,
        profile:profiles(*),
        likes:workout_likes(count)
      `)
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(20);

    // Check which workouts the user has liked
    const { data: userLikes } = await supabase
      .from('workout_likes')
      .select('workout_id')
      .eq('user_id', user.id);

    const likedWorkoutIds = new Set(userLikes?.map(l => l.workout_id) || []);

    const feedWithLikes = (workouts || []).map(w => ({
      ...w,
      likes: (w.likes as any)?.[0]?.count || 0,
      liked: likedWorkoutIds.has(w.id),
    }));

    setFeed(feedWithLikes as any);
  };

  // Search users
  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(10);

    setSearchResults(data || []);
  };

  // Send friend request
  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;

    await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending',
      });

    setSearchResults(prev => prev.filter(p => p.id !== friendId));
  };

  // Accept friend request
  const acceptFriendRequest = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    fetchFriends();
    fetchPendingRequests();
  };

  // Reject friend request
  const rejectFriendRequest = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    fetchPendingRequests();
  };

  // Like workout
  const likeWorkout = async (workoutId: string) => {
    if (!user) return;

    const workout = feed.find(w => w.id === workoutId);
    if (!workout) return;

    if (workout.liked) {
      await supabase
        .from('workout_likes')
        .delete()
        .eq('workout_id', workoutId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('workout_likes')
        .insert({ workout_id: workoutId, user_id: user.id });
    }

    setFeed(prev => prev.map(w => 
      w.id === workoutId 
        ? { ...w, liked: !w.liked, likes: w.liked ? w.likes - 1 : w.likes + 1 }
        : w
    ));
  };

  // Create challenge
  const createChallenge = async (challengedId: string, type: string, targetValue: number, days: number) => {
    if (!user) return;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    await supabase
      .from('challenges')
      .insert({
        challenger_id: user.id,
        challenged_id: challengedId,
        challenge_type: type,
        target_value: targetValue,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'pending',
      });

    setShowNewChallenge(false);
    fetchChallenges();
  };

  // Accept challenge
  const acceptChallenge = async (challengeId: string) => {
    await supabase
      .from('challenges')
      .update({ status: 'active' })
      .eq('id', challengeId);

    fetchChallenges();
  };

  // Remove friend
  const removeFriend = async (friendId: string) => {
    if (!user) return;

    // Delete both directions of friendship
    await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

    setFriends(prev => prev.filter(f => f.id !== friendId));
    setViewingProfile(null);
  };

  // Share workout
  const shareWorkout = async (workoutData: { name: string; duration: number; volume: number; type: 'weights' | 'cardio'; distance?: number; imageUrl?: string; caption?: string }) => {
    if (!user) return;

    await supabase
      .from('workout_shares')
      .insert({
        user_id: user.id,
        workout_name: workoutData.name,
        duration_minutes: workoutData.duration,
        volume: workoutData.volume,
        workout_type: workoutData.type,
        distance_km: workoutData.distance,
        image_url: workoutData.imageUrl,
        caption: workoutData.caption,
      });

    setShowShareWorkout(false);
    fetchFeed();
  };

  // Fetch comments for a workout
  const fetchComments = async (workoutId: string) => {
    const { data } = await supabase
      .from('workout_comments')
      .select('*, profile:profiles(*)')
      .eq('workout_id', workoutId)
      .order('created_at', { ascending: true });

    if (data) {
      setComments(prev => ({ ...prev, [workoutId]: data as any }));
    }
  };

  // Add comment
  const addComment = async (workoutId: string, content: string) => {
    if (!user || !content.trim()) return;

    await supabase
      .from('workout_comments')
      .insert({
        workout_id: workoutId,
        user_id: user.id,
        content: content.trim(),
      });

    fetchComments(workoutId);
  };

  // Delete comment
  const deleteComment = async (commentId: string, workoutId: string) => {
    await supabase
      .from('workout_comments')
      .delete()
      .eq('id', commentId);

    fetchComments(workoutId);
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchFriends(),
        fetchPendingRequests(),
        fetchLeaderboard(),
        fetchChallenges(),
      ]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (friends.length > 0) {
      fetchFeed();
    }
  }, [friends]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!user || !profile) {
    if (showAuthScreen) {
      return <AuthScreen onBack={() => setShowAuthScreen(false)} />;
    }

    return (
      <div className="space-y-6 pb-32 animate-fadeInUp">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold">Sosialt</h1>
          <p className="text-soft-white/60">Tren med venner</p>
        </div>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-electric/20 via-coral/10 to-neon-green/20 border border-white/10 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-electric/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-coral/20 rounded-full blur-2xl"></div>
          
          <div className="relative text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-electric to-coral flex items-center justify-center mx-auto mb-4">
              <UserCircle size={40} className="text-white" />
            </div>
            
            <h2 className="text-xl font-display font-bold mb-2">
              Opprett en profil
            </h2>
            <p className="text-soft-white/70 mb-6">
              Koble deg til andre treningsentusiaster og ta treningen til neste nivå
            </p>

            <button
              onClick={() => setShowAuthScreen(true)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-electric to-coral text-white font-bold flex items-center justify-center gap-2 mb-3"
            >
              <LogIn size={20} />
              Kom i gang
            </button>
            
            <p className="text-soft-white/50 text-sm">
              Allerede bruker?{' '}
              <button 
                onClick={() => setShowAuthScreen(true)}
                className="text-electric hover:underline"
              >
                Logg inn
              </button>
            </p>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold px-1">Hvorfor lage profil?</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-electric/20 flex items-center justify-center mb-3">
                <Users className="text-electric" size={20} />
              </div>
              <h4 className="font-semibold mb-1">Finn venner</h4>
              <p className="text-soft-white/60 text-sm">
                Søk etter og koble deg til andre treningsvenner
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-coral/20 flex items-center justify-center mb-3">
                <Swords className="text-coral" size={20} />
              </div>
              <h4 className="font-semibold mb-1">Konkurrer</h4>
              <p className="text-soft-white/60 text-sm">
                Utfordre venner i treningskonkurranser
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center mb-3">
                <Trophy className="text-gold" size={20} />
              </div>
              <h4 className="font-semibold mb-1">Topplister</h4>
              <p className="text-soft-white/60 text-sm">
                Se hvordan du rangerer mot andre
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-neon-green/20 flex items-center justify-center mb-3">
                <Share2 className="text-neon-green" size={20} />
              </div>
              <h4 className="font-semibold mb-1">Del fremgang</h4>
              <p className="text-soft-white/60 text-sm">
                Del treningsøkter og inspirer andre
              </p>
            </div>
          </div>
        </div>

        {/* Preview Leaderboard */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Trophy className="text-gold" size={18} />
              Toppliste
            </h3>
            <span className="text-soft-white/50 text-sm">Topp 5</span>
          </div>

          {leaderboard.slice(0, 5).map((leaderUser, index) => (
            <div key={leaderUser.id} className="flex items-center gap-3 p-2 rounded-lg">
              <span className={`w-6 text-center font-bold ${
                index === 0 ? 'text-yellow-400' : 
                index === 1 ? 'text-gray-400' : 
                index === 2 ? 'text-orange-600' : 'text-soft-white/40'
              }`}>
                {index + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-sm font-bold">{leaderUser.display_name[0].toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{leaderUser.display_name}</p>
              </div>
              <span className="text-electric font-bold text-sm">{leaderUser.total_workouts}</span>
            </div>
          ))}

          <button
            onClick={() => setShowAuthScreen(true)}
            className="w-full mt-4 py-3 rounded-xl bg-white/5 border border-white/10 text-soft-white/70 text-sm flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            Logg inn for å se din plassering
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header with Profile */}
      <div className="flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setShowEditProfile(true)}
        >
          <div className="relative">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.display_name}
                className="w-12 h-12 rounded-full object-cover border-2 border-electric"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-electric to-coral flex items-center justify-center">
                <span className="text-white font-bold text-lg">{profile.display_name[0].toUpperCase()}</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gold flex items-center justify-center border-2 border-midnight">
              <span className="text-[10px] font-bold text-midnight">{profile.level}</span>
            </div>
          </div>
          <div>
            <p className="font-bold">{profile.display_name}</p>
            <p className="text-soft-white/60 text-sm flex items-center gap-1">
              <Zap size={12} className="text-gold" />
              {profile.xp.toLocaleString()} XP
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditProfile(true)}
            className="p-2 rounded-lg bg-white/10 text-soft-white/60 hover:bg-electric/20 hover:text-electric transition-all"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-white/10 text-soft-white/60 hover:bg-coral/20 hover:text-coral transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {[
          { id: 'friends', label: 'Venner', icon: Users },
          { id: 'leaderboard', label: 'Toppliste', icon: Trophy },
          { id: 'challenges', label: 'Utfordringer', icon: Swords },
          { id: 'feed', label: 'Aktivitet', icon: Flame },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-electric text-midnight font-semibold'
                : 'bg-white/5 text-soft-white/60'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-soft-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søk etter brukere..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/5 space-y-3">
              <h3 className="text-sm text-soft-white/60">Søkeresultater</h3>
              {searchResults.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-electric/20 flex items-center justify-center">
                      <span className="text-electric font-bold">{user.display_name[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium">{user.display_name}</p>
                      <p className="text-soft-white/50 text-sm">@{user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(user.id)}
                    className="p-2 rounded-lg bg-electric/20 text-electric"
                  >
                    <UserPlus size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 space-y-3">
              <h3 className="font-bold flex items-center gap-2">
                <Clock size={18} className="text-yellow-400" />
                Venneforespørsler ({pendingRequests.length})
              </h3>
              {pendingRequests.map(request => (
                <div key={request.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <span className="text-yellow-400 font-bold">
                        {request.profile.display_name[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{request.profile.display_name}</p>
                      <p className="text-soft-white/50 text-sm">Nivå {request.profile.level}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptFriendRequest(request.id)}
                      className="p-2 rounded-lg bg-neon-green/20 text-neon-green"
                    >
                      <Check size={20} />
                    </button>
                    <button
                      onClick={() => rejectFriendRequest(request.id)}
                      className="p-2 rounded-lg bg-coral/20 text-coral"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Friends List */}
          <div className="p-4 rounded-2xl bg-white/5 space-y-3">
            <h3 className="font-bold flex items-center gap-2">
              <Users size={18} className="text-electric" />
              Dine venner ({friends.length})
            </h3>
            
            {friends.length === 0 ? (
              <div className="text-center py-8">
                <Users size={40} className="mx-auto text-soft-white/20 mb-2" />
                <p className="text-soft-white/50">Ingen venner enda</p>
                <p className="text-soft-white/30 text-sm">Søk etter brukere for å legge til</p>
              </div>
            ) : (
              friends.map(friend => (
                <div 
                  key={friend.id} 
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => setViewingProfile(friend.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric to-coral flex items-center justify-center">
                        <span className="text-white font-bold">{friend.display_name[0].toUpperCase()}</span>
                      </div>
                      {/* Level badge */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gold flex items-center justify-center border border-midnight">
                        <span className="text-[10px] font-bold text-midnight">{friend.level}</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">{friend.display_name}</p>
                      <div className="flex items-center gap-2 text-soft-white/50 text-sm">
                        <span className="flex items-center gap-1">
                          <Dumbbell size={12} />
                          {friend.total_workouts}
                        </span>
                        {friend.current_streak > 0 && (
                          <span className="flex items-center gap-1 text-coral">
                            <Flame size={12} />
                            {friend.current_streak}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFriend(friend);
                        setShowNewChallenge(true);
                      }}
                      className="p-2 rounded-lg bg-coral/20 text-coral hover:bg-coral/30 transition-all"
                    >
                      <Swords size={18} />
                    </button>
                    <ChevronRight size={16} className="text-soft-white/30" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          {/* Top 3 */}
          <div className="grid grid-cols-3 gap-3">
            {leaderboard.slice(0, 3).map((leaderUser, index) => (
              <div
                key={leaderUser.id}
                onClick={() => setViewingProfile(leaderUser.id)}
                className={`p-4 rounded-2xl text-center cursor-pointer transition-all hover:scale-105 ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' :
                  index === 1 ? 'bg-gradient-to-br from-gray-400/20 to-gray-500/20 border border-gray-400/30' :
                  'bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-600/30'
                }`}
              >
                {index === 0 ? <Crown className="mx-auto text-yellow-400 mb-2" size={24} /> :
                 index === 1 ? <Medal className="mx-auto text-gray-400 mb-2" size={24} /> :
                 <Award className="mx-auto text-orange-600 mb-2" size={24} />}
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold">{leaderUser.display_name[0].toUpperCase()}</span>
                </div>
                <p className="font-bold text-sm truncate">{leaderUser.display_name}</p>
                <p className="text-xl font-bold mt-1 text-gold">{leaderUser.xp.toLocaleString()}</p>
                <p className="text-xs text-soft-white/50">XP</p>
              </div>
            ))}
          </div>

          {/* Rest of leaderboard */}
          <div className="p-4 rounded-2xl bg-white/5 space-y-2">
            {leaderboard.slice(3).map((leaderUser, index) => (
              <div
                key={leaderUser.id}
                onClick={() => setViewingProfile(leaderUser.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/10 ${
                  leaderUser.id === profile?.id ? 'bg-electric/10 border border-electric/30' : 'bg-white/5'
                }`}
              >
                <span className="w-8 text-center font-bold text-soft-white/40">{index + 4}</span>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="font-bold">{leaderUser.display_name[0].toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{leaderUser.display_name}</p>
                  <p className="text-soft-white/50 text-sm">Nivå {leaderUser.level}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-bold text-gold">{leaderUser.xp.toLocaleString()}</p>
                    <p className="text-xs text-soft-white/50">XP</p>
                  </div>
                  <ChevronRight size={16} className="text-soft-white/30" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          {/* Active Challenges */}
          <div className="p-4 rounded-2xl bg-white/5 space-y-3">
            <h3 className="font-bold flex items-center gap-2">
              <Swords size={18} className="text-coral" />
              Aktive utfordringer
            </h3>

            {challenges.filter(c => c.status === 'active').length === 0 ? (
              <div className="text-center py-8">
                <Swords size={40} className="mx-auto text-soft-white/20 mb-2" />
                <p className="text-soft-white/50">Ingen aktive utfordringer</p>
              </div>
            ) : (
              challenges.filter(c => c.status === 'active').map(challenge => {
                const isChallenger = challenge.challenger_id === user?.id;
                const opponent = isChallenger ? challenge.challenged : challenge.challenger;
                const myProgress = isChallenger ? challenge.challenger_progress : challenge.challenged_progress;
                const theirProgress = isChallenger ? challenge.challenged_progress : challenge.challenger_progress;

                return (
                  <div key={challenge.id} className="p-4 rounded-xl bg-gradient-to-br from-coral/10 to-orange-500/10 border border-coral/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Target size={16} className="text-coral" />
                        <span className="font-medium">
                          {challenge.challenge_type === 'workouts' ? 'Flest økter' :
                           challenge.challenge_type === 'volume' ? 'Mest volum' : 'Lengst streak'}
                        </span>
                      </div>
                      <span className="text-sm text-soft-white/50">
                        {formatDistanceToNow(parseISO(challenge.end_date), { locale: nb, addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-soft-white/60 text-sm">Du</p>
                        <p className="text-2xl font-bold text-neon-green">{myProgress}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-soft-white/60 text-sm">{opponent?.display_name}</p>
                        <p className="text-2xl font-bold text-coral">{theirProgress}</p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden flex">
                      <div
                        className="bg-neon-green transition-all"
                        style={{ width: `${(myProgress / (myProgress + theirProgress || 1)) * 100}%` }}
                      />
                      <div
                        className="bg-coral transition-all"
                        style={{ width: `${(theirProgress / (myProgress + theirProgress || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pending Challenges */}
          {challenges.filter(c => c.status === 'pending' && c.challenged_id === user?.id).length > 0 && (
            <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 space-y-3">
              <h3 className="font-bold">Ventende utfordringer</h3>
              {challenges.filter(c => c.status === 'pending' && c.challenged_id === user?.id).map(challenge => (
                <div key={challenge.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div>
                    <p className="font-medium">{challenge.challenger.display_name}</p>
                    <p className="text-soft-white/50 text-sm">
                      {challenge.challenge_type === 'workouts' ? 'Flest økter' :
                       challenge.challenge_type === 'volume' ? 'Mest volum' : 'Lengst streak'}
                    </p>
                  </div>
                  <button
                    onClick={() => acceptChallenge(challenge.id)}
                    className="px-4 py-2 rounded-lg bg-neon-green text-midnight font-semibold"
                  >
                    Aksepter
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create Challenge Button */}
          <button
            onClick={() => setShowNewChallenge(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-coral to-orange-500 text-white font-bold flex items-center justify-center gap-2"
          >
            <Swords size={20} />
            Start ny utfordring
          </button>
        </div>
      )}

      {/* Activity Feed Tab - Instagram Style */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Share Workout Button */}
          <button
            onClick={() => setShowShareWorkout(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-electric to-neon-green text-midnight font-bold flex items-center justify-center gap-2"
          >
            <Camera size={20} />
            Del treningsøkt
          </button>

          {feed.length === 0 ? (
            <div className="text-center py-12">
              <Camera size={48} className="mx-auto text-soft-white/20 mb-4" />
              <p className="text-soft-white/50">Ingen innlegg enda</p>
              <p className="text-soft-white/30 text-sm">Del din første treningsøkt!</p>
            </div>
          ) : (
            feed.map(workout => (
              <div key={workout.id} className="rounded-2xl bg-white/5 overflow-hidden">
                {/* Post Header */}
                <div className="flex items-center gap-3 p-4">
                  <div 
                    className="cursor-pointer"
                    onClick={() => setViewingProfile(workout.user_id)}
                  >
                    {workout.profile.avatar_url ? (
                      <img 
                        src={workout.profile.avatar_url} 
                        alt={workout.profile.display_name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-electric/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric to-coral flex items-center justify-center">
                        <span className="text-white font-bold">
                          {workout.profile.display_name[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{workout.profile.display_name}</p>
                    <p className="text-soft-white/50 text-xs">
                      {formatDistanceToNow(parseISO(workout.created_at), { locale: nb, addSuffix: true })}
                    </p>
                  </div>
                  {workout.workout_type === 'cardio' ? (
                    <div className="px-2 py-1 rounded-full bg-neon-green/20 text-neon-green text-xs font-medium">
                      Cardio
                    </div>
                  ) : (
                    <div className="px-2 py-1 rounded-full bg-electric/20 text-electric text-xs font-medium">
                      Styrke
                    </div>
                  )}
                </div>

                {/* Post Image */}
                {workout.image_url && (
                  <div className="relative aspect-square bg-black/20">
                    <img 
                      src={workout.image_url} 
                      alt={workout.workout_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Workout Stats Card */}
                <div className="mx-4 -mt-4 relative z-10">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-midnight to-deep-purple border border-white/10 shadow-lg">
                    <p className="font-bold text-lg">{workout.workout_name}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-soft-white/70">
                        <Clock size={14} />
                        {workout.duration_minutes} min
                      </span>
                      {workout.workout_type === 'weights' && workout.volume > 0 && (
                        <span className="flex items-center gap-1 text-electric">
                          <Dumbbell size={14} />
                          {workout.volume.toLocaleString()} kg
                        </span>
                      )}
                      {workout.workout_type === 'cardio' && workout.distance_km && (
                        <span className="flex items-center gap-1 text-neon-green">
                          <Zap size={14} />
                          {workout.distance_km.toFixed(2)} km
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Caption */}
                {workout.caption && (
                  <p className="px-4 pt-3 text-soft-white/90">
                    <span className="font-semibold mr-2">{workout.profile.display_name}</span>
                    {workout.caption}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-4 p-4">
                  <button
                    onClick={() => likeWorkout(workout.id)}
                    className="flex items-center gap-2 transition-all"
                  >
                    <Heart 
                      size={24} 
                      className={workout.liked ? 'text-coral fill-coral' : 'text-soft-white/70'}
                    />
                    <span className={workout.liked ? 'text-coral font-semibold' : 'text-soft-white/70'}>
                      {workout.likes}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (expandedComments === workout.id) {
                        setExpandedComments(null);
                      } else {
                        setExpandedComments(workout.id);
                        fetchComments(workout.id);
                      }
                    }}
                    className="flex items-center gap-2 text-soft-white/70"
                  >
                    <MessageCircle size={24} />
                    <span>Kommentar</span>
                  </button>
                </div>

                {/* Comments Section */}
                {expandedComments === workout.id && (
                  <div className="px-4 pb-4 border-t border-white/10">
                    {/* Comment List */}
                    <div className="py-3 space-y-3 max-h-60 overflow-y-auto">
                      {(!comments[workout.id] || comments[workout.id].length === 0) ? (
                        <p className="text-soft-white/50 text-sm text-center py-4">
                          Ingen kommentarer enda. Vær den første!
                        </p>
                      ) : (
                        comments[workout.id].map(comment => (
                          <div key={comment.id} className="flex gap-2">
                            {comment.profile.avatar_url ? (
                              <img 
                                src={comment.profile.avatar_url}
                                alt={comment.profile.display_name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-electric/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-electric text-xs font-bold">
                                  {comment.profile.display_name[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-semibold mr-2">{comment.profile.display_name}</span>
                                {comment.content}
                              </p>
                              <p className="text-xs text-soft-white/40 mt-1">
                                {formatDistanceToNow(parseISO(comment.created_at), { locale: nb, addSuffix: true })}
                              </p>
                            </div>
                            {comment.user_id === user?.id && (
                              <button
                                onClick={() => deleteComment(comment.id, workout.id)}
                                className="text-soft-white/30 hover:text-coral"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Input */}
                    <CommentInput 
                      onSubmit={(content) => addComment(workout.id, content)}
                      userAvatar={profile.avatar_url}
                      userName={profile.display_name}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* New Challenge Modal */}
      {showNewChallenge && (
        <ChallengeModal
          friends={friends}
          selectedFriend={selectedFriend}
          onClose={() => {
            setShowNewChallenge(false);
            setSelectedFriend(null);
          }}
          onCreate={createChallenge}
        />
      )}

      {/* User Profile Modal */}
      {viewingProfile && (
        <UserProfileModal
          userId={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onChallenge={(profileUser) => {
            setViewingProfile(null);
            setSelectedFriend(profileUser);
            setShowNewChallenge(true);
          }}
          onRemoveFriend={removeFriend}
          isFriend={friends.some(f => f.id === viewingProfile)}
        />
      )}

      {/* Share Workout Modal */}
      {showShareWorkout && (
        <ShareWorkoutModal
          onClose={() => setShowShareWorkout(false)}
          onShare={shareWorkout}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditProfile(false)}
        />
      )}
    </div>
  );
}

// Challenge Modal Component
function ChallengeModal({
  friends,
  selectedFriend,
  onClose,
  onCreate,
}: {
  friends: DBProfile[];
  selectedFriend: DBProfile | null;
  onClose: () => void;
  onCreate: (friendId: string, type: string, target: number, days: number) => void;
}) {
  const [friend, setFriend] = useState<DBProfile | null>(selectedFriend);
  const [type, setType] = useState<'workouts' | 'volume' | 'streak'>('workouts');
  const [days, setDays] = useState(7);

  const targetValues = {
    workouts: days === 7 ? 5 : days === 14 ? 10 : 20,
    volume: days === 7 ? 5000 : days === 14 ? 10000 : 20000,
    streak: days,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-midnight rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Ny utfordring</h3>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Select Friend */}
          <div>
            <label className="block text-sm text-soft-white/60 mb-2">Utfordre</label>
            <select
              value={friend?.id || ''}
              onChange={(e) => setFriend(friends.find(f => f.id === e.target.value) || null)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10"
            >
              <option value="">Velg en venn</option>
              {friends.map(f => (
                <option key={f.id} value={f.id}>{f.display_name}</option>
              ))}
            </select>
          </div>

          {/* Challenge Type */}
          <div>
            <label className="block text-sm text-soft-white/60 mb-2">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'workouts', label: 'Økter', icon: Dumbbell },
                { id: 'volume', label: 'Volum', icon: Zap },
                { id: 'streak', label: 'Streak', icon: Flame },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id as any)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                    type === t.id ? 'bg-electric text-midnight' : 'bg-white/5'
                  }`}
                >
                  <t.icon size={20} />
                  <span className="text-sm">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm text-soft-white/60 mb-2">Varighet</label>
            <div className="grid grid-cols-3 gap-2">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`py-3 rounded-xl font-medium transition-all ${
                    days === d ? 'bg-neon-green text-midnight' : 'bg-white/5'
                  }`}
                >
                  {d} dager
                </button>
              ))}
            </div>
          </div>

          {/* Target */}
          <div className="p-4 rounded-xl bg-white/5 text-center">
            <p className="text-soft-white/60 text-sm">Mål</p>
            <p className="text-3xl font-bold text-electric">
              {targetValues[type]}
              <span className="text-lg text-soft-white/60 ml-2">
                {type === 'workouts' ? 'økter' : type === 'volume' ? 'kg' : 'dager'}
              </span>
            </p>
          </div>

          <button
            onClick={() => friend && onCreate(friend.id, type, targetValues[type], days)}
            disabled={!friend}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-coral to-orange-500 text-white font-bold disabled:opacity-50"
          >
            Send utfordring
          </button>
        </div>
      </div>
    </div>
  );
}

// Comment Input Component
function CommentInput({ 
  onSubmit, 
  userAvatar, 
  userName 
}: { 
  onSubmit: (content: string) => void;
  userAvatar?: string;
  userName: string;
}) {
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (comment.trim()) {
      onSubmit(comment);
      setComment('');
    }
  };

  return (
    <div className="flex items-center gap-2 pt-3 border-t border-white/10">
      {userAvatar ? (
        <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-electric/20 flex items-center justify-center">
          <span className="text-electric text-xs font-bold">{userName[0].toUpperCase()}</span>
        </div>
      )}
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Skriv en kommentar..."
        className="flex-1 px-3 py-2 rounded-full bg-white/5 border border-white/10 focus:border-electric outline-none text-sm"
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      <button
        onClick={handleSubmit}
        disabled={!comment.trim()}
        className="p-2 rounded-full bg-electric text-midnight disabled:opacity-50"
      >
        <Send size={16} />
      </button>
    </div>
  );
}

// Share Workout Modal Component
function ShareWorkoutModal({
  onClose,
  onShare,
}: {
  onClose: () => void;
  onShare: (data: { name: string; duration: number; volume: number; type: 'weights' | 'cardio'; distance?: number; imageUrl?: string; caption?: string }) => void;
}) {
  const [workoutName, setWorkoutName] = useState('');
  const [duration, setDuration] = useState('');
  const [volume, setVolume] = useState('');
  const [distance, setDistance] = useState('');
  const [caption, setCaption] = useState('');
  const [workoutType, setWorkoutType] = useState<'weights' | 'cardio'>('weights');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShare = () => {
    if (!workoutName || !duration) return;
    
    onShare({
      name: workoutName,
      duration: parseInt(duration),
      volume: parseInt(volume) || 0,
      type: workoutType,
      distance: distance ? parseFloat(distance) : undefined,
      imageUrl: imagePreview || undefined,
      caption: caption || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-midnight rounded-2xl p-6 my-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Nytt innlegg</h3>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm text-soft-white/60 mb-2">Bilde</label>
            <div className="relative">
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full aspect-square object-cover" />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-white/20 cursor-pointer hover:border-electric/50 transition-all bg-white/5">
                  <ImagePlus size={48} className="text-soft-white/30 mb-3" />
                  <span className="text-soft-white/60 text-sm">Ta bilde eller velg fra galleri</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm text-soft-white/60 mb-2">Bildetekst</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Skriv noe om treningsøkten din..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none resize-none"
            />
          </div>

          {/* Workout Type */}
          <div>
            <label className="block text-sm text-soft-white/60 mb-2">Type trening</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setWorkoutType('weights')}
                className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  workoutType === 'weights' ? 'bg-electric text-midnight' : 'bg-white/5'
                }`}
              >
                <Dumbbell size={20} />
                <span>Styrke</span>
              </button>
              <button
                onClick={() => setWorkoutType('cardio')}
                className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  workoutType === 'cardio' ? 'bg-neon-green text-midnight' : 'bg-white/5'
                }`}
              >
                <Zap size={20} />
                <span>Cardio</span>
              </button>
            </div>
          </div>

          {/* Workout Name */}
          <div>
            <label className="block text-sm text-soft-white/60 mb-2">Navn på økten</label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="f.eks. Beindag, Morgenløp..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none"
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-soft-white/60 mb-2">Varighet (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none"
              />
            </div>
            {workoutType === 'weights' ? (
              <div>
                <label className="block text-sm text-soft-white/60 mb-2">Volum (kg)</label>
                <input
                  type="number"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="5000"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm text-soft-white/60 mb-2">Distanse (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="5.0"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none"
                />
              </div>
            )}
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            disabled={!workoutName || !duration}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-electric to-neon-green text-midnight font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send size={20} />
            Del innlegg
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Profile Modal Component
function EditProfileModal({
  profile,
  onClose,
}: {
  profile: DBProfile;
  onClose: () => void;
}) {
  const { updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null);
  const [saving, setSaving] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    await updateProfile({
      display_name: displayName,
      bio: bio || undefined,
      avatar_url: avatarPreview || undefined,
    });

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-midnight rounded-2xl p-6 my-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Rediger profil</h3>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-electric"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-electric to-coral flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">{displayName[0].toUpperCase()}</span>
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-2 rounded-full bg-electric cursor-pointer">
                <Camera size={16} className="text-midnight" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-soft-white/50 text-sm mt-2">Trykk for å endre profilbilde</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm text-soft-white/60 mb-2">Visningsnavn</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ditt navn"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none"
            />
          </div>

          {/* Username (read-only) */}
          <div>
            <label className="block text-sm text-soft-white/60 mb-2">Brukernavn</label>
            <input
              type="text"
              value={`@${profile.username}`}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-soft-white/50"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-soft-white/60 mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fortell litt om deg selv..."
              rows={3}
              maxLength={150}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none resize-none"
            />
            <p className="text-soft-white/40 text-xs mt-1 text-right">{bio.length}/150</p>
          </div>

          {/* Stats Display */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-white/5">
            <div className="text-center">
              <p className="text-xl font-bold text-electric">{profile.total_workouts}</p>
              <p className="text-soft-white/50 text-xs">Økter</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gold">{profile.xp.toLocaleString()}</p>
              <p className="text-soft-white/50 text-xs">XP</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-neon-green">{profile.level}</p>
              <p className="text-soft-white/50 text-xs">Nivå</p>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!displayName.trim() || saving}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-electric to-neon-green text-midnight font-bold disabled:opacity-50"
          >
            {saving ? 'Lagrer...' : 'Lagre endringer'}
          </button>
        </div>
      </div>
    </div>
  );
}
