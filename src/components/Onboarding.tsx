'use client';

import { useState } from 'react';
import { User, Ruler, Scale, Target, Activity, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { UserProfile, activityLevelLabels, fitnessGoalLabels } from '@/types';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [activityLevel, setActivityLevel] = useState<UserProfile['activityLevel']>('moderate');
  const [fitnessGoal, setFitnessGoal] = useState<UserProfile['fitnessGoal']>('improve_fitness');

  const totalSteps = 4;

  const avatarColors = ['#00d9ff', '#39ff14', '#ff6b6b', '#ffd93d', '#a855f7', '#f97316'];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const profile: UserProfile = {
      id: Date.now().toString(),
      name,
      height: Number(height),
      currentWeight: Number(currentWeight),
      targetWeight: Number(targetWeight) || Number(currentWeight),
      birthDate: birthDate || undefined,
      gender,
      activityLevel,
      fitnessGoal,
      createdAt: new Date().toISOString(),
      avatarColor: randomColor,
    };
    onComplete(profile);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return name.trim().length >= 2;
      case 2: return height.length > 0 && currentWeight.length > 0;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-fadeInUp">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-electric/20 flex items-center justify-center mx-auto mb-4">
                <User className="text-electric" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold">Hva heter du?</h2>
              <p className="text-soft-white/60 mt-2">La oss bli kjent!</p>
            </div>
            
            <div>
              <label className="block text-sm text-soft-white/60 mb-2">Navn</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Skriv navnet ditt"
                className="input-field text-lg"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-soft-white/60 mb-2">Kjønn (valgfritt)</label>
              <div className="grid grid-cols-3 gap-3">
                {(['male', 'female', 'other'] as const).map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setGender(g)}
                    className={`p-3 rounded-xl transition-all ${
                      gender === g 
                        ? 'bg-electric text-midnight font-semibold' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {g === 'male' ? 'Mann' : g === 'female' ? 'Kvinne' : 'Annet'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-soft-white/60 mb-2">Fødselsdato (valgfritt)</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-fadeInUp">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-4">
                <Ruler className="text-neon-green" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold">Dine mål</h2>
              <p className="text-soft-white/60 mt-2">Vi bruker dette for å tilpasse appen</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-soft-white/60 mb-2">Høyde (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                  className="input-field text-lg text-center"
                />
              </div>
              <div>
                <label className="block text-sm text-soft-white/60 mb-2">Nåværende vekt (kg)</label>
                <input
                  type="number"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(e.target.value)}
                  placeholder="75"
                  className="input-field text-lg text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-soft-white/60 mb-2">Målvekt (kg)</label>
              <input
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder={currentWeight || '70'}
                className="input-field text-lg text-center"
              />
              <p className="text-soft-white/40 text-sm mt-2 text-center">
                La stå tom hvis du vil beholde nåværende vekt
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-fadeInUp">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <Activity className="text-gold" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold">Aktivitetsnivå</h2>
              <p className="text-soft-white/60 mt-2">Hvor aktiv er du i hverdagen?</p>
            </div>

            <div className="space-y-3">
              {(Object.entries(activityLevelLabels) as [UserProfile['activityLevel'], string][]).map(([level, label]) => (
                <button
                  type="button"
                  key={level}
                  onClick={() => setActivityLevel(level)}
                  className={`w-full p-4 rounded-xl transition-all text-left ${
                    activityLevel === level 
                      ? 'bg-electric/20 border-2 border-electric' 
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-soft-white/60">
                    {level === 'sedentary' && 'Lite eller ingen trening'}
                    {level === 'light' && 'Lett trening 1-3 dager/uke'}
                    {level === 'moderate' && 'Moderat trening 3-5 dager/uke'}
                    {level === 'active' && 'Hard trening 6-7 dager/uke'}
                    {level === 'very_active' && 'Veldig hard trening, fysisk jobb'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-fadeInUp">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-coral/20 flex items-center justify-center mx-auto mb-4">
                <Target className="text-coral" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold">Ditt treningsmål</h2>
              <p className="text-soft-white/60 mt-2">Hva ønsker du å oppnå?</p>
            </div>

            <div className="space-y-3">
              {(Object.entries(fitnessGoalLabels) as [UserProfile['fitnessGoal'], string][]).map(([goal, label]) => (
                <button
                  type="button"
                  key={goal}
                  onClick={() => setFitnessGoal(goal)}
                  className={`w-full p-4 rounded-xl transition-all text-left flex items-center gap-4 ${
                    fitnessGoal === goal 
                      ? 'bg-coral/20 border-2 border-coral' 
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    fitnessGoal === goal ? 'bg-coral/30' : 'bg-white/10'
                  }`}>
                    {goal === 'lose_weight' && '⬇️'}
                    {goal === 'maintain' && '⚖️'}
                    {goal === 'build_muscle' && '💪'}
                    {goal === 'improve_fitness' && '🏃'}
                  </div>
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className="text-sm text-soft-white/60">
                      {goal === 'lose_weight' && 'Brenn fett og gå ned i vekt'}
                      {goal === 'maintain' && 'Hold vekten stabil'}
                      {goal === 'build_muscle' && 'Øk muskelmasse og styrke'}
                      {goal === 'improve_fitness' && 'Bedre utholdenhet og helse'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-electric/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-coral/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-12 pb-6 px-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles className="text-electric" size={24} />
          <h1 className="text-2xl font-display font-bold">
            <span className="bg-gradient-to-r from-electric to-neon-green bg-clip-text text-transparent">
              FitTrack
            </span>
          </h1>
        </div>

        {/* Progress */}
        <div className="flex gap-2 max-w-xs mx-auto">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i < step ? 'bg-electric' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
        <p className="text-center text-soft-white/60 text-sm mt-3">
          Steg {step} av {totalSteps}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 relative z-10 px-6 pb-32">
        <div className="max-w-md mx-auto">
          {renderStep()}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-midnight via-midnight/95 to-transparent z-50">
        <div className="max-w-md mx-auto flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="btn-secondary flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Tilbake
            </button>
          )}
          
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step < totalSteps ? (
              <>
                Neste
                <ChevronRight size={20} />
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Kom i gang!
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
