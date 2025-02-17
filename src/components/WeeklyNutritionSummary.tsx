import { NutritionSummary } from '@/types';
import { motion } from 'framer-motion';

export const WeeklyNutritionSummary = ({ data }: { data: NutritionSummary }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-100"
    >
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span className="text-3xl mr-3">📊</span>
        Wochenübersicht Nährwerte
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">Kalorien gesamt</p>
          <p className="text-2xl font-bold text-gray-900">{data.totalCalories} kcal</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">Protein</p>
          <p className="text-2xl font-bold text-gray-900">{data.totalProtein}g</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">Kohlenhydrate</p>
          <p className="text-2xl font-bold text-gray-900">{data.totalCarbs}g</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">Fett</p>
          <p className="text-2xl font-bold text-gray-900">{data.totalFat}g</p>
        </div>
      </div>
    </motion.div>
  );
}; 