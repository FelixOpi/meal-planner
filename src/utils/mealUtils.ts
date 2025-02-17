import { NutritionSummary, Recipe } from '@/types';

export const calculateWeeklyNutrition = (mealPlan: any[]): NutritionSummary => {
  // Initialisiere die Summen
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let mealCount = 0;

  // Summiere die Nährwerte aller Mahlzeiten
  mealPlan.forEach(day => {
    if (day.dinner) {
      // Setze Standardwerte, falls keine Nährwerte vorhanden sind
      totalCalories += day.dinner.calories || 600; // Durchschnittliche Kalorien pro Mahlzeit
      totalProtein += day.dinner.protein || 20;   // Durchschnittliches Protein in Gramm
      totalCarbs += day.dinner.carbs || 60;       // Durchschnittliche Kohlenhydrate in Gramm
      totalFat += day.dinner.fat || 25;           // Durchschnittliches Fett in Gramm
      mealCount++;
    }
  });

  // Berechne die Durchschnittswerte pro Tag
  return {
    totalCalories: Math.round(totalCalories / mealCount),
    totalProtein: Math.round(totalProtein / mealCount),
    totalCarbs: Math.round(totalCarbs / mealCount),
    totalFat: Math.round(totalFat / mealCount)
  };
};

export const adjustServings = (recipe: Recipe, newServings: number) => {
  const factor = newServings / recipe.servings;
  return {
    ...recipe,
    servings: newServings,
    ingredients: recipe.ingredients.map(ing => ({
      ...ing,
      amount: ing.amount * factor
    }))
  };
};

export const getSeasonalIngredients = (month: number) => {
  const seasons = {
    winter: [12, 1, 2],
    spring: [3, 4, 5],
    summer: [6, 7, 8],
    fall: [9, 10, 11]
  };
  
  // Bestimme aktuelle Saison
  const currentSeason = Object.entries(seasons).find(([_, months]) => 
    months.includes(month)
  )?.[0];

  return SEASONAL_INGREDIENTS.filter(ing => 
    ing.seasons.includes(currentSeason as any)
  );
}; 