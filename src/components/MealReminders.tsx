import { useState } from 'react';
import { MealReminder } from '@/types';
import { motion } from 'framer-motion';
import { setMealReminder, deleteMealReminder } from '@/utils/firebaseUtils';

export const MealReminders = ({ reminders, onUpdate }: { reminders: MealReminder[], onUpdate: () => void }) => {
  const [newReminder, setNewReminder] = useState({
    mealId: '',
    reminderTime: new Date(),
    notificationType: 'prep' as const
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-100"
    >
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span className="text-3xl mr-3">⏰</span>
        Erinnerungen
      </h3>

      <div className="space-y-6">
        {reminders.map((reminder, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">
                {reminder.notificationType === 'prep' ? 'Vorbereitung' : 
                 reminder.notificationType === 'cook' ? 'Kochen' : 'Einkaufen'}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(reminder.reminderTime).toLocaleString()}
              </p>
            </div>
            <button
              onClick={async () => {
                await deleteMealReminder(reminder.id);
                onUpdate();
              }}
              className="text-red-600 hover:text-red-800"
            >
              Entfernen
            </button>
          </div>
        ))}

        {/* Neue Erinnerung */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={newReminder.notificationType}
            onChange={(e) => setNewReminder({ 
              ...newReminder, 
              notificationType: e.target.value as 'prep' | 'cook' | 'shop' 
            })}
            className="rounded-lg border-gray-300"
          >
            <option value="prep">Vorbereitung</option>
            <option value="cook">Kochen</option>
            <option value="shop">Einkaufen</option>
          </select>
          <input
            type="datetime-local"
            value={newReminder.reminderTime.toISOString().slice(0, 16)}
            onChange={(e) => setNewReminder({ 
              ...newReminder, 
              reminderTime: new Date(e.target.value) 
            })}
            className="rounded-lg border-gray-300"
          />
          <button
            onClick={async () => {
              await setMealReminder(
                newReminder.mealId,
                newReminder.reminderTime,
                newReminder.notificationType
              );
              onUpdate();
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Erinnerung setzen
          </button>
        </div>
      </div>
    </motion.div>
  );
}; 