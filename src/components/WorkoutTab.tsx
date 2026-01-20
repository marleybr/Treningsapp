'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Check, Clock, Trophy, Zap, Star, Sparkles, Minus } from 'lucide-react';
import { Workout, WorkoutExercise, GameStats, ACHIEVEMENTS, XP_PER_WORKOUT, XP_PER_KG, XP_STREAK_BONUS, calculateLevel } from '@/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { nb } from 'date-fns/locale';

interface WorkoutTabProps {
  workouts: Workout[];
  setWorkouts: (workouts: Workout[]) => void;
  gameStats: GameStats;
  setGameStats: (stats: GameStats) => void;
  currentWorkout: Workout | null;
  setCurrentWorkout: (workout: Workout | null) => void;
  workoutStartTime: Date | null;
  setWorkoutStartTime: (time: Date | null) => void;
  elapsedTime: number;
  setElapsedTime: (time: number) => void;
  isTimerRunning: boolean;
  setIsTimerRunning: (running: boolean) => void;
}

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatWeight = (weight: number): string => {
  if (weight >= 1000) return `${(weight / 1000).toFixed(1)}t`;
  return `${weight.toLocaleString()}kg`;
};

const calculateWorkoutVolume = (workout: Workout): number => {
  return workout.exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((setTotal, set) => {
      return setTotal + (set.weight * set.reps);
    }, 0);
  }, 0);
};

