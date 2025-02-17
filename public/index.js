import { useState, useEffect } from "react";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyB4lFAQQalvbx8RSfkC7s3Nz-9nAbQyT7A",
  authDomain: "foodraffel.firebaseapp.com",
  projectId: "foodraffel",
  storageBucket: "foodraffel.appspot.com",
  messagingSenderId: "556275518032",
  appId: "1:556275518032:web:e75df28fba96716230df55"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function MealPlanner() {
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const provider = new GoogleAuthProvider();

  const signIn = async () => {
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
  };

  const fetchMeals = async () => {
    const querySnapshot = await getDocs(collection(db, "meals"));
    setMeals(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  const addMeal = async () => {
    const meal = { name: "Example Meal", category: "Vegetarian" };
    await addDoc(collection(db, "meals"), meal);
    fetchMeals();
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">Meal Planner</h1>
      {!user ? (
        <button onClick={signIn} className="mt-4 p-2 bg-blue-500 text-white rounded">
          Sign in with Google
        </button>
      ) : (
        <>
          <p className="mt-2">Welcome, {user.displayName}</p>
          <button onClick={addMeal} className="mt-4 p-2 bg-green-500 text-white rounded">
            Add Meal
          </button>
          <ul className="mt-4">
            {meals.map(meal => (
              <li key={meal.id} className="p-2 border-b">{meal.name} - {meal.category}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
