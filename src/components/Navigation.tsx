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
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/10">
      {/* Safe area padding for iPhone home indicator */}
      <div 
        className="max-w-lg mx-auto px-2"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-around items-center pt-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showWorkoutIndicator = tab.id === 'workout' && hasActiveWorkout && !isActive;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[56px] rounded-2xl transition-all duration-200 active:scale-95 ${
                  isActive 
                    ? 'text-electric bg-electric/10' 
                    : 'text-soft-white/50 active:text-soft-white active:bg-white/5'
                }`}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {showWorkoutIndicator && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-coral rounded-full animate-pulse" />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-electric' : ''}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-electric" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
