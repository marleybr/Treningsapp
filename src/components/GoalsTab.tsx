'use client';

import { useState } from 'react';
import { Target, Plus, X, Check, Trash2, Trophy, Flame, Scale, Dumbbell, Apple } from 'lucide-react';
import { Goal } from '@/types';
import { format, parseISO, isPast } from 'date-fns';
import { nb } from 'date-fns/locale';

interface GoalsTabProps {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
}

export default function GoalsTab({ goals, setGoals }: GoalsTabProps) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalType, setGoalType] = useState<'weight' | 'strength' | 'nutrition'>('strength');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [unit, setUnit] = useState('kg');
  const [deadline, setDeadline] = useState('');

  const addGoal = () => {
    if (!description || !targetValue) return;
    
    const newGoal: Goal = {
      id: Date.now().toString(),
      type: goalType,
      description,
      targetValue: Number(targetValue),
      currentValue: Number(currentValue) || 0,
      unit,
      deadline: deadline || undefined,
      completed: false,
    };
    
    setGoals([...goals, newGoal]);
    setDescription('');
    setTargetValue('');
    setCurrentValue('');
    setUnit('kg');
    setDeadline('');
    setShowAddGoal(false);
  };

  const updateGoalProgress = (goalId: string, newValue: number) => {
    setGoals(goals.map(g => {
      if (g.id === goalId) {
        const completed = newValue >= g.targetValue;
        return { ...g, currentValue: newValue, completed };
      }
      return g;
    }));
  };

  const toggleGoalComplete = (goalId: string) => {
    setGoals(goals.map(g => 
      g.id === goalId ? { ...g, completed: !g.completed } : g
    ));
  };

  const deleteGoal = (goalId: string) => {
    setGoals(goals.filter(g => g.id !== goalId));
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'weight': return Scale;
      case 'strength': return Dumbbell;
      case 'nutrition': return Apple;
      default: return Target;
    }
  };

  const getGoalColor = (type: string) => {
    switch (type) {
      case 'weight': return 'electric';
      case 'strength': return 'neon-green';
      case 'nutrition': return 'coral';
      default: return 'gold';
    }
  };

  const goalTypes = [
    { id: 'strength', label: 'Styrke', icon: Dumbbell, color: 'neon-green' },
    { id: 'weight', label: 'Vekt', icon: Scale, color: 'electric' },
    { id: 'nutrition', label: 'Kosthold', icon: Apple, color: 'coral' },
  ];

  return (
    <div className="space-y-6 animate-fadeInUp pb-32">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Mål</h2>
        <button 
          onClick={() => setShowAddGoal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Nytt mål
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="text-coral" size={20} />
            <span className="text-soft-white/60 text-sm">Aktive mål</span>
          </div>
          <p className="text-3xl font-display font-bold">{activeGoals.length}</p>
        </div>
        
        <div className="card glow-green">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="text-gold" size={20} />
            <span className="text-soft-white/60 text-sm">Fullførte</span>
          </div>
          <p className="text-3xl font-display font-bold text-gold">{completedGoals.length}</p>
        </div>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-display font-semibold flex items-center gap-2">
            <Target className="text-electric" size={20} />
            Aktive mål
          </h3>
          
          {activeGoals.map((goal, index) => {
            const Icon = getGoalIcon(goal.type);
            const color = getGoalColor(goal.type);
            const progress = (goal.currentValue / goal.targetValue) * 100;
            const isOverdue = goal.deadline && isPast(parseISO(goal.deadline));
            
            return (
              <div 
                key={goal.id}
                className={`card animate-fadeInUp ${isOverdue ? 'border-coral/50' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${color}/20`}>
                      <Icon className={`text-${color}`} size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">{goal.description}</p>
                      {goal.deadline && (
                        <p className={`text-sm ${isOverdue ? 'text-coral' : 'text-soft-white/60'}`}>
                          {isOverdue ? 'Forfalt: ' : 'Frist: '}
                          {format(parseISO(goal.deadline), 'd. MMMM yyyy', { locale: nb })}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-2 rounded-lg hover:bg-coral/20 text-soft-white/60 hover:text-coral transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-soft-white/60">Fremgang</span>
                    <span className={`text-${color}`}>
                      {goal.currentValue} / {goal.targetValue} {goal.unit}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className={`h-full bg-${color} rounded-full transition-all duration-500`}
                      style={{ 
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: color === 'electric' ? '#00d9ff' : color === 'neon-green' ? '#39ff14' : '#ff6b6b'
                      }}
                    />
                  </div>
                </div>

                {/* Update Progress */}
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={goal.currentValue}
                    onChange={(e) => updateGoalProgress(goal.id, Number(e.target.value))}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/10 focus:border-electric outline-none"
                    placeholder="Oppdater verdi"
                  />
                  <button
                    onClick={() => toggleGoalComplete(goal.id)}
                    className="p-3 rounded-lg bg-neon-green/20 hover:bg-neon-green text-neon-green hover:text-midnight transition-all"
                  >
                    <Check size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-display font-semibold flex items-center gap-2">
            <Trophy className="text-gold" size={20} />
            Fullførte mål
          </h3>
          
          {completedGoals.map((goal, index) => {
            const Icon = getGoalIcon(goal.type);
            
            return (
              <div 
                key={goal.id}
                className="card bg-neon-green/5 border-neon-green/20 animate-fadeInUp"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neon-green/20">
                      <Icon className="text-neon-green" size={20} />
                    </div>
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        {goal.description}
                        <Check className="text-neon-green" size={16} />
                      </p>
                      <p className="text-sm text-soft-white/60">
                        {goal.targetValue} {goal.unit} oppnådd
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-2 rounded-lg hover:bg-coral/20 text-soft-white/60 hover:text-coral transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="card text-center py-12">
          <Target className="mx-auto text-soft-white/30 mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">Ingen mål satt</h3>
          <p className="text-soft-white/60 mb-6">Sett ditt første mål for å holde deg motivert!</p>
          <button 
            onClick={() => setShowAddGoal(true)}
            className="btn-primary"
          >
            Sett første mål
          </button>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-deep-purple rounded-t-3xl p-6 animate-fadeInUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-bold">Nytt mål</h3>
              <button 
                onClick={() => setShowAddGoal(false)}
                className="p-2 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Goal Type */}
            <div className="mb-4">
              <label className="block text-sm text-soft-white/60 mb-2">Type mål</label>
              <div className="flex gap-2">
                {goalTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setGoalType(type.id as any)}
                      className={`flex-1 p-4 rounded-xl transition-all flex flex-col items-center gap-2 ${
                        goalType === type.id 
                          ? `bg-${type.color}/20 border-2 border-${type.color}` 
                          : 'bg-white/5 border-2 border-transparent'
                      }`}
                      style={{
                        borderColor: goalType === type.id 
                          ? (type.color === 'neon-green' ? '#39ff14' : type.color === 'electric' ? '#00d9ff' : '#ff6b6b')
                          : 'transparent'
                      }}
                    >
                      <Icon size={24} style={{
                        color: type.color === 'neon-green' ? '#39ff14' : type.color === 'electric' ? '#00d9ff' : '#ff6b6b'
                      }} />
                      <span className="text-sm">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm text-soft-white/60 mb-2">Beskrivelse *</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="F.eks. Benkpress 100kg"
                className="input-field"
              />
            </div>

            {/* Target & Current */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm text-soft-white/60 mb-2">Målverdi *</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="100"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-soft-white/60 mb-2">Nåværende</label>
                <input
                  type="number"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="80"
                  className="input-field"
                />
              </div>
            </div>

            {/* Unit */}
            <div className="mb-4">
              <label className="block text-sm text-soft-white/60 mb-2">Enhet</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="input-field"
              >
                <option value="kg">kg</option>
                <option value="reps">reps</option>
                <option value="min">min</option>
                <option value="km">km</option>
                <option value="g">g (protein)</option>
                <option value="kcal">kcal</option>
              </select>
            </div>

            {/* Deadline */}
            <div className="mb-6">
              <label className="block text-sm text-soft-white/60 mb-2">Frist (valgfritt)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddGoal(false)}
                className="flex-1 btn-secondary"
              >
                Avbryt
              </button>
              <button
                onClick={addGoal}
                disabled={!description || !targetValue}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Opprett mål
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


