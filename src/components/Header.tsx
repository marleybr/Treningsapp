'use client';

import { Flame } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { UserProfile, GameStats } from '@/types';

interface HeaderProps {
  streak?: number;
  profile?: UserProfile | null;
  gameStats?: GameStats;
}

export default function Header({ streak = 0, profile }: HeaderProps) {
  const today = format(new Date(), 'EEEE d. MMMM', { locale: nb });
  
  return (
    <header className="pt-8 pb-2 px-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-soft-white/40 text-xs uppercase tracking-wider">{today}</p>
          {profile ? (
            <h1 className="text-xl font-display font-semibold mt-1">
              Hei, {profile.name.split(' ')[0]}
            </h1>
          ) : (
            <h1 className="text-xl font-display font-semibold mt-1">
              FitTrack
            </h1>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 text-coral">
              <Flame size={18} />
              <span className="font-semibold">{streak}</span>
            </div>
          )}
          
          {profile && (
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold bg-white/10"
            >
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
