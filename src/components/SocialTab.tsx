'use client';

import { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Trophy, Swords, Check, X, Crown, Medal, Award, Flame, Dumbbell, Zap, ChevronRight, Clock, Target } from 'lucide-react';
import { supabase, DBProfile, DBFriendship, DBWorkoutShare, DBChallenge } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

type TabType = 'friends' | 'leaderboard' | 'challenges' | 'feed';

export default function SocialTab() {
  const { user, profile } = useAuth();
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

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('total_workouts', { ascending: false })
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
    return (
      <div className="text-center py-12">
        <Users size={48} className="mx-auto text-soft-white/30 mb-4" />
        <h3 className="text-xl font-bold mb-2">Logg inn for sosiale funksjoner</h3>
        <p className="text-soft-white/60">Du må være innlogget for å se venner og konkurranser</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold">Sosialt</h1>
        <p className="text-soft-white/60">Tren med venner</p>
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
                <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-electric/20 flex items-center justify-center">
                      <span className="text-electric font-bold">{friend.display_name[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium">{friend.display_name}</p>
                      <p className="text-soft-white/50 text-sm">
                        Nivå {friend.level} • {friend.total_workouts} økter
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFriend(friend);
                      setShowNewChallenge(true);
                    }}
                    className="p-2 rounded-lg bg-coral/20 text-coral"
                  >
                    <Swords size={20} />
                  </button>
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
            {leaderboard.slice(0, 3).map((user, index) => (
              <div
                key={user.id}
                className={`p-4 rounded-2xl text-center ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' :
                  index === 1 ? 'bg-gradient-to-br from-gray-400/20 to-gray-500/20 border border-gray-400/30' :
                  'bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-600/30'
                }`}
              >
                {index === 0 ? <Crown className="mx-auto text-yellow-400 mb-2" size={24} /> :
                 index === 1 ? <Medal className="mx-auto text-gray-400 mb-2" size={24} /> :
                 <Award className="mx-auto text-orange-600 mb-2" size={24} />}
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold">{user.display_name[0].toUpperCase()}</span>
                </div>
                <p className="font-bold text-sm truncate">{user.display_name}</p>
                <p className="text-2xl font-bold mt-1">{user.total_workouts}</p>
                <p className="text-xs text-soft-white/50">økter</p>
              </div>
            ))}
          </div>

          {/* Rest of leaderboard */}
          <div className="p-4 rounded-2xl bg-white/5 space-y-2">
            {leaderboard.slice(3).map((user, index) => (
              <div
                key={user.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  user.id === profile?.id ? 'bg-electric/10 border border-electric/30' : 'bg-white/5'
                }`}
              >
                <span className="w-8 text-center font-bold text-soft-white/40">{index + 4}</span>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="font-bold">{user.display_name[0].toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{user.display_name}</p>
                  <p className="text-soft-white/50 text-sm">Nivå {user.level}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-electric">{user.total_workouts}</p>
                  <p className="text-xs text-soft-white/50">økter</p>
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

      {/* Activity Feed Tab */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {feed.length === 0 ? (
            <div className="text-center py-12">
              <Flame size={48} className="mx-auto text-soft-white/20 mb-4" />
              <p className="text-soft-white/50">Ingen aktivitet enda</p>
              <p className="text-soft-white/30 text-sm">Legg til venner for å se deres treninger</p>
            </div>
          ) : (
            feed.map(workout => (
              <div key={workout.id} className="p-4 rounded-2xl bg-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-electric/20 flex items-center justify-center">
                    <span className="text-electric font-bold">
                      {workout.profile.display_name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{workout.profile.display_name}</p>
                    <p className="text-soft-white/50 text-sm">
                      {formatDistanceToNow(parseISO(workout.created_at), { locale: nb, addSuffix: true })}
                    </p>
                  </div>
                  {workout.workout_type === 'cardio' ? (
                    <Zap className="text-neon-green" size={20} />
                  ) : (
                    <Dumbbell className="text-electric" size={20} />
                  )}
                </div>

                <div className="p-3 rounded-xl bg-white/5 mb-3">
                  <p className="font-bold">{workout.workout_name}</p>
                  <div className="flex gap-4 mt-2 text-sm text-soft-white/60">
                    <span>{workout.duration_minutes} min</span>
                    {workout.workout_type === 'weights' && (
                      <span>{workout.volume.toLocaleString()} kg</span>
                    )}
                    {workout.workout_type === 'cardio' && workout.distance_km && (
                      <span>{workout.distance_km.toFixed(2)} km</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => likeWorkout(workout.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    workout.liked ? 'bg-coral/20 text-coral' : 'bg-white/5 text-soft-white/60'
                  }`}
                >
                  <Flame size={16} fill={workout.liked ? 'currentColor' : 'none'} />
                  <span>{workout.likes}</span>
                </button>
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
