import React, { useState } from 'react';
import type { QuizQuestion } from '../../types';
import Button from '../ui/Button';

interface QuizProps {
    questions: QuizQuestion[];
    onComplete?: (score: number, answers: any[]) => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, onComplete }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
    const [showResults, setShowResults] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);

    if (!questions || questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <div className="text-4xl mb-4 opacity-50">📝</div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">No Quiz Available</h3>
                <p>Generate quiz content first to start practicing.</p>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    const handleAnswerSelect = (answer: string) => {
        setSelectedAnswers({
            ...selectedAnswers,
            [currentQuestionIndex]: answer
        });
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            finishQuiz();
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const finishQuiz = () => {
        setQuizCompleted(true);
        setShowResults(true);

        let correctAnswers = 0;
        const results = questions.map((question, index) => {
            const userAnswer = selectedAnswers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            if (isCorrect) correctAnswers++;

            return {
                question: question.question,
                userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect,
                explanation: question.explanation
            };
        });

        const score = (correctAnswers / questions.length) * 100;
        if (onComplete) {
            onComplete(score, results);
        }
    };

    const resetQuiz = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setShowResults(false);
        setQuizCompleted(false);
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-amber-600';
        return 'text-red-600';
    };

    if (showResults) {
        const correctAnswers = Object.keys(selectedAnswers).filter(
            (index) => selectedAnswers[parseInt(index)] === questions[parseInt(index)].correctAnswer
        ).length;
        const score = (correctAnswers / questions.length) * 100;

        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold mb-4">Quiz Results</h2>
                        <div className={`text-6xl font-black mb-2 ${getScoreColor(score)}`}>
                            {Math.round(score)}%
                        </div>
                        <p className="text-lg text-slate-600">
                            You got {correctAnswers} out of {questions.length} questions correct!
                        </p>
                    </div>

                    <div className="space-y-6">
                        {questions.map((question, index) => {
                            const userAnswer = selectedAnswers[index];
                            const isCorrect = userAnswer === question.correctAnswer;

                            return (
                                <div key={index} className={`border rounded-xl p-5 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                                    }`}>
                                    <h3 className="font-bold mb-3 text-slate-800">Question {index + 1}: {question.question}</h3>
                                    <div className="grid grid-cols-1 gap-2 mb-3">
                                        {question.options.map((option, optIndex) => (
                                            <div key={optIndex} className={`p-3 rounded-lg flex items-center gap-2 ${option === question.correctAnswer ? 'bg-green-100 border border-green-300 text-green-900' :
                                                    option === userAnswer && !isCorrect ? 'bg-red-100 border border-red-300 text-red-900' :
                                                        'bg-white border border-slate-200 text-slate-500'
                                                }`}>
                                                <span>
                                                    {option === question.correctAnswer && '✅'}
                                                    {option === userAnswer && !isCorrect && '❌'}
                                                </span>
                                                <span>{option}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {question.explanation && (
                                        <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800">
                                            <strong>Explanation:</strong> {question.explanation}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-center mt-8">
                        <Button onClick={resetQuiz} size="lg">
                            Take Quiz Again
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4">
            <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                        {Math.round(progress)}% Complete
                    </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                <h2 className="text-2xl font-bold mb-8 text-slate-800">{currentQuestion.question}</h2>

                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                        <label key={index} className={`flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all ${selectedAnswers[currentQuestionIndex] === option
                                ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                                : 'border-slate-100 hover:border-indigo-300 hover:bg-slate-50'
                            }`}>
                            <input
                                type="radio"
                                name={`question-${currentQuestionIndex}`}
                                value={option}
                                checked={selectedAnswers[currentQuestionIndex] === option}
                                onChange={() => handleAnswerSelect(option)}
                                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            />
                            <span className="ml-4 text-lg font-medium text-slate-700">{option}</span>
                        </label>
                    ))}
                </div>

                <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100">
                    <Button
                        onClick={handlePrevious}
                        variant="outline"
                        disabled={currentQuestionIndex === 0}
                    >
                        Previous
                    </Button>

                    <Button
                        onClick={handleNext}
                        disabled={!selectedAnswers[currentQuestionIndex]}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Quiz;
