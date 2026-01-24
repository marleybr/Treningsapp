'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Workout, Goal, BodyStats, UserProfile, GameStats, calculateLevel, TrainingPlan } from '@/types';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import HomeTab from '@/components/HomeTab';
import WorkoutTab from '@/components/WorkoutTab';
import NutritionTab from '@/components/NutritionTab';
import ProgressTab from '@/components/ProgressTab';
import ProfileTab from '@/components/ProfileTab';
import Onboarding from '@/components/Onboarding';
import { subDays, differenceInDays, startOfWeek } from 'date-fns';

const initialGameStats: GameStats = {
  xp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  totalWorkouts: 0,
  totalVolumeLifted: 0,
  achievements: [],
  weeklyXP: 0,
  weekStartDate: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('fittrack-profile', null);
  const [workouts, setWorkouts] = useLocalStorage<Workout[]>('fittrack-workouts', []);
  const [goals, setGoals] = useLocalStorage<Goal[]>('fittrack-goals', []);
  const [bodyStats, setBodyStats] = useLocalStorage<BodyStats[]>('fittrack-bodystats', []);
  const [gameStats, setGameStats] = useLocalStorage<GameStats>('fittrack-gamestats', initialGameStats);
  const [trainingPlans, setTrainingPlans] = useLocalStorage<TrainingPlan[]>('fittrack-trainingplans', []);
  const [isLoaded, setIsLoaded] = useState(false);

  // Active workout state (persists across tab changes)
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTimerRunning && workoutStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - workoutStartTime.getTime()) / 1000));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, workoutStartTime]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Reset weekly XP if new week
  useEffect(() => {
    if (!gameStats) return;
    
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0];
    const savedWeekStart = gameStats.weekStartDate?.split('T')[0];
    
    if (currentWeekStart !== savedWeekStart) {
      setGameStats({
        ...gameStats,
        weeklyXP: 0,
        weekStartDate: currentWeekStart,
      });
    }
  }, [gameStats, setGameStats]);

  // Calculate streak (consecutive days with workouts)
  const calculateStreak = () => {
    if (workouts.length === 0) return 0;
    
    const sortedDates = [...new Set(workouts.map(w => w.date.split('T')[0]))]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedDates.length; i++) {
      const workoutDate = new Date(sortedDates[i]);
      workoutDate.setHours(0, 0, 0, 0);
      
      const expectedDate = subDays(currentDate, streak);
      expectedDate.setHours(0, 0, 0, 0);
      
      const daysDiff = differenceInDays(expectedDate, workoutDate);
      
      if (daysDiff === 0) {
        streak++;
      } else if (daysDiff === 1 && streak === 0) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Handle profile completion from onboarding
  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    const initialStats: BodyStats = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      weight: newProfile.currentWeight,
    };
    setBodyStats([initialStats]);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-electric border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-soft-white/60">Laster...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if no profile exists
  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab 
            workouts={workouts} 
            bodyStats={bodyStats}
            setActiveTab={setActiveTab}
            profile={profile}
            gameStats={gameStats}
            currentWorkout={currentWorkout}
            elapsedTime={elapsedTime}
          />
        );
      case 'workout':
        return (
          <WorkoutTab 
            workouts={workouts} 
            setWorkouts={setWorkouts}
            gameStats={gameStats}
            setGameStats={setGameStats}
            currentWorkout={currentWorkout}
            setCurrentWorkout={setCurrentWorkout}
            workoutStartTime={workoutStartTime}
            setWorkoutStartTime={setWorkoutStartTime}
            elapsedTime={elapsedTime}
            setElapsedTime={setElapsedTime}
            isTimerRunning={isTimerRunning}
            setIsTimerRunning={setIsTimerRunning}
            trainingPlans={trainingPlans}
            setTrainingPlans={setTrainingPlans}
            userProfile={profile}
          />
        );
      case 'nutrition':
        return (
          <NutritionTab 
            profile={profile}
          />
        );
      case 'progress':
        return (
          <ProgressTab 
            bodyStats={bodyStats} 
            setBodyStats={setBodyStats}
            workouts={workouts}
            profile={profile}
          />
        );
      case 'profile':
        return (
          <ProfileTab 
            profile={profile}
            setProfile={setProfile}
            gameStats={gameStats}
            workouts={workouts}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen pb-24">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-electric/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-neon-green/5 rounded-full blur-3xl translate-x-1/2"></div>
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-coral/5 rounded-full blur-3xl translate-y-1/2"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        <Header 
          streak={calculateStreak()} 
          profile={profile} 
          gameStats={gameStats}
        />
        
        <div className="px-6">
          {renderTab()}
        </div>
      </div>

      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        hasActiveWorkout={currentWorkout !== null}
      />
    </main>
  );
}
