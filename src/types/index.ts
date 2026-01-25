// Bruker-profil
export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  height: number; // cm
  currentWeight: number; // kg
  targetWeight: number; // kg
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  fitnessGoal: 'lose_weight' | 'maintain' | 'build_muscle' | 'improve_fitness';
  createdAt: string;
  avatarColor?: string;
  
  // Utvidet profilinformasjon
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  availableEquipment?: ('gym' | 'home_basic' | 'home_full' | 'bodyweight')[];
  focusAreas?: ('chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'glutes')[];
  injuries?: string[];
  preferredWorkoutDuration?: 30 | 45 | 60 | 90;
  workoutsPerWeek?: number;
  specificGoals?: {
    benchPress?: number;
    squat?: number;
    deadlift?: number;
    pullups?: number;
    runningDistance?: number;
  };
  trainingPreferences?: {
    preferCardio?: boolean;
    preferHIIT?: boolean;
    preferStrength?: boolean;
    preferFlexibility?: boolean;
  };
}

// Erfaringsnivå oversettelser
export const experienceLevelLabels: Record<NonNullable<UserProfile['experienceLevel']>, string> = {
  beginner: 'Nybegynner',
  intermediate: 'Middels',
  advanced: 'Avansert',
};

// Utstyr oversettelser
export const equipmentLabels: Record<string, string> = {
  gym: 'Treningssenter',
  home_basic: 'Hjemme (grunnleggende)',
  home_full: 'Hjemme (fullt utstyrt)',
  bodyweight: 'Kun kroppsvekt',
};

// Fokusområder oversettelser
export const focusAreaLabels: Record<string, string> = {
  chest: 'Bryst',
  back: 'Rygg',
  shoulders: 'Skuldre',
  arms: 'Armer',
  legs: 'Ben',
  core: 'Mage/Core',
  glutes: 'Rumpe',
};

// Gamification
export interface GameStats {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: string;
  totalWorkouts: number;
  totalVolumeLifted: number;
  achievements: string[];
  weeklyXP: number;
  weekStartDate: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  requirement: {
    type: 'workouts' | 'streak' | 'volume' | 'level' | 'exercises';
    value: number;
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_workout', name: 'Første Steg', description: 'Fullfør din første økt', icon: '🎯', xpReward: 100, requirement: { type: 'workouts', value: 1 } },
  { id: 'workout_5', name: 'Dedikert', description: 'Fullfør 5 økter', icon: '💪', xpReward: 250, requirement: { type: 'workouts', value: 5 } },
  { id: 'workout_10', name: 'Vanebygger', description: 'Fullfør 10 økter', icon: '🔥', xpReward: 500, requirement: { type: 'workouts', value: 10 } },
  { id: 'workout_25', name: 'Treningsmaskin', description: 'Fullfør 25 økter', icon: '⚡', xpReward: 1000, requirement: { type: 'workouts', value: 25 } },
  { id: 'workout_50', name: 'Jernvilje', description: 'Fullfør 50 økter', icon: '🏆', xpReward: 2500, requirement: { type: 'workouts', value: 50 } },
  { id: 'workout_100', name: 'Legendarisk', description: 'Fullfør 100 økter', icon: '👑', xpReward: 5000, requirement: { type: 'workouts', value: 100 } },
  { id: 'streak_3', name: 'På Rulle', description: '3 dagers streak', icon: '🌟', xpReward: 150, requirement: { type: 'streak', value: 3 } },
  { id: 'streak_7', name: 'Ukeskrigeren', description: '7 dagers streak', icon: '💎', xpReward: 500, requirement: { type: 'streak', value: 7 } },
  { id: 'streak_14', name: 'Ustoppelig', description: '14 dagers streak', icon: '🚀', xpReward: 1000, requirement: { type: 'streak', value: 14 } },
  { id: 'streak_30', name: 'Månedsmonster', description: '30 dagers streak', icon: '🌙', xpReward: 3000, requirement: { type: 'streak', value: 30 } },
  { id: 'volume_1000', name: 'Tonneløfter', description: 'Løft 1,000 kg totalt', icon: '🏋️', xpReward: 200, requirement: { type: 'volume', value: 1000 } },
  { id: 'volume_10000', name: 'Kraftpakke', description: 'Løft 10,000 kg totalt', icon: '💥', xpReward: 750, requirement: { type: 'volume', value: 10000 } },
  { id: 'volume_50000', name: 'Titan', description: 'Løft 50,000 kg totalt', icon: '🗿', xpReward: 2000, requirement: { type: 'volume', value: 50000 } },
  { id: 'volume_100000', name: 'Olympier', description: 'Løft 100,000 kg totalt', icon: '🏛️', xpReward: 5000, requirement: { type: 'volume', value: 100000 } },
  { id: 'level_5', name: 'Nybegynner', description: 'Nå nivå 5', icon: '⭐', xpReward: 0, requirement: { type: 'level', value: 5 } },
  { id: 'level_10', name: 'Erfaren', description: 'Nå nivå 10', icon: '🌟', xpReward: 0, requirement: { type: 'level', value: 10 } },
  { id: 'level_25', name: 'Mester', description: 'Nå nivå 25', icon: '💫', xpReward: 0, requirement: { type: 'level', value: 25 } },
  { id: 'level_50', name: 'Grandmaster', description: 'Nå nivå 50', icon: '✨', xpReward: 0, requirement: { type: 'level', value: 50 } },
];

// XP beregning
export const XP_PER_WORKOUT = 50;
export const XP_PER_KG = 0.1;
export const XP_STREAK_BONUS = 25; // per dag i streak

// Nivå beregning - basert på brukerens ukentlige treningsmål
// Standard: 4 økter per nivå (ca. 1 uke med trening = 1 nivå)
export const DEFAULT_WORKOUTS_PER_LEVEL = 4;

// Beregn økter per nivå basert på brukerens ukentlige mål
export const getWorkoutsPerLevel = (workoutsPerWeek?: number): number => {
  if (!workoutsPerWeek) return DEFAULT_WORKOUTS_PER_LEVEL;
  // Nivå opp etter ca. 1 uke med trening (3-5 økter basert på mål)
  return Math.max(3, Math.min(5, workoutsPerWeek));
};

export const calculateLevel = (totalWorkouts: number, workoutsPerWeek?: number): number => {
  const perLevel = getWorkoutsPerLevel(workoutsPerWeek);
  return Math.floor(totalWorkouts / perLevel) + 1;
};

export const calculateLevelFromXP = (xp: number): number => {
  // Backup for XP-basert hvis trengt
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const workoutsToNextLevel = (totalWorkouts: number, workoutsPerWeek?: number): { current: number; required: number; progress: number } => {
  const perLevel = getWorkoutsPerLevel(workoutsPerWeek);
  const currentLevel = calculateLevel(totalWorkouts, workoutsPerWeek);
  const workoutsForCurrentLevel = (currentLevel - 1) * perLevel;
  const workoutsInCurrentLevel = totalWorkouts - workoutsForCurrentLevel;
  
  return {
    current: workoutsInCurrentLevel,
    required: perLevel,
    progress: (workoutsInCurrentLevel / perLevel) * 100,
  };
};

// Legacy XP progress (for visning)
export const xpToNextLevel = (xp: number): { current: number; required: number; progress: number } => {
  return {
    current: xp % 1000,
    required: 1000,
    progress: (xp % 1000) / 10,
  };
};

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Nybegynner',
  5: 'Treningsentuisiast',
  10: 'Dedikert Løfter',
  15: 'Styrkebygger',
  20: 'Fitnesskriger',
  25: 'Jernmester',
  30: 'Eliteløfter',
  40: 'Treningslegende',
  50: 'Grandmaster',
  75: 'Udødelig',
  100: 'Gud',
};

export const getLevelTitle = (level: number): string => {
  const titles = Object.entries(LEVEL_TITLES)
    .map(([lvl, title]) => ({ level: parseInt(lvl), title }))
    .sort((a, b) => b.level - a.level);
  
  for (const { level: lvl, title } of titles) {
    if (level >= lvl) return title;
  }
  return 'Nybegynner';
};

// Treningsøkt typer
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
}

