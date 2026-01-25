'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Plus, X, Scale, Activity, Trash2, Target } from 'lucide-react';
import { BodyStats, Workout, UserProfile } from '@/types';
import { format, parseISO, subDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';

interface ProgressTabProps {
  bodyStats: BodyStats[];
  setBodyStats: (stats: BodyStats[]) => void;
  workouts: Workout[];
  profile?: UserProfile | null;
}

export default function ProgressTab({ bodyStats, setBodyStats, workouts, profile }: ProgressTabProps) {
  const [showAddStats, setShowAddStats] = useState(false);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Chart data
  const chartData = sortedStats.slice(-30).map(stat => ({
    date: format(parseISO(stat.date), 'd. MMM', { locale: nb }),
    weight: stat.weight,
    bodyFat: stat.bodyFat,
  }));

  // Workout frequency chart data (last 4 weeks)
  const workoutFrequencyData = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = subDays(new Date(), (i + 1) * 7);
    const weekEnd = subDays(new Date(), i * 7);
    const weekWorkouts = workouts.filter(w => {
      const date = parseISO(w.date);
      return date >= weekStart && date < weekEnd;
    }).length;
    workoutFrequencyData.push({
      week: `Uke ${4 - i}`,
      workouts: weekWorkouts,
    });
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-3 rounded-lg">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'weight' ? 'Vekt' : entry.name}: {entry.value}{entry.name === 'weight' ? ' kg' : entry.name === 'bodyFat' ? '%' : ''}
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

      {/* Current Stats */}
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

      {/* Total Progress */}
      {totalWeightChange !== 0 && (
        <div className="card bg-gradient-to-r from-electric/10 to-neon-green/10 border-electric/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-soft-white/60 text-sm">Total endring</p>
              <p className={`text-2xl font-bold ${
                (profile?.fitnessGoal === 'lose_weight' && totalWeightChange < 0) ||
                (profile?.fitnessGoal === 'build_muscle' && totalWeightChange > 0)
                  ? 'text-neon-green' 
                  : 'text-coral'
              }`}>
                {totalWeightChange > 0 ? '+' : ''}{totalWeightChange.toFixed(1)} kg
              </p>
            </div>
            <div className="text-right">
              <p className="text-soft-white/60 text-sm">Siden start</p>
              <p className="text-soft-white/80">
                {sortedStats[0]?.weight} kg → {latestStats?.weight} kg
              </p>
            </div>
          </div>
        </div>
      )}

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
      </div>

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
