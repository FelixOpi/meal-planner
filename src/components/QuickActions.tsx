export const QuickActions = () => (
  <div className="fixed bottom-6 right-6 flex flex-col space-y-2">
    <motion.button
      whileHover={{ scale: 1.05 }}
      className="p-3 bg-indigo-600 text-white rounded-full shadow-lg"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      ↑
    </motion.button>
    <motion.button
      whileHover={{ scale: 1.05 }}
      className="p-3 bg-indigo-600 text-white rounded-full shadow-lg"
      onClick={() => {/* Schnell neuen Plan erstellen */}}
    >
      +
    </motion.button>
  </div>
); 