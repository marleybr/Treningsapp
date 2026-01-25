'use client';

import { useState, useEffect } from 'react';
import { Dumbbell, Flame, Trophy, Zap, Target, ChevronRight, Sparkles } from 'lucide-react';
import { Workout, BodyStats, UserProfile, GameStats, workoutsToNextLevel, getLevelTitle, WORKOUTS_PER_LEVEL, ACHIEVEMENTS } from '@/types';
import { format, isToday, parseISO, differenceInDays } from 'date-fns';
import { nb } from 'date-fns/locale';

const QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "You don't have to be extreme, just consistent.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "One workout away from a good mood.",
  "Progress, not perfection.",
  "Every day is a chance to get stronger.",
  "Be stronger than your excuses.",
  "Strong body, strong mind.",
  "Fall seven times, stand up eight.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "The hard days are what make you stronger.",
  "Success starts with self-discipline.",
  "Push yourself because no one else is going to do it for you.",
  "Dream big. Work hard. Stay focused.",
  "Sweat is just fat crying.",
  "No pain, no gain.",
  "Champions train, losers complain.",
  "Make yourself proud.",
  "The best project you'll ever work on is you.",
  "Discipline is doing what needs to be done, even when you don't want to.",
];

interface HomeTabProps {
  workouts: Workout[];
  bodyStats: BodyStats[];
  setActiveTab: (tab: string) => void;
  profile?: UserProfile | null;
  gameStats?: GameStats;
  currentWorkout?: Workout | null;
  elapsedTime?: number;
}

