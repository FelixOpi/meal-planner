import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  id: string;
  title: string;
  content: string;
  target: string;
}

const OnboardingTour = ({ isFirstVisit, onComplete }: { 
  isFirstVisit: boolean;
  onComplete: () => void;
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(isFirstVisit);

  const steps: Step[] = [
    {
      id: 'welcome',
      title: 'Willkommen bei MealPlanner!',
      content: 'Lass uns gemeinsam deinen ersten Essensplan erstellen.',
      target: '#meal-planner'
    },
    {
      id: 'preferences',
      title: 'Deine Vorlieben',
      content: 'Hier kannst du deine Ernährungsvorlieben und Allergien angeben.',
      target: '#preferences'
    },
    {
      id: 'pantry',
      title: 'Vorratskammer',
      content: 'Verwalte deine Vorräte und erhalte passende Rezeptvorschläge.',
      target: '#pantry'
    },
    {
      id: 'reminders',
      title: 'Erinnerungen',
      content: 'Lass dich ans Einkaufen und Kochen erinnern.',
      target: '#reminders'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsVisible(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      <AnimatePresence>
        <motion.div
          key={steps[currentStep].id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white rounded-xl p-6 shadow-2xl pointer-events-auto max-w-md"
        >
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">✨</span>
            <h3 className="text-xl font-bold text-gray-900">
              {steps[currentStep].title}
            </h3>
          </div>
          <p className="text-gray-600 mb-6">
            {steps[currentStep].content}
          </p>
          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              Überspringen
            </button>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStep ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {currentStep === steps.length - 1 ? 'Fertig' : 'Weiter'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default OnboardingTour; 