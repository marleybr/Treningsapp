'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Plus, X, Scale, Activity, Trash2, Target, Flame, Dumbbell, Apple, Calendar, Award, Zap, Check } from 'lucide-react';
import { BodyStats, Workout, UserProfile } from '@/types';
import { format, parseISO, subDays, startOfWeek, endOfWeek, isWithinInterval, differenceInDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, BarChart, Bar } from 'recharts';

interface MealEntry {
  id: string;
  timestamp: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface ProgressTabProps {
  bodyStats: BodyStats[];
  setBodyStats: (stats: BodyStats[]) => void;
  workouts: Workout[];
  profile?: UserProfile | null;
}

// Activity level multipliers for TDEE calculation
const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Goal adjustments
const goalAdjustments: Record<string, number> = {
  lose_weight: -500,
  maintain: 0,
  build_muscle: 300,
  improve_fitness: 0,
};

export default function ProgressTab({ bodyStats, setBodyStats, workouts, profile }: ProgressTabProps) {
  const [showAddStats, setShowAddStats] = useState(false);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState<MealEntry[]>([]);

  // Load meals from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fittrack-meals');
      if (saved) {
        setMeals(JSON.parse(saved));
      }
    }
  }, []);

  const sortedStats = [...bodyStats].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const latestStats = sortedStats[sortedStats.length - 1];
  const previousStats = sortedStats[sortedStats.length - 2];

  const weightChange = latestStats && previousStats 
    ? (latestStats.weight || 0) - (previousStats.weight || 0)
    : 0;

  // Calculate total weight change from start
  const totalWeightChange = sortedStats.length > 1 && sortedStats[0].weight && latestStats?.weight
    ? latestStats.weight - sortedStats[0].weight
    : 0;

  // Calculate target calories
  const targetCalories = useMemo(() => {
    if (!profile) return 2000;
    
    const age = profile.birthDate 
      ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 30;
    
    // BMR using Mifflin-St Jeor
    let bmr;
    if (profile.gender === 'female') {
      bmr = 10 * profile.currentWeight + 6.25 * profile.height - 5 * age - 161;
    } else {
      bmr = 10 * profile.currentWeight + 6.25 * profile.height - 5 * age + 5;
    }
    
    const tdee = bmr * (activityMultipliers[profile.activityLevel] || 1.55);
    const adjustment = goalAdjustments[profile.fitnessGoal] || 0;
    
    return Math.round(tdee + adjustment);
  }, [profile]);

  // Calculate this week's stats
  const thisWeekStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    // Workouts this week
    const weekWorkouts = workouts.filter(w => {
      const date = parseISO(w.date);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });
    
    // Meals this week
    const weekMeals = meals.filter(m => {
      const date = parseISO(m.timestamp);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });
    
    // Calculate average daily calories this week
    const daysWithMeals = new Set(weekMeals.map(m => m.timestamp.split('T')[0])).size;
    const totalCaloriesThisWeek = weekMeals.reduce((sum, m) => sum + m.totalCalories, 0);
    const avgDailyCalories = daysWithMeals > 0 ? Math.round(totalCaloriesThisWeek / daysWithMeals) : 0;
    
    // Volume lifted this week
    const weekVolume = weekWorkouts.reduce((total, w) => {
      return total + w.exercises.reduce((exTotal, ex) => {
        return exTotal + ex.sets.reduce((setTotal, set) => {
          return setTotal + (set.weight * set.reps);
        }, 0);
      }, 0);
    }, 0);
    
    // Cardio this week (distance from cardio workouts)
    const cardioWorkouts = weekWorkouts.filter(w => w.workoutType === 'cardio');
    const totalCardioDistance = cardioWorkouts.reduce((total, w) => {
      const cardioEx = w.exercises.find(ex => ex.exerciseName === 'Løping');
      return total + (cardioEx ? cardioEx.sets[0]?.reps || 0 : 0); // Distance stored in reps
    }, 0);
    
    return {
      workoutCount: weekWorkouts.length,
      avgDailyCalories,
      totalCaloriesThisWeek,
      weekVolume,
      cardioDistance: totalCardioDistance / 1000, // Convert to km
      cardioWorkouts: cardioWorkouts.length,
      strengthWorkouts: weekWorkouts.filter(w => w.workoutType !== 'cardio').length,
    };
  }, [workouts, meals]);

  // Calculate streak
  const streak = useMemo(() => {
    if (workouts.length === 0) return 0;
    
    const sortedDates = [...new Set(workouts.map(w => w.date.split('T')[0]))]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let currentStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedDates.length; i++) {
      const workoutDate = new Date(sortedDates[i]);
      workoutDate.setHours(0, 0, 0, 0);
      
      const expectedDate = subDays(currentDate, currentStreak);
      expectedDate.setHours(0, 0, 0, 0);
      
      const daysDiff = differenceInDays(expectedDate, workoutDate);
      
      if (daysDiff === 0) {
        currentStreak++;
      } else if (daysDiff === 1 && currentStreak === 0) {
        currentStreak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }
    
    return currentStreak;
  }, [workouts]);

  // Weekly calories chart data (last 7 days)
  const caloriesChartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayMeals = meals.filter(m => m.timestamp.split('T')[0] === dateStr);
      const totalCals = dayMeals.reduce((sum, m) => sum + m.totalCalories, 0);
      
      data.push({
        day: format(date, 'EEE', { locale: nb }),
        calories: totalCals,
        target: targetCalories,
      });
    }
    return data;
  }, [meals, targetCalories]);

  // Workout frequency chart data (last 4 weeks)
  const workoutFrequencyData = useMemo(() => {
    const data = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = subDays(new Date(), (i + 1) * 7);
      const weekEnd = subDays(new Date(), i * 7);
      const weekWorkouts = workouts.filter(w => {
        const date = parseISO(w.date);
        return date >= weekStart && date < weekEnd;
      });
      
      data.push({
        week: `Uke ${4 - i}`,
        workouts: weekWorkouts.length,
        target: profile?.workoutsPerWeek || 3,
      });
    }
    return data;
  }, [workouts, profile]);

  // Chart data
  const chartData = sortedStats.slice(-30).map(stat => ({
    date: format(parseISO(stat.date), 'd. MMM', { locale: nb }),
    weight: stat.weight,
    bodyFat: stat.bodyFat,
  }));

  // Goal progress calculations
  const goalProgress = useMemo(() => {
    if (!profile || !latestStats?.weight) return null;
    
    const startWeight = sortedStats[0]?.weight || profile.currentWeight;
    const currentWeight = latestStats.weight;
    const targetWeight = profile.targetWeight;
    
    const totalToLose = startWeight - targetWeight;
    const lost = startWeight - currentWeight;
    const progress = totalToLose !== 0 ? Math.min(Math.max((lost / totalToLose) * 100, 0), 100) : 100;
    
    return {
      startWeight,
      currentWeight,
      targetWeight,
      progress,
      remaining: Math.abs(currentWeight - targetWeight),
      isGaining: targetWeight > startWeight,
    };
  }, [profile, latestStats, sortedStats]);

  const addStats = () => {
    if (!weight) return;
    
    const newStats: BodyStats = {
      id: Date.now().toString(),
      date: new Date(selectedDate).toISOString(),
      weight: Number(weight),
      bodyFat: bodyFat ? Number(bodyFat) : undefined,
    };
    
    setBodyStats([...bodyStats, newStats]);
    setWeight('');
    setBodyFat('');
    setShowAddStats(false);
  };

  const deleteStats = (statsId: string) => {
    setBodyStats(bodyStats.filter(s => s.id !== statsId));
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-3 rounded-lg">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'weight' ? 'Vekt' : 
               entry.name === 'calories' ? 'Kalorier' :
               entry.name === 'workouts' ? 'Økter' :
               entry.name}: {entry.value}{entry.name === 'weight' ? ' kg' : entry.name === 'bodyFat' ? '%' : entry.name === 'calories' ? ' kcal' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeInUp pb-32">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Fremgang</h2>
        <button 
          onClick={() => setShowAddStats(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Logg vekt
        </button>
      </div>

      {/* This Week Summary */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-electric/20 to-neon-green/20 border border-electric/30">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Calendar size={18} className="text-electric" />
          Denne uken
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell size={16} className="text-electric" />
              <span className="text-soft-white/60 text-xs">Treningsøkter</span>
            </div>
            <p className="text-2xl font-bold">
              {thisWeekStats.workoutCount}
              <span className="text-soft-white/40 text-sm font-normal">/{profile?.workoutsPerWeek || 3}</span>
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={16} className="text-orange-400" />
              <span className="text-soft-white/60 text-xs">Snitt kalorier/dag</span>
            </div>
            <p className="text-2xl font-bold text-orange-400">
              {thisWeekStats.avgDailyCalories}
              <span className="text-soft-white/40 text-sm font-normal"> kcal</span>
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-neon-green" />
              <span className="text-soft-white/60 text-xs">Volum løftet</span>
            </div>
            <p className="text-2xl font-bold text-neon-green">
              {thisWeekStats.weekVolume >= 1000 
                ? `${(thisWeekStats.weekVolume / 1000).toFixed(1)}t` 
                : `${thisWeekStats.weekVolume}kg`}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={16} className="text-purple-400" />
              <span className="text-soft-white/60 text-xs">Løpt</span>
            </div>
            <p className="text-2xl font-bold text-purple-400">
              {thisWeekStats.cardioDistance.toFixed(1)}
              <span className="text-soft-white/40 text-sm font-normal"> km</span>
            </p>
          </div>
        </div>
      </div>

      {/* Goal Progress */}
      {goalProgress && (
        <div className="card">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Target size={18} className="text-neon-green" />
            Målprogresjon
          </h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>{goalProgress.startWeight} kg</span>
              <span className="text-neon-green font-bold">{goalProgress.currentWeight} kg</span>
              <span>{goalProgress.targetWeight} kg</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-electric to-neon-green transition-all duration-500"
                style={{ width: `${goalProgress.progress}%` }}
              />
            </div>
            <p className="text-sm text-soft-white/60 mt-2 text-center">
              {goalProgress.progress >= 100 ? (
                <span className="text-neon-green flex items-center justify-center gap-1">
                  <Check size={16} /> Mål oppnådd!
                </span>
              ) : (
                <>
                  {goalProgress.remaining.toFixed(1)} kg igjen til mål
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Streak & Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-coral/10 border border-coral/20 text-center">
          <Award className="mx-auto text-coral mb-1" size={24} />
          <p className="text-2xl font-bold text-coral">{streak}</p>
          <p className="text-soft-white/50 text-xs">Dagers streak</p>
        </div>
        <div className="p-4 rounded-2xl bg-electric/10 border border-electric/20 text-center">
          <Dumbbell className="mx-auto text-electric mb-1" size={24} />
          <p className="text-2xl font-bold text-electric">{workouts.length}</p>
          <p className="text-soft-white/50 text-xs">Totalt økter</p>
        </div>
        <div className="p-4 rounded-2xl bg-neon-green/10 border border-neon-green/20 text-center">
          <Apple className="mx-auto text-neon-green mb-1" size={24} />
          <p className="text-2xl font-bold text-neon-green">{meals.length}</p>
          <p className="text-soft-white/50 text-xs">Måltider logget</p>
        </div>
      </div>

      {/* Current Weight Stats */}
      {latestStats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card glow-electric">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="text-electric" size={20} />
              <span className="text-soft-white/60 text-sm">Nåværende vekt</span>
            </div>
            <p className="text-3xl font-display font-bold">{latestStats.weight} kg</p>
            {weightChange !== 0 && (
              <div className={`flex items-center gap-1 mt-2 ${
                (profile?.fitnessGoal === 'lose_weight' && weightChange < 0) ||
                (profile?.fitnessGoal === 'build_muscle' && weightChange > 0) 
                  ? 'text-neon-green' 
                  : weightChange > 0 ? 'text-coral' : 'text-neon-green'
              }`}>
                {weightChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="text-sm font-medium">
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                </span>
              </div>
            )}
          </div>
          
          {profile && (
            <div className="card glow-green">
              <div className="flex items-center gap-2 mb-2">
                <Target className="text-neon-green" size={20} />
                <span className="text-soft-white/60 text-sm">Til målvekt</span>
              </div>
              <p className="text-3xl font-display font-bold">
                {Math.abs(latestStats.weight! - profile.targetWeight).toFixed(1)} kg
              </p>
              <p className="text-sm text-soft-white/60 mt-1">
                {latestStats.weight! > profile.targetWeight ? 'å gå ned' : 
                 latestStats.weight! < profile.targetWeight ? 'å gå opp' : '✓ Mål nådd!'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Calories Chart (Last 7 days) */}
      {caloriesChartData.some(d => d.calories > 0) && (
        <div className="card">
          <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
            <Flame className="text-orange-400" size={20} />
            Kalorier siste 7 dager
          </h3>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={caloriesChartData}>
                <XAxis 
                  dataKey="day" 
                  stroke="#f0f0f580"
                  tick={{ fill: '#f0f0f580', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#f0f0f580"
                  tick={{ fill: '#f0f0f580', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine 
                  y={targetCalories} 
                  stroke="#39ff14" 
                  strokeDasharray="5 5"
                />
                <Bar 
                  dataKey="calories" 
                  fill="#ff6b6b"
                  radius={[4, 4, 0, 0]}
                  name="calories"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-soft-white/50 text-xs mt-2">
            Grønn linje = kaloriemål ({targetCalories} kcal)
          </p>
        </div>
      )}

      {/* Workout Frequency */}
      <div className="card">
        <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
          <Activity className="text-gold" size={20} />
          Treningsfrekvens
        </h3>
        
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={workoutFrequencyData}>
              <defs>
                <linearGradient id="workoutGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#39ff14" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#39ff14" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="week" 
                stroke="#f0f0f580"
                tick={{ fill: '#f0f0f580', fontSize: 12 }}
              />
              <YAxis 
                stroke="#f0f0f580"
                tick={{ fill: '#f0f0f580', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={profile?.workoutsPerWeek || 3} 
                stroke="#00d9ff" 
                strokeDasharray="5 5"
              />
              <Area 
                type="monotone" 
                dataKey="workouts" 
                stroke="#39ff14" 
                strokeWidth={2}
                fill="url(#workoutGradient)"
                name="Økter"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-soft-white/50 text-xs mt-2">
          Blå linje = ukentlig mål ({profile?.workoutsPerWeek || 3} økter)
        </p>
      </div>

      {/* Weight Chart */}
      {chartData.length > 1 && (
        <div className="card">
          <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="text-electric" size={20} />
            Vektutvikling
          </h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00d9ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#f0f0f580"
                  tick={{ fill: '#f0f0f580', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#f0f0f580"
                  tick={{ fill: '#f0f0f580', fontSize: 12 }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip content={<CustomTooltip />} />
                {profile && (
                  <ReferenceLine 
                    y={profile.targetWeight} 
                    stroke="#39ff14" 
                    strokeDasharray="5 5"
                    label={{ value: 'Mål', fill: '#39ff14', fontSize: 12 }}
                  />
                )}
                <Area 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#00d9ff" 
                  strokeWidth={2}
                  fill="url(#weightGradient)"
                  name="weight"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stats History */}
      {bodyStats.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-display font-semibold mb-4">Vekthistorikk</h3>
          
          <div className="space-y-3">
            {sortedStats.slice().reverse().slice(0, 10).map((stat, index) => (
              <div 
                key={stat.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 animate-fadeInUp"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div>
                  <p className="font-medium">{stat.weight} kg</p>
                  <p className="text-sm text-soft-white/60">
                    {format(parseISO(stat.date), 'd. MMMM yyyy', { locale: nb })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {stat.bodyFat && (
                    <span className="text-neon-green text-sm">{stat.bodyFat}% fett</span>
                  )}
                  <button
                    onClick={() => deleteStats(stat.id)}
                    className="p-2 rounded-lg hover:bg-coral/20 text-soft-white/60 hover:text-coral transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {bodyStats.length === 0 && (
        <div className="card text-center py-12">
          <Scale className="mx-auto text-soft-white/30 mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">Ingen vektdata enda</h3>
          <p className="text-soft-white/60 mb-6">Logg din første veiing for å begynne å spore fremgangen!</p>
          <button 
            onClick={() => setShowAddStats(true)}
            className="btn-primary"
          >
            Logg første veiing
          </button>
        </div>
      )}

      {/* Add Stats Modal */}
      {showAddStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-md bg-deep-purple rounded-2xl p-6 animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-bold">Logg kroppsvekt</h3>
              <button 
                onClick={() => setShowAddStats(false)}
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-soft-white/60 mb-2">Dato</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm text-soft-white/60 mb-2">Vekt (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={latestStats?.weight?.toString() || '75.5'}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm text-soft-white/60 mb-2">Fettprosent (valgfritt)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="15.0"
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddStats(false)}
                className="flex-1 btn-secondary"
              >
                Avbryt
              </button>
              <button
                onClick={addStats}
                disabled={!weight}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