const formatWeight = (weight: number): string => {
  if (weight >= 1000) return `${(weight / 1000).toFixed(1)}t`;
  return `${weight.toLocaleString()}kg`;
};

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function HomeTab({ workouts, setActiveTab, gameStats, profile, currentWorkout, elapsedTime = 0 }: HomeTabProps) {
  const [quote, setQuote] = useState(QUOTES[0]);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    setMounted(true);
  }, []);

  const todaysWorkout = workouts.find(w => isToday(parseISO(w.date)));
  const levelProgress = gameStats ? workoutsToNextLevel(gameStats.totalWorkouts) : null;
  const level = gameStats?.level || 1;
  const levelTitle = getLevelTitle(level);

  // Beregn dager siden siste økt
  const lastWorkout = workouts.length > 0 ? workouts[workouts.length - 1] : null;
  const daysSinceLastWorkout = lastWorkout 
    ? differenceInDays(new Date(), parseISO(lastWorkout.date))
    : null;

  // Finn neste achievement
  const nextAchievement = ACHIEVEMENTS.find(a => 
    !gameStats?.achievements.includes(a.id)
  );

  // Beregn progress til neste achievement
  const getAchievementProgress = () => {
    if (!nextAchievement || !gameStats) return 0;
    switch (nextAchievement.requirement.type) {
      case 'workouts':
        return Math.min(100, (gameStats.totalWorkouts / nextAchievement.requirement.value) * 100);
      case 'streak':
        return Math.min(100, (gameStats.currentStreak / nextAchievement.requirement.value) * 100);
      case 'volume':
        return Math.min(100, (gameStats.totalVolumeLifted / nextAchievement.requirement.value) * 100);
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Hero Section */}
      <div className="relative pt-4 pb-8">
        {/* Background Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-64 h-64 rounded-full bg-electric/20 blur-3xl transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`} />
        </div>

        {/* Level Circle */}
        <div className="relative text-center">
          <div className={`inline-block transition-all duration-700 ${mounted ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
            <div className="relative">
              {/* Outer ring */}
              <svg className="w-32 h-32 -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  fill="none"
                  stroke="url(#levelGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(levelProgress?.progress || 0) * 3.64} 364`}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00F5D4" />
                    <stop offset="100%" stopColor="#FFD93D" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Inner content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-display font-bold">{level}</span>
                <span className="text-xs text-soft-white/60 mt-1">NIVÅ</span>
              </div>

              {/* Streak badge */}
              {gameStats && gameStats.currentStreak > 0 && (
                <div className="absolute -right-2 -top-2 flex items-center gap-1 px-2 py-1 rounded-full bg-coral text-white text-xs font-bold">
                  <Flame size={12} />
                  {gameStats.currentStreak}
                </div>
              )}
            </div>
          </div>

          <h2 className={`mt-4 text-xl font-display font-semibold bg-gradient-to-r from-electric to-gold bg-clip-text text-transparent transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {levelTitle}
          </h2>
          
          <p className={`text-soft-white/50 text-sm mt-1 transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            {levelProgress?.current} / {WORKOUTS_PER_LEVEL} økter til neste nivå
          </p>
        </div>
      </div>

      {/* Quote */}
      <p className={`text-soft-white/40 text-sm italic text-center px-6 transition-all duration-700 delay-400 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        "{quote}"
      </p>

      {/* Active Workout Banner */}
      {currentWorkout && (
        <div className={`mx-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={() => setActiveTab('workout')}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-coral/20 to-electric/20 border border-coral/30 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-coral/20 relative">
                  <Dumbbell className="text-coral" size={24} />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-coral rounded-full animate-pulse" />
                </div>
                <div>
                  <p className="text-xs text-coral font-medium">Pågående økt</p>
                  <p className="font-semibold">{currentWorkout.name}</p>
                  <p className="text-soft-white/60 text-sm">
                    {currentWorkout.exercises.length} øvelser • {formatTime(elapsedTime)}
                  </p>
                </div>
              </div>
              <ChevronRight className="text-coral" size={24} />
            </div>
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className={`grid grid-cols-3 gap-3 px-4 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="text-center p-4 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10">
          <Dumbbell className="mx-auto text-electric mb-2" size={20} />
          <p className="text-2xl font-bold">{gameStats?.totalWorkouts || 0}</p>
          <p className="text-soft-white/50 text-xs">økter</p>
        </div>
        <div className="text-center p-4 rounded-2xl bg-gradient-to-b from-coral/20 to-coral/5 border border-coral/20">
          <Flame className="mx-auto text-coral mb-2" size={20} />
          <p className="text-2xl font-bold text-coral">{gameStats?.currentStreak || 0}</p>
          <p className="text-soft-white/50 text-xs">streak</p>
        </div>
        <div className="text-center p-4 rounded-2xl bg-gradient-to-b from-gold/20 to-gold/5 border border-gold/20">
          <Trophy className="mx-auto text-gold mb-2" size={20} />
          <p className="text-2xl font-bold text-gold">{gameStats?.achievements.length || 0}</p>
          <p className="text-soft-white/50 text-xs">trofeer</p>
        </div>
      </div>

      {/* Total Volume */}
      {gameStats && gameStats.totalVolumeLifted > 0 && (
        <div className={`mx-4 p-4 rounded-2xl bg-white/5 border border-white/10 transition-all duration-700 delay-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-electric/20 flex items-center justify-center">
                <Zap className="text-electric" size={20} />
              </div>
              <div>
                <p className="text-soft-white/60 text-xs">Totalt løftet</p>
                <p className="text-xl font-bold">{formatWeight(gameStats.totalVolumeLifted)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-soft-white/60 text-xs">Total XP</p>
              <p className="text-lg font-semibold text-electric">{gameStats.xp.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Next Achievement */}
      {nextAchievement && (
        <div className={`mx-4 transition-all duration-700 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button 
            onClick={() => setActiveTab('profile')}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-gold/10 to-coral/10 border border-gold/20 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{nextAchievement.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-gold" />
                  <p className="text-xs text-gold">Neste achievement</p>
                </div>
                <p className="font-semibold">{nextAchievement.name}</p>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-gold to-coral rounded-full"
                    style={{ width: `${getAchievementProgress()}%` }}
                  />
                </div>
              </div>
              <ChevronRight size={20} className="text-soft-white/40" />
            </div>
          </button>
        </div>
      )}

      {/* CTA Button */}
      <div className={`text-center px-4 pt-2 transition-all duration-700 delay-800 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button 
          onClick={() => setActiveTab('workout')}
          className="w-full py-4 rounded-2xl font-semibold text-lg transition-all active:scale-[0.98]"
          style={{
            background: todaysWorkout 
              ? 'linear-gradient(135deg, rgba(57, 255, 20, 0.2), rgba(0, 245, 212, 0.2))'
              : 'linear-gradient(135deg, #00F5D4, #00D4AA)',
            color: todaysWorkout ? '#39FF14' : '#0A0A0F',
            border: todaysWorkout ? '1px solid rgba(57, 255, 20, 0.3)' : 'none'
          }}
        >
          {todaysWorkout ? (
            <span className="flex items-center justify-center gap-2">
              <Target size={20} />
              Dagens økt fullført ✓
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Dumbbell size={20} />
              Start dagens økt
            </span>
          )}
        </button>
        
        {daysSinceLastWorkout !== null && daysSinceLastWorkout > 0 && !todaysWorkout && (
          <p className="text-soft-white/40 text-xs mt-2">
            {daysSinceLastWorkout === 1 ? 'Siste økt var i går' : `${daysSinceLastWorkout} dager siden siste økt`}
          </p>
        )}
      </div>

      {/* Recent Workouts */}
      {workouts.length > 0 && (
        <div className={`px-4 transition-all duration-700 delay-900 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-soft-white/60 text-sm font-medium">Siste økter</p>
            <button 
              onClick={() => setActiveTab('profile')}
              className="text-electric text-xs"
            >
              Se alle →
            </button>
          </div>
          <div className="space-y-2">
            {workouts.slice(-3).reverse().map((workout, index) => (
              <div 
                key={workout.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg">
                    💪
                  </div>
                  <div>
                    <p className="font-medium">{workout.name}</p>
                    <p className="text-soft-white/40 text-xs">
                      {format(parseISO(workout.date), 'EEEE d. MMM', { locale: nb })}
                    </p>
                  </div>
                </div>
                {workout.xpEarned && (
                  <div className="text-right">
                    <span className="text-electric text-sm font-semibold">+{workout.xpEarned}</span>
                    <p className="text-soft-white/40 text-xs">XP</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {workouts.length === 0 && (
        <div className={`text-center px-4 pt-4 transition-all duration-700 delay-900 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-5xl mb-4">🏋️</div>
            <h3 className="font-display font-semibold text-lg mb-2">Velkommen{profile ? `, ${profile.name.split(' ')[0]}` : ''}!</h3>
            <p className="text-soft-white/50 text-sm">
              Start din første økt og begynn å bygge streak
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
