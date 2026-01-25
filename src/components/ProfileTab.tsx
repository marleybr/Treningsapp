'use client';

import { useState } from 'react';
import { User, Edit2, Save, X, LogOut, Ruler, Scale, Target, Activity, Calendar, Trash2, Trophy, Zap, Flame, Star, Lock, Award, Sparkles, Dumbbell, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { UserProfile, GameStats, ACHIEVEMENTS, workoutsToNextLevel, getLevelTitle, activityLevelLabels, fitnessGoalLabels, WORKOUTS_PER_LEVEL, Workout, WorkoutExercise } from '@/types';
import { format, parseISO, differenceInYears } from 'date-fns';
import { nb } from 'date-fns/locale';

interface ProfileTabProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile | null) => void;
  gameStats?: GameStats;
  workouts?: Workout[];
}

// Beregn total vekt for en øvelse
const calculateExerciseVolume = (exercise: WorkoutExercise): number => {
  return exercise.sets.reduce((total, set) => {
    if (!set.completed) return total;
    return total + (set.weight * set.reps);
  }, 0);
};

// Beregn total vekt for en hel økt
const calculateWorkoutVolume = (workout: Workout): number => {
  return workout.exercises.reduce((total, ex) => total + calculateExerciseVolume(ex), 0);
};

// Formater vekt
const formatWeight = (weight: number): string => {
  if (weight >= 1000) {
    return `${(weight / 1000).toFixed(1)}t`;
  }
  return `${weight.toLocaleString()}kg`;
};

