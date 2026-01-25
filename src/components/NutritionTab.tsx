'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Flame, Apple, Beef, Wheat, Droplets, Target, TrendingDown, TrendingUp, Minus, Info, ChevronDown, ChevronUp, Calculator, Zap, Camera, X, Plus, Trash2, Loader2, Image as ImageIcon, Sparkles, CalendarDays, ChefHat, ShoppingCart, Lightbulb, ArrowLeft, ArrowRight, Edit3, RefreshCw, Check, RotateCcw, BookOpen, Clock, Users } from 'lucide-react';
import { UserProfile, activityLevelLabels, fitnessGoalLabels } from '@/types';

interface Recipe {
  title: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  ingredients: string[];
  steps: string[];
  tips: string;
}

interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  prepTime: string;
  tags: string[];
}

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

interface MealPlanMeal {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
}

interface DayPlan {
  dayName: string;
  meals: {
    breakfast: MealPlanMeal;
    lunch: MealPlanMeal;
    dinner: MealPlanMeal;
    snacks: { name: string; calories: number; protein: number; carbs: number; fat: number }[];
  };
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface MealPlan {
  weekPlan: {
    monday: DayPlan;
    tuesday: DayPlan;
    wednesday: DayPlan;
    thursday: DayPlan;
    friday: DayPlan;
    saturday: DayPlan;
    sunday: DayPlan;
  };
  tips: string[];
  shoppingList: string[];
  summary: string;
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
  
  // Meal plan states
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fittrack-mealplan');
      if (saved) return JSON.parse(saved);
    }
    return null;
  });
  const [selectedDay, setSelectedDay] = useState<keyof MealPlan['weekPlan']>('monday');
  const [showShoppingList, setShowShoppingList] = useState(false);
  
  // Editing states
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingMeal, setEditingMeal] = useState<{ day: keyof MealPlan['weekPlan']; mealType: 'breakfast' | 'lunch' | 'dinner' } | null>(null);
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Recipe states
  const [showRecipe, setShowRecipe] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

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

  // Save meal plan to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && mealPlan) {
      localStorage.setItem('fittrack-mealplan', JSON.stringify(mealPlan));
    }
  }, [mealPlan]);

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

  // Generate AI meal plan
  const generateMealPlan = async () => {
    setIsGeneratingPlan(true);
    setShowMealPlan(true);

    try {
      const response = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          targetCalories,
          macros,
        }),
      });

      const data = await response.json();

      if (data.success && data.plan) {
        setMealPlan(data.plan);
      } else {
        console.error('Failed to generate plan:', data.error);
      }
    } catch (error) {
      console.error('Error generating meal plan:', error);
    }

    setIsGeneratingPlan(false);
  };

  const dayKeys: (keyof MealPlan['weekPlan'])[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  const navigateDay = (direction: 'prev' | 'next') => {
    const currentIndex = dayKeys.indexOf(selectedDay);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedDay(dayKeys[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < dayKeys.length - 1) {
      setSelectedDay(dayKeys[currentIndex + 1]);
    }
  };

  // Get meal suggestions from AI
  const getMealSuggestions = async (mealType: 'breakfast' | 'lunch' | 'dinner', currentMealName?: string) => {
    setIsLoadingSuggestions(true);
    setSuggestions([]);
    setShowSuggestions(true);
    setEditingMeal({ day: selectedDay, mealType });

    const mealCalories = mealType === 'breakfast' ? Math.round(targetCalories * 0.25) :
                        mealType === 'lunch' ? Math.round(targetCalories * 0.30) :
                        Math.round(targetCalories * 0.30);

    try {
      const response = await fetch('/api/suggest-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMeal: currentMealName,
          mealType,
          targetCalories: mealCalories,
        }),
      });

      const data = await response.json();

      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
    }

    setIsLoadingSuggestions(false);
  };

  // Apply a suggestion to the meal plan
  const applySuggestion = (suggestion: MealSuggestion) => {
    if (!mealPlan || !editingMeal) return;

    const updatedPlan = { ...mealPlan };
    const day = updatedPlan.weekPlan[editingMeal.day];
    
    day.meals[editingMeal.mealType] = {
      name: suggestion.name,
      description: suggestion.description,
      calories: suggestion.calories,
      protein: suggestion.protein,
      carbs: suggestion.carbs,
      fat: suggestion.fat,
      ingredients: suggestion.ingredients,
    };

    // Recalculate day totals
    const breakfast = day.meals.breakfast;
    const lunch = day.meals.lunch;
    const dinner = day.meals.dinner;
    const snacksCals = day.meals.snacks.reduce((sum, s) => sum + s.calories, 0);
    const snacksProtein = day.meals.snacks.reduce((sum, s) => sum + s.protein, 0);
    const snacksCarbs = day.meals.snacks.reduce((sum, s) => sum + s.carbs, 0);
    const snacksFat = day.meals.snacks.reduce((sum, s) => sum + s.fat, 0);

    day.totalCalories = breakfast.calories + lunch.calories + dinner.calories + snacksCals;
    day.totalProtein = breakfast.protein + lunch.protein + dinner.protein + snacksProtein;
    day.totalCarbs = breakfast.carbs + lunch.carbs + dinner.carbs + snacksCarbs;
    day.totalFat = breakfast.fat + lunch.fat + dinner.fat + snacksFat;

    // Update shopping list
    const allIngredients = new Set<string>();
    dayKeys.forEach(dayKey => {
      const d = updatedPlan.weekPlan[dayKey];
      d.meals.breakfast.ingredients.forEach(i => allIngredients.add(i));
      d.meals.lunch.ingredients.forEach(i => allIngredients.add(i));
      d.meals.dinner.ingredients.forEach(i => allIngredients.add(i));
    });
    updatedPlan.shoppingList = Array.from(allIngredients);

    setMealPlan(updatedPlan);
    setShowSuggestions(false);
    setEditingMeal(null);
    setSuggestions([]);
  };

  // Regenerate a single meal with AI
  const regenerateMeal = async (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (!mealPlan) return;
    
    const currentMeal = mealPlan.weekPlan[selectedDay].meals[mealType];
    setEditingMeal({ day: selectedDay, mealType });
    setIsLoadingSuggestions(true);

    try {
      const response = await fetch('/api/suggest-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMeal: currentMeal.name,
          mealType,
          targetCalories: currentMeal.calories,
          preferences: 'Gi meg ett alternativt måltid som er forskjellig fra det nåværende',
        }),
      });

      const data = await response.json();

      if (data.success && data.suggestions && data.suggestions.length > 0) {
        // Pick the first suggestion and apply it directly
        const newMeal = data.suggestions[0];
        
        const updatedPlan = { ...mealPlan };
        const day = updatedPlan.weekPlan[selectedDay];
        
        day.meals[mealType] = {
          name: newMeal.name,
          description: newMeal.description,
          calories: newMeal.calories,
          protein: newMeal.protein,
          carbs: newMeal.carbs,
          fat: newMeal.fat,
          ingredients: newMeal.ingredients,
        };

        // Recalculate day totals
        const breakfast = day.meals.breakfast;
        const lunch = day.meals.lunch;
        const dinner = day.meals.dinner;
        const snacksCals = day.meals.snacks.reduce((sum, s) => sum + s.calories, 0);
        const snacksProtein = day.meals.snacks.reduce((sum, s) => sum + s.protein, 0);
        const snacksCarbs = day.meals.snacks.reduce((sum, s) => sum + s.carbs, 0);
        const snacksFat = day.meals.snacks.reduce((sum, s) => sum + s.fat, 0);

        day.totalCalories = breakfast.calories + lunch.calories + dinner.calories + snacksCals;
        day.totalProtein = breakfast.protein + lunch.protein + dinner.protein + snacksProtein;
        day.totalCarbs = breakfast.carbs + lunch.carbs + dinner.carbs + snacksCarbs;
        day.totalFat = breakfast.fat + lunch.fat + dinner.fat + snacksFat;

        setMealPlan(updatedPlan);
      }
    } catch (error) {
      console.error('Error regenerating meal:', error);
    }

    setIsLoadingSuggestions(false);
    setEditingMeal(null);
  };

  // Get recipe for a meal
  const getRecipe = async (meal: MealPlanMeal) => {
    setShowRecipe(true);
    setIsLoadingRecipe(true);
    setCurrentRecipe(null);

    try {
      const response = await fetch('/api/get-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealName: meal.name,
          ingredients: meal.ingredients,
        }),
      });

      const data = await response.json();

      if (data.success && data.recipe) {
        setCurrentRecipe(data.recipe);
      }
    } catch (error) {
      console.error('Error getting recipe:', error);
    }

    setIsLoadingRecipe(false);
  };

  // Update meal manually
  const updateMealField = (mealType: 'breakfast' | 'lunch' | 'dinner', field: keyof MealPlanMeal, value: any) => {
    if (!mealPlan) return;

    const updatedPlan = { ...mealPlan };
    const day = updatedPlan.weekPlan[selectedDay];
    (day.meals[mealType] as any)[field] = value;
    
    // Recalculate totals if calories changed
    if (field === 'calories' || field === 'protein' || field === 'carbs' || field === 'fat') {
      const breakfast = day.meals.breakfast;
      const lunch = day.meals.lunch;
      const dinner = day.meals.dinner;
      const snacksCals = day.meals.snacks.reduce((sum, s) => sum + s.calories, 0);
      const snacksProtein = day.meals.snacks.reduce((sum, s) => sum + s.protein, 0);
      const snacksCarbs = day.meals.snacks.reduce((sum, s) => sum + s.carbs, 0);
      const snacksFat = day.meals.snacks.reduce((sum, s) => sum + s.fat, 0);

      day.totalCalories = breakfast.calories + lunch.calories + dinner.calories + snacksCals;
      day.totalProtein = breakfast.protein + lunch.protein + dinner.protein + snacksProtein;
      day.totalCarbs = breakfast.carbs + lunch.carbs + dinner.carbs + snacksCarbs;
      day.totalFat = breakfast.fat + lunch.fat + dinner.fat + snacksFat;
    }

    setMealPlan(updatedPlan);
  };

  // Progress percentage
  const calorieProgress = Math.min((consumedToday.calories / targetCalories) * 100, 100);
  const proteinProgress = Math.min((consumedToday.protein / macros.protein) * 100, 100);
  const carbsProgress = Math.min((consumedToday.carbs / macros.carbs) * 100, 100);
  const fatProgress = Math.min((consumedToday.fat / macros.fat) * 100, 100);

  // Meal Plan Modal
  if (showMealPlan) {
    const currentDay = mealPlan?.weekPlan[selectedDay];
    
    return (
      <div className="fixed inset-0 z-50 bg-midnight ios-modal">
        <div className="h-full flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          {/* iOS-style Header */}
          <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-white/10 bg-midnight/95 backdrop-blur-lg">
            <button 
              onClick={() => setShowMealPlan(false)} 
              className="min-w-[70px] text-electric text-[17px] font-medium active:opacity-60"
            >
              ← Tilbake
            </button>
            <h2 className="text-[17px] font-semibold">Kostholdsplan</h2>
            <div className="min-w-[70px] flex justify-end">
              {!isEditingPlan && mealPlan && (
                <button
                  onClick={() => setIsEditingPlan(true)}
                  className="text-electric text-[17px] font-medium active:opacity-60"
                >
                  Rediger
                </button>
              )}
              {isEditingPlan && (
                <button
                  onClick={() => setIsEditingPlan(false)}
                  className="text-neon-green text-[17px] font-medium active:opacity-60"
                >
                  Ferdig
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto ios-scroll" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
            {isGeneratingPlan ? (
              <div className="h-full flex flex-col items-center justify-center p-6">
                <Loader2 size={50} className="text-neon-green animate-spin mb-4" />
                <p className="font-semibold text-lg mb-2">Genererer kostholdsplan...</p>
                <p className="text-soft-white/60 text-center text-[15px]">AI-en lager en personlig ukesplan basert på dine mål</p>
              </div>
            ) : mealPlan && currentDay ? (
              <div className="px-4 py-4 space-y-4">
                {/* Summary Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-neon-green/15 to-electric/15 border border-neon-green/20">
                  <p className="text-soft-white/80 text-[15px] leading-relaxed">{mealPlan.summary}</p>
                </div>

                {/* Day Selector - iOS Segmented Control Style */}
                <div className="bg-white/5 rounded-xl p-1 flex">
                  {dayKeys.map((day) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all active:scale-95 ${
                        selectedDay === day
                          ? 'bg-neon-green text-midnight shadow-lg'
                          : 'text-soft-white/60'
                      }`}
                    >
                      {mealPlan.weekPlan[day].dayName.slice(0, 3)}
                    </button>
                  ))}
                </div>

                {/* Day Header with Navigation */}
                <div className="flex items-center justify-between py-2">
                  <button
                    onClick={() => navigateDay('prev')}
                    disabled={selectedDay === 'monday'}
                    className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center active:bg-white/10 disabled:opacity-30"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="text-center">
                    <h3 className="text-xl font-bold">{currentDay.dayName}</h3>
                    <p className="text-soft-white/50 text-[13px]">{currentDay.totalCalories} kcal totalt</p>
                  </div>
                  <button
                    onClick={() => navigateDay('next')}
                    disabled={selectedDay === 'sunday'}
                    className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center active:bg-white/10 disabled:opacity-30"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>

                {/* Macro Summary - iOS Card Style */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-white/5 rounded-2xl p-3 text-center">
                    <p className="text-xl font-bold text-orange-400">{currentDay.totalCalories}</p>
                    <p className="text-[11px] text-soft-white/50 mt-0.5">KCAL</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 text-center">
                    <p className="text-xl font-bold text-red-400">{currentDay.totalProtein}g</p>
                    <p className="text-[11px] text-soft-white/50 mt-0.5">PROTEIN</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 text-center">
                    <p className="text-xl font-bold text-yellow-400">{currentDay.totalCarbs}g</p>
                    <p className="text-[11px] text-soft-white/50 mt-0.5">KARBS</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 text-center">
                    <p className="text-xl font-bold text-purple-400">{currentDay.totalFat}g</p>
                    <p className="text-[11px] text-soft-white/50 mt-0.5">FETT</p>
                  </div>
                </div>

                {/* Recipe Modal - iOS Sheet Style */}
                {showRecipe && (
                  <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end">
                    <div 
                      className="w-full bg-midnight rounded-t-[20px] overflow-hidden animate-slideUp"
                      style={{ maxHeight: '90vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                      {/* iOS Handle */}
                      <div className="flex justify-center pt-3 pb-2">
                        <div className="w-10 h-1 rounded-full bg-white/30" />
                      </div>
                      
                      <div className="px-4 pb-2 flex items-center justify-between border-b border-white/10">
                        <div className="w-16" />
                        <h3 className="font-semibold text-[17px]">Oppskrift</h3>
                        <button 
                          onClick={() => setShowRecipe(false)} 
                          className="w-16 text-right text-electric font-medium active:opacity-60"
                        >
                          Lukk
                        </button>
                      </div>
                      
                      <div className="px-4 py-4 overflow-y-auto ios-scroll" style={{ maxHeight: 'calc(90vh - 100px)' }}>
                        {isLoadingRecipe ? (
                          <div className="text-center py-16">
                            <Loader2 size={40} className="animate-spin text-orange-400 mx-auto mb-3" />
                            <p className="text-[15px]">Henter oppskrift...</p>
                          </div>
                        ) : currentRecipe ? (
                          <div className="space-y-4">
                            <h2 className="text-2xl font-bold">{currentRecipe.title}</h2>
                            
                            {/* Time & Servings */}
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 whitespace-nowrap">
                                <Clock size={16} className="text-orange-400" />
                                <span className="text-[14px]">Prep: {currentRecipe.prepTime}</span>
                              </div>
                              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 whitespace-nowrap">
                                <Clock size={16} className="text-red-400" />
                                <span className="text-[14px]">Kok: {currentRecipe.cookTime}</span>
                              </div>
                              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 whitespace-nowrap">
                                <Users size={16} className="text-electric" />
                                <span className="text-[14px]">{currentRecipe.servings} pers</span>
                              </div>
                            </div>

                            {/* Ingredients */}
                            <div className="p-4 rounded-2xl bg-white/5">
                              <h4 className="font-semibold mb-3 text-[15px]">Ingredienser</h4>
                              <ul className="space-y-2.5">
                                {currentRecipe.ingredients.map((ing, i) => (
                                  <li key={i} className="flex items-center gap-3 text-[15px]">
                                    <div className="w-2 h-2 rounded-full bg-neon-green flex-shrink-0" />
                                    <span className="text-soft-white/90">{ing}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Steps */}
                            <div className="p-4 rounded-2xl bg-white/5">
                              <h4 className="font-semibold mb-3 text-[15px]">Fremgangsmåte</h4>
                              <ol className="space-y-4">
                                {currentRecipe.steps.map((step, i) => (
                                  <li key={i} className="flex gap-3">
                                    <span className="w-7 h-7 rounded-full bg-orange-400 text-midnight flex items-center justify-center text-[13px] font-bold flex-shrink-0">
                                      {i + 1}
                                    </span>
                                    <span className="text-soft-white/80 text-[15px] leading-relaxed pt-0.5">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Tips */}
                            {currentRecipe.tips && (
                              <div className="p-4 rounded-2xl bg-yellow-500/10">
                                <div className="flex items-start gap-3">
                                  <Lightbulb size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-[14px] text-soft-white/80 leading-relaxed">{currentRecipe.tips}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-center text-soft-white/50 py-16">Kunne ikke hente oppskrift</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggestions Modal - iOS Sheet Style */}
                {showSuggestions && (
                  <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end">
                    <div 
                      className="w-full bg-midnight rounded-t-[20px] overflow-hidden"
                      style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                      {/* iOS Handle */}
                      <div className="flex justify-center pt-3 pb-2">
                        <div className="w-10 h-1 rounded-full bg-white/30" />
                      </div>
                      
                      <div className="px-4 pb-2 flex items-center justify-between border-b border-white/10">
                        <div className="w-16" />
                        <h3 className="font-semibold text-[17px]">Alternativer</h3>
                        <button 
                          onClick={() => { setShowSuggestions(false); setEditingMeal(null); }} 
                          className="w-16 text-right text-electric font-medium active:opacity-60"
                        >
                          Lukk
                        </button>
                      </div>
                      
                      <div className="px-4 py-4 overflow-y-auto ios-scroll space-y-3" style={{ maxHeight: 'calc(85vh - 80px)' }}>
                        {isLoadingSuggestions ? (
                          <div className="text-center py-12">
                            <Loader2 size={40} className="animate-spin text-neon-green mx-auto mb-3" />
                            <p className="text-[15px]">Henter anbefalinger...</p>
                          </div>
                        ) : suggestions.length > 0 ? (
                          suggestions.map((suggestion, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-bold text-lg">{suggestion.name}</p>
                                  <p className="text-soft-white/60 text-sm">{suggestion.description}</p>
                                </div>
                                <span className="text-electric font-bold">{suggestion.calories} kcal</span>
                              </div>
                              <div className="flex gap-4 text-xs mb-3">
                                <span className="text-red-400">P: {suggestion.protein}g</span>
                                <span className="text-yellow-400">K: {suggestion.carbs}g</span>
                                <span className="text-purple-400">F: {suggestion.fat}g</span>
                                <span className="text-soft-white/50">⏱ {suggestion.prepTime}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mb-3">
                                {suggestion.tags.map((tag, j) => (
                                  <span key={j} className="px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green text-xs">{tag}</span>
                                ))}
                              </div>
                              <button
                                onClick={() => applySuggestion(suggestion)}
                                className="w-full py-2 rounded-xl bg-neon-green text-midnight font-bold flex items-center justify-center gap-2"
                              >
                                <Check size={18} />
                                Velg dette måltidet
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-soft-white/50 py-8">Ingen anbefalinger funnet</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Mode Toggle */}
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setIsEditingPlan(!isEditingPlan)}
                    className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${
                      isEditingPlan ? 'bg-neon-green text-midnight' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {isEditingPlan ? <Check size={16} /> : <Edit3 size={16} />}
                    {isEditingPlan ? 'Ferdig' : 'Rediger'}
                  </button>
                </div>

                {/* Breakfast */}
                <div className="p-4 rounded-2xl bg-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🍳</span>
                    <h4 className="font-bold">Frokost</h4>
                    <span className="ml-auto text-electric font-bold">{currentDay.meals.breakfast.calories} kcal</span>
                    {!isEditingPlan && (
                      <button
                        onClick={() => regenerateMeal('breakfast')}
                        disabled={isLoadingSuggestions && editingMeal?.mealType === 'breakfast'}
                        className="p-2 rounded-lg bg-electric/20 hover:bg-electric/30 text-electric disabled:opacity-50"
                        title="Generer nytt måltid"
                      >
                        {isLoadingSuggestions && editingMeal?.mealType === 'breakfast' ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                      </button>
                    )}
                    {isEditingPlan && (
                      <button
                        onClick={() => getMealSuggestions('breakfast', currentDay.meals.breakfast.name)}
                        className="p-2 rounded-lg bg-neon-green/20 hover:bg-neon-green/30 text-neon-green"
                        title="Se flere alternativer"
                      >
                        <Sparkles size={16} />
                      </button>
                    )}
                  </div>
                  {isEditingPlan ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={currentDay.meals.breakfast.name}
                        onChange={(e) => updateMealField('breakfast', 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-electric outline-none font-medium"
                      />
                      <textarea
                        value={currentDay.meals.breakfast.description}
                        onChange={(e) => updateMealField('breakfast', 'description', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-electric outline-none text-sm resize-none"
                        rows={2}
                      />
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-soft-white/50">Kcal</label>
                          <input
                            type="number"
                            value={currentDay.meals.breakfast.calories}
                            onChange={(e) => updateMealField('breakfast', 'calories', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-soft-white/50">Protein</label>
                          <input
                            type="number"
                            value={currentDay.meals.breakfast.protein}
                            onChange={(e) => updateMealField('breakfast', 'protein', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-soft-white/50">Karbs</label>
                          <input
                            type="number"
                            value={currentDay.meals.breakfast.carbs}
                            onChange={(e) => updateMealField('breakfast', 'carbs', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-soft-white/50">Fett</label>
                          <input
                            type="number"
                            value={currentDay.meals.breakfast.fat}
                            onChange={(e) => updateMealField('breakfast', 'fat', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-lg mb-1">{currentDay.meals.breakfast.name}</p>
                      <p className="text-soft-white/60 text-sm mb-3">{currentDay.meals.breakfast.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {currentDay.meals.breakfast.ingredients.map((ing, i) => (
                          <span key={i} className="px-2 py-1 rounded-lg bg-white/10 text-xs">{ing}</span>
                        ))}
                      </div>
                      <button
                        onClick={() => getRecipe(currentDay.meals.breakfast)}
                        className="w-full py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <BookOpen size={16} />
                        Se oppskrift
                      </button>
                    </>
                  )}
                </div>

                {/* Lunch */}
                <div className="p-4 rounded-2xl bg-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🥗</span>
                    <h4 className="font-bold">Lunsj</h4>
                    <span className="ml-auto text-electric font-bold">{currentDay.meals.lunch.calories} kcal</span>
                    {!isEditingPlan && (
                      <button
                        onClick={() => regenerateMeal('lunch')}
                        disabled={isLoadingSuggestions && editingMeal?.mealType === 'lunch'}
                        className="p-2 rounded-lg bg-electric/20 hover:bg-electric/30 text-electric disabled:opacity-50"
                        title="Generer nytt måltid"
                      >
                        {isLoadingSuggestions && editingMeal?.mealType === 'lunch' ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                      </button>
                    )}
                    {isEditingPlan && (
                      <button
                        onClick={() => getMealSuggestions('lunch', currentDay.meals.lunch.name)}
                        className="p-2 rounded-lg bg-neon-green/20 hover:bg-neon-green/30 text-neon-green"
                        title="Se flere alternativer"
                      >
                        <Sparkles size={16} />
                      </button>
                    )}
                  </div>
                  {isEditingPlan ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={currentDay.meals.lunch.name}
                        onChange={(e) => updateMealField('lunch', 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-electric outline-none font-medium"
                      />
                      <textarea
                        value={currentDay.meals.lunch.description}
                        onChange={(e) => updateMealField('lunch', 'description', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-electric outline-none text-sm resize-none"
                        rows={2}
                      />
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-soft-white/50">Kcal</label>
                          <input
                            type="number"
                            value={currentDay.meals.lunch.calories}
                            onChange={(e) => updateMealField('lunch', 'calories', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-soft-white/50">Protein</label>
                          <input
                            type="number"
                            value={currentDay.meals.lunch.protein}
                            onChange={(e) => updateMealField('lunch', 'protein', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-soft-white/50">Karbs</label>
                          <input
                            type="number"
                            value={currentDay.meals.lunch.carbs}
                            onChange={(e) => updateMealField('lunch', 'carbs', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-soft-white/50">Fett</label>
                          <input
                            type="number"
                            value={currentDay.meals.lunch.fat}
                            onChange={(e) => updateMealField('lunch', 'fat', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-lg mb-1">{currentDay.meals.lunch.name}</p>
                      <p className="text-soft-white/60 text-sm mb-3">{currentDay.meals.lunch.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {currentDay.meals.lunch.ingredients.map((ing, i) => (
                          <span key={i} className="px-2 py-1 rounded-lg bg-white/10 text-xs">{ing}</span>
                        ))}
                      </div>
                      <button
                        onClick={() => getRecipe(currentDay.meals.lunch)}
                        className="w-full py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <BookOpen size={16} />
                        Se oppskrift
                      </button>
                    </>
                  )}
                </div>

                {/* Dinner */}
                <div className="p-4 rounded-2xl bg-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🍽️</span>
                    <h4 className="font-bold">Middag</h4>
                    <span className="ml-auto text-electric font-bold">{currentDay.meals.dinner.calories} kcal</span>
                    {!isEditingPlan && (
                      <button
                        onClick={() => regenerateMeal('dinner')}
                        disabled={isLoadingSuggestions && editingMeal?.mealType === 'dinner'}
                        className="p-2 rounded-lg bg-electric/20 hover:bg-electric/30 text-electric disabled:opacity-50"
                        title="Generer nytt måltid"
                      >
                        {isLoadingSuggestions && editingMeal?.mealType === 'dinner' ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                      </button>
                    )}
                    {isEditingPlan && (
                      <button
                        onClick={() => getMealSuggestions('dinner', currentDay.meals.dinner.name)}
                        className="p-2 rounded-lg bg-neon-green/20 hover:bg-neon-green/30 text-neon-green"
                        title="Se flere alternativer"
                      >
                        <Sparkles size={16} />
                      </button>
                    )}
                  </div>
                  {isEditingPlan ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={currentDay.meals.dinner.name}
                        onChange={(e) => updateMealField('dinner', 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-electric outline-none font-medium"
                      />
                      <textarea
                        value={currentDay.meals.dinner.description}
                        onChange={(e) => updateMealField('dinner', 'description', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-electric outline-none text-sm resize-none"
                        rows={2}
                      />
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-soft-white/50">Kcal</label>
                          <input
                            type="number"
                            value={currentDay.meals.dinner.calories}
                            onChange={(e) => updateMealField('dinner', 'calories', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-soft-white/50">Protein</label>
                          <input
                            type="number"
                            value={currentDay.meals.dinner.protein}
                            onChange={(e) => updateMealField('dinner', 'protein', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-soft-white/50">Karbs</label>
                          <input
                            type="number"
                            value={currentDay.meals.dinner.carbs}
                            onChange={(e) => updateMealField('dinner', 'carbs', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-soft-white/50">Fett</label>
                          <input
                            type="number"
                            value={currentDay.meals.dinner.fat}
                            onChange={(e) => updateMealField('dinner', 'fat', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-lg mb-1">{currentDay.meals.dinner.name}</p>
                      <p className="text-soft-white/60 text-sm mb-3">{currentDay.meals.dinner.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {currentDay.meals.dinner.ingredients.map((ing, i) => (
                          <span key={i} className="px-2 py-1 rounded-lg bg-white/10 text-xs">{ing}</span>
                        ))}
                      </div>
                      <button
                        onClick={() => getRecipe(currentDay.meals.dinner)}
                        className="w-full py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <BookOpen size={16} />
                        Se oppskrift
                      </button>
                    </>
                  )}
                </div>

                {/* Snacks */}
                {currentDay.meals.snacks.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white/5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🍎</span>
                      <h4 className="font-bold">Mellommåltider</h4>
                    </div>
                    <div className="space-y-2">
                      {currentDay.meals.snacks.map((snack, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                          <span>{snack.name}</span>
                          <span className="text-electric font-medium">{snack.calories} kcal</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips */}
                <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={20} className="text-yellow-400" />
                    <h4 className="font-bold">Tips</h4>
                  </div>
                  <ul className="space-y-2">
                    {mealPlan.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-soft-white/80">
                        <span className="text-yellow-400">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Shopping List Toggle */}
                <button
                  onClick={() => setShowShoppingList(!showShoppingList)}
                  className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={20} className="text-neon-green" />
                    <span className="font-bold">Handleliste</span>
                  </div>
                  {showShoppingList ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {showShoppingList && (
                  <div className="p-4 rounded-2xl bg-white/5 grid grid-cols-2 gap-2">
                    {mealPlan.shoppingList.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                        <div className="w-5 h-5 rounded border border-white/20" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Regenerate Button */}
                <button
                  onClick={generateMealPlan}
                  className="w-full py-4 rounded-2xl border-2 border-neon-green text-neon-green font-bold flex items-center justify-center gap-2"
                >
                  <Sparkles size={20} />
                  Generer ny plan
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6">
                <p className="text-soft-white/60">Noe gikk galt. Prøv igjen.</p>
                <button
                  onClick={generateMealPlan}
                  className="mt-4 px-6 py-3 rounded-xl bg-neon-green text-midnight font-bold"
                >
                  Prøv igjen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Scanner Modal
  if (showScanner) {
    return (
      <div className="fixed inset-0 z-50 bg-midnight">
        <div className="h-full flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-white/10 bg-midnight/95 backdrop-blur-lg">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Camera size={22} className="text-electric" />
              Matskanner
            </h2>
            <button onClick={closeScanner} className="w-11 h-11 flex items-center justify-center hover:bg-white/10 rounded-xl active:scale-95">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto ios-scroll p-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 120px)' }}>
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

                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fixed Add Button at Bottom */}
          {analysisResult && !isAnalyzing && (
            <div 
              className="flex-shrink-0 p-4 bg-midnight/95 backdrop-blur-lg border-t border-white/10"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
            >
              <button
                onClick={addMealFromAnalysis}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-electric to-neon-green text-midnight font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Plus size={24} />
                Legg til {mealTypeLabels[selectedMealType].label.toLowerCase()}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
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

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => setShowScanner(true)}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-electric to-neon-green text-midnight font-bold text-lg flex items-center justify-center gap-3"
        >
          <Camera size={28} />
          Skann mat med AI
        </button>

        <button
          onClick={() => mealPlan ? setShowMealPlan(true) : generateMealPlan()}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-neon-green to-emerald-500 text-midnight font-bold text-lg flex items-center justify-center gap-3"
        >
          <ChefHat size={28} />
          {mealPlan ? 'Se kostholdsplan' : 'Lag AI kostholdsplan'}
        </button>
      </div>

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
