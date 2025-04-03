'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Plus, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
}

interface FlashcardProps {
  card: Flashcard;
}

// Create a dedicated FlashcardComponent
const FlashcardComponent = ({ card }: FlashcardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className="relative w-full h-48 rounded-lg cursor-pointer perspective-1000 hover-shadow-effect m-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="relative w-full h-full preserve-3d"
        animate={{ rotateY: isHovered ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
      >
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden border border-[var(--border-color)] rounded-lg p-4 bg-white dark:bg-[var(--bg-secondary)] flex flex-col justify-between shadow-md">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.category}</div>
          <div className="text-base font-medium flex items-center justify-center text-center py-2">
            {card.front}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-1">
            <span>Hover to reveal</span>
          </div>
        </div>
        
        {/* Back */}
        <div 
          className="absolute w-full h-full backface-hidden border border-[var(--border-color)] rounded-lg p-4 bg-blue-50 dark:bg-[color:var(--bg-tertiary)] flex flex-col justify-between rotate-y-180 shadow-md"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.category}</div>
          <div className="text-base font-medium flex items-center justify-center text-center py-2">
            {card.back}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-1">
            <span>Return to question</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Alternative pure CSS implementation (uncomment to use)
// const PureCSSFlashcardComponent = ({ card }: FlashcardProps) => {
//   return (
//     <div className="h-64 flashcard-hover hover-shadow-effect cursor-pointer">
//       <div className="flashcard-container">
//         {/* Front */}
//         <div className="flashcard-front border border-[var(--border-color)] p-6 bg-white dark:bg-[var(--bg-tertiary)]">
//           <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">{card.category}</div>
//           <div className="text-lg font-medium flex-1 flex items-center justify-center text-center">
//             {card.front}
//           </div>
//           <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
//             Hover to reveal answer
//           </div>
//         </div>
//         
//         {/* Back */}
//         <div className="flashcard-back border border-[var(--border-color)] p-6 bg-blue-50 dark:bg-blue-900/20">
//           <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">{card.category}</div>
//           <div className="text-lg flex-1 flex items-center justify-center text-center font-medium">
//             {card.back}
//           </div>
//           <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
//             Return to question
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

export default function FlashcardsPage() {
  const [currentCategory, setCurrentCategory] = useState<string>("All");
  
  // Example flashcard data
  const flashcards: Flashcard[] = [
    {
      id: "1",
      front: "What is the capital of France?",
      back: "Paris",
      category: "Geography"
    },
    {
      id: "2",
      front: "What is the chemical symbol for gold?",
      back: "Au",
      category: "Chemistry"
    },
    {
      id: "3",
      front: "Who wrote 'Romeo and Juliet'?",
      back: "William Shakespeare",
      category: "Literature"
    },
    {
      id: "4",
      front: "What is the formula for the area of a circle?",
      back: "A = πr²",
      category: "Mathematics"
    },
    {
      id: "5",
      front: "What is the powerhouse of the cell?",
      back: "Mitochondria",
      category: "Biology"
    },
    {
      id: "6",
      front: "What year did World War II end?",
      back: "1945",
      category: "History"
    }
  ];

  // Get unique categories
  const categories = ["All", ...new Set(flashcards.map(card => card.category))];

  // Filter flashcards by category
  const filteredFlashcards = currentCategory === "All"
    ? flashcards
    : flashcards.filter(card => card.category === currentCategory);

  return (
    <AppLayout activePage="flashcards">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {currentCategory !== "All" ? `${currentCategory} ` : ""}Flashcards
        </h1>
        
        <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm">
          <Plus size={16} />
          <span>Create Flashcard</span>
        </button>
      </div>

      {/* Category selection */}
      <div className="mb-4">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setCurrentCategory(category)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                currentCategory === category
                  ? "bg-[var(--highlight-color)] text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              } transition-colors`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      {/* Flashcards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredFlashcards.map((card) => (
          <FlashcardComponent key={card.id} card={card} />
        ))}
      </div>
    </AppLayout>
  );
} 