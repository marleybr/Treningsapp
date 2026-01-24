'use client';

import { Dumbbell, TrendingUp, Home, User, Apple } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasActiveWorkout?: boolean;
}

export default function Navigation({ activeTab, setActiveTab, hasActiveWorkout }: NavigationProps) {
  const tabs = [
    { id: 'home', label: 'Hjem', icon: Home },
    { id: 'workout', label: 'Trening', icon: Dumbbell },
    { id: 'nutrition', label: 'Kosthold', icon: Apple },
    { id: 'progress', label: 'Fremgang', icon: TrendingUp },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-lg mx-auto px-4 py-2">
        <div className="flex justify-between items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showWorkoutIndicator = tab.id === 'workout' && hasActiveWorkout && !isActive;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'text-electric glow-electric bg-electric/10' 
                    : 'text-soft-white/60 hover:text-soft-white'
                }`}
              >
                <div className="relative">
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  {showWorkoutIndicator && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-coral rounded-full animate-pulse" />
                  )}
                </div>
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
