import React, { useState, useEffect } from 'react';
import {
    generateSummary,
    generateFlashcards,
    generateQuiz,
    generateDeepDive,
    generateSlides,
} from '../../services/geminiService';
import { db } from '../../services/db';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import VoiceTutor from '../ai/VoiceTutor';
import Flashcard from './Flashcard';
import Quiz from './Quiz';
import { ContentSource, LearningMaterial } from '../../types';
import toast from 'react-hot-toast';
import { Brain, FileText, Zap, BookOpen, Layers, X, Mic } from 'lucide-react';

interface StudyWorkspaceProps {
    projectId: string;
    contentSources: ContentSource[];
    onContentGenerated: (materials: LearningMaterial[]) => void;
    onClose: () => void;
}

interface GeneratedContent {
    summary?: string;
    flashcards?: any[];
    quiz?: any[];
    deepDive?: string;
    slides?: any[];
}

type OutputType = 'Summary' | 'Flashcards' | 'Quiz' | 'Deep Dive' | 'Slides' | 'Voice Tutor';

const StudyWorkspace: React.FC<StudyWorkspaceProps> = ({
    projectId,
    contentSources,
    onContentGenerated,
    onClose
}) => {
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({});
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [activeOutput, setActiveOutput] = useState<OutputType | null>(null);
    const [sourceText, setSourceText] = useState('');
    const [sourceTitle, setSourceTitle] = useState('');

    // NOTE: Full Adaptive Testing service omitted for MVP, simplification to focus on content generation

    useEffect(() => {
        // Combine all content sources
        const combinedText = contentSources
            .map(source => source.content || '')
            .filter(content => content.trim())
            .join('\n\n');

        const combinedTitle = contentSources
            .map(source => source.title)
            .join(' + ');

        setSourceText(combinedText);
        setSourceTitle(combinedTitle || 'Study Material');

        loadPreviousMaterials();
    }, [contentSources, projectId]);

    const loadPreviousMaterials = async () => {
        try {
            const materials = await db.getLearningMaterials(projectId);
            // Simple local matching to populate generatedContent from DB materials
            const newContent: GeneratedContent = {};
            materials.forEach(m => {
                if (m.type === 'summary') newContent.summary = m.content;
                if (m.type === 'flashcards') newContent.flashcards = m.content;
                if (m.type === 'quiz') newContent.quiz = m.content;
                if (m.type === 'deep_dive') newContent.deepDive = m.content;
                if (m.type === 'slides') newContent.slides = m.content;
            });
            setGeneratedContent(prev => ({ ...prev, ...newContent }));
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerate = async (type: OutputType) => {
        if (!sourceText.trim()) {
            toast.error('No content available. Please add some sources first.');
            return;
        }

        // Check if we already have it in state (simple cache)
        // In a full version, we'd check DB explicitly or force regenerate
        if (type === 'Summary' && generatedContent.summary) { setActiveOutput(type); return; }
        if (type === 'Flashcards' && generatedContent.flashcards) { setActiveOutput(type); return; }
        if (type === 'Quiz' && generatedContent.quiz) { setActiveOutput(type); return; }
        if (type === 'Deep Dive' && generatedContent.deepDive) { setActiveOutput(type); return; }
        if (type === 'Slides' && generatedContent.slides) { setActiveOutput(type); return; }

        if (type === 'Voice Tutor') {
            setActiveOutput(type);
            return;
        }

        setLoadingStates(prev => ({ ...prev, [type]: true }));
        setActiveOutput(type);

        try {
            let content;
            let dbType = type.toLowerCase().replace(' ', '_');

            switch (type) {
                case 'Summary':
                    content = await generateSummary(sourceText);
                    setGeneratedContent(prev => ({ ...prev, summary: content }));
                    break;
                case 'Flashcards':
                    content = await generateFlashcards(sourceText);
                    setGeneratedContent(prev => ({ ...prev, flashcards: content }));
                    break;
                case 'Quiz':
                    content = await generateQuiz(sourceText);
                    setGeneratedContent(prev => ({ ...prev, quiz: content }));
                    break;
                case 'Deep Dive':
                    content = await generateDeepDive(sourceText);
                    setGeneratedContent(prev => ({ ...prev, deepDive: content }));
                    dbType = 'deep_dive';
                    break;
                case 'Slides':
                    content = await generateSlides(sourceText);
                    setGeneratedContent(prev => ({ ...prev, slides: content }));
                    dbType = 'slides';
                    break;
            }

            // Save to database
            await db.createLearningMaterial({
                projectId,
                type: dbType,
                title: `${type} for ${sourceTitle.substring(0, 30)}...`,
                content: content,
                generatedFrom: sourceText.substring(0, 200)
            });

            toast.success(`${type} generated successfully!`);

            // Refresh learning materials list in parent
            const updatedMaterials = await db.getLearningMaterials(projectId);
            onContentGenerated(updatedMaterials);

        } catch (error: any) {
            console.error(`Error generating ${type}:`, error);
            toast.error(`Failed to generate ${type}: ${error.message}`);
        } finally {
            setLoadingStates(prev => ({ ...prev, [type]: false }));
        }
    };

    const outputOptions: { type: OutputType; label: string; description: string; icon: any }[] = [
        { type: 'Summary', label: 'Summary', description: 'Concise overview', icon: FileText },
        { type: 'Flashcards', label: 'Flashcards', description: 'Study cards', icon: Zap },
        { type: 'Quiz', label: 'Quiz', description: 'Practice questions', icon: Brain },
        { type: 'Deep Dive', label: 'Deep Dive', description: 'Detailed guide', icon: BookOpen },
        { type: 'Slides', label: 'Slides', description: 'Presentation', icon: Layers },
        { type: 'Voice Tutor', label: 'Voice Tutor', description: 'AI conversation', icon: Mic },
    ];

    const renderContent = () => {
        if (!activeOutput) {
            return (
                <div className="text-center text-slate-400 p-12 flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <Brain size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">AI Study Workspace</h3>
                    <p className="max-w-md">Select a learning tool above to generate study materials from your project content.</p>
                </div>
            );
        }

        if (loadingStates[activeOutput]) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                    <LoadingSpinner size="lg" className="mb-6" />
                    <h3 className="text-xl font-bold text-slate-800">Generating {activeOutput}...</h3>
                    <p className="text-slate-500 mt-2">Analyzing your content with AI. This might take a moment.</p>
                </div>
            );
        }

        switch (activeOutput) {
            case 'Summary':
                return (
                    <div className="prose prose-slate max-w-none p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <div dangerouslySetInnerHTML={{ __html: generatedContent.summary || '' }} />
                    </div>
                );

            case 'Flashcards':
                return (
                    <div className="p-4">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">Key Concepts</h3>
                        {generatedContent.flashcards && generatedContent.flashcards.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {generatedContent.flashcards.map((card, i) => (
                                    <Flashcard key={i} card={card} />
                                ))}
                            </div>
                        ) : <p>No flashcards found.</p>}
                    </div>
                );

            case 'Quiz':
                return (
                    <div className="p-4">
                        {generatedContent.quiz && generatedContent.quiz.length > 0 ? (
                            <Quiz
                                questions={generatedContent.quiz}
                                onComplete={(score) => toast.success(`Quiz completed! Score: ${Math.round(score)}%`)}
                            />
                        ) : <p>No quiz found.</p>}
                    </div>
                );

            case 'Deep Dive':
                return (
                    <div className="prose prose-slate max-w-none p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <div dangerouslySetInnerHTML={{ __html: generatedContent.deepDive || '' }} />
                    </div>
                );

            case 'Slides':
                return (
                    <div className="p-6 space-y-6">
                        <h3 className="text-xl font-bold mb-4">Generated Slides</h3>
                        <div className="grid grid-cols-1 gap-6">
                            {generatedContent.slides?.map((slide, index) => (
                                <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden aspect-video flex flex-col">
                                    <div className="bg-indigo-600 p-6 text-white shrink-0">
                                        <h4 className="text-xl font-bold">{index + 1}. {slide.title}</h4>
                                    </div>
                                    <div className="p-8 flex-1 bg-white">
                                        <ul className="space-y-3">
                                            {slide.content?.map((point: string, i: number) => (
                                                <li key={i} className="flex items-start gap-3 text-lg text-slate-700">
                                                    <span className="mt-2 w-2 h-2 rounded-full bg-indigo-400 shrink-0"></span>
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'Voice Tutor':
                return (
                    <div className="p-6 h-[600px]">
                        <VoiceTutor
                            systemInstruction={`You are a helpful tutor explaining the following topic: ${sourceTitle}. The user has provided context. Keep answers concise.`}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] mx-4 flex flex-col overflow-hidden animate-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Brain className="text-indigo-600" /> Study Workspace
                        </h2>
                        <p className="text-slate-500">Generate AI study materials from {contentSources.length} sources</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 overflow-x-auto">
                    <div className="flex gap-4 min-w-max">
                        {outputOptions.map(opt => (
                            <button
                                key={opt.type}
                                onClick={() => handleGenerate(opt.type)}
                                disabled={loadingStates[opt.type] || !sourceText.trim()}
                                className={`flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all border-2 ${activeOutput === opt.type
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 transform scale-105'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
                                    } ${(!sourceText.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <opt.icon size={18} />
                                <div className="flex flex-col items-start">
                                    <span>{opt.label}</span>
                                    {loadingStates[opt.type] && <span className="text-[10px] opacity-80 font-normal">Generating...</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                    {!sourceText.trim() && (
                        <div className="mt-2 text-xs text-amber-600 font-medium px-2">
                            ⚠️ Add content sources to unlock these tools.
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default StudyWorkspace;
