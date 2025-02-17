export interface Rating {
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface SeasonalIngredient {
  name: string;
  seasons: ('spring' | 'summer' | 'fall' | 'winter')[];
  localAvailability: boolean;
}

export interface Pantry {
  userId: string;
  ingredients: {
    name: string;
    amount: number;
    unit: string;
    expiryDate?: Date;
  }[];
}

export interface MealPrepPlan {
  prepDay: Date;
  meals: Meal[];
  storageInstructions: string[];
  reheatingInstructions: string[];
}

export interface NutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface MealReminder {
  id: string;
  userId: string;
  mealId: string;
  reminderTime: Date;
  notificationType: 'prep' | 'cook' | 'shop';
}

export interface ShoppingListOptimization {
  preferredStores: string[];
  budgetLimit?: number;
  organicPreference: boolean;
}

export interface UserPreferences {
  excludedIngredients: string[];
  servings: number;
  // ... andere Präferenzen
}

export interface Recipe {
  name: string;
  description: string;
  ingredients: {
    name: string;
    amount: number;
    unit: string;
  }[];
  instructions: string[];
  preparationTime: number;
  servings: number;
  dietaryInfo?: string[];
} 