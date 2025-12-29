import React, { useState } from 'react';
import type { Flashcard as FlashcardType } from '../../types';

interface FlashcardProps {
    card: FlashcardType;
    className?: string;
}

const Flashcard: React.FC<FlashcardProps> = ({ card, className = '' }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div
            className={`relative w-full h-64 cursor-pointer group [perspective:1000px] ${className}`}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div
                className={`absolute inset-0 w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''
                    }`}
            >
                {/* Front Side */}
                <div
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg flex flex-col justify-center items-center text-white p-6 [backface-visibility:hidden]"
                >
                    <div className="text-center">
                        {card.tag && (
                            <div className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-3 bg-indigo-700/30 px-2 py-1 rounded inline-block">
                                {card.tag}
                            </div>
                        )}
                        <h3 className="text-lg font-bold leading-tight">
                            {card.question}
                        </h3>
                    </div>
                    <div className="absolute bottom-4 right-4 text-indigo-200 text-xs group-hover:text-white transition-colors flex items-center gap-1">
                        Klik to flip 🔄
                    </div>
                </div>

                {/* Back Side */}
                <div
                    className="absolute inset-0 w-full h-full bg-slate-800 rounded-xl shadow-lg flex flex-col justify-center items-center text-white p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]"
                >
                    <div className="text-center">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Answer
                        </div>
                        <p className="text-lg leading-relaxed font-medium">
                            {card.answer}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Flashcard;
