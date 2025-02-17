import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  setDoc,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { Rating, MealReminder } from '@/types';

export const rateRecipe = async (mealId: string, rating: number, comment?: string) => {
  if (!auth.currentUser) return;
  
  const ratingData: Rating = {
    userId: auth.currentUser.uid,
    rating,
    comment,
    createdAt: serverTimestamp()
  };
  
  await addDoc(collection(db, 'meals', mealId, 'ratings'), ratingData);
};

export const setMealReminder = async (mealId: string, reminderTime: Date, type: 'prep' | 'cook' | 'shop') => {
  if (!auth.currentUser) return;

  const reminder: MealReminder = {
    userId: auth.currentUser.uid,
    mealId,
    reminderTime,
    notificationType: type,
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db, 'users', auth.currentUser.uid, 'reminders'), reminder);
};

export const updatePantry = async (ingredients: any[]) => {
  if (!auth.currentUser) return;

  // Validate and clean ingredients data
  const validIngredients = ingredients.filter(item => 
    item && 
    typeof item.name === 'string' && 
    typeof item.amount === 'number' && 
    typeof item.unit === 'string'
  ).map(item => ({
    name: item.name,
    amount: item.amount,
    unit: item.unit,
    expiryDate: item.expiryDate || null
  }));

  const pantryRef = doc(db, 'users', auth.currentUser.uid, 'pantry', 'current');
  const pantryDoc = await getDoc(pantryRef);

  const timestamp = Timestamp.now();
  const pantryData = {
    ingredients: validIngredients,
    updatedAt: timestamp
  };

  if (!pantryDoc.exists()) {
    await setDoc(pantryRef, {
      ...pantryData,
      createdAt: timestamp
    });
  } else {
    await updateDoc(pantryRef, pantryData);
  }
};

export const deleteMealReminder = async (reminderId: string) => {
  if (!auth.currentUser) return;

  const reminderRef = doc(
    db, 
    'users', 
    auth.currentUser.uid, 
    'reminders', 
    reminderId
  );
  
  await deleteDoc(reminderRef);
}; 