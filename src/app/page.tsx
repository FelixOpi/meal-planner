"use client";

import { useState, useEffect } from "react";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, setPersistence, browserLocalPersistence, onAuthStateChanged, signInWithRedirect, getRedirectResult, inMemoryPersistence } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp,
  deleteDoc,
  query,
  where,
  Timestamp
} from "firebase/firestore";
import { Menu, Transition, Dialog } from '@headlessui/react';
import { Fragment } from 'react';
import openai from '@/utils/openai';
import { motion } from 'framer-motion';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { db, auth } from '@/lib/firebase';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  calculateWeeklyNutrition, 
  adjustServings,
  getSeasonalIngredients 
} from '@/utils/mealUtils';
import { 
  rateRecipe, 
  setMealReminder, 
  updatePantry 
} from '@/utils/firebaseUtils';
import { 
  NutritionSummary, 
  MealReminder, 
  Pantry, 
  SeasonalIngredient, 
  MealPrepPlan 
} from '@/types';
import { WeeklyNutritionSummary } from '@/components/WeeklyNutritionSummary';
import { PantryManager } from '@/components/PantryManager';
import { MealReminders } from '@/components/MealReminders';
import OnboardingTour from '@/components/OnboardingTour';

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

interface Meal {
  id?: string;
  name: string;
  category: string;
  description: string;
  dietaryPreferences: string[];
  cuisine: string;
  preparationTime: string;
  difficulty: string;
  isKidFriendly: boolean;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
  userId: string;
  seasonality: string[];
  tags: string[];
}

interface MealPreferences {
  dietaryPreferences: string[];
  cuisine: string[];
  preparationTime: string;
  difficulty: string;
  isKidFriendly: boolean;
  servings: number;
  excludedIngredients: string[];
}

interface GeneratedMeal {
  name: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  preparationTime: string;
  cuisine: string;
  dietaryInfo: string[];
}

interface UserPreferences {
  dietaryPreferences: string[];
  cuisine: string[];
  preparationTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isKidFriendly: boolean;
  servings: number;
  excludedIngredients: string[];
}

interface Recipe {
  name: string;
  preparationTime: string;
  ingredients: string[];
  steps: string[];
  nutrition: string;
}

interface MealPlan {
  recipes: Recipe[];
  createdAt: Date;
}

interface SavedMealPlan {
  id: string;
  name: string;
  createdAt: Date;
  mealPlan: any;
  preferences: UserPreferences;
}

const dietaryOptions: string[] = [
  'Vegetarisch',
  'Vegan',
  'Glutenfrei',
  'Laktosefrei',
  'Low Carb',
  'Keto'
];

const MOCK_MEAL_PLAN = {
  "days": [
    {
      "date": new Date().toISOString(),
      "lunch": {
        "name": "Mediterraner Quinoa-Salat",
        "description": "Frischer Quinoa-Salat mit Gemüse und Feta",
        "ingredients": [
          {"name": "Quinoa", "amount": 200, "unit": "g"},
          {"name": "Gurke", "amount": 1, "unit": "Stück"},
          {"name": "Tomaten", "amount": 2, "unit": "Stück"},
          {"name": "Feta", "amount": 100, "unit": "g"}
        ],
        "instructions": [
          "Quinoa nach Packungsanleitung kochen",
          "Gemüse klein schneiden",
          "Alles vermischen und mit Olivenöl anmachen"
        ],
        "preparationTime": "20",
        "cuisine": "Mediterran",
        "dietaryInfo": ["Vegetarisch", "Glutenfrei"]
      },
      "dinner": {
        "name": "Gemüse-Curry mit Reis",
        "description": "Cremiges Curry mit buntem Gemüse",
        "ingredients": [
          {"name": "Reis", "amount": 200, "unit": "g"},
          {"name": "Karotten", "amount": 2, "unit": "Stück"},
          {"name": "Kokosmilch", "amount": 400, "unit": "ml"}
        ],
        "instructions": [
          "Reis kochen",
          "Gemüse anbraten",
          "Mit Kokosmilch ablöschen"
        ],
        "preparationTime": "30",
        "cuisine": "Asiatisch",
        "dietaryInfo": ["Vegan", "Glutenfrei"]
      }
    }
    // ... mehr Tage können hier hinzugefügt werden
  ]
};

interface RecipeViewProps {
  meal: any;
  isOpen: boolean;
  onClose: () => void;
}