export default function ProfileTab({ profile, setProfile, gameStats, workouts = [] }: ProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  
  // Edit state
  const [name, setName] = useState(profile.name);
  const [height, setHeight] = useState(profile.height.toString());
  const [currentWeight, setCurrentWeight] = useState(profile.currentWeight.toString());
  const [targetWeight, setTargetWeight] = useState(profile.targetWeight.toString());
  const [activityLevel, setActivityLevel] = useState(profile.activityLevel);
  const [fitnessGoal, setFitnessGoal] = useState(profile.fitnessGoal);

  const age = profile.birthDate 
    ? differenceInYears(new Date(), parseISO(profile.birthDate))
    : null;

  const level = gameStats?.level || 1;
  const levelTitle = getLevelTitle(level);
  const levelProgress = gameStats ? workoutsToNextLevel(gameStats.totalWorkouts) : null;

  const handleSave = () => {
    const updatedProfile: UserProfile = {
      ...profile,
      name,
      height: Number(height),
      currentWeight: Number(currentWeight),
      targetWeight: Number(targetWeight),
      activityLevel,
      fitnessGoal,
    };
    setProfile(updatedProfile);
    setIsEditing(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    setProfile(null);
  };

  // Achievement progress
  const getAchievementProgress = (achievement: typeof ACHIEVEMENTS[0]) => {
    if (!gameStats) return 0;
    
    let current = 0;
    const target = achievement.requirement.value;
    
    switch (achievement.requirement.type) {
      case 'workouts':
        current = gameStats.totalWorkouts;
        break;
      case 'streak':
        current = Math.max(gameStats.currentStreak, gameStats.longestStreak);
        break;
      case 'volume':
        current = gameStats.totalVolumeLifted;
        break;
      case 'level':
        current = level;
        break;
    }
    
    return Math.min(100, (current / target) * 100);
  };

  const unlockedAchievements = ACHIEVEMENTS.filter(a => gameStats?.achievements.includes(a.id));
  const lockedAchievements = ACHIEVEMENTS.filter(a => !gameStats?.achievements.includes(a.id));

  return (
    <div className="space-y-6 animate-fadeInUp pb-32">
      {/* Profile Header with Level */}
      <div className="card text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-electric/10 rounded-full blur-2xl"></div>
        
        <div className="relative">
          <div className="relative inline-block">
            <div 
              className="w-24 h-24 rounded-full mx-auto mb-2 flex items-center justify-center text-4xl font-bold relative"
              style={{ backgroundColor: `${profile.avatarColor}30`, color: profile.avatarColor }}
            >
              {profile.name.charAt(0).toUpperCase()}
              
              {/* Level Badge */}
              {gameStats && (
                <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br from-gold to-coral flex items-center justify-center border-2 border-midnight">
                  <span className="text-sm font-bold text-midnight">{level}</span>
                </div>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-center text-xl font-bold mb-2"
            />
          ) : (
            <>
              <h2 className="text-2xl font-display font-bold mb-1">{profile.name}</h2>
              {gameStats && (
                <p className="text-gold font-semibold">{levelTitle}</p>
              )}
            </>
          )}
          
          <p className="text-soft-white/60 text-sm mt-1">
            Medlem siden {format(parseISO(profile.createdAt), 'MMMM yyyy', { locale: nb })}
          </p>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="mt-4 btn-secondary text-sm inline-flex items-center gap-2"
            >
              <Edit2 size={16} />
              Rediger profil
            </button>
          )}
        </div>
      </div>

      {/* XP Progress */}
      {gameStats && levelProgress && (
        <div className="card bg-gradient-to-r from-electric/10 to-gold/10 border-electric/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="text-electric" size={20} />
              <span className="font-semibold">Erfaring</span>
            </div>
            <span className="text-gold font-bold">{gameStats.xp.toLocaleString()} XP</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-gradient-to-r from-electric to-gold rounded-full relative"
              style={{ width: `${levelProgress.progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          <div className="flex justify-between text-sm text-soft-white/60">
            <span>Nivå {level}</span>
            <span>{levelProgress.current} / {WORKOUTS_PER_LEVEL} økter til nivå {level + 1}</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {gameStats && (
        <div className="grid grid-cols-4 gap-2">
          <div className="card text-center p-3">
            <Zap className="mx-auto text-electric mb-1" size={20} />
            <p className="text-lg font-bold">{gameStats.totalWorkouts}</p>
            <p className="text-soft-white/60 text-xs">Økter</p>
          </div>
          
          <div className="card text-center p-3">
            <Flame className="mx-auto text-coral mb-1" size={20} />
            <p className="text-lg font-bold text-coral">{gameStats.currentStreak}</p>
            <p className="text-soft-white/60 text-xs">Streak</p>
          </div>
          
          <div className="card text-center p-3">
            <Star className="mx-auto text-gold mb-1" size={20} />
            <p className="text-lg font-bold text-gold">{gameStats.longestStreak}</p>
            <p className="text-soft-white/60 text-xs">Rekord</p>
          </div>
          
          <div className="card text-center p-3">
            <Trophy className="mx-auto text-neon-green mb-1" size={20} />
            <p className="text-lg font-bold text-neon-green">{unlockedAchievements.length}</p>
            <p className="text-soft-white/60 text-xs">Trophies</p>
          </div>
        </div>
      )}

      {/* Achievements */}
      {gameStats && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold flex items-center gap-2">
              <Award className="text-gold" size={20} />
              Achievements
            </h3>
            <span className="text-soft-white/60 text-sm">
              {unlockedAchievements.length} / {ACHIEVEMENTS.length}
            </span>
          </div>
          
          {/* Unlocked */}
          {unlockedAchievements.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {unlockedAchievements.slice(0, showAllAchievements ? undefined : 8).map(achievement => (
                <div 
                  key={achievement.id} 
                  className="text-center p-2 rounded-xl bg-gradient-to-br from-gold/20 to-coral/10 border border-gold/30"
                  title={`${achievement.name}: ${achievement.description}`}
                >
                  <span className="text-2xl block">{achievement.icon}</span>
                  <p className="text-xs text-gold mt-1 truncate">{achievement.name}</p>
                </div>
              ))}
            </div>
          )}

          {/* Locked Preview */}
          {lockedAchievements.length > 0 && (
            <>
              <p className="text-soft-white/40 text-sm mb-2">Låst</p>
              <div className="grid grid-cols-4 gap-3">
                {lockedAchievements.slice(0, showAllAchievements ? undefined : 4).map(achievement => {
                  const progress = getAchievementProgress(achievement);
                  return (
                    <div 
                      key={achievement.id} 
                      className="text-center p-2 rounded-xl bg-white/5 relative overflow-hidden"
                      title={`${achievement.name}: ${achievement.description}`}
                    >
                      <div className="opacity-30">
                        <span className="text-2xl block grayscale">{achievement.icon}</span>
                        <p className="text-xs mt-1 truncate">{achievement.name}</p>
                      </div>
                      {progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                          <div 
                            className="h-full bg-gold/50 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                      <Lock className="absolute top-1 right-1 text-soft-white/30" size={10} />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {(unlockedAchievements.length > 8 || lockedAchievements.length > 4) && (
            <button
              onClick={() => setShowAllAchievements(!showAllAchievements)}
              className="w-full mt-4 py-2 text-sm text-electric hover:underline"
            >
              {showAllAchievements ? 'Vis mindre' : 'Vis alle achievements'}
            </button>
          )}
        </div>
      )}

      {/* Total Volume */}
      {gameStats && gameStats.totalVolumeLifted > 0 && (
        <div className="card bg-gradient-to-r from-neon-green/10 to-electric/10 border-neon-green/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-neon-green/20">
              <Sparkles className="text-neon-green" size={24} />
            </div>
            <div>
              <p className="text-soft-white/60 text-sm">Total vekt løftet</p>
              <p className="text-2xl font-display font-bold bg-gradient-to-r from-neon-green to-electric bg-clip-text text-transparent">
                {formatWeight(gameStats.totalVolumeLifted)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Treningshistorikk */}
      {workouts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold flex items-center gap-2">
              <Dumbbell className="text-electric" size={20} />
              Treningshistorikk
            </h3>
            <span className="text-soft-white/60 text-sm">
              {workouts.length} økter
            </span>
          </div>
          
          <div className="space-y-2">
            {[...workouts].reverse().slice(0, showAllWorkouts ? undefined : 5).map((workout) => {
              const volume = calculateWorkoutVolume(workout);
              const isExpanded = expandedWorkout === workout.id;
              
              return (
                <div key={workout.id} className="rounded-xl bg-white/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedWorkout(isExpanded ? null : workout.id)}
                    className="w-full p-3 text-left flex items-center justify-between hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-electric/20 flex items-center justify-center">
                        <Dumbbell className="text-electric" size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{workout.name}</p>
                        <p className="text-soft-white/60 text-xs">
                          {format(parseISO(workout.date), 'd. MMM yyyy', { locale: nb })}
                          {workout.duration && ` • ${workout.duration} min`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-electric font-semibold text-sm">{formatWeight(volume)}</p>
                        {workout.xpEarned && (
                          <p className="text-gold text-xs">+{workout.xpEarned} XP</p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="text-soft-white/40" size={16} />
                      ) : (
                        <ChevronDown className="text-soft-white/40" size={16} />
                      )}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2">
                      {workout.exercises.map((exercise) => {
                        const exVolume = calculateExerciseVolume(exercise);
                        const completedSets = exercise.sets.filter(s => s.completed);
                        
                        return (
                          <div key={exercise.id} className="p-2 rounded-lg bg-white/5">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm">{exercise.exerciseName}</p>
                              <p className="text-electric text-sm font-semibold">{formatWeight(exVolume)}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {completedSets.map((set, idx) => (
                                <span key={set.id} className="text-xs bg-white/10 px-2 py-1 rounded">
                                  {set.weight}kg × {set.reps}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {workouts.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllWorkouts(!showAllWorkouts)}
              className="w-full mt-3 py-2 text-sm text-electric hover:underline"
            >
              {showAllWorkouts ? 'Vis mindre' : `Vis alle ${workouts.length} økter`}
            </button>
          )}
        </div>
      )}

      {/* Physical Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Ruler className="mx-auto text-electric mb-2" size={24} />
          {isEditing ? (
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full px-2 py-1 rounded bg-white/10 text-center text-lg font-bold"
            />
          ) : (
            <p className="text-xl font-bold">{profile.height}</p>
          )}
          <p className="text-soft-white/60 text-xs">cm høyde</p>
        </div>
        
        <div className="card text-center">
          <Scale className="mx-auto text-neon-green mb-2" size={24} />
          {isEditing ? (
            <input
              type="number"
              value={currentWeight}
              onChange={(e) => setCurrentWeight(e.target.value)}
              className="w-full px-2 py-1 rounded bg-white/10 text-center text-lg font-bold"
            />
          ) : (
            <p className="text-xl font-bold">{profile.currentWeight}</p>
          )}
          <p className="text-soft-white/60 text-xs">kg vekt</p>
        </div>
        
        <div className="card text-center">
          <Calendar className="mx-auto text-coral mb-2" size={24} />
          <p className="text-xl font-bold">{age || '-'}</p>
          <p className="text-soft-white/60 text-xs">år</p>
        </div>
      </div>

      {/* Weight Goal */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold flex items-center gap-2">
            <Target className="text-gold" size={20} />
            Vektmål
          </h3>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <p className="text-soft-white/60 text-sm">Nå</p>
            <p className="text-xl font-bold">{profile.currentWeight} kg</p>
          </div>
          <div className="flex-1 mx-4 h-2 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-electric to-neon-green rounded-full transition-all"
              style={{ 
                width: `${profile.targetWeight === profile.currentWeight ? 100 :
                  Math.min(100, Math.max(0, 100 - (Math.abs(profile.currentWeight - profile.targetWeight) / 
                  Math.max(1, Math.abs(profile.currentWeight - profile.targetWeight))) * 100))}%` 
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-soft-white/60 text-sm">Mål</p>
            {isEditing ? (
              <input
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="w-20 px-2 py-1 rounded bg-white/10 text-center text-lg font-bold"
              />
            ) : (
              <p className="text-xl font-bold">{profile.targetWeight} kg</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity & Goal */}
      <div className="card">
        <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
          <Activity className="text-electric" size={20} />
          Aktivitet & Mål
        </h3>
        
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-soft-white/60 mb-2">Aktivitetsnivå</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as UserProfile['activityLevel'])}
                className="input-field"
              >
                {Object.entries(activityLevelLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-soft-white/60 mb-2">Treningsmål</label>
              <select
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value as UserProfile['fitnessGoal'])}
                className="input-field"
              >
                {Object.entries(fitnessGoalLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-soft-white/60">Aktivitetsnivå</span>
              <span className="font-medium">{activityLevelLabels[profile.activityLevel]}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-soft-white/60">Treningsmål</span>
              <span className="font-medium">{fitnessGoalLabels[profile.fitnessGoal]}</span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Actions */}
      {isEditing && (
        <div className="flex gap-3">
          <button
            onClick={() => {
              setIsEditing(false);
              setName(profile.name);
              setHeight(profile.height.toString());
              setCurrentWeight(profile.currentWeight.toString());
              setTargetWeight(profile.targetWeight.toString());
              setActivityLevel(profile.activityLevel);
              setFitnessGoal(profile.fitnessGoal);
            }}
            className="flex-1 btn-secondary flex items-center justify-center gap-2"
          >
            <X size={20} />
            Avbryt
          </button>
          <button
            onClick={handleSave}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Lagre
          </button>
        </div>
      )}

      {/* Logout */}
      {!isEditing && (
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full p-4 rounded-xl bg-coral/10 text-coral hover:bg-coral/20 transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Logg ut / Slett data
        </button>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-md bg-deep-purple rounded-2xl p-6 animate-fadeInUp">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-coral/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-coral" size={32} />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">Logg ut?</h3>
              <p className="text-soft-white/60">
                Dette vil slette all din lokale data inkludert treningshistorikk, XP, achievements og mål. 
                Denne handlingen kan ikke angres.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 btn-secondary"
              >
                Avbryt
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-coral text-white px-6 py-3 rounded-xl font-semibold hover:bg-coral/80 transition-all"
              >
                Logg ut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
