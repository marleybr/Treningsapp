'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Check, Clock, Trophy, Zap, Star, Sparkles, Minus, Brain, Calendar, ChevronRight, Dumbbell, Play, Target, AlertTriangle, Flame } from 'lucide-react';
import { Workout, WorkoutExercise, GameStats, ACHIEVEMENTS, XP_PER_WORKOUT, XP_PER_KG, XP_STREAK_BONUS, calculateLevel, TrainingPlan, TrainingDay, goalLabels, UserProfile, experienceLevelLabels, focusAreaLabels } from '@/types';
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
  trainingPlans: TrainingPlan[];
  setTrainingPlans: (plans: TrainingPlan[]) => void;
  userProfile?: UserProfile;
}

// Utvidet øvelsesdatabase med utstyrskrav og muskelgrupper
interface ExerciseDefinition {
  name: string;
  category: 'compound' | 'isolation' | 'cardio';
  equipment: ('gym' | 'home_basic' | 'home_full' | 'bodyweight')[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  avoidWithInjuries?: string[];
}

const EXERCISE_DATABASE: ExerciseDefinition[] = [
  // Bryst øvelser
  { name: 'Benkpress', category: 'compound', equipment: ['gym', 'home_full'], primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'], difficulty: 'intermediate' },
  { name: 'Skråbenk', category: 'compound', equipment: ['gym', 'home_full'], primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'], difficulty: 'intermediate' },
  { name: 'Manualpress', category: 'compound', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'], difficulty: 'beginner' },
  { name: 'Kabelflyes', category: 'isolation', equipment: ['gym'], primaryMuscles: ['chest'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Push-ups', category: 'compound', equipment: ['bodyweight', 'home_basic', 'home_full', 'gym'], primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders', 'core'], difficulty: 'beginner' },
  { name: 'Decline push-ups', category: 'compound', equipment: ['bodyweight', 'home_basic'], primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'], difficulty: 'intermediate' },
  { name: 'Dips', category: 'compound', equipment: ['gym', 'home_full', 'bodyweight'], primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'], difficulty: 'intermediate', avoidWithInjuries: ['Skulderproblemer'] },
  { name: 'Chest press maskin', category: 'compound', equipment: ['gym'], primaryMuscles: ['chest'], secondaryMuscles: ['triceps'], difficulty: 'beginner' },
  
  // Rygg øvelser
  { name: 'Pullups', category: 'compound', equipment: ['gym', 'home_full', 'bodyweight'], primaryMuscles: ['back'], secondaryMuscles: ['biceps', 'shoulders'], difficulty: 'intermediate' },
  { name: 'Chin-ups', category: 'compound', equipment: ['gym', 'home_full', 'bodyweight'], primaryMuscles: ['back', 'biceps'], secondaryMuscles: ['shoulders'], difficulty: 'intermediate' },
  { name: 'Lat pulldown', category: 'compound', equipment: ['gym'], primaryMuscles: ['back'], secondaryMuscles: ['biceps'], difficulty: 'beginner' },
  { name: 'Sittende rows', category: 'compound', equipment: ['gym'], primaryMuscles: ['back'], secondaryMuscles: ['biceps', 'shoulders'], difficulty: 'beginner' },
  { name: 'Bøyde rows', category: 'compound', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['back'], secondaryMuscles: ['biceps'], difficulty: 'intermediate', avoidWithInjuries: ['Ryggproblemer'] },
  { name: 'Enarms row', category: 'compound', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['back'], secondaryMuscles: ['biceps'], difficulty: 'beginner' },
  { name: 'Face pulls', category: 'isolation', equipment: ['gym'], primaryMuscles: ['back', 'shoulders'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Inverted rows', category: 'compound', equipment: ['gym', 'bodyweight'], primaryMuscles: ['back'], secondaryMuscles: ['biceps'], difficulty: 'beginner' },
  { name: 'Superman hold', category: 'isolation', equipment: ['bodyweight'], primaryMuscles: ['back'], secondaryMuscles: ['glutes'], difficulty: 'beginner' },
  
  // Skulder øvelser
  { name: 'Skulderpress', category: 'compound', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps'], difficulty: 'intermediate', avoidWithInjuries: ['Skulderproblemer'] },
  { name: 'Arnold press', category: 'compound', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps'], difficulty: 'intermediate' },
  { name: 'Lateral raises', category: 'isolation', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['shoulders'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Front raises', category: 'isolation', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['shoulders'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Reverse flyes', category: 'isolation', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['shoulders', 'back'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Pike push-ups', category: 'compound', equipment: ['bodyweight'], primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps'], difficulty: 'intermediate' },
  { name: 'Handstand push-ups', category: 'compound', equipment: ['bodyweight'], primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps', 'core'], difficulty: 'advanced' },
  
  // Arm øvelser
  { name: 'Bicep curls', category: 'isolation', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['biceps'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Hammer curls', category: 'isolation', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['biceps'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Preacher curls', category: 'isolation', equipment: ['gym'], primaryMuscles: ['biceps'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Concentration curls', category: 'isolation', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['biceps'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Triceps pushdown', category: 'isolation', equipment: ['gym'], primaryMuscles: ['triceps'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Triceps extensions', category: 'isolation', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['triceps'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Skull crushers', category: 'isolation', equipment: ['gym', 'home_full'], primaryMuscles: ['triceps'], secondaryMuscles: [], difficulty: 'intermediate' },
  { name: 'Close-grip push-ups', category: 'compound', equipment: ['bodyweight'], primaryMuscles: ['triceps'], secondaryMuscles: ['chest'], difficulty: 'beginner' },
  { name: 'Diamond push-ups', category: 'compound', equipment: ['bodyweight'], primaryMuscles: ['triceps'], secondaryMuscles: ['chest'], difficulty: 'intermediate' },
  
  // Ben øvelser
  { name: 'Knebøy', category: 'compound', equipment: ['gym', 'home_full'], primaryMuscles: ['legs', 'glutes'], secondaryMuscles: ['core'], difficulty: 'intermediate', avoidWithInjuries: ['Kneproblemer', 'Ryggproblemer'] },
  { name: 'Front squat', category: 'compound', equipment: ['gym', 'home_full'], primaryMuscles: ['legs'], secondaryMuscles: ['core', 'glutes'], difficulty: 'advanced', avoidWithInjuries: ['Kneproblemer'] },
  { name: 'Goblet squat', category: 'compound', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['legs', 'glutes'], secondaryMuscles: ['core'], difficulty: 'beginner' },
  { name: 'Bodyweight squats', category: 'compound', equipment: ['bodyweight'], primaryMuscles: ['legs', 'glutes'], secondaryMuscles: ['core'], difficulty: 'beginner' },
  { name: 'Romanian deadlift', category: 'compound', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['legs', 'glutes'], secondaryMuscles: ['back'], difficulty: 'intermediate', avoidWithInjuries: ['Ryggproblemer'] },
  { name: 'Markløft', category: 'compound', equipment: ['gym', 'home_full'], primaryMuscles: ['legs', 'back', 'glutes'], secondaryMuscles: ['core'], difficulty: 'advanced', avoidWithInjuries: ['Ryggproblemer'] },
  { name: 'Leg press', category: 'compound', equipment: ['gym'], primaryMuscles: ['legs', 'glutes'], secondaryMuscles: [], difficulty: 'beginner', avoidWithInjuries: ['Kneproblemer'] },
  { name: 'Leg extension', category: 'isolation', equipment: ['gym'], primaryMuscles: ['legs'], secondaryMuscles: [], difficulty: 'beginner', avoidWithInjuries: ['Kneproblemer'] },
  { name: 'Leg curl', category: 'isolation', equipment: ['gym'], primaryMuscles: ['legs'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Lunges', category: 'compound', equipment: ['gym', 'home_basic', 'home_full', 'bodyweight'], primaryMuscles: ['legs', 'glutes'], secondaryMuscles: ['core'], difficulty: 'beginner', avoidWithInjuries: ['Kneproblemer'] },
  { name: 'Bulgarian split squat', category: 'compound', equipment: ['gym', 'home_basic', 'bodyweight'], primaryMuscles: ['legs', 'glutes'], secondaryMuscles: ['core'], difficulty: 'intermediate', avoidWithInjuries: ['Kneproblemer'] },
  { name: 'Step-ups', category: 'compound', equipment: ['gym', 'home_basic', 'bodyweight'], primaryMuscles: ['legs', 'glutes'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Calf raises', category: 'isolation', equipment: ['gym', 'home_basic', 'bodyweight'], primaryMuscles: ['legs'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Hip thrusts', category: 'compound', equipment: ['gym', 'home_full'], primaryMuscles: ['glutes'], secondaryMuscles: ['legs'], difficulty: 'intermediate' },
  { name: 'Glute bridges', category: 'compound', equipment: ['bodyweight', 'home_basic'], primaryMuscles: ['glutes'], secondaryMuscles: ['legs', 'core'], difficulty: 'beginner' },
  
  // Core øvelser
  { name: 'Plank', category: 'isolation', equipment: ['bodyweight', 'gym', 'home_basic', 'home_full'], primaryMuscles: ['core'], secondaryMuscles: ['shoulders'], difficulty: 'beginner' },
  { name: 'Side plank', category: 'isolation', equipment: ['bodyweight'], primaryMuscles: ['core'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Dead bug', category: 'isolation', equipment: ['bodyweight'], primaryMuscles: ['core'], secondaryMuscles: [], difficulty: 'beginner', avoidWithInjuries: ['Ryggproblemer'] },
  { name: 'Russian twists', category: 'isolation', equipment: ['bodyweight', 'home_basic'], primaryMuscles: ['core'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Bicycle crunches', category: 'isolation', equipment: ['bodyweight'], primaryMuscles: ['core'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Leg raises', category: 'isolation', equipment: ['bodyweight', 'gym'], primaryMuscles: ['core'], secondaryMuscles: [], difficulty: 'intermediate' },
  { name: 'Hanging leg raises', category: 'isolation', equipment: ['gym', 'home_full'], primaryMuscles: ['core'], secondaryMuscles: [], difficulty: 'advanced' },
  { name: 'Ab rollout', category: 'isolation', equipment: ['gym', 'home_basic'], primaryMuscles: ['core'], secondaryMuscles: ['shoulders'], difficulty: 'intermediate' },
  { name: 'Cable woodchops', category: 'isolation', equipment: ['gym'], primaryMuscles: ['core'], secondaryMuscles: [], difficulty: 'intermediate' },
  { name: 'Mountain climbers', category: 'cardio', equipment: ['bodyweight'], primaryMuscles: ['core'], secondaryMuscles: ['legs', 'shoulders'], difficulty: 'beginner' },
  
  // Cardio øvelser
  { name: 'Løping', category: 'cardio', equipment: ['gym', 'bodyweight'], primaryMuscles: ['legs'], secondaryMuscles: ['core'], difficulty: 'beginner', avoidWithInjuries: ['Kneproblemer', 'Ankelskade'] },
  { name: 'Sykling', category: 'cardio', equipment: ['gym'], primaryMuscles: ['legs'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Romaskin', category: 'cardio', equipment: ['gym'], primaryMuscles: ['back', 'legs'], secondaryMuscles: ['arms', 'core'], difficulty: 'beginner' },
  { name: 'Burpees', category: 'cardio', equipment: ['bodyweight'], primaryMuscles: ['legs'], secondaryMuscles: ['chest', 'core'], difficulty: 'intermediate' },
  { name: 'Jumping jacks', category: 'cardio', equipment: ['bodyweight'], primaryMuscles: ['legs'], secondaryMuscles: [], difficulty: 'beginner' },
  { name: 'Jump rope', category: 'cardio', equipment: ['home_basic', 'gym'], primaryMuscles: ['legs'], secondaryMuscles: ['core'], difficulty: 'beginner', avoidWithInjuries: ['Kneproblemer', 'Ankelskade'] },
  { name: 'Box jumps', category: 'cardio', equipment: ['gym'], primaryMuscles: ['legs', 'glutes'], secondaryMuscles: ['core'], difficulty: 'intermediate', avoidWithInjuries: ['Kneproblemer'] },
  { name: 'Battle ropes', category: 'cardio', equipment: ['gym'], primaryMuscles: ['arms', 'shoulders'], secondaryMuscles: ['core'], difficulty: 'intermediate' },
  { name: 'Kettlebell swings', category: 'cardio', equipment: ['gym', 'home_basic', 'home_full'], primaryMuscles: ['glutes', 'legs'], secondaryMuscles: ['core', 'back'], difficulty: 'intermediate', avoidWithInjuries: ['Ryggproblemer'] },
];

// Avansert planlegger
interface PlanConfig {
  goal: TrainingPlan['goal'];
  daysPerWeek: number;
  experienceLevel: UserProfile['experienceLevel'];
  equipment: string[];
  focusAreas: string[];
  injuries: string[];
  duration: number;
  preferences: {
    preferCardio: boolean;
    preferHIIT: boolean;
    preferStrength: boolean;
    preferFlexibility: boolean;
  };
}

const generateAdvancedPlan = (config: PlanConfig): TrainingDay[] => {
  const { goal, daysPerWeek, experienceLevel = 'beginner', equipment, focusAreas, injuries, duration, preferences } = config;
  
  // Filtrer øvelser basert på utstyr og skader
  const availableExercises = EXERCISE_DATABASE.filter(ex => {
    // Sjekk utstyr
    const hasEquipment = ex.equipment.some(eq => equipment.includes(eq));
    if (!hasEquipment) return false;
    
    // Sjekk skader
    if (ex.avoidWithInjuries) {
      const hasConflict = ex.avoidWithInjuries.some(injury => injuries.includes(injury));
      if (hasConflict) return false;
    }
    
    // Sjekk vanskelighetsgrad
    if (experienceLevel === 'beginner' && ex.difficulty === 'advanced') return false;
    if (experienceLevel === 'intermediate' && ex.difficulty === 'advanced') {
      // 50% sjanse for å inkludere avanserte øvelser for mellomliggende
      return Math.random() > 0.5;
    }
    
    return true;
  });

  // Hjelpefunksjon for å velge øvelser
  const selectExercises = (muscles: string[], count: number, includeIsolation: boolean = true): ExerciseDefinition[] => {
    const filtered = availableExercises.filter(ex => 
      muscles.some(m => ex.primaryMuscles.includes(m))
    );
    
    const compounds = filtered.filter(ex => ex.category === 'compound');
    const isolations = filtered.filter(ex => ex.category === 'isolation');
    
    const selected: ExerciseDefinition[] = [];
    
    // Prioriter sammensatte øvelser
    const compoundCount = includeIsolation ? Math.ceil(count * 0.6) : count;
    const shuffledCompounds = [...compounds].sort(() => Math.random() - 0.5);
    selected.push(...shuffledCompounds.slice(0, compoundCount));
    
    // Legg til isolasjonsøvelser
    if (includeIsolation && isolations.length > 0) {
      const isolationCount = count - selected.length;
      const shuffledIsolations = [...isolations].sort(() => Math.random() - 0.5);
      selected.push(...shuffledIsolations.slice(0, isolationCount));
    }
    
    return selected.slice(0, count);
  };

  // Beregn sett/reps basert på mål og erfaring
  const getSetsReps = (exercise: ExerciseDefinition): { sets: number; reps: string; restSeconds: number } => {
    let sets = 3;
    let reps = '8-12';
    let restSeconds = 90;
    
    // Juster for mål
    switch (goal) {
      case 'strength':
        sets = experienceLevel === 'beginner' ? 4 : 5;
        reps = '4-6';
        restSeconds = 180;
        break;
      case 'muscle':
        sets = experienceLevel === 'beginner' ? 3 : 4;
        reps = '8-12';
        restSeconds = 90;
        break;
      case 'weightloss':
        sets = 3;
        reps = '12-15';
        restSeconds = 45;
        break;
      case 'fitness':
        sets = 3;
        reps = '10-15';
        restSeconds = 60;
        break;
    }
    
    // Juster for øvelsestype
    if (exercise.category === 'isolation') {
      sets = Math.max(2, sets - 1);
      reps = goal === 'strength' ? '8-12' : '12-15';
    }
    
    if (exercise.category === 'cardio') {
      return { sets: 1, reps: duration >= 60 ? '15-20 min' : '10-15 min', restSeconds: 60 };
    }
    
    // Juster for erfaring
    if (experienceLevel === 'beginner') {
      sets = Math.max(2, sets - 1);
    }
    
    return { sets, reps, restSeconds };
  };

  // Velg treningssplit basert på dager
  const getSplit = (): string[][] => {
    const hasFocusAreas = focusAreas.length > 0;
    
    // Muskelmapping for fokusområder
    const focusMuscles = focusAreas.flatMap(area => {
      switch (area) {
        case 'chest': return ['chest'];
        case 'back': return ['back'];
        case 'shoulders': return ['shoulders'];
        case 'arms': return ['biceps', 'triceps'];
        case 'legs': return ['legs'];
        case 'core': return ['core'];
        case 'glutes': return ['glutes'];
        default: return [];
      }
    });
    
    // Splits basert på dager og preferanser
    if (daysPerWeek <= 2) {
      return [['fullbody'], ['fullbody']].slice(0, daysPerWeek);
    }
    
    if (daysPerWeek === 3) {
      if (hasFocusAreas && focusMuscles.length <= 3) {
        // Fokusert split
        return [
          ['push', ...focusMuscles],
          ['pull', ...focusMuscles],
          ['legs', 'core']
        ];
      }
      return [['push'], ['pull'], ['legs']];
    }
    
    if (daysPerWeek === 4) {
      if (preferences.preferCardio || goal === 'weightloss') {
        return [['upper'], ['lower'], ['push', 'cardio'], ['pull', 'cardio']];
      }
      return [['upper'], ['lower'], ['push'], ['pull']];
    }
    
    if (daysPerWeek === 5) {
      if (hasFocusAreas) {
        const focusDay = focusMuscles.length > 0 ? [focusMuscles.slice(0, 3).join('_')] : ['arms'];
        return [['push'], ['pull'], ['legs'], ['upper'], focusDay];
      }
      if (preferences.preferCardio || goal === 'fitness') {
        return [['push'], ['pull'], ['legs'], ['upper', 'cardio'], ['lower', 'cardio']];
      }
      return [['chest', 'triceps'], ['back', 'biceps'], ['legs'], ['shoulders', 'arms'], ['fullbody']];
    }
    
    // 6 dager
    if (goal === 'weightloss' || preferences.preferHIIT) {
      return [['push'], ['pull'], ['legs', 'cardio'], ['push'], ['pull'], ['legs', 'cardio']];
    }
    return [['push'], ['pull'], ['legs'], ['chest', 'shoulders'], ['back', 'arms'], ['legs', 'glutes']];
  };

  const split = getSplit();
  
  // Generer treningsdager
  return split.map((dayTypes, i) => {
    let exercises: { name: string; sets: number; reps: string; restSeconds: number }[] = [];
    let dayName = '';
    
    // Beregn antall øvelser basert på varighet
    const exerciseTime = goal === 'strength' ? 8 : goal === 'weightloss' ? 4 : 6; // minutter per øvelse
    const warmupTime = 5;
    const maxExercises = Math.floor((duration - warmupTime) / exerciseTime);
    
    // Bygg øvelser for dagen
    dayTypes.forEach(type => {
      let selectedExercises: ExerciseDefinition[] = [];
      
      switch (type) {
        case 'push':
          selectedExercises = selectExercises(['chest', 'shoulders', 'triceps'], Math.min(5, maxExercises));
          dayName = 'Push dag';
          break;
        case 'pull':
          selectedExercises = selectExercises(['back', 'biceps'], Math.min(5, maxExercises));
          dayName = 'Pull dag';
          break;
        case 'legs':
          selectedExercises = selectExercises(['legs', 'glutes'], Math.min(5, maxExercises));
          dayName = 'Ben dag';
          break;
        case 'upper':
          selectedExercises = selectExercises(['chest', 'back', 'shoulders', 'biceps', 'triceps'], Math.min(6, maxExercises));
          dayName = 'Overkropp';
          break;
        case 'lower':
          selectedExercises = selectExercises(['legs', 'glutes', 'core'], Math.min(5, maxExercises));
          dayName = 'Underkropp';
          break;
        case 'fullbody':
          selectedExercises = selectExercises(['chest', 'back', 'legs', 'shoulders'], Math.min(6, maxExercises));
          dayName = 'Helkropp';
          break;
        case 'cardio':
          const cardioExercises = availableExercises.filter(ex => ex.category === 'cardio');
          selectedExercises = cardioExercises.sort(() => Math.random() - 0.5).slice(0, 3);
          if (!dayName) dayName = 'Cardio';
          break;
        case 'chest':
          selectedExercises.push(...selectExercises(['chest'], 3));
          dayName = dayName || 'Bryst';
          break;
        case 'back':
          selectedExercises.push(...selectExercises(['back'], 3));
          dayName = dayName || 'Rygg';
          break;
        case 'shoulders':
          selectedExercises.push(...selectExercises(['shoulders'], 2));
          dayName = dayName || 'Skuldre';
          break;
        case 'arms':
          selectedExercises.push(...selectExercises(['biceps', 'triceps'], 4, true));
          dayName = dayName || 'Armer';
          break;
        case 'triceps':
          selectedExercises.push(...selectExercises(['triceps'], 2));
          break;
        case 'biceps':
          selectedExercises.push(...selectExercises(['biceps'], 2));
          break;
        case 'glutes':
          selectedExercises.push(...selectExercises(['glutes'], 3));
          dayName = dayName || 'Rumpe fokus';
          break;
        case 'core':
          selectedExercises.push(...selectExercises(['core'], 3));
          break;
        default:
          // Håndter fokusområder
          if (type.includes('_')) {
            const muscles = type.split('_');
            selectedExercises = selectExercises(muscles, Math.min(5, maxExercises));
            dayName = 'Fokus dag';
          }
      }
      
      exercises.push(...selectedExercises.map(ex => ({
        name: ex.name,
        ...getSetsReps(ex)
      })));
    });
    
    // Legg til core for de fleste dager hvis ikke allerede der
    if (!dayTypes.includes('core') && !dayTypes.includes('fullbody') && Math.random() > 0.5) {
      const coreExercises = selectExercises(['core'], 2, false);
      exercises.push(...coreExercises.map(ex => ({
        name: ex.name,
        ...getSetsReps(ex)
      })));
    }
    
    // Begrens antall øvelser
    exercises = exercises.slice(0, maxExercises);
    
    // Fjern duplikater
    const uniqueExercises = exercises.filter((ex, index, self) => 
      index === self.findIndex(e => e.name === ex.name)
    );
    
    return {
      dayNumber: i + 1,
      name: dayName || `Dag ${i + 1}`,
      exercises: uniqueExercises.length > 0 ? uniqueExercises : [
        { name: 'Push-ups', sets: 3, reps: '10-15', restSeconds: 60 },
        { name: 'Bodyweight squats', sets: 3, reps: '15-20', restSeconds: 60 },
        { name: 'Plank', sets: 3, reps: '30-45 sek', restSeconds: 45 }
      ],
    };
  });
};

// Legacy wrapper for bakoverkompatibilitet
const generatePlan = (goal: TrainingPlan['goal'], daysPerWeek: number): TrainingDay[] => {
  return generateAdvancedPlan({
    goal,
    daysPerWeek,
    experienceLevel: 'intermediate',
    equipment: ['gym'],
    focusAreas: [],
    injuries: [],
    duration: 60,
    preferences: {
      preferCardio: false,
      preferHIIT: false,
      preferStrength: true,
      preferFlexibility: false,
    }
  });
};

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
  trainingPlans, setTrainingPlans,
  userProfile,
}: WorkoutTabProps) {
  const [newExerciseName, setNewExerciseName] = useState('');
  const [showXPGain, setShowXPGain] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [workoutComment, setWorkoutComment] = useState('');
  const [pendingFinish, setPendingFinish] = useState<{ workout: Workout; stats: any } | null>(null);
  
  // Treningsplan states
  const [showPlanGenerator, setShowPlanGenerator] = useState(false);
  const [planStep, setPlanStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState<TrainingPlan['goal']>(
    userProfile?.fitnessGoal === 'build_muscle' ? 'muscle' :
    userProfile?.fitnessGoal === 'lose_weight' ? 'weightloss' :
    userProfile?.fitnessGoal === 'improve_fitness' ? 'fitness' : 'muscle'
  );
  const [selectedDays, setSelectedDays] = useState(userProfile?.workoutsPerWeek || 3);
  const [selectedExperience, setSelectedExperience] = useState<UserProfile['experienceLevel']>(userProfile?.experienceLevel || 'beginner');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(userProfile?.availableEquipment || ['gym']);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(userProfile?.focusAreas || []);
  const [selectedInjuries, setSelectedInjuries] = useState<string[]>(userProfile?.injuries || []);
  const [selectedDuration, setSelectedDuration] = useState<30 | 45 | 60 | 90>(userProfile?.preferredWorkoutDuration || 45);
  const [selectedPreferences, setSelectedPreferences] = useState({
    preferCardio: userProfile?.trainingPreferences?.preferCardio || false,
    preferHIIT: userProfile?.trainingPreferences?.preferHIIT || false,
    preferStrength: userProfile?.trainingPreferences?.preferStrength || true,
    preferFlexibility: userProfile?.trainingPreferences?.preferFlexibility || false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<TrainingPlan | null>(null);

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

  // Generer AI treningsplan med alle parametre
  const generateAIPlan = () => {
    setIsGenerating(true);
    
    // Simuler AI-tenking
    setTimeout(() => {
      const days = generateAdvancedPlan({
        goal: selectedGoal,
        daysPerWeek: selectedDays,
        experienceLevel: selectedExperience,
        equipment: selectedEquipment,
        focusAreas: selectedFocusAreas,
        injuries: selectedInjuries,
        duration: selectedDuration,
        preferences: selectedPreferences,
      });
      
      // Lag et beskrivende navn
      const focusText = selectedFocusAreas.length > 0 
        ? ` (${selectedFocusAreas.slice(0, 2).map(f => focusAreaLabels[f] || f).join(', ')} fokus)`
        : '';
      
      const newPlan: TrainingPlan = {
        id: Date.now().toString(),
        name: `${goalLabels[selectedGoal]}${focusText} - ${selectedDays}x/uke`,
        goal: selectedGoal,
        daysPerWeek: selectedDays,
        days,
        createdAt: new Date().toISOString(),
      };
      
      setTrainingPlans([...trainingPlans, newPlan]);
      setIsGenerating(false);
      setShowPlanGenerator(false);
      setPlanStep(1);
      setViewingPlan(newPlan);
    }, 2000);
  };
  
  const planTotalSteps = 4;
  
  const toggleEquipment = (eq: string) => {
    if (selectedEquipment.includes(eq)) {
      if (selectedEquipment.length > 1) {
        setSelectedEquipment(selectedEquipment.filter(e => e !== eq));
      }
    } else {
      setSelectedEquipment([...selectedEquipment, eq]);
    }
  };
  
  const toggleFocusArea = (area: string) => {
    if (selectedFocusAreas.includes(area)) {
      setSelectedFocusAreas(selectedFocusAreas.filter(a => a !== area));
    } else {
      setSelectedFocusAreas([...selectedFocusAreas, area]);
    }
  };

  // Start økt fra plan
  const startFromPlan = (day: TrainingDay) => {
    const today = new Date();
    setCurrentWorkout({
      id: Date.now().toString(),
      date: today.toISOString(),
      name: day.name,
      exercises: day.exercises.map((ex, i) => ({
        id: (i + 1).toString(),
        exerciseId: ex.name.toLowerCase().replace(/\s+/g, '-'),
        exerciseName: ex.name,
        sets: Array.from({ length: ex.sets }, (_, j) => ({
          id: (j + 1).toString(),
          reps: parseInt(ex.reps) || 10,
          weight: 20,
          completed: false,
        })),
      })),
    });
    setWorkoutStartTime(today);
    setElapsedTime(0);
    setIsTimerRunning(true);
    setViewingPlan(null);
  };

  // Slett plan
  const deletePlan = (planId: string) => {
    setTrainingPlans(trainingPlans.filter(p => p.id !== planId));
    if (viewingPlan?.id === planId) setViewingPlan(null);
  };

  const volume = currentWorkout ? calculateWorkoutVolume(currentWorkout) : 0;

  // Plan Generator Modal - Multi-step
  if (showPlanGenerator) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-deep-purple rounded-2xl p-6 my-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Brain className="text-electric" size={24} />
              <h2 className="text-xl font-bold">AI Treningsplan</h2>
            </div>
            <button onClick={() => { setShowPlanGenerator(false); setPlanStep(1); }} className="p-2">
              <X size={20} />
            </button>
          </div>
          
          {/* Progress */}
          <div className="flex gap-1 mb-6">
            {Array.from({ length: planTotalSteps }).map((_, i) => (
              <div 
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${
                  i < planStep ? 'bg-electric' : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Mål og erfaring */}
          {planStep === 1 && (
            <div className="space-y-5 animate-fadeInUp">
              <div>
                <p className="text-soft-white/80 font-medium mb-3 flex items-center gap-2">
                  <Target size={18} className="text-coral" />
                  Hva er hovedmålet ditt?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['muscle', 'strength', 'weightloss', 'fitness'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGoal(g)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        selectedGoal === g 
                          ? 'border-electric bg-electric/10 text-electric' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-2xl mb-1 block">
                        {g === 'muscle' && '💪'}
                        {g === 'strength' && '🏋️'}
                        {g === 'weightloss' && '🔥'}
                        {g === 'fitness' && '🏃'}
                      </span>
                      <span className="text-sm">{goalLabels[g]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-soft-white/80 font-medium mb-3 flex items-center gap-2">
                  <Dumbbell size={18} className="text-purple-400" />
                  Ditt erfaringsnivå
                </p>
                <div className="space-y-2">
                  {([
                    { level: 'beginner' as const, emoji: '🌱', label: 'Nybegynner', desc: 'Under 6 mnd erfaring' },
                    { level: 'intermediate' as const, emoji: '💪', label: 'Middels', desc: '6 mnd - 2 år erfaring' },
                    { level: 'advanced' as const, emoji: '🏆', label: 'Avansert', desc: 'Over 2 år erfaring' },
                  ]).map(({ level, emoji, label, desc }) => (
                    <button
                      key={level}
                      onClick={() => setSelectedExperience(level)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                        selectedExperience === level 
                          ? 'border-purple-400 bg-purple-400/10' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xl">{emoji}</span>
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-xs text-soft-white/50">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Utstyr og frekvens */}
          {planStep === 2 && (
            <div className="space-y-5 animate-fadeInUp">
              <div>
                <p className="text-soft-white/80 font-medium mb-3 flex items-center gap-2">
                  <Dumbbell size={18} className="text-orange-400" />
                  Tilgjengelig utstyr
                </p>
                <div className="space-y-2">
                  {([
                    { id: 'gym', emoji: '🏋️', label: 'Treningssenter' },
                    { id: 'home_full', emoji: '🏠', label: 'Hjemmegym (fullt)' },
                    { id: 'home_basic', emoji: '🎯', label: 'Hjemmegym (basis)' },
                    { id: 'bodyweight', emoji: '🤸', label: 'Kun kroppsvekt' },
                  ]).map(({ id, emoji, label }) => (
                    <button
                      key={id}
                      onClick={() => toggleEquipment(id)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
                        selectedEquipment.includes(id)
                          ? 'border-orange-400 bg-orange-400/10' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{emoji}</span>
                        <span className="font-medium">{label}</span>
                      </div>
                      {selectedEquipment.includes(id) && (
                        <div className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center">
                          <Check size={12} className="text-midnight" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-soft-white/80 font-medium mb-3 flex items-center gap-2">
                  <Calendar size={18} className="text-cyan-400" />
                  Treningsdager per uke
                </p>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDays(d)}
                      className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all ${
                        selectedDays === d 
                          ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <p className="text-xl">{d}</p>
                      <p className="text-xs text-soft-white/50">dager</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-soft-white/80 font-medium mb-3 flex items-center gap-2">
                  <Clock size={18} className="text-green-400" />
                  Tid per økt
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {([30, 45, 60, 90] as const).map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setSelectedDuration(mins)}
                      className={`py-3 rounded-xl border-2 transition-all ${
                        selectedDuration === mins 
                          ? 'border-green-400 bg-green-400/10 text-green-400' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <p className="font-bold">{mins}</p>
                      <p className="text-xs text-soft-white/50">min</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Fokusområder */}
          {planStep === 3 && (
            <div className="space-y-5 animate-fadeInUp">
              <div>
                <p className="text-soft-white/80 font-medium mb-2 flex items-center gap-2">
                  <Target size={18} className="text-pink-400" />
                  Fokusområder (valgfritt)
                </p>
                <p className="text-soft-white/50 text-sm mb-3">Velg 1-3 områder du vil fokusere ekstra på</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'chest', emoji: '💪', label: 'Bryst' },
                    { id: 'back', emoji: '🔙', label: 'Rygg' },
                    { id: 'shoulders', emoji: '🎯', label: 'Skuldre' },
                    { id: 'arms', emoji: '💪', label: 'Armer' },
                    { id: 'legs', emoji: '🦵', label: 'Ben' },
                    { id: 'core', emoji: '🔥', label: 'Mage' },
                    { id: 'glutes', emoji: '🍑', label: 'Rumpe' },
                  ]).map(({ id, emoji, label }) => (
                    <button
                      key={id}
                      onClick={() => toggleFocusArea(id)}
                      disabled={selectedFocusAreas.length >= 3 && !selectedFocusAreas.includes(id)}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                        selectedFocusAreas.includes(id)
                          ? 'border-pink-400 bg-pink-400/10' 
                          : selectedFocusAreas.length >= 3
                          ? 'border-white/5 opacity-40'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-lg">{emoji}</span>
                      <span className="font-medium text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-soft-white/80 font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-yellow-400" />
                  Skader/begrensninger
                </p>
                <p className="text-soft-white/50 text-sm mb-3">Vi tilpasser øvelser for å unngå problemer</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Ryggproblemer',
                    'Kneproblemer', 
                    'Skulderproblemer',
                    'Nakkesmerter',
                    'Håndleddsskade',
                    'Ankelskade',
                  ].map((injury) => (
                    <button
                      key={injury}
                      onClick={() => {
                        if (selectedInjuries.includes(injury)) {
                          setSelectedInjuries(selectedInjuries.filter(i => i !== injury));
                        } else {
                          setSelectedInjuries([...selectedInjuries, injury]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedInjuries.includes(injury)
                          ? 'bg-yellow-500/20 border border-yellow-400 text-yellow-400' 
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {injury}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Treningspreferanser og oppsummering */}
          {planStep === 4 && (
            <div className="space-y-5 animate-fadeInUp">
              <div>
                <p className="text-soft-white/80 font-medium mb-3 flex items-center gap-2">
                  <Flame size={18} className="text-red-400" />
                  Treningspreferanser
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'preferStrength', emoji: '🏋️', label: 'Styrke' },
                    { id: 'preferCardio', emoji: '🏃', label: 'Cardio' },
                    { id: 'preferHIIT', emoji: '⚡', label: 'HIIT' },
                    { id: 'preferFlexibility', emoji: '🧘', label: 'Stretch' },
                  ] as const).map(({ id, emoji, label }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedPreferences({ 
                        ...selectedPreferences, 
                        [id]: !selectedPreferences[id] 
                      })}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                        selectedPreferences[id]
                          ? 'border-red-400 bg-red-400/10' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-lg">{emoji}</span>
                      <span className="font-medium text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Oppsummering */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-soft-white/80 font-medium mb-3">Din personlige plan:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-soft-white/60">Mål</span>
                    <span className="font-medium">{goalLabels[selectedGoal]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-soft-white/60">Erfaring</span>
                    <span className="font-medium">{experienceLevelLabels[selectedExperience || 'beginner']}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-soft-white/60">Frekvens</span>
                    <span className="font-medium">{selectedDays} dager/uke</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-soft-white/60">Varighet</span>
                    <span className="font-medium">{selectedDuration} min/økt</span>
                  </div>
                  {selectedFocusAreas.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-soft-white/60">Fokus</span>
                      <span className="font-medium text-pink-400">
                        {selectedFocusAreas.map(f => focusAreaLabels[f] || f).join(', ')}
                      </span>
                    </div>
                  )}
                  {selectedInjuries.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-soft-white/60">Tilpasset for</span>
                      <span className="font-medium text-yellow-400">{selectedInjuries.length} begrensning(er)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {planStep > 1 && (
              <button
                onClick={() => setPlanStep(planStep - 1)}
                className="px-4 py-3 rounded-xl bg-white/10 font-medium"
              >
                Tilbake
              </button>
            )}
            
            {planStep < planTotalSteps ? (
              <button
                onClick={() => setPlanStep(planStep + 1)}
                className="flex-1 py-3 rounded-xl bg-electric text-midnight font-bold"
              >
                Neste
              </button>
            ) : (
              <button
                onClick={generateAIPlan}
                disabled={isGenerating}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-electric to-neon-green text-midnight font-bold flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="animate-spin" size={20} />
                    Analyserer...
                  </>
                ) : (
                  <>
                    <Brain size={20} />
                    Generer min plan
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Viewing Plan Modal
  if (viewingPlan) {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <button onClick={() => setViewingPlan(null)} className="text-soft-white/60 flex items-center gap-1">
            <ChevronRight className="rotate-180" size={20} />
            Tilbake
          </button>
          <button 
            onClick={() => deletePlan(viewingPlan.id)}
            className="text-coral text-sm"
          >
            Slett plan
          </button>
        </div>

        <div className="text-center py-4">
          <h2 className="text-2xl font-bold">{viewingPlan.name}</h2>
          <p className="text-soft-white/60">{viewingPlan.daysPerWeek} dager per uke</p>
        </div>

        <div className="space-y-3">
          {viewingPlan.days.map((day) => (
            <div key={day.dayNumber} className="p-4 rounded-2xl bg-white/5">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-electric text-sm">Dag {day.dayNumber}</span>
                  <h3 className="font-bold text-lg">{day.name}</h3>
                </div>
                <button
                  onClick={() => startFromPlan(day)}
                  className="px-4 py-2 rounded-xl bg-electric text-midnight font-semibold flex items-center gap-2"
                >
                  <Play size={16} />
                  Start
                </button>
              </div>

              <div className="space-y-2">
                {day.exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                    <span>{ex.name}</span>
                    <span className="text-soft-white/60">{ex.sets} × {ex.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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

      {/* AI Treningsplan */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-600/20 to-electric/10 border border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-electric/20 flex items-center justify-center">
            <Brain className="text-electric" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">AI Treningsplan</h3>
            <p className="text-soft-white/60 text-sm">Få en personlig plan</p>
          </div>
          <button
            onClick={() => setShowPlanGenerator(true)}
            className="px-4 py-2 rounded-xl bg-electric text-midnight font-semibold text-sm"
          >
            Lag ny
          </button>
        </div>

        {/* Eksisterende planer */}
        {trainingPlans.length > 0 && (
          <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
            <p className="text-soft-white/50 text-xs">DINE PLANER</p>
            {trainingPlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setViewingPlan(plan)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-3">
                  <Dumbbell size={18} className="text-electric" />
                  <div className="text-left">
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-soft-white/50 text-xs">{plan.daysPerWeek} dager/uke</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-soft-white/40" />
              </button>
            ))}
          </div>
        )}
      </div>

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