const RecipeView: React.FC<RecipeViewProps> = ({ meal, isOpen, onClose }) => {
  if (!meal) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-8 shadow-2xl transition-all">
                {/* Header */}
                <div className="border-b border-gray-200 pb-6 mb-6">
                  <Dialog.Title as="h3" className="text-3xl font-bold text-gray-900 mb-3">
                    {meal.name}
                  </Dialog.Title>
                  <p className="text-lg text-gray-600">{meal.description}</p>
                </div>

                {/* Quick Info */}
                <div className="flex flex-wrap gap-4 mb-8 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">⏱️</span>
                    <span className="text-gray-700 font-medium">{meal.preparationTime} Minuten</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🍳</span>
                    <span className="text-gray-700 font-medium">{meal.cuisine}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">👥</span>
                    <span className="text-gray-700 font-medium">{meal.servings || 4} Portionen</span>
                  </div>
                  {meal.dietaryInfo?.map((info: string) => (
                    <span key={info} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {info}
                    </span>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Zutaten */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <span className="text-2xl mr-2">🥗</span>
                      Zutaten
                    </h4>
                    <ul className="space-y-3">
                      {meal.ingredients.map((ingredient: Ingredient, index: number) => (
                        <li key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                          <span className="text-gray-800 font-medium">{ingredient.name}</span>
                          <span className="text-gray-600">
                            {ingredient.amount} {ingredient.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Zubereitungsschritte */}
                <div className="mt-8">
                  <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="text-2xl mr-2">👩‍🍳</span>
                    Zubereitung
                  </h4>
                  <div className="space-y-6">
                    {meal.instructions.map((instruction: string, index: number) => (
                      <div key={index} className="flex items-start">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-600 font-bold mr-4">
                          {index + 1}
                        </div>
                        <div className="flex-grow bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-gray-800 text-lg">{instruction}</p>
                          {index === 0 && (
                            <div className="mt-2 text-sm text-gray-600">
                              Tipp: Bereite alle Zutaten vor dem Kochen vor und stelle sie bereit.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                  <button
                    type="button"
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
                    onClick={onClose}
                  >
                    Schließen
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

interface ShoppingList {
  category: string;
  items: {
    name: string;
    amount: number;
    unit: string;
  }[];
}

const defaultPreferences: UserPreferences = {
  dietaryPreferences: [],
  cuisine: [],
  preparationTime: '30',
  difficulty: 'medium' as const,
  isKidFriendly: false,
  servings: 4,
  excludedIngredients: []
};

// Stattdessen, füge diese Interface-Definition am Anfang der Datei hinzu
interface RecipeSuggestion {
  name: string;
  description: string;
  usedIngredients: string[];
  additionalIngredients: string[];
  instructions: string[];
}

// Move RecipeSuggestionsModal outside and before Page component
const RecipeSuggestionsModal = ({ 
  showSuggestions, 
  setShowSuggestions, 
  recipeSuggestions 
}: { 
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  recipeSuggestions: RecipeSuggestion[];
}) => (
  <Transition appear show={showSuggestions} as={Fragment}>
    <Dialog 
      as="div" 
      className="relative z-10" 
      onClose={() => setShowSuggestions(false)}
    >
      <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Rezeptvorschläge aus deinem Vorrat
            </h3>

            <div className="space-y-6">
              {recipeSuggestions.map((recipe, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-3">{recipe.name}</h4>
                  <p className="text-gray-600 mb-4">{recipe.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Vorhandene Zutaten:</h5>
                      <ul className="list-disc list-inside text-gray-600">
                        {recipe.usedIngredients.map((ing: string, i: number) => (
                          <li key={i}>{ing}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Zusätzlich benötigt:</h5>
                      <ul className="list-disc list-inside text-gray-600">
                        {recipe.additionalIngredients.map((ing: string, i: number) => (
                          <li key={i}>{ing}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Zubereitung:</h5>
                    <ol className="list-decimal list-inside text-gray-600 space-y-2">
                      {recipe.instructions.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                onClick={() => setShowSuggestions(false)}
              >
                Schließen
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  </Transition>
);

// Entferne das ProfileModal aus der Page-Komponente und erstelle es als separate Komponente
const ProfileModal = ({ 
  isOpen, 
  onClose, 
  preferences, 
  onUpdatePreferences 
}: { 
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
}) => {
  // Lokaler State für die Einstellungen
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences);

  // Aktualisiere lokale Einstellungen wenn sich die Props ändern
  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-10" 
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-4 sm:p-6 text-left align-middle shadow-xl transition-all mx-4 sm:mx-auto">
              {/* Modal Inhalt */}
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// Füge einen LoadingOverlay hinzu
const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-white p-6 rounded-xl shadow-xl">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto" />
      <p className="mt-4 text-gray-700">Einen Moment bitte...</p>
    </div>
  </div>
);

interface RecipeCardProps {
  meal: {
    name: string;
    description: string;
    dietaryInfo?: string[];
    preparationTime: string | number;
  }
}

const RecipeCard = ({ meal }: RecipeCardProps) => (
  <motion.div 
    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    whileHover={{ y: -2 }}
  >
    <div className="p-4 sm:p-6">
      <div className="flex items-start justify-between">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 line-clamp-2">
          {meal.name}
        </h3>
        <span className="text-xl sm:text-2xl ml-2">🍽️</span>
      </div>
      
      <p className="mt-2 text-sm sm:text-base text-gray-600 line-clamp-2">
        {meal.description}
      </p>
      
      <div className="mt-4 flex flex-wrap gap-2">
        {meal.dietaryInfo?.map((info, index) => (
          <span
            key={index}
            className="px-2 py-1 text-xs sm:text-sm bg-indigo-50 text-indigo-700 rounded-full"
          >
            {info}
          </span>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
        <div className="text-sm sm:text-base text-gray-600">
          <span className="mr-1">⏱️</span>
          {meal.preparationTime} Min
        </div>
        <button
          onClick={() => {/* ... */}}
          className="text-indigo-600 hover:text-indigo-800 text-sm sm:text-base font-medium"
        >
          Details
        </button>
      </div>
    </div>
  </motion.div>
);

export default function Page() {
  const [user, setUser] = useState<any>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [newMeal, setNewMeal] = useState<Meal>({
    name: '',
    category: '',
    description: '',
    dietaryPreferences: [],
    cuisine: '',
    preparationTime: '',
    difficulty: 'medium',
    isKidFriendly: false,
    servings: 4,
    ingredients: [],
    instructions: [],
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    createdAt: '',
    userId: '',
    seasonality: [],
    tags: []
  });
  const [planningPeriod, setPlanningPeriod] = useState('1-week');
  const [mealPlan, setMealPlan] = useState<any[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState({ name: '', amount: 0, unit: 'g' });
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [shoppingList, setShoppingList] = useState<ShoppingList[]>([]);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    dietaryPreferences: [],
    cuisine: [],
    preparationTime: '30',
    difficulty: 'medium',
    isKidFriendly: false,
    servings: 4,
    excludedIngredients: []
  });
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedMealPlan, setGeneratedMealPlan] = useState<Recipe[] | null>(null);
  const [savedMealPlans, setSavedMealPlans] = useState<SavedMealPlan[]>([]);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [nutritionSummary, setNutritionSummary] = useState<NutritionSummary | null>(null);
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  const [mealReminders, setMealReminders] = useState<MealReminder[]>([]);
  const [recipeSuggestions, setRecipeSuggestions] = useState<RecipeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  // Prüfe beim Laden, ob es der erste Besuch ist
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (hasVisited) {
      setIsFirstVisit(false);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasVisited', 'true');
    setIsFirstVisit(false);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          console.log("Auth state changed:", currentUser?.email);
          setUser(currentUser);
          
          if (currentUser) {
            try {
              await Promise.all([
                loadUserPreferences(),
                loadSavedMealPlans(),  // Lade gespeicherte Pläne
                loadPantryItems(),     // Lade Vorratskammer
                loadMealReminders()    // Lade Erinnerungen
              ]);

              // Prüfe auf gespeicherten aktiven Plan im localStorage
              const savedActivePlan = localStorage.getItem('activeMealPlan');
              if (savedActivePlan) {
                try {
                  const parsedPlan = JSON.parse(savedActivePlan);
                  setMealPlan(parsedPlan);
                } catch (error) {
                  console.error("Fehler beim Parsen des gespeicherten Plans:", error);
                  localStorage.removeItem('activeMealPlan');
                }
              }
            } catch (error) {
              console.error("Error loading user data:", error);
            }
          }
          
          setAuthLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Auth initialization error:", error);
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Speichere den aktiven Plan im localStorage wenn er sich ändert
  useEffect(() => {
    if (mealPlan.length > 0) {
      localStorage.setItem('activeMealPlan', JSON.stringify(mealPlan));
    }
  }, [mealPlan]);

  const signIn = async () => {
    if (loginInProgress) return;

    try {
      setLoginInProgress(true);
      setError(null);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      console.log("Sign in successful:", result.user.email); // Debug-Log
      
      // Explizit User-State setzen
      setUser(result.user);
      
      // Sofort Präferenzen laden
      await loadUserPreferences();

    } catch (error: any) {
      console.error("Sign in error:", error);
      setError(error.message || "Anmeldefehler. Bitte versuche es erneut.");
    } finally {
      setLoginInProgress(false);
    }
  };

  const fetchMeals = async () => {
    if (!user) {
      setError("Please sign in to view meals");
      return;
    }
    
    try {
      const querySnapshot = await getDocs(collection(db, "meals"));
      const mealsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMeals(mealsData);
      setError(null);
    } catch (error) {
      console.error("Error fetching meals:", error);
      setError("Failed to fetch meals. Please try again.");
    }
  };
  

  const addMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please sign in to add meals");
      return;
    }

    try {
      const meal = {
        ...newMeal,
        userId: user.uid,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "meals"), meal);
      await fetchMeals();
      setError(null);
      setIsAddingMeal(false);
      setNewMeal({ name: '', category: '', description: '', dietaryPreferences: [], cuisine: '', preparationTime: '', difficulty: 'medium', isKidFriendly: false, servings: 4, ingredients: [], instructions: [], calories: 0, protein: 0, carbs: 0, fat: 0, createdAt: '', userId: '', seasonality: [], tags: [] });
    } catch (error) {
      console.error("Error adding meal:", error);
      setError("Failed to add meal. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setMeals([]);
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Failed to sign out. Please try again.");
    }
  };

  const generateMealPlan = async () => {
    if (!auth.currentUser) {
      setError("Bitte melde dich an, um einen Essensplan zu erstellen");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Erstelle einen optimierten Prompt basierend auf den Präferenzen
      const prompt = generateOptimizedPrompt(preferences);
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Du bist ein erfahrener Chefkoch. Erstelle einen detaillierten Essensplan mit präzisen Rezepten. 
Für jedes Rezept:
- Gib genaue Mengenangaben
- Beschreibe jeden Zubereitungsschritt ausführlich
- Füge Kochtipps und wichtige Hinweise hinzu
- Erkläre spezielle Techniken
- Nenne konkrete Garzeiten und Temperaturen
- Beschreibe die gewünschte Konsistenz/das gewünschte Ergebnis

Strukturiere die Antwort als JSON-Objekt mit dem vorgegebenen Format. Sei präzise und detailliert in den Anweisungen.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      console.log("Raw OpenAI response:", content);

      try {
        // Parse the JSON response
        const parsedResponse = JSON.parse(content);
        console.log("Parsed response:", parsedResponse);
        if (!parsedResponse.days || !Array.isArray(parsedResponse.days)) {
          throw new Error("Ungültiges Antwortformat");
        }
        setMealPlan(parsedResponse.days);
        await saveMealPlanToHistory(parsedResponse);
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        throw new Error("Fehler beim Parsen der OpenAI-Antwort. Bitte versuche es erneut.");
      }

    } catch (error: any) {
      console.error("Fehler bei der Essensplan-Generierung:", error);
      const errorMessage = error.status === 429 
        ? "Zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut."
        : "Es gab einen Fehler bei der Erstellung deines Essensplans. Bitte versuche es erneut.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Hilfsfunktion für optimierten Prompt
  const generateOptimizedPrompt = (prefs: UserPreferences) => {
    const dietaryStr = prefs.dietaryPreferences.length > 0 
      ? `Ernährungsform: ${prefs.dietaryPreferences.join(', ')}`
      : 'Keine speziellen Ernährungseinschränkungen';

    const excludedStr = prefs.excludedIngredients.length > 0
      ? `Ausgeschlossene Zutaten: ${prefs.excludedIngredients.join(', ')}`
      : 'Keine ausgeschlossenen Zutaten';

    const days = planningPeriod === '1-week' ? 7 : 14;

    return `Erstelle einen Essensplan für ${days} Tage im folgenden JSON-Format:
    {
      "days": [
        {
          "date": "2024-XX-XX",
          "dinner": {
            "name": "Name des Gerichts",
            "description": "Beschreibung",
            "ingredients": [{"name": "Zutat", "amount": 100, "unit": "g"}],
            "instructions": ["Schritt 1", "Schritt 2"],
            "preparationTime": "30",
            "cuisine": "Küchenstil",
            "dietaryInfo": ["Vegetarisch", "Glutenfrei"]
          }
        }
      ]
    }

    Berücksichtige dabei folgende Anforderungen:
    - ${dietaryStr}
    - Küche: ${prefs.cuisine.join(', ') || 'Keine Präferenz'}
    - Zubereitungszeit: maximal ${prefs.preparationTime} Minuten
    - Schwierigkeitsgrad: ${prefs.difficulty}
    - ${prefs.isKidFriendly ? 'Kinderfreundlich' : 'Keine Anforderung an Kinderfreundlichkeit'}
    - Portionen: ${prefs.servings}
    - ${excludedStr}
    
    Erstelle ausschließlich Abendessen-Rezepte.`;
  };

  // Hilfsfunktion zum Speichern in der Historie
  const saveMealPlanToHistory = async (mealPlan: any) => {
    if (!auth.currentUser) return;

    try {
      const historyRef = collection(db, 'users', auth.currentUser.uid, 'mealPlanHistory');
      await addDoc(historyRef, {
        mealPlan,
        createdAt: serverTimestamp(),
        preferences: { ...preferences }
      });
    } catch (error) {
      console.error("Fehler beim Speichern des Essensplans:", error);
    }
  };

  const addIngredient = () => {
    if (currentIngredient.name && currentIngredient.amount) {
      setNewMeal({
        ...newMeal,
        ingredients: [...newMeal.ingredients, currentIngredient]
      });
      setCurrentIngredient({ name: '', amount: 0, unit: 'g' });
    }
  };

  const addInstruction = () => {
    if (currentInstruction.trim()) {
      setNewMeal({
        ...newMeal,
        instructions: [...newMeal.instructions, currentInstruction.trim()]
      });
      setCurrentInstruction('');
    }
  };

  const generateShoppingList = () => {
    if (!mealPlan.length) return;

    const ingredientsByCategory: { [key: string]: any[] } = {};
    
    mealPlan.forEach(day => {
      // Nur noch Abendessen verarbeiten
      const meal = day.dinner;
      if (!meal) return;

      meal.ingredients.forEach((ingredient: any) => {
        const category = determineCategory(ingredient.name);
        
        if (!ingredientsByCategory[category]) {
          ingredientsByCategory[category] = [];
        }

        const existingIngredient = ingredientsByCategory[category].find(
          (item: any) => item.name === ingredient.name && item.unit === ingredient.unit
        );

        if (existingIngredient) {
          existingIngredient.amount += ingredient.amount;
        } else {
          ingredientsByCategory[category].push({ ...ingredient });
        }
      });
    });

    const formattedList = Object.entries(ingredientsByCategory).map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.name.localeCompare(b.name))
    }));

    setShoppingList(formattedList);
    setShowShoppingList(true);
  };

  const determineCategory = (ingredientName: string): string => {
    const categories = {
      'Gemüse': ['karotte', 'tomate', 'gurke', 'salat', 'zwiebel'],
      'Obst': ['apfel', 'banane', 'orange', 'zitrone'],
      'Proteine': ['fleisch', 'fisch', 'tofu', 'hähnchen', 'ei'],
      'Milchprodukte': ['milch', 'käse', 'joghurt', 'sahne'],
      'Getreide': ['reis', 'nudel', 'brot', 'mehl'],
      'Gewürze': ['salz', 'pfeffer', 'gewürz'],
    };

    const lowerName = ingredientName.toLowerCase();
    for (const [category, ingredients] of Object.entries(categories)) {
      if (ingredients.some(ing => lowerName.includes(ing))) {
        return category;
      }
    }
    return 'Sonstiges';
  };

  const exportToPDF = async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      let currentPage = pdfDoc.addPage();  // Verwende let statt const
      const { width, height } = currentPage.getSize();
      const fontSize = 12;

      // Lade Standard-Font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Header
      currentPage.drawText('Einkaufsliste', {
        x: 50,
        y: height - 50,
        size: 20,
        font: boldFont
      });

      let yPosition = height - 100;

      // Kategorien und Items
      for (const category of shoppingList) {
        // Kategorie-Überschrift
        currentPage.drawText(category.category, {
          x: 50,
          y: yPosition,
          size: 14,
          font: boldFont
        });
        yPosition -= 30;

        // Items
        for (const item of category.items) {
          const text = `• ${item.name}: ${item.amount} ${item.unit}`;
          currentPage.drawText(text, {
            x: 70,
            y: yPosition,
            size: fontSize,
            font: font
          });
          yPosition -= 20;

          // Neue Seite wenn nötig
          if (yPosition < 50) {
            currentPage = pdfDoc.addPage();
            yPosition = height - 50;
          }
        }
        yPosition -= 10;
      }

      // PDF generieren und herunterladen
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, 'einkaufsliste.pdf');
      
      setError("✅ PDF wurde erfolgreich erstellt!");
    } catch (error) {
      console.error("Fehler beim PDF-Export:", error);
      setError("❌ Fehler beim Erstellen der PDF");
    }
  };

  const handleServingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 12) {
      setPreferences({ ...preferences, servings: value });
    }
  };

  const generateMealId = (meal: any, dayIndex: number, type: 'lunch' | 'dinner'): string => {
    return `${dayIndex}-${type}-${meal.name.toLowerCase().replace(/\s+/g, '-')}`;
  };

  const renderMealCard = (meal: any, type: 'lunch' | 'dinner', dayIndex: number) => {
    const mealId = generateMealId(meal, dayIndex, type);
    
    return (
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className={`relative bg-gradient-to-r ${
          type === 'lunch' 
            ? 'from-indigo-50 to-purple-50' 
            : 'from-purple-50 to-pink-50'
        } p-4 rounded-xl cursor-pointer`}
        onClick={() => setSelectedMeal({ ...meal, id: mealId })}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(mealId);
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
        >
          {favorites.includes(mealId) ? (
            <svg className="w-6 h-6 fill-current text-red-500" viewBox="0 0 20 20">
              <path d="M10 18l-1.45-1.32C3.4 12.36 0 9.28 0 5.5 0 2.42 2.42 0 5.5 0 7.24 0 8.91.81 10 2.09 11.09.81 12.76 0 14.5 0 17.58 0 20 2.42 20 5.5c0 3.78-3.4 6.86-8.55 11.54L10 18z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20">
              <path d="M10 18l-1.45-1.32C3.4 12.36 0 9.28 0 5.5 0 2.42 2.42 0 5.5 0 7.24 0 8.91.81 10 2.09 11.09.81 12.76 0 14.5 0 17.58 0 20 2.42 20 5.5c0 3.78-3.4 6.86-8.55 11.54L10 18z"/>
            </svg>
          )}
        </button>
        
        <h4 className="text-sm font-medium text-gray-500 mb-2">
          {type === 'lunch' ? 'Mittagessen' : 'Abendessen'}
        </h4>
        <h5 className="text-lg font-medium text-gray-900">{meal.name}</h5>
        <p className="mt-2 text-sm text-gray-600">{meal.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {meal.dietaryInfo.map((info: string, i: number) => (
            <span 
              key={i} 
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                type === 'lunch'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              {info}
            </span>
          ))}
        </div>
      </motion.div>
    );
  };

  const renderMealPlan = () => {
    if (!mealPlan || !Array.isArray(mealPlan) || mealPlan.length === 0) {
      return null;
    }

    console.log("Rendering meal plan:", mealPlan); // Debug log

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8"
      >
        <div className="flex justify-between items-center mb-6 bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-purple-100">
          <div className="flex items-center space-x-4">
            <span className="text-4xl">📋</span>
            <h2 className="text-3xl font-bold text-gray-900">
              Dein Essensplan
            </h2>
          </div>
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={saveMealPlan}
              className="inline-flex items-center px-6 py-3 text-base font-medium rounded-full text-white bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 shadow-lg transition-all"
            >
              <span className="mr-2">💾</span>
              Plan speichern
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={generateShoppingList}
              className="inline-flex items-center px-6 py-3 text-base font-medium rounded-full text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg transition-all"
            >
              <span className="mr-2">🛒</span>
              Einkaufsliste erstellen
            </motion.button>
          </div>
        </div>

        <div className="space-y-6">
          {mealPlan.map((day, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100"
            >
              <div className="flex items-center space-x-4 mb-6">
                <span className="text-3xl">📅</span>
                <h3 className="text-2xl font-bold text-gray-900">
                  {new Date(day.date).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
              </div>

              {day.dinner && (
                <div 
                  className="bg-gradient-to-r from-purple-200 to-pink-200 p-8 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-200 border border-purple-300"
                  onClick={() => setSelectedMeal(day.dinner)}
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <span className="text-3xl">🍽️</span>
                    <h4 className="text-xl font-bold text-gray-900">
                      Abendessen: {day.dinner.name}
                    </h4>
                  </div>
                  <p className="text-gray-800 mb-4 text-lg">{day.dinner.description}</p>
                  <div className="flex space-x-6">
                    <p className="text-base font-medium text-gray-800">
                      ⏱️ {day.dinner.preparationTime} Minuten
                    </p>
                    <p className="text-base font-medium text-gray-800">
                      🍳 {day.dinner.cuisine}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  const ShoppingListModal = () => (
    <Transition appear show={showShoppingList} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-10" 
        onClose={() => setShowShoppingList(false)}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-3xl font-bold text-gray-900 mb-6"
                >
                  Einkaufsliste
                </Dialog.Title>

                <div className="mt-6 space-y-8">
                  {shoppingList.map((category, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-6 shadow-sm">
                      <h4 className="text-xl font-bold text-gray-900 mb-4">
                        {category.category}
                      </h4>
                      <ul className="space-y-3">
                        {category.items.map((item, itemIndex) => (
                          <li 
                            key={itemIndex}
                            className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0"
                          >
                            <span className="text-lg text-gray-800">{item.name}</span>
                            <span className="text-lg font-medium text-gray-700">
                              {item.amount} {item.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium shadow-lg hover:bg-indigo-700 transition-all"
                    onClick={exportToPDF}
                  >
                    Als PDF exportieren
                  </button>
                  <button
                    type="button"
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
                    onClick={() => setShowShoppingList(false)}
                  >
                    Schließen
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  const loadUserPreferences = async () => {
    if (!auth.currentUser) {
      console.log("Kein aktiver Benutzer");
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Erstelle neuen Benutzer mit Standardeinstellungen
        const initialPreferences = {
          dietaryPreferences: [],
          cuisine: [],
          preparationTime: '30',
          difficulty: 'medium' as const,
          isKidFriendly: false,
          servings: 4,
          excludedIngredients: [],
          favorites: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(userRef, initialPreferences);
        setPreferences(initialPreferences);
        console.log("Neue Benutzereinstellungen erstellt");
      } else {
        // Lade existierende Einstellungen
        const data = userDoc.data();
        setPreferences({
          dietaryPreferences: Array.isArray(data.dietaryPreferences) ? data.dietaryPreferences : [],
          cuisine: Array.isArray(data.cuisine) ? data.cuisine : [],
          preparationTime: data.preparationTime || '30',
          difficulty: data.difficulty || 'medium',
          isKidFriendly: Boolean(data.isKidFriendly),
          servings: Number(data.servings) || 4,
          excludedIngredients: Array.isArray(data.excludedIngredients) ? data.excludedIngredients : []
        });
        console.log("Existierende Einstellungen geladen");
      }
    } catch (error) {
      console.error("Fehler beim Laden der Benutzereinstellungen:", error);
      // Setze Standardwerte im Fehlerfall
      setPreferences(defaultPreferences);
    }
  };

  // Neue Funktion zum Aktualisieren der Einstellungen
  const updateUserPreferences = async (newPreferences: UserPreferences) => {
    if (!auth.currentUser) {
      setError("Bitte melde dich an, um deine Einstellungen zu speichern");
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        ...newPreferences,
        updatedAt: serverTimestamp()
      });
      setPreferences(newPreferences);
      console.log("Einstellungen erfolgreich aktualisiert");
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Einstellungen:", error);
      setError("Deine Einstellungen konnten nicht gespeichert werden");
    }
  };

  const toggleFavorite = async (mealId: string) => {
    if (!user) {
      setError("Bitte melde dich an, um Favoriten zu speichern");
      return;
    }

    if (!mealId) {
      console.error("Keine gültige Meal ID");
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Erstelle Dokument falls es noch nicht existiert
        await setDoc(userRef, { favorites: [] });
      }

      if (favorites.includes(mealId)) {
        await updateDoc(userRef, {
          favorites: arrayRemove(mealId)
        });
        setFavorites(prev => prev.filter(id => id !== mealId));
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(mealId)
        });
        setFavorites(prev => [...prev, mealId]);
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Favoriten:", error);
      setError("Fehler beim Speichern des Favoriten");
    }
  };

  const UserMenu = () => (
    <Menu as="div" className="relative">
      <Menu.Button className="inline-flex items-center px-6 py-3 text-base font-medium rounded-full text-indigo-700 bg-indigo-50 hover:bg-indigo-100 shadow-md transition-all">
        <span className="mr-2">👤</span>
        Profil
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => setShowProfileModal(true)}
                  className={`${
                    active ? 'bg-gray-100' : ''
                  } w-full text-left px-4 py-2 text-sm text-gray-700`}
                >
                  Einstellungen
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => signOut(auth)} // Korrigiere den signOut-Aufruf
                  className={`${
                    active ? 'bg-gray-100' : ''
                  } w-full text-left px-4 py-2 text-sm text-red-600`}
                >
                  Abmelden
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError("Bitte melde dich an, um einen Essensplan zu erstellen");
      return;
    }
    
    try {
      await generateMealPlan();
    } catch (error) {
      console.error("Fehler beim Erstellen des Essensplans:", error);
      setError("Es gab einen Fehler bei der Erstellung deines Essensplans.");
    }
  };

  const handleDietaryChange = (option: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      dietaryPreferences: checked 
        ? [...prev.dietaryPreferences, option]
        : prev.dietaryPreferences.filter(item => item !== option)
    }));
  };

  const handleCuisineChange = (option: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      cuisine: checked
        ? [...prev.cuisine, option]
        : prev.cuisine.filter(item => item !== option)
    }));
  };

  const handlePreferenceChange = (field: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReset = () => {
    setPreferences(defaultPreferences);
    setError(null);
    setGeneratedMealPlan(null);
  };

  const parseMealPlanResponse = (content: string): Recipe[] => {
    try {
      // Hier könnte eine komplexere Parsing-Logik implementiert werden
      const recipes: Recipe[] = [];
      // ... Parsing-Logik ...
      return recipes;
    } catch (error) {
      console.error("Fehler beim Parsen des Essensplans:", error);
      return [];
    }
  };

  const loadSavedMealPlans = async () => {
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const plansRef = collection(userRef, 'mealPlans');
      const snapshot = await getDocs(plansRef);
      
      const plans = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          createdAt: data.createdAt?.toDate() || new Date(),
          mealPlan: data.mealPlan,
          preferences: data.preferences
        };
      });
      
      setSavedMealPlans(plans.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      ));
    } catch (error) {
      console.error("Fehler beim Laden der Essenspläne:", error);
      setError("Fehler beim Laden der gespeicherten Pläne");
    } finally {
      setLoading(false);
    }
  };

  const saveMealPlan = async () => {
    if (!auth.currentUser || !mealPlan.length) return;
    
    try {
      setLoading(true);
      const planName = `Essensplan vom ${new Date().toLocaleDateString('de-DE')}`;
      
      // Korrekter Pfad zur mealPlans Subkollektion
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const plansRef = collection(userRef, 'mealPlans');
      
      await addDoc(plansRef, {
        name: planName,
        createdAt: serverTimestamp(),
        mealPlan: mealPlan,
        preferences: preferences
      });

      await loadSavedMealPlans();
      setError("Essensplan erfolgreich gespeichert!");
    } catch (error) {
      console.error("Fehler beim Speichern des Essensplans:", error);
      setError("Fehler beim Speichern des Essensplans");
    } finally {
      setLoading(false);
    }
  };

  const deleteMealPlan = async (planId: string) => {
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const planRef = doc(userRef, 'mealPlans', planId);
      await deleteDoc(planRef);
      await loadSavedMealPlans();
    } catch (error) {
      console.error("Fehler beim Löschen des Essensplans:", error);
      setError("Fehler beim Löschen des Essensplans");
    } finally {
      setLoading(false);
    }
  };

  const loadSavedPlan = (plan: SavedMealPlan) => {
    try {
      console.log("Loading plan:", plan);

      if (!plan.mealPlan) {
        throw new Error("Kein mealPlan gefunden");
      }

      // Direkt das mealPlan Array setzen
      setMealPlan(plan.mealPlan);
      
      // Preferences setzen, falls vorhanden
      if (plan.preferences) {
        setPreferences({
          ...defaultPreferences,  // Standardwerte als Fallback
          ...plan.preferences    // Überschreiben mit gespeicherten Werten
        });
      }

      // Modal schließen
      setShowSavedPlans(false);

      // Erfolgsmeldung
      setError("Plan erfolgreich geladen!");

    } catch (error) {
      console.error("Debug - Plan Format:", plan);
      console.error("Fehler beim Laden des Plans:", error);
      setError("Der Plan konnte nicht geladen werden.");
    }
  };

  const SavedPlansModal = () => (
    <Transition appear show={showSavedPlans} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-10" 
        onClose={() => setShowSavedPlans(false)}
      >
        <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
              <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 mb-6">
                Gespeicherte Essenspläne
              </Dialog.Title>

              <div className="space-y-4">
                {savedMealPlans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className="bg-gray-50 rounded-xl p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{plan.name}</h4>
                      <p className="text-sm text-gray-500">
                        Erstellt am: {plan.createdAt.toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => loadSavedPlan(plan)}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Laden
                      </button>
                      <button
                        onClick={() => deleteMealPlan(plan.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))}

                {savedMealPlans.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    Keine gespeicherten Essenspläne vorhanden
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  onClick={() => setShowSavedPlans(false)}
                >
                  Schließen
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  useEffect(() => {
    if (mealPlan.length > 0) {
      const summary = calculateWeeklyNutrition(mealPlan);
      setNutritionSummary(summary);
    }
  }, [mealPlan]);

  const shareMealPlan = async () => {
    if (!mealPlan.length) return;

    try {
      // Erstelle eine vereinfachte Version des Plans zum Teilen
      const shareablePlan = mealPlan.map(day => ({
        date: day.date,
        dinner: {
          name: day.dinner.name,
          description: day.dinner.description,
          ingredients: day.dinner.ingredients,
          instructions: day.dinner.instructions,
          preparationTime: day.dinner.preparationTime,
          cuisine: day.dinner.cuisine
        }
      }));

      // Konvertiere zu JSON und dann zu Base64
      const planString = JSON.stringify(shareablePlan);
      const encodedPlan = btoa(encodeURIComponent(planString));
      
      // Erstelle und kopiere den Link
      const shareableUrl = `${window.location.origin}/shared-plan/${encodedPlan}`;
      await navigator.clipboard.writeText(shareableUrl);
      
      // Zeige Erfolgsmeldung
      setError("✅ Link wurde in die Zwischenablage kopiert!");
      
      console.log("Shared URL:", shareableUrl); // Debug-Log
    } catch (error) {
      console.error("Fehler beim Teilen:", error);
      setError("❌ Fehler beim Erstellen des Share-Links");
    }
  };

  const suggestRecipesFromPantry = async () => {
    if (!pantryItems.length) return;
    
    setLoading(true);
    try {
      const ingredients = pantryItems.map(item => item.name).join(', ');
      const prompt = `Erstelle 3 Rezeptvorschläge mit diesen Zutaten: ${ingredients}
      Berücksichtige dabei die Mengen und schlage Rezepte vor, die möglichst viele der vorhandenen Zutaten verwenden.
      Formatiere die Antwort als JSON mit diesem Format:
      {
        "suggestions": [
          {
            "name": "Rezeptname",
            "description": "Kurze Beschreibung",
            "usedIngredients": ["Zutat1", "Zutat2"],
            "additionalIngredients": ["Zutat3", "Zutat4"],
            "instructions": ["Schritt 1", "Schritt 2"]
          }
        ]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Du bist ein kreativer Koch, der aus vorhandenen Zutaten leckere Gerichte zaubert."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Keine Antwort erhalten");

      const suggestions = JSON.parse(content);
      
      // Zeige die Vorschläge in einem Modal
      setRecipeSuggestions(suggestions.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Fehler beim Erstellen der Rezeptvorschläge:", error);
      setError("Fehler beim Erstellen der Rezeptvorschläge");
    } finally {
      setLoading(false);
    }
  };

  // Neue Funktionen für das Laden der Daten
  const loadPantryItems = async () => {
    if (!auth.currentUser) return;
    
    try {
      const pantryRef = doc(db, 'users', auth.currentUser.uid, 'pantry', 'current');
      const pantryDoc = await getDoc(pantryRef);
      
      if (pantryDoc.exists()) {
        setPantryItems(pantryDoc.data().ingredients || []);
      } else {
        setPantryItems([]);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Vorratskammer:", error);
    }
  };

  const loadMealReminders = async () => {
    if (!auth.currentUser) return;
    
    try {
      const remindersRef = collection(db, 'users', auth.currentUser.uid, 'reminders');
      const snapshot = await getDocs(remindersRef);
      
      const reminders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: auth.currentUser!.uid,
          mealId: data.mealId,
          reminderTime: data.reminderTime?.toDate() || new Date(),
          notificationType: data.notificationType as 'prep' | 'cook' | 'shop'
        } satisfies MealReminder;
      });
      
      setMealReminders(reminders);
    } catch (error) {
      console.error("Fehler beim Laden der Erinnerungen:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-100 via-purple-50 to-pink-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header mit Animation */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-between items-center mb-8 bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-purple-100 z-10"
        >
          <div className="flex items-center space-x-4">
            <span className="text-5xl">🍽️</span>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 text-transparent bg-clip-text">
              Meal Planner
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSavedPlans(true)}
                className="inline-flex items-center px-6 py-3 text-base font-medium rounded-full text-indigo-700 bg-indigo-50 hover:bg-indigo-100 shadow-md transition-all"
              >
                <span className="mr-2">📋</span>
                Meine Pläne
              </motion.button>
            )}
            {user ? (
              <UserMenu />
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={signIn}
                className="inline-flex items-center px-6 py-3 text-base font-medium rounded-full text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg transition-all"
              >
                <span className="mr-2">🎯</span>
                Mit Google anmelden
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Hauptformular Container */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-br from-white via-purple-50/50 to-pink-50/50 backdrop-blur-sm rounded-3xl shadow-2xl p-10 mb-8 border-2 border-purple-200/50 relative overflow-hidden z-0"
        >
          {/* Dekorative Elemente */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2" />

          {/* Header mit verbessertem Styling */}
          <div className="flex items-center space-x-6 mb-10 pb-6 border-b-2 border-purple-100">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-4 rounded-2xl shadow-lg">
              <span className="text-4xl filter drop-shadow-lg">👩‍🍳</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 text-transparent bg-clip-text mb-2">
                Essensplan erstellen
              </h2>
              <p className="text-gray-600">
                Personalisiere deinen Essensplan nach deinen Vorlieben
              </p>
            </div>
          </div>

          {/* Formular mit verbessertem Abstand */}
          <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 md:p-8">
            {/* Bestehende Formularelemente mit zusätzlichem Padding */}
            <div className="space-y-8 px-2">
              {/* Ernährungsform */}
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Ernährungsform
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {dietaryOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={preferences.dietaryPreferences.includes(option)}
                        onChange={(e) => handleDietaryChange(option, e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-3 text-base font-medium text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Küchen */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Bevorzugte Küchen
                </label>
                <div className="flex flex-wrap gap-3">
                  {[
                    'Deutsch', 'Italienisch', 'Asiatisch', 'Mediterran', 'Amerikanisch',
                    'Indisch', 'Mexikanisch', 'Thailändisch', 'Französisch', 'Griechisch'
                  ].map((cuisine) => (
                    <motion.label
                      key={cuisine}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`inline-flex items-center px-5 py-3 rounded-full cursor-pointer transition-colors duration-200 ${
                        preferences.cuisine.includes(cuisine)
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={preferences.cuisine.includes(cuisine)}
                        onChange={(e) => {
                          const updatedCuisines = e.target.checked
                            ? [...preferences.cuisine, cuisine]
                            : preferences.cuisine.filter(c => c !== cuisine);
                          setPreferences({ ...preferences, cuisine: updatedCuisines });
                        }}
                        className="sr-only"
                      />
                      {cuisine}
                    </motion.label>
                  ))}
                </div>
              </div>

              {/* Weitere Präferenzen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Zubereitungszeit */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    Maximale Zubereitungszeit
                  </label>
                  <select
                    value={preferences.preparationTime}
                    onChange={(e) => handlePreferenceChange('preparationTime', e.target.value)}
                    className="w-full rounded-lg border-gray-300 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base"
                  >
                    <option value="15">15 Minuten</option>
                    <option value="30">30 Minuten</option>
                    <option value="45">45 Minuten</option>
                    <option value="60">1 Stunde</option>
                    <option value="90">1.5 Stunden</option>
                  </select>
                </div>

                {/* Schwierigkeitsgrad */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    Schwierigkeitsgrad
                  </label>
                  <div className="flex space-x-4">
                    {['easy', 'medium', 'hard'].map((level) => (
                      <label key={level} className="flex-1">
                        <input
                          type="radio"
                          value={level}
                          checked={preferences.difficulty === level}
                          onChange={(e) => handlePreferenceChange('difficulty', e.target.value)}
                          className="sr-only"
                        />
                        <div className={`text-center p-3 rounded-lg cursor-pointer transition-all ${
                          preferences.difficulty === level
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>
                          {level === 'easy' ? 'Einfach' : level === 'medium' ? 'Mittel' : 'Anspruchsvoll'}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ausgeschlossene Zutaten */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Zutaten ausschließen
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {preferences.excludedIngredients.map((ingredient, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                    >
                      {ingredient}
                      <button
                        type="button"
                        className="ml-2 hover:text-red-900"
                        onClick={() => {
                          const newExcluded = preferences.excludedIngredients.filter((_, i) => i !== index);
                          setPreferences({ ...preferences, excludedIngredients: newExcluded });
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Zutat eingeben und Enter drücken"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const value = input.value.trim();
                      if (value && !preferences.excludedIngredients.includes(value)) {
                        setPreferences(prev => ({
                          ...prev,
                          excludedIngredients: [...prev.excludedIngredients, value]
                        }));
                        input.value = '';
                      }
                    }
                  }}
                />
              </div>

              {/* Weitere Optionen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    Portionen
                  </label>
                  <input
                    type="number"
                    value={preferences.servings}
                    onChange={(e) => handlePreferenceChange('servings', parseInt(e.target.value))}
                    min="1"
                    max="12"
                    className="w-full rounded-lg border-gray-300 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center">
                  <label className="flex items-center space-x-3 text-lg">
                    <input
                      type="checkbox"
                      checked={preferences.isKidFriendly}
                      onChange={(e) => handlePreferenceChange('isKidFriendly', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-gray-900">Kinderfreundlich</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer mit verbessertem Styling */}
            <div className="flex items-center justify-between pt-8 border-t-2 border-purple-100 mt-10">
              <div className="flex items-center space-x-4 bg-white/80 rounded-xl p-2 shadow-sm">
                <span className="text-2xl">📅</span>
                <select
                  value={planningPeriod}
                  onChange={(e) => setPlanningPeriod(e.target.value)}
                  className="rounded-lg border-0 bg-transparent py-2 focus:ring-2 focus:ring-indigo-500 text-gray-700 font-medium"
                >
                  <option value="1-week">1 Woche</option>
                  <option value="2-weeks">2 Wochen</option>
                </select>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading}
                className="px-8 py-4 text-lg font-medium rounded-full text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-2 relative"
              >
                {loading ? (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                    <span className="opacity-0">Essensplan generieren</span>
                  </>
                ) : (
                  <>
                    <span>Essensplan generieren</span>
                    <span className="text-xl">✨</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Nach dem Formular */}
        {mealPlan && mealPlan.length > 0 && (
          <>
            {renderMealPlan()}
            
            {/* Vorratskammer und Rezeptvorschläge */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <PantryManager 
                pantry={{
                  userId: auth.currentUser?.uid || '',
                  ingredients: pantryItems
                }}
                onUpdate={loadPantryItems}
              />

              {pantryItems.length > 0 && (
                <motion.div 
                  className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-100"
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="text-3xl mr-3">💡</span>
                    Rezeptvorschläge aus Vorrat
                  </h3>
                  <button
                    onClick={suggestRecipesFromPantry}
                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Rezepte vorschlagen</span>
                    <span>✨</span>
                  </button>
                </motion.div>
              )}
            </motion.div>

            {/* Erinnerungen */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <MealReminders 
                reminders={mealReminders}
                onUpdate={loadMealReminders}
              />
            </motion.div>

            {/* Teilen-Button */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 flex justify-end"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareMealPlan}
                className="inline-flex items-center px-6 py-3 text-base font-medium rounded-full text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg transition-all"
              >
                <span className="mr-2">🔗</span>
                Plan teilen
              </motion.button>
            </motion.div>
          </>
        )}

        {/* Recipe Modal */}
        <RecipeView 
          meal={selectedMeal} 
          isOpen={!!selectedMeal} 
          onClose={() => setSelectedMeal(null)} 
        />

        {/* Shopping List Modal */}
        <ShoppingListModal />

        {/* Saved Plans Modal */}
        <SavedPlansModal />

        {/* Loading Overlay */}
        {loading && <LoadingOverlay />}

        {/* Rezeptvorschläge Modal */}
        <RecipeSuggestionsModal 
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          recipeSuggestions={recipeSuggestions}
        />
      </div>
      
      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        preferences={preferences}
        onUpdatePreferences={updateUserPreferences}
      />
      
      <OnboardingTour 
        isFirstVisit={isFirstVisit} 
        onComplete={handleOnboardingComplete}
      />
    </main>
  );
}