export type ExerciseCategory = 
  | 'chest' 
  | 'back' 
  | 'shoulders' 
  | 'biceps' 
  | 'triceps' 
  | 'legs' 
  | 'core' 
  | 'cardio';

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Workout {
  id: string;
  date: string;
  name: string;
  exercises: WorkoutExercise[];
  duration?: number; // minutter
  notes?: string;
  xpEarned?: number;
  rating?: number; // 1-6 stjerner
  comment?: string; // valgfri kommentar
  workoutType?: 'weights' | 'cardio'; // type trening
}

// Treningsplan
export interface TrainingPlan {
  id: string;
  name: string;
  goal: 'strength' | 'muscle' | 'weightloss' | 'fitness';
  daysPerWeek: number;
  days: TrainingDay[];
  createdAt: string;
}

export interface TrainingDay {
  dayNumber: number;
  name: string;
  exercises: PlannedExercise[];
}

export interface PlannedExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
}

export const goalLabels: Record<TrainingPlan['goal'], string> = {
  strength: 'Styrke',
  muscle: 'Muskelvekst',
  weightloss: 'Vekttap',
  fitness: 'Kondisjon',
};

// Mål typer
export interface Goal {
  id: string;
  type: 'weight' | 'strength' | 'nutrition';
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline?: string;
  completed: boolean;
}

// Kropps-statistikk
export interface BodyStats {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  notes?: string;
}

// Kategorioversettelser
export const categoryLabels: Record<ExerciseCategory, string> = {
  chest: 'Bryst',
  back: 'Rygg',
  shoulders: 'Skuldre',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Ben',
  core: 'Mage/Core',
  cardio: 'Cardio',
};

// Aktivitetsnivå oversettelser
export const activityLevelLabels: Record<UserProfile['activityLevel'], string> = {
  sedentary: 'Stillesittende',
  light: 'Lett aktiv',
  moderate: 'Moderat aktiv',
  active: 'Aktiv',
  very_active: 'Veldig aktiv',
};

// Treningsmål oversettelser
export const fitnessGoalLabels: Record<UserProfile['fitnessGoal'], string> = {
  lose_weight: 'Gå ned i vekt',
  maintain: 'Vedlikeholde',
  build_muscle: 'Bygge muskler',
  improve_fitness: 'Bedre kondisjon',
};
