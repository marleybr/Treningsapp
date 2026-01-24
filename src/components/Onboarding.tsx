'use client';

import { useState } from 'react';
import { User, Ruler, Scale, Target, Activity, ChevronRight, ChevronLeft, Sparkles, Dumbbell, Clock, Crosshair, AlertTriangle, Heart } from 'lucide-react';
import { UserProfile, activityLevelLabels, fitnessGoalLabels, experienceLevelLabels, equipmentLabels, focusAreaLabels } from '@/types';

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
  
  // Nye felter
  const [experienceLevel, setExperienceLevel] = useState<UserProfile['experienceLevel']>('beginner');
  const [availableEquipment, setAvailableEquipment] = useState<string[]>(['gym']);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [customInjury, setCustomInjury] = useState('');
  const [preferredDuration, setPreferredDuration] = useState<30 | 45 | 60 | 90>(45);
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3);
  const [specificGoals, setSpecificGoals] = useState({
    benchPress: '',
    squat: '',
    deadlift: '',
    pullups: '',
  });
  const [trainingPreferences, setTrainingPreferences] = useState({
    preferCardio: false,
    preferHIIT: false,
    preferStrength: true,
    preferFlexibility: false,
  });

  const totalSteps = 8;

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
      // Utvidet profil
      experienceLevel,
      availableEquipment: availableEquipment as UserProfile['availableEquipment'],
      focusAreas: focusAreas.length > 0 ? focusAreas as UserProfile['focusAreas'] : undefined,
      injuries: injuries.length > 0 ? injuries : undefined,
      preferredWorkoutDuration: preferredDuration,
      workoutsPerWeek,
      specificGoals: {
        benchPress: specificGoals.benchPress ? Number(specificGoals.benchPress) : undefined,
        squat: specificGoals.squat ? Number(specificGoals.squat) : undefined,
        deadlift: specificGoals.deadlift ? Number(specificGoals.deadlift) : undefined,
        pullups: specificGoals.pullups ? Number(specificGoals.pullups) : undefined,
      },
      trainingPreferences,
    };
    onComplete(profile);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return name.trim().length >= 2;
      case 2: return height.length > 0 && currentWeight.length > 0;
      case 3: return true; // aktivitetsnivå
      case 4: return true; // treningsmål
      case 5: return true; // erfaringsnivå
      case 6: return availableEquipment.length > 0; // utstyr
      case 7: return true; // fokusområder og skader
      case 8: return true; // treningsfrekvens og varighet
      default: return false;
    }
  };

  const toggleArrayItem = (array: string[], item: string, setArray: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setArray(array.filter(i => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const addCustomInjury = () => {
    if (customInjury.trim() && !injuries.includes(customInjury.trim())) {
      setInjuries([...injuries, customInjury.trim()]);
      setCustomInjury('');
    }
  };

  const commonInjuries = [
    'Ryggproblemer',
    'Kneproblemer',
    'Skulderproblemer',
    'Nakkesmerter',
    'Håndleddsskade',
    'Ankelskade',
  ];

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

      case 5:
        return (
          <div className="space-y-6 animate-fadeInUp">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="text-purple-400" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold">Treningserfaring</h2>
              <p className="text-soft-white/60 mt-2">Hvor erfaren er du med trening?</p>
            </div>

            <div className="space-y-3">
              {([
                { level: 'beginner' as const, emoji: '🌱', desc: 'Ny til trening eller har trent i mindre enn 6 måneder' },
                { level: 'intermediate' as const, emoji: '💪', desc: 'Har trent regelmessig i 6 mnd - 2 år' },
                { level: 'advanced' as const, emoji: '🏆', desc: 'Mer enn 2 års erfaring med strukturert trening' },
              ]).map(({ level, emoji, desc }) => (
                <button
                  type="button"
                  key={level}
                  onClick={() => setExperienceLevel(level)}
                  className={`w-full p-4 rounded-xl transition-all text-left flex items-center gap-4 ${
                    experienceLevel === level 
                      ? 'bg-purple-500/20 border-2 border-purple-400' 
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    experienceLevel === level ? 'bg-purple-500/30' : 'bg-white/10'
                  }`}>
                    {emoji}
                  </div>
                  <div>
                    <p className="font-semibold">{experienceLevelLabels[level]}</p>
                    <p className="text-sm text-soft-white/60">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 animate-fadeInUp">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="text-orange-400" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold">Tilgjengelig utstyr</h2>
              <p className="text-soft-white/60 mt-2">Velg alt som gjelder for deg</p>
            </div>

            <div className="space-y-3">
              {([
                { id: 'gym', emoji: '🏋️', label: 'Treningssenter', desc: 'Tilgang til fullt utstyrt gym' },
                { id: 'home_full', emoji: '🏠', label: 'Hjemmegym (fullt)', desc: 'Vekter, stativ, benk, maskiner' },
                { id: 'home_basic', emoji: '🎯', label: 'Hjemmegym (basis)', desc: 'Manualer, strikk, kettlebell' },
                { id: 'bodyweight', emoji: '🤸', label: 'Kun kroppsvekt', desc: 'Ingen utstyr nødvendig' },
              ]).map(({ id, emoji, label, desc }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => toggleArrayItem(availableEquipment, id, setAvailableEquipment)}
                  className={`w-full p-4 rounded-xl transition-all text-left flex items-center gap-4 ${
                    availableEquipment.includes(id)
                      ? 'bg-orange-500/20 border-2 border-orange-400' 
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    availableEquipment.includes(id) ? 'bg-orange-500/30' : 'bg-white/10'
                  }`}>
                    {emoji}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{label}</p>
                    <p className="text-sm text-soft-white/60">{desc}</p>
                  </div>
                  {availableEquipment.includes(id) && (
                    <div className="w-6 h-6 rounded-full bg-orange-400 flex items-center justify-center">
                      <span className="text-midnight text-sm">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6 animate-fadeInUp">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-pink-500/20 flex items-center justify-center mx-auto mb-4">
                <Crosshair className="text-pink-400" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold">Fokusområder</h2>
              <p className="text-soft-white/60 mt-2">Hvilke kroppsområder vil du fokusere på?</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'chest', emoji: '💪', label: 'Bryst' },
                { id: 'back', emoji: '🔙', label: 'Rygg' },
                { id: 'shoulders', emoji: '🎯', label: 'Skuldre' },
                { id: 'arms', emoji: '💪', label: 'Armer' },
                { id: 'legs', emoji: '🦵', label: 'Ben' },
                { id: 'core', emoji: '🔥', label: 'Mage/Core' },
                { id: 'glutes', emoji: '🍑', label: 'Rumpe' },
              ]).map(({ id, emoji, label }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => toggleArrayItem(focusAreas, id, setFocusAreas)}
                  className={`p-3 rounded-xl transition-all flex items-center gap-2 ${
                    focusAreas.includes(id)
                      ? 'bg-pink-500/20 border-2 border-pink-400' 
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>

            <p className="text-soft-white/40 text-sm text-center">
              Velg så mange du vil, eller hopp over for balansert trening
            </p>

            {/* Skader/begrensninger */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-yellow-400" size={18} />
                <p className="text-soft-white/80 font-medium">Skader eller begrensninger?</p>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {commonInjuries.map((injury) => (
                  <button
                    type="button"
                    key={injury}
                    onClick={() => toggleArrayItem(injuries, injury, setInjuries)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      injuries.includes(injury)
                        ? 'bg-yellow-500/20 border border-yellow-400 text-yellow-400' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {injury}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInjury}
                  onChange={(e) => setCustomInjury(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomInjury()}
                  placeholder="Annen skade..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-electric outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomInjury}
                  disabled={!customInjury.trim()}
                  className="px-4 py-2 rounded-xl bg-white/10 text-sm font-medium disabled:opacity-30"
                >
                  Legg til
                </button>
              </div>

              {injuries.filter(i => !commonInjuries.includes(i)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {injuries.filter(i => !commonInjuries.includes(i)).map((injury) => (
                    <span
                      key={injury}
                      className="px-3 py-1.5 rounded-full text-sm bg-yellow-500/20 border border-yellow-400 text-yellow-400 flex items-center gap-2"
                    >
                      {injury}
                      <button onClick={() => setInjuries(injuries.filter(i => i !== injury))} className="hover:text-white">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6 animate-fadeInUp">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="text-cyan-400" size={40} />
              </div>
              <h2 className="text-2xl font-display font-bold">Treningsplan</h2>
              <p className="text-soft-white/60 mt-2">Siste steg - tilpass din plan</p>
            </div>

            {/* Treningsdager per uke */}
            <div>
              <p className="text-soft-white/80 font-medium mb-3">Hvor ofte vil du trene?</p>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map((days) => (
                  <button
                    type="button"
                    key={days}
                    onClick={() => setWorkoutsPerWeek(days)}
                    className={`flex-1 py-4 rounded-xl transition-all text-center ${
                      workoutsPerWeek === days 
                        ? 'bg-cyan-500/20 border-2 border-cyan-400' 
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <p className="text-xl font-bold">{days}</p>
                    <p className="text-xs text-soft-white/60">dager</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Øktvarighet */}
            <div>
              <p className="text-soft-white/80 font-medium mb-3">Hvor lang tid per økt?</p>
              <div className="grid grid-cols-4 gap-2">
                {([30, 45, 60, 90] as const).map((mins) => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => setPreferredDuration(mins)}
                    className={`py-3 rounded-xl transition-all ${
                      preferredDuration === mins 
                        ? 'bg-cyan-500/20 border-2 border-cyan-400' 
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <p className="font-bold">{mins}</p>
                    <p className="text-xs text-soft-white/60">min</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Treningspreferanser */}
            <div>
              <p className="text-soft-white/80 font-medium mb-3">Hvilke treningstyper liker du?</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'preferStrength', emoji: '🏋️', label: 'Styrketrening' },
                  { id: 'preferCardio', emoji: '🏃', label: 'Cardio' },
                  { id: 'preferHIIT', emoji: '⚡', label: 'HIIT' },
                  { id: 'preferFlexibility', emoji: '🧘', label: 'Stretch/Yoga' },
                ] as const).map(({ id, emoji, label }) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setTrainingPreferences({ ...trainingPreferences, [id]: !trainingPreferences[id] })}
                    className={`p-3 rounded-xl transition-all flex items-center gap-2 ${
                      trainingPreferences[id]
                        ? 'bg-cyan-500/20 border-2 border-cyan-400' 
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="font-medium text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Spesifikke mål (valgfritt) - vis bare for styrke */}
            {(fitnessGoal === 'build_muscle' || trainingPreferences.preferStrength) && (
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="text-electric" size={18} />
                  <p className="text-soft-white/80 font-medium">Spesifikke styrkemål (valgfritt)</p>
                </div>
                <p className="text-soft-white/40 text-sm mb-3">Legg inn målvekter du vil nå</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-soft-white/60">Benkpress (kg)</label>
                    <input
                      type="number"
                      value={specificGoals.benchPress}
                      onChange={(e) => setSpecificGoals({ ...specificGoals, benchPress: e.target.value })}
                      placeholder="100"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-electric outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-soft-white/60">Knebøy (kg)</label>
                    <input
                      type="number"
                      value={specificGoals.squat}
                      onChange={(e) => setSpecificGoals({ ...specificGoals, squat: e.target.value })}
                      placeholder="120"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-electric outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-soft-white/60">Markløft (kg)</label>
                    <input
                      type="number"
                      value={specificGoals.deadlift}
                      onChange={(e) => setSpecificGoals({ ...specificGoals, deadlift: e.target.value })}
                      placeholder="140"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-electric outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-soft-white/60">Pullups (antall)</label>
                    <input
                      type="number"
                      value={specificGoals.pullups}
                      onChange={(e) => setSpecificGoals({ ...specificGoals, pullups: e.target.value })}
                      placeholder="10"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-electric outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
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
