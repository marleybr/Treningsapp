'use client';

import { useState, useEffect, useMemo } from 'react';
import { Flame, Apple, Beef, Wheat, Droplets, Target, TrendingDown, TrendingUp, Minus, Info, ChevronDown, ChevronUp, Calculator, Zap } from 'lucide-react';
import { UserProfile, activityLevelLabels, fitnessGoalLabels } from '@/types';

interface NutritionTabProps {
  profile: UserProfile;
}

// Activity level multipliers for TDEE calculation
const activityMultipliers: Record<UserProfile['activityLevel'], number> = {
  sedentary: 1.2,      // Lite eller ingen trening
  light: 1.375,        // Lett trening 1-3 dager/uke
  moderate: 1.55,      // Moderat trening 3-5 dager/uke
  active: 1.725,       // Hard trening 6-7 dager/uke
  very_active: 1.9,    // Veldig hard trening, fysisk jobb
};

// Goal adjustments (calories)
const goalAdjustments: Record<UserProfile['fitnessGoal'], { calories: number; label: string; description: string }> = {
  lose_weight: { calories: -500, label: 'Underskudd', description: 'For å gå ned ~0.5 kg per uke' },
  maintain: { calories: 0, label: 'Vedlikehold', description: 'Hold vekten stabil' },
  build_muscle: { calories: 300, label: 'Overskudd', description: 'For å bygge muskler effektivt' },
  improve_fitness: { calories: 0, label: 'Vedlikehold', description: 'Fokus på prestasjon' },
};

// Macronutrient ratios based on goal
const macroRatios: Record<UserProfile['fitnessGoal'], { protein: number; carbs: number; fat: number }> = {
  lose_weight: { protein: 0.35, carbs: 0.35, fat: 0.30 },
  maintain: { protein: 0.30, carbs: 0.40, fat: 0.30 },
  build_muscle: { protein: 0.30, carbs: 0.45, fat: 0.25 },
  improve_fitness: { protein: 0.25, carbs: 0.50, fat: 0.25 },
};

