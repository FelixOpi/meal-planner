import { useState } from 'react';
import { Pantry } from '@/types';
import { motion } from 'framer-motion';
import { updatePantry } from '@/utils/firebaseUtils';

export const PantryManager = ({ pantry, onUpdate }: { pantry: Pantry, onUpdate: () => void }) => {
  const [newItem, setNewItem] = useState({ name: '', amount: 0, unit: 'g', expiryDate: '' });

  const addItem = async () => {
    if (!newItem.name || !newItem.amount) return;

    const updatedIngredients = [...pantry.ingredients, {
      ...newItem,
      expiryDate: newItem.expiryDate ? new Date(newItem.expiryDate) : undefined
    }];

    await updatePantry(updatedIngredients);
    onUpdate();
    setNewItem({ name: '', amount: 0, unit: 'g', expiryDate: '' });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-100"
    >
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span className="text-3xl mr-3">🗄️</span>
        Vorratskammer
      </h3>

      <div className="space-y-6">
        {/* Vorhandene Zutaten */}
        <div className="grid gap-4">
          {pantry.ingredients.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-600">
                  {item.amount} {item.unit}
                  {item.expiryDate && ` • Haltbar bis: ${new Date(item.expiryDate).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={async () => {
                  const updatedIngredients = pantry.ingredients.filter((_, i) => i !== index);
                  await updatePantry(updatedIngredients);
                  onUpdate();
                }}
                className="text-red-600 hover:text-red-800"
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>

        {/* Neue Zutat hinzufügen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Zutat"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="rounded-lg border-gray-300"
          />
          <input
            type="number"
            placeholder="Menge"
            value={newItem.amount || ''}
            onChange={(e) => setNewItem({ ...newItem, amount: parseFloat(e.target.value) })}
            className="rounded-lg border-gray-300"
          />
          <select
            value={newItem.unit}
            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
            className="rounded-lg border-gray-300"
          >
            <option value="g">Gramm</option>
            <option value="kg">Kilogramm</option>
            <option value="ml">Milliliter</option>
            <option value="l">Liter</option>
            <option value="Stück">Stück</option>
          </select>
          <button
            onClick={addItem}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </motion.div>
  );
}; 