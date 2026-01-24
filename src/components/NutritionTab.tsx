'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Flame, Apple, Beef, Wheat, Droplets, Target, TrendingDown, TrendingUp, Minus, Info, ChevronDown, ChevronUp, Calculator, Zap, Camera, X, Plus, Trash2, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { UserProfile, activityLevelLabels, fitnessGoalLabels } from '@/types';

interface NutritionTabProps {
  profile: UserProfile;
}

interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
}

interface MealEntry {
  id: string;
  timestamp: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  imageUrl?: string;
}

// Activity level multipliers for TDEE calculation
const activityMultipliers: Record<UserProfile['activityLevel'], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
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

const mealTypeLabels: Record<MealEntry['type'], { label: string; icon: string }> = {
  breakfast: { label: 'Frokost', icon: '🍳' },
  lunch: { label: 'Lunsj', icon: '🥗' },
  dinner: { label: 'Middag', icon: '🍽️' },
  snack: { label: 'Mellommåltid', icon: '🍎' },
};

export default function NutritionTab({ profile }: NutritionTabProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [customCalories, setCustomCalories] = useState<number | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  
  // Food scanner states
  const [showScanner, setShowScanner] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    foods: FoodItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    confidence: string;
    description: string;
  } | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealEntry['type']>('lunch');
  
  // Meal tracking
  const [meals, setMeals] = useState<MealEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fittrack-meals');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Filter to only today's meals
        const today = new Date().toDateString();
        return parsed.filter((m: MealEntry) => new Date(m.timestamp).toDateString() === today);
      }
    }
    return [];
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save meals to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fittrack-meals', JSON.stringify(meals));
    }
  }, [meals]);

  // Calculate age from birthdate
  const age = useMemo(() => {
    if (!profile.birthDate) return 30;
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
    if (profile.gender === 'female') {
      return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  }, [profile.currentWeight, profile.height, profile.gender, age]);

  // Calculate TDEE
  const tdee = useMemo(() => {
    const multiplier = activityMultipliers[profile.activityLevel];
    return Math.round(bmr * multiplier);
  }, [bmr, profile.activityLevel]);

  // Calculate target calories
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
      protein: Math.round(proteinCals / 4),
      carbs: Math.round(carbsCals / 4),
      fat: Math.round(fatCals / 9),
    };
  }, [targetCalories, profile.fitnessGoal]);

  // Calculate consumed today
  const consumedToday = useMemo(() => {
    return meals.reduce((acc, meal) => ({
      calories: acc.calories + meal.totalCalories,
      protein: acc.protein + meal.totalProtein,
      carbs: acc.carbs + meal.totalCarbs,
      fat: acc.fat + meal.totalFat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [meals]);

  // Remaining calories
  const remainingCalories = targetCalories - consumedToday.calories;

  // Water intake recommendation
  const waterIntake = useMemo(() => {
    const baseMultiplier = profile.activityLevel === 'very_active' ? 40 : 
                          profile.activityLevel === 'active' ? 37 : 33;
    return Math.round(profile.currentWeight * baseMultiplier / 100) * 100;
  }, [profile.currentWeight, profile.activityLevel]);

  const goalAdjustment = goalAdjustments[profile.fitnessGoal];

  // Handle image capture/upload
  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCapturedImage(base64);
      analyzeFood(base64);
    };
    reader.readAsDataURL(file);
  };

  // Analyze food with AI
  const analyzeFood = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });

      const data = await response.json();

      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
      } else {
        console.error('Analysis failed:', data.error);
        // Show demo result on error
        setAnalysisResult({
          foods: [{ name: 'Kunne ikke analysere', calories: 0, protein: 0, carbs: 0, fat: 0, portion: '-' }],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          confidence: 'low',
          description: 'Kunne ikke analysere bildet. Prøv igjen med et tydeligere bilde.',
        });
      }
    } catch (error) {
      console.error('Error analyzing food:', error);
      setAnalysisResult({
        foods: [{ name: 'Feil ved analyse', calories: 0, protein: 0, carbs: 0, fat: 0, portion: '-' }],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        confidence: 'low',
        description: 'En feil oppstod. Sjekk internettilkoblingen og prøv igjen.',
      });
    }

    setIsAnalyzing(false);
  };

  // Add meal from analysis
  const addMealFromAnalysis = () => {
    if (!analysisResult) return;

    const newMeal: MealEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: selectedMealType,
      foods: analysisResult.foods,
      totalCalories: analysisResult.totalCalories,
      totalProtein: analysisResult.totalProtein,
      totalCarbs: analysisResult.totalCarbs,
      totalFat: analysisResult.totalFat,
      imageUrl: capturedImage || undefined,
    };

    setMeals([...meals, newMeal]);
    closeScanner();
  };

  // Delete meal
  const deleteMeal = (mealId: string) => {
    setMeals(meals.filter(m => m.id !== mealId));
  };

  // Close scanner and reset
  const closeScanner = () => {
    setShowScanner(false);
    setCapturedImage(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Progress percentage
  const calorieProgress = Math.min((consumedToday.calories / targetCalories) * 100, 100);
  const proteinProgress = Math.min((consumedToday.protein / macros.protein) * 100, 100);
  const carbsProgress = Math.min((consumedToday.carbs / macros.carbs) * 100, 100);
  const fatProgress = Math.min((consumedToday.fat / macros.fat) * 100, 100);

  // Scanner Modal
  if (showScanner) {
    return (
      <div className="fixed inset-0 z-50 bg-midnight">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Camera size={24} className="text-electric" />
              Matskanner
            </h2>
            <button onClick={closeScanner} className="p-2 hover:bg-white/10 rounded-lg">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Meal Type Selector */}
            <div>
              <p className="text-soft-white/60 text-sm mb-2">Velg måltidstype:</p>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(mealTypeLabels) as [MealEntry['type'], { label: string; icon: string }][]).map(([type, { label, icon }]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedMealType(type)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedMealType === type
                        ? 'border-electric bg-electric/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{icon}</span>
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Capture Area */}
            {!capturedImage ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-electric flex flex-col items-center justify-center gap-4 transition-all"
                >
                  <div className="w-20 h-20 rounded-full bg-electric/20 flex items-center justify-center">
                    <Camera size={40} className="text-electric" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">Ta bilde av maten</p>
                    <p className="text-soft-white/60 text-sm">eller velg fra galleri</p>
                  </div>
                </button>

                <div className="p-4 rounded-xl bg-white/5 text-center">
                  <Sparkles size={20} className="text-electric mx-auto mb-2" />
                  <p className="text-soft-white/60 text-sm">
                    AI-en vil analysere bildet og estimere næringsverdier automatisk
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Captured Image */}
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured food"
                    className="w-full aspect-square object-cover rounded-2xl"
                  />
                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      setAnalysisResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Analysis Loading */}
                {isAnalyzing && (
                  <div className="p-6 rounded-2xl bg-white/5 text-center">
                    <Loader2 size={40} className="text-electric mx-auto animate-spin mb-3" />
                    <p className="font-medium">Analyserer maten...</p>
                    <p className="text-soft-white/60 text-sm">AI-en identifiserer ingredienser og beregner næringsverdier</p>
                  </div>
                )}

                {/* Analysis Result */}
                {analysisResult && !isAnalyzing && (
                  <div className="space-y-4">
                    {/* Confidence Badge */}
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      analysisResult.confidence === 'high' ? 'bg-neon-green/20 text-neon-green' :
                      analysisResult.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-coral/20 text-coral'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {analysisResult.confidence === 'high' ? 'Høy sikkerhet' :
                       analysisResult.confidence === 'medium' ? 'Middels sikkerhet' : 'Lav sikkerhet'}
                    </div>

                    {/* Description */}
                    <p className="text-soft-white/80">{analysisResult.description}</p>

                    {/* Foods List */}
                    <div className="p-4 rounded-2xl bg-white/5 space-y-3">
                      <h4 className="font-medium text-sm text-soft-white/60">Identifiserte matvarer:</h4>
                      {analysisResult.foods.map((food, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                          <div>
                            <p className="font-medium">{food.name}</p>
                            <p className="text-soft-white/50 text-xs">{food.portion}</p>
                          </div>
                          <p className="text-electric font-bold">{food.calories} kcal</p>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-electric/20 to-neon-green/20 border border-electric/30">
                      <div className="text-center mb-4">
                        <p className="text-soft-white/60 text-sm">Totalt</p>
                        <p className="text-4xl font-bold text-electric">{analysisResult.totalCalories} kcal</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                          <p className="text-red-400 font-bold">{analysisResult.totalProtein}g</p>
                          <p className="text-soft-white/50">Protein</p>
                        </div>
                        <div>
                          <p className="text-yellow-400 font-bold">{analysisResult.totalCarbs}g</p>
                          <p className="text-soft-white/50">Karbs</p>
                        </div>
                        <div>
                          <p className="text-purple-400 font-bold">{analysisResult.totalFat}g</p>
                          <p className="text-soft-white/50">Fett</p>
                        </div>
                      </div>
                    </div>

                    {/* Add Button */}
                    <button
                      onClick={addMealFromAnalysis}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-electric to-neon-green text-midnight font-bold text-lg flex items-center justify-center gap-2"
                    >
                      <Plus size={24} />
                      Legg til {mealTypeLabels[selectedMealType].label.toLowerCase()}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold">Kosthold</h1>
        <p className="text-soft-white/60">Din personlige ernæringsplan</p>
      </div>

      {/* Daily Progress Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Flame className="text-orange-400" size={20} />
            <span className="text-soft-white/60 text-sm">Dagens kalorier</span>
          </div>
          <span className={`text-sm font-medium ${remainingCalories >= 0 ? 'text-neon-green' : 'text-coral'}`}>
            {remainingCalories >= 0 ? `${remainingCalories} gjenstår` : `${Math.abs(remainingCalories)} over`}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-4 rounded-full bg-white/10 overflow-hidden mb-2">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              calorieProgress > 100 ? 'bg-coral' : 'bg-gradient-to-r from-orange-400 to-orange-500'
            }`}
            style={{ width: `${Math.min(calorieProgress, 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between items-baseline">
          <p className="text-3xl font-bold">{consumedToday.calories.toLocaleString()}</p>
          <p className="text-soft-white/60">/ {targetCalories.toLocaleString()} kcal</p>
        </div>
      </div>

      {/* Scan Food Button */}
      <button
        onClick={() => setShowScanner(true)}
        className="w-full py-5 rounded-2xl bg-gradient-to-r from-electric to-neon-green text-midnight font-bold text-lg flex items-center justify-center gap-3"
      >
        <Camera size={28} />
        Skann mat med AI
      </button>

      {/* Macro Progress */}
      <div className="p-4 rounded-2xl bg-white/5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Target size={18} className="text-electric" />
          Dagens makroer
        </h3>

        <div className="space-y-4">
          {/* Protein */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <Beef size={16} className="text-red-400" />
                Protein
              </span>
              <span><span className="font-bold">{consumedToday.protein}g</span> / {macros.protein}g</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${proteinProgress}%` }} />
            </div>
          </div>

          {/* Carbs */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <Wheat size={16} className="text-yellow-400" />
                Karbohydrater
              </span>
              <span><span className="font-bold">{consumedToday.carbs}g</span> / {macros.carbs}g</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${carbsProgress}%` }} />
            </div>
          </div>

          {/* Fat */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <Apple size={16} className="text-purple-400" />
                Fett
              </span>
              <span><span className="font-bold">{consumedToday.fat}g</span> / {macros.fat}g</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-purple-400 transition-all" style={{ width: `${fatProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Meals */}
      <div className="p-4 rounded-2xl bg-white/5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Apple size={18} className="text-coral" />
          Dagens måltider
        </h3>

        {meals.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
              <ImageIcon size={32} className="text-soft-white/30" />
            </div>
            <p className="text-soft-white/50">Ingen måltider registrert</p>
            <p className="text-soft-white/30 text-sm">Bruk matskanneren for å legge til</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => (
              <div key={meal.id} className="p-3 rounded-xl bg-white/5 flex items-center gap-3">
                {meal.imageUrl ? (
                  <img src={meal.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center text-2xl">
                    {mealTypeLabels[meal.type].icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{mealTypeLabels[meal.type].label}</span>
                    <span className="text-soft-white/40 text-xs">
                      {new Date(meal.timestamp).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-soft-white/50 text-sm truncate">
                    {meal.foods.map(f => f.name).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-electric">{meal.totalCalories} kcal</p>
                  <button
                    onClick={() => deleteMeal(meal.id)}
                    className="text-coral/60 hover:text-coral text-xs"
                  >
                    Fjern
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TDEE Info Card */}
      <div className="p-4 rounded-2xl bg-white/5">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Info size={18} className="text-soft-white/60" />
            <span className="font-medium">Ditt kaloriebehov</span>
          </div>
          {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showDetails && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-soft-white/60">BMR (Hvileforbrenning)</span>
              <span className="font-bold">{bmr.toLocaleString()} kcal</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-soft-white/60">TDEE (Totalforbrenning)</span>
              <span className="font-bold">{tdee.toLocaleString()} kcal</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-soft-white/60">Mål-justering</span>
              <span className={`font-bold ${goalAdjustment.calories >= 0 ? 'text-neon-green' : 'text-coral'}`}>
                {goalAdjustment.calories >= 0 ? '+' : ''}{goalAdjustment.calories} kcal
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-soft-white/60">Daglig mål ({fitnessGoalLabels[profile.fitnessGoal]})</span>
              <span className="font-bold text-electric">{targetCalories.toLocaleString()} kcal</span>
            </div>
          </div>
        )}
      </div>

      {/* Water Intake */}
      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
          <Droplets className="text-cyan-400" size={24} />
        </div>
        <div className="flex-1">
          <p className="font-medium">Væskeinntak</p>
          <p className="text-soft-white/60 text-sm">Anbefalt daglig</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-cyan-400">{(waterIntake / 1000).toFixed(1)}L</p>
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
            <span className="font-medium">Tilpass kaloriemål</span>
          </div>
          {showCustomize ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showCustomize && (
          <div className="mt-4 space-y-4">
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
    </div>
  );
}