export default function NutritionTab({ profile }: NutritionTabProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [customCalories, setCustomCalories] = useState<number | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);

  // Calculate age from birthdate
  const age = useMemo(() => {
    if (!profile.birthDate) return 30; // Default age if not provided
    const birth = new Date(profile.birthDate);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  }, [profile.birthDate]);

  // Calculate BMR using Mifflin-St Jeor equation
  const bmr = useMemo(() => {
    const weight = profile.currentWeight;
    const height = profile.height;
    
    // Mifflin-St Jeor Equation
    // Men: BMR = 10W + 6.25H - 5A + 5
    // Women: BMR = 10W + 6.25H - 5A - 161
    
    if (profile.gender === 'female') {
      return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
    // Default to male formula (also for 'other')
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  }, [profile.currentWeight, profile.height, profile.gender, age]);

  // Calculate TDEE (Total Daily Energy Expenditure)
  const tdee = useMemo(() => {
    const multiplier = activityMultipliers[profile.activityLevel];
    return Math.round(bmr * multiplier);
  }, [bmr, profile.activityLevel]);

  // Calculate target calories based on goal
  const targetCalories = useMemo(() => {
    if (customCalories !== null) return customCalories;
    const adjustment = goalAdjustments[profile.fitnessGoal];
    return Math.round(tdee + adjustment.calories);
  }, [tdee, profile.fitnessGoal, customCalories]);

  // Calculate macros
  const macros = useMemo(() => {
    const ratios = macroRatios[profile.fitnessGoal];
    const proteinCals = targetCalories * ratios.protein;
    const carbsCals = targetCalories * ratios.carbs;
    const fatCals = targetCalories * ratios.fat;
    
    return {
      protein: Math.round(proteinCals / 4), // 4 cal per gram
      carbs: Math.round(carbsCals / 4),     // 4 cal per gram
      fat: Math.round(fatCals / 9),         // 9 cal per gram
    };
  }, [targetCalories, profile.fitnessGoal]);

  // Calculate protein per kg bodyweight
  const proteinPerKg = useMemo(() => {
    return (macros.protein / profile.currentWeight).toFixed(1);
  }, [macros.protein, profile.currentWeight]);

  // Water intake recommendation (ml)
  const waterIntake = useMemo(() => {
    // Base: 30-35ml per kg bodyweight, more for active people
    const baseMultiplier = profile.activityLevel === 'very_active' ? 40 : 
                          profile.activityLevel === 'active' ? 37 : 33;
    return Math.round(profile.currentWeight * baseMultiplier / 100) * 100; // Round to nearest 100ml
  }, [profile.currentWeight, profile.activityLevel]);

  const goalAdjustment = goalAdjustments[profile.fitnessGoal];

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold">Kosthold</h1>
        <p className="text-soft-white/60">Din personlige ernæringsplan</p>
      </div>

      {/* Main Calorie Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/30 flex items-center justify-center">
              <Flame className="text-orange-400" size={24} />
            </div>
            <div>
              <p className="text-soft-white/60 text-sm">Daglig kaloriebehov</p>
              <p className="text-xs text-orange-400">{goalAdjustment.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {profile.fitnessGoal === 'lose_weight' && <TrendingDown className="text-coral" size={20} />}
            {profile.fitnessGoal === 'build_muscle' && <TrendingUp className="text-neon-green" size={20} />}
            {(profile.fitnessGoal === 'maintain' || profile.fitnessGoal === 'improve_fitness') && <Minus className="text-electric" size={20} />}
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-6xl font-bold text-orange-400">{targetCalories.toLocaleString()}</p>
          <p className="text-soft-white/60 mt-1">kalorier per dag</p>
        </div>

        <p className="text-center text-soft-white/50 text-sm">{goalAdjustment.description}</p>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-soft-white/50 text-xs">BMR (Hvilemetabolisme)</p>
            <p className="font-bold text-lg">{bmr.toLocaleString()} kcal</p>
          </div>
          <div className="text-center">
            <p className="text-soft-white/50 text-xs">TDEE (Totalt forbruk)</p>
            <p className="font-bold text-lg">{tdee.toLocaleString()} kcal</p>
          </div>
        </div>
      </div>

      {/* Macronutrients */}
      <div className="p-5 rounded-2xl bg-white/5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Target size={18} className="text-electric" />
          Makronæringsstoffer
        </h3>

        <div className="space-y-4">
          {/* Protein */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Beef className="text-red-400" size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-baseline">
                <p className="font-medium">Protein</p>
                <p className="text-red-400 font-bold">{macros.protein}g</p>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex-1 h-2 rounded-full bg-white/10 mr-3">
                  <div 
                    className="h-full rounded-full bg-red-400" 
                    style={{ width: `${macroRatios[profile.fitnessGoal].protein * 100}%` }}
                  />
                </div>
                <span className="text-soft-white/50 text-xs">{Math.round(macroRatios[profile.fitnessGoal].protein * 100)}%</span>
              </div>
              <p className="text-soft-white/40 text-xs mt-1">{proteinPerKg}g per kg kroppsvekt</p>
            </div>
          </div>

          {/* Carbs */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Wheat className="text-yellow-400" size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-baseline">
                <p className="font-medium">Karbohydrater</p>
                <p className="text-yellow-400 font-bold">{macros.carbs}g</p>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex-1 h-2 rounded-full bg-white/10 mr-3">
                  <div 
                    className="h-full rounded-full bg-yellow-400" 
                    style={{ width: `${macroRatios[profile.fitnessGoal].carbs * 100}%` }}
                  />
                </div>
                <span className="text-soft-white/50 text-xs">{Math.round(macroRatios[profile.fitnessGoal].carbs * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Fat */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Apple className="text-purple-400" size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-baseline">
                <p className="font-medium">Fett</p>
                <p className="text-purple-400 font-bold">{macros.fat}g</p>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex-1 h-2 rounded-full bg-white/10 mr-3">
                  <div 
                    className="h-full rounded-full bg-purple-400" 
                    style={{ width: `${macroRatios[profile.fitnessGoal].fat * 100}%` }}
                  />
                </div>
                <span className="text-soft-white/50 text-xs">{Math.round(macroRatios[profile.fitnessGoal].fat * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Water Intake */}
      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
          <Droplets className="text-cyan-400" size={24} />
        </div>
        <div className="flex-1">
          <p className="font-medium">Væskeinntak</p>
          <p className="text-soft-white/60 text-sm">Anbefalt daglig inntak</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-cyan-400">{(waterIntake / 1000).toFixed(1)}L</p>
          <p className="text-soft-white/50 text-xs">{waterIntake} ml</p>
        </div>
      </div>

      {/* Customize Calories */}
      <div className="p-4 rounded-2xl bg-white/5">
        <button 
          onClick={() => setShowCustomize(!showCustomize)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-electric" />
            <span className="font-medium">Tilpass kalorier</span>
          </div>
          {showCustomize ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showCustomize && (
          <div className="mt-4 space-y-4">
            <p className="text-soft-white/60 text-sm">
              Overstyr den beregnede verdien med ditt eget kaloriemål:
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={customCalories || ''}
                onChange={(e) => setCustomCalories(e.target.value ? parseInt(e.target.value) : null)}
                placeholder={targetCalories.toString()}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 focus:border-electric outline-none text-center text-lg"
              />
              <span className="text-soft-white/60">kcal</span>
            </div>
            {customCalories !== null && (
              <button
                onClick={() => setCustomCalories(null)}
                className="w-full py-2 text-sm text-electric hover:text-electric/80"
              >
                Tilbakestill til beregnet verdi
              </button>
            )}
          </div>
        )}
      </div>

      {/* Details Section */}
      <div className="p-4 rounded-2xl bg-white/5">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Info size={18} className="text-soft-white/60" />
            <span className="font-medium">Hvordan beregnes dette?</span>
          </div>
          {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showDetails && (
          <div className="mt-4 space-y-4 text-sm text-soft-white/70">
            <div className="p-3 rounded-xl bg-white/5">
              <p className="font-medium text-soft-white mb-2">1. BMR (Basal Metabolic Rate)</p>
              <p>Din hvilemetabolisme - kalorier kroppen brenner i total hvile. Beregnet med Mifflin-St Jeor-formelen:</p>
              <p className="text-electric mt-1 font-mono text-xs">
                {profile.gender === 'female' 
                  ? '10 × vekt + 6.25 × høyde - 5 × alder - 161'
                  : '10 × vekt + 6.25 × høyde - 5 × alder + 5'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5">
              <p className="font-medium text-soft-white mb-2">2. TDEE (Total Daily Energy Expenditure)</p>
              <p>Totalt daglig forbruk basert på aktivitetsnivå:</p>
              <p className="text-neon-green mt-1">
                BMR ({bmr}) × {activityMultipliers[profile.activityLevel]} ({activityLevelLabels[profile.activityLevel]}) = {tdee} kcal
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5">
              <p className="font-medium text-soft-white mb-2">3. Mål-justering</p>
              <p>Justert for ditt mål "{fitnessGoalLabels[profile.fitnessGoal]}":</p>
              <p className="text-coral mt-1">
                TDEE ({tdee}) {goalAdjustment.calories >= 0 ? '+' : ''} {goalAdjustment.calories} = {tdee + goalAdjustment.calories} kcal
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5">
              <p className="font-medium text-soft-white mb-2">Dine data</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p>Alder: {age} år</p>
                <p>Kjønn: {profile.gender === 'male' ? 'Mann' : profile.gender === 'female' ? 'Kvinne' : 'Annet'}</p>
                <p>Høyde: {profile.height} cm</p>
                <p>Vekt: {profile.currentWeight} kg</p>
                <p>Aktivitet: {activityLevelLabels[profile.activityLevel]}</p>
                <p>Mål: {fitnessGoalLabels[profile.fitnessGoal]}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-neon-green/10 to-electric/10 border border-neon-green/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-green/20 flex items-center justify-center flex-shrink-0">
            <Zap className="text-neon-green" size={20} />
          </div>
          <div>
            <p className="font-medium mb-1">Tips for {fitnessGoalLabels[profile.fitnessGoal].toLowerCase()}</p>
            <p className="text-soft-white/60 text-sm">
              {profile.fitnessGoal === 'lose_weight' && 
                'Fokuser på å holde et moderat kaloriunderskudd. Spis proteinrike måltider for å bevare muskelmasse, og prioriter fiber for metthet.'}
              {profile.fitnessGoal === 'build_muscle' && 
                'Sørg for nok protein (1.6-2.2g/kg) fordelt over dagen. Spis karbohydrater rundt trening for optimal prestasjon og restitusjon.'}
              {profile.fitnessGoal === 'maintain' && 
                'Hold en jevn kaloribalanse. Varier kostholdet for å sikre alle næringsstoffer, og tilpass inntak etter aktivitetsnivå.'}
              {profile.fitnessGoal === 'improve_fitness' && 
                'Prioriter karbohydrater for energi til trening. Spis et lett måltid 2-3 timer før trening og protein etter for restitusjon.'}
            </p>
          </div>
        </div>
      </div>

      {/* Meal suggestions based on calories */}
      <div className="p-4 rounded-2xl bg-white/5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Apple size={18} className="text-coral" />
          Forslag til måltidsfordeling
        </h3>
        
        <div className="space-y-2">
          {[
            { meal: 'Frokost', percent: 25, icon: '🍳' },
            { meal: 'Lunsj', percent: 30, icon: '🥗' },
            { meal: 'Middag', percent: 35, icon: '🍽️' },
            { meal: 'Mellommåltid', percent: 10, icon: '🍎' },
          ].map((item) => (
            <div key={item.meal} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                <span>{item.meal}</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{Math.round(targetCalories * item.percent / 100)} kcal</p>
                <p className="text-soft-white/50 text-xs">{item.percent}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
