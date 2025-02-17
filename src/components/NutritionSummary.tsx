// Neue Komponente für Nährwertübersicht
export const NutritionSummary = ({ data }: { data: NutritionSummary }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h3 className="text-xl font-bold mb-4">Wochenübersicht Nährwerte</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Kalorien gesamt</p>
          <p className="text-2xl font-bold">{data.totalCalories} kcal</p>
        </div>
        {/* Weitere Nährwerte */}
      </div>
    </div>
  );
}; 