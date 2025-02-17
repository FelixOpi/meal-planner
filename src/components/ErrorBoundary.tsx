export const ErrorDisplay = ({ error, onRetry }: { error: string, onRetry?: () => void }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-4 my-4">
    <div className="flex items-center">
      <span className="text-2xl mr-3">⚠️</span>
      <div>
        <h4 className="text-red-800 font-medium">Ups, etwas ist schiefgelaufen</h4>
        <p className="text-red-600">{error}</p>
      </div>
    </div>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="mt-3 text-red-700 hover:text-red-800 font-medium"
      >
        Erneut versuchen
      </button>
    )}
  </div>
); 