export default function WorkoutTab({ 
  workouts, setWorkouts, gameStats, setGameStats,
  currentWorkout, setCurrentWorkout, workoutStartTime, setWorkoutStartTime,
  elapsedTime, setElapsedTime, isTimerRunning, setIsTimerRunning,
}: WorkoutTabProps) {
  const [newExerciseName, setNewExerciseName] = useState('');
  const [showXPGain, setShowXPGain] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [workoutComment, setWorkoutComment] = useState('');
  const [pendingFinish, setPendingFinish] = useState<{ workout: Workout; stats: any } | null>(null);

  // Quick start - ett klikk
  const quickStart = () => {
    const today = new Date();
    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const name = `${dayNames[today.getDay()]} trening`;
    
    setCurrentWorkout({
      id: Date.now().toString(),
      date: today.toISOString(),
      name,
      exercises: [],
    });
    setWorkoutStartTime(today);
    setElapsedTime(0);
    setIsTimerRunning(true);
  };

  // Legg til øvelse - enkelt
  const addExercise = () => {
    if (!currentWorkout || !newExerciseName.trim()) return;
    
    // Finn siste vekt/reps for denne øvelsen
    const lastWorkout = workouts.slice().reverse().find(w => 
      w.exercises.some(e => e.exerciseName.toLowerCase() === newExerciseName.toLowerCase())
    );
    const lastExercise = lastWorkout?.exercises.find(e => 
      e.exerciseName.toLowerCase() === newExerciseName.toLowerCase()
    );
    const lastSet = lastExercise?.sets[0];

    setCurrentWorkout({
      ...currentWorkout,
      exercises: [...currentWorkout.exercises, {
        id: Date.now().toString(),
        exerciseId: newExerciseName.toLowerCase().replace(/\s+/g, '-'),
        exerciseName: newExerciseName,
        sets: [{ 
          id: '1', 
          reps: lastSet?.reps || 10, 
          weight: lastSet?.weight || 20, 
          completed: false 
        }],
      }],
    });
    setNewExerciseName('');
  };

  // Oppdater sett med +/- knapper
  const adjustSet = (exerciseId: string, setId: string, field: 'weight' | 'reps', delta: number) => {
    if (!currentWorkout) return;
    setCurrentWorkout({
      ...currentWorkout,
      exercises: currentWorkout.exercises.map(ex => 
        ex.id === exerciseId ? {
          ...ex,
          sets: ex.sets.map(s => 
            s.id === setId ? { 
              ...s, 
              [field]: Math.max(0, s[field] + delta),
              completed: true 
            } : s
          ),
        } : ex
      ),
    });
  };

  // Legg til sett (kopierer forrige)
  const addSet = (exerciseId: string) => {
    if (!currentWorkout) return;
    setCurrentWorkout({
      ...currentWorkout,
      exercises: currentWorkout.exercises.map(ex => {
        if (ex.id !== exerciseId) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { 
            id: (ex.sets.length + 1).toString(), 
            reps: last?.reps || 10, 
            weight: last?.weight || 20, 
            completed: false 
          }],
        };
      }),
    });
  };

  // Fjern øvelse
  const removeExercise = (exerciseId: string) => {
    if (!currentWorkout) return;
    setCurrentWorkout({
      ...currentWorkout,
      exercises: currentWorkout.exercises.filter(ex => ex.id !== exerciseId),
    });
  };

  // Fullfør økt
  const finishWorkout = () => {
    if (!currentWorkout) return;
    
    const duration = workoutStartTime 
      ? Math.round((Date.now() - workoutStartTime.getTime()) / 60000)
      : 0;
    
    const volume = calculateWorkoutVolume(currentWorkout);
    let xp = XP_PER_WORKOUT + Math.floor(volume * XP_PER_KG);
    
    const newWorkouts = [...workouts, currentWorkout];
    const streak = calculateStreak(newWorkouts);
    xp += streak * XP_STREAK_BONUS;
    
    const newTotal = gameStats.totalWorkouts + 1;
    const newVolume = gameStats.totalVolumeLifted + volume;
    
    // Achievements
    const unlocked: string[] = [];
    for (const a of ACHIEVEMENTS) {
      if (gameStats.achievements.includes(a.id)) continue;
      let ok = false;
      if (a.requirement.type === 'workouts') ok = newTotal >= a.requirement.value;
      if (a.requirement.type === 'streak') ok = streak >= a.requirement.value;
      if (a.requirement.type === 'volume') ok = newVolume >= a.requirement.value;
      if (ok) { unlocked.push(a.id); xp += a.xpReward; }
    }

    setPendingFinish({
      workout: { ...currentWorkout, duration, xpEarned: xp },
      stats: { xp, streak, newTotal, newVolume, unlocked }
    });
    setShowRating(true);
  };

  const confirmFinish = () => {
    if (!pendingFinish) return;
    const { workout, stats } = pendingFinish;
    
    setWorkouts([...workouts, { 
      ...workout, 
      rating: selectedRating || undefined,
      comment: workoutComment.trim() || undefined,
    }]);
    setGameStats({
      ...gameStats,
      xp: gameStats.xp + stats.xp,
      level: calculateLevel(stats.newTotal),
      currentStreak: stats.streak,
      longestStreak: Math.max(gameStats.longestStreak, stats.streak),
      lastWorkoutDate: new Date().toISOString(),
      totalWorkouts: stats.newTotal,
      totalVolumeLifted: stats.newVolume,
      achievements: [...gameStats.achievements, ...stats.unlocked],
      weeklyXP: gameStats.weeklyXP + stats.xp,
    });
    
    setXpGained(stats.xp);
    setShowXPGain(true);
    setTimeout(() => setShowXPGain(false), 2500);
    
    // Reset
    setCurrentWorkout(null);
    setWorkoutStartTime(null);
    setElapsedTime(0);
    setIsTimerRunning(false);
    setShowRating(false);
    setPendingFinish(null);
    setSelectedRating(0);
    setWorkoutComment('');
  };

  const calculateStreak = (list: Workout[]): number => {
    if (list.length === 0) return 0;
    const dates = [...new Set(list.map(w => w.date.split('T')[0]))].sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const d of dates) {
      const wd = new Date(d);
      wd.setHours(0, 0, 0, 0);
      const diff = differenceInDays(today, wd);
      if (diff === streak || (diff === 1 && streak === 0)) streak++;
      else if (diff > streak + 1) break;
    }
    return streak;
  };

  const cancelWorkout = () => {
    setCurrentWorkout(null);
    setWorkoutStartTime(null);
    setElapsedTime(0);
    setIsTimerRunning(false);
  };

  const volume = currentWorkout ? calculateWorkoutVolume(currentWorkout) : 0;

  // XP Overlay
  if (showXPGain) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="text-center animate-fadeInUp">
          <Zap className="w-20 h-20 text-electric mx-auto animate-bounce" />
          <p className="text-5xl font-bold text-electric mt-4">+{xpGained} XP</p>
          <p className="text-soft-white/60 mt-2">Bra jobbet! 💪</p>
        </div>
      </div>
    );
  }

  // Rating Modal
  if (showRating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
        <div className="w-full max-w-sm bg-deep-purple rounded-2xl p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold mb-2">Ferdig!</h3>
            <p className="text-soft-white/60 mb-4">Hvordan var økten?</p>
            
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <button key={s} onClick={() => setSelectedRating(s)} className="p-1">
                  <Star size={32} className={s <= selectedRating ? 'text-gold fill-gold' : 'text-white/20'} />
                </button>
              ))}
            </div>

            {/* Kommentar */}
            <textarea
              value={workoutComment}
              onChange={(e) => setWorkoutComment(e.target.value)}
              placeholder="Legg til en kommentar... (valgfritt)"
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none resize-none text-sm mb-4"
              rows={2}
            />

            <div className="p-4 rounded-xl bg-white/5 mb-4 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-soft-white/60">Tid</span>
                <span className="font-mono font-bold">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-soft-white/60">Volum</span>
                <span className="text-electric font-bold">{formatWeight(volume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-soft-white/60">XP</span>
                <span className="text-gold font-bold">+{pendingFinish?.stats.xp || 0}</span>
              </div>
            </div>

            <button onClick={confirmFinish} className="w-full btn-primary py-4 text-lg font-semibold">
              Lagre økt
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Aktiv økt
  if (currentWorkout) {
    return (
      <div className="space-y-4 pb-24">
        {/* Header med timer */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-soft-white/60 text-sm">Pågår</p>
            <p className="text-3xl font-mono font-bold text-electric">{formatTime(elapsedTime)}</p>
          </div>
          <button onClick={cancelWorkout} className="p-2 rounded-lg bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Volum */}
        <div className="p-4 rounded-2xl bg-white/5 flex justify-between items-center">
          <div>
            <p className="text-soft-white/60 text-xs">TOTALT</p>
            <p className="text-2xl font-bold">{formatWeight(volume)}</p>
          </div>
          <div className="text-right">
            <p className="text-soft-white/60 text-xs">XP</p>
            <p className="text-xl font-bold text-gold">+{Math.floor(XP_PER_WORKOUT + volume * XP_PER_KG)}</p>
          </div>
        </div>

        {/* Øvelser */}
        {currentWorkout.exercises.map((ex) => (
          <div key={ex.id} className="p-4 rounded-2xl bg-white/5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg">{ex.exerciseName}</h3>
              <button onClick={() => removeExercise(ex.id)} className="text-coral p-1">
                <X size={18} />
              </button>
            </div>

            {ex.sets.map((set, i) => (
              <div key={set.id} className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-white/5">
                <span className="text-soft-white/40 w-6 text-sm">{i + 1}</span>
                
                {/* Vekt */}
                <div className="flex items-center gap-1 flex-1">
                  <button 
                    onClick={() => adjustSet(ex.id, set.id, 'weight', -2.5)}
                    className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-lg font-bold">{set.weight}</span>
                    <span className="text-soft-white/40 text-xs ml-1">kg</span>
                  </div>
                  <button 
                    onClick={() => adjustSet(ex.id, set.id, 'weight', 2.5)}
                    className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <span className="text-soft-white/40">×</span>

                {/* Reps */}
                <div className="flex items-center gap-1 flex-1">
                  <button 
                    onClick={() => adjustSet(ex.id, set.id, 'reps', -1)}
                    className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-lg font-bold">{set.reps}</span>
                    <span className="text-soft-white/40 text-xs ml-1">reps</span>
                  </div>
                  <button 
                    onClick={() => adjustSet(ex.id, set.id, 'reps', 1)}
                    className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {set.completed && <Check size={16} className="text-neon-green" />}
              </div>
            ))}

            <button 
              onClick={() => addSet(ex.id)}
              className="w-full py-2 text-sm text-soft-white/60 hover:text-electric"
            >
              + Nytt sett
            </button>
          </div>
        ))}

        {/* Legg til øvelse */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExercise()}
            placeholder="Legg til øvelse..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-electric outline-none"
          />
          <button 
            onClick={addExercise}
            disabled={!newExerciseName.trim()}
            className="px-4 rounded-xl bg-electric text-midnight font-semibold disabled:opacity-30"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Fullfør */}
        {currentWorkout.exercises.length > 0 && (
          <button
            onClick={finishWorkout}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-electric to-neon-green text-midnight font-bold text-lg flex items-center justify-center gap-2"
          >
            <Trophy size={20} />
            Fullfør økt
          </button>
        )}
      </div>
    );
  }

  // Startskjerm
  return (
    <div className="space-y-6 pb-24">
      {/* Quick Start */}
      <button
        onClick={quickStart}
        className="w-full py-6 rounded-2xl bg-gradient-to-r from-electric to-neon-green text-midnight font-bold text-xl flex items-center justify-center gap-3"
      >
        <Plus size={28} />
        Start trening
      </button>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/5 text-center">
          <p className="text-2xl font-bold">{gameStats.totalWorkouts}</p>
          <p className="text-soft-white/50 text-xs">økter</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 text-center">
          <p className="text-2xl font-bold text-coral">{gameStats.currentStreak}</p>
          <p className="text-soft-white/50 text-xs">streak</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 text-center">
          <p className="text-2xl font-bold text-electric">{formatWeight(gameStats.totalVolumeLifted)}</p>
          <p className="text-soft-white/50 text-xs">totalt</p>
        </div>
      </div>

      {/* Historikk */}
      {workouts.length > 0 && (
        <div>
          <h3 className="text-soft-white/60 text-sm mb-3">Siste økter</h3>
          <div className="space-y-2">
            {workouts.slice(-5).reverse().map((w) => (
              <div key={w.id} className="p-3 rounded-xl bg-white/5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-soft-white/40 text-sm">
                      {format(parseISO(w.date), 'd. MMM', { locale: nb })}
                      {w.duration && ` • ${w.duration}min`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-electric font-bold">{formatWeight(calculateWorkoutVolume(w))}</p>
                    {w.rating && (
                      <div className="flex">
                        {[...Array(w.rating)].map((_, i) => (
                          <Star key={i} size={10} className="text-gold fill-gold" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {w.comment && (
                  <p className="text-soft-white/50 text-sm mt-2 italic">"{w.comment}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {workouts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-soft-white/40">Ingen økter enda</p>
          <p className="text-soft-white/60 text-sm mt-1">Trykk på knappen over for å starte!</p>
        </div>
      )}
    </div>
  );
}
