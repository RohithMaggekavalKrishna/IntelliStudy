import React, { useState } from 'react';
import useVoiceTutor from '../../hooks/useVoiceTutor';
import Button from '../ui/Button';
import { Mic, Square, X, Brain } from 'lucide-react';

interface VoiceTutorProps {
    systemInstruction: string;
    onClose?: () => void;
}

const VoiceTutor: React.FC<VoiceTutorProps> = ({ systemInstruction, onClose }) => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const { startSession, stopSession, transcriptionHistory, isConnecting, error } = useVoiceTutor(systemInstruction);

    const handleToggleSession = () => {
        if (isSessionActive) {
            stopSession();
            setIsSessionActive(false);
        } else {
            startSession();
            setIsSessionActive(true);
        }
    };

    const getStatusIndicator = () => {
        if (isConnecting) return <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse ring-4 ring-amber-100"></div>;
        if (isSessionActive && !error) return <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-100"></div>;
        if (error) return <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100"></div>;
        return <div className="w-3 h-3 rounded-full bg-slate-300"></div>;
    };

    const getStatusText = () => {
        if (isConnecting) return "Connecting...";
        if (isSessionActive && !error) return "Listening...";
        if (error) return "Error";
        return "Ready to start";
    };

    // Content to render (shared between inline and modal)
    const renderContent = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isSessionActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                        {isSessionActive ? <Mic size={24} className="animate-pulse" /> : <Mic size={24} />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">AI Voice Tutor</h3>
                        <div className="flex items-center gap-2 mt-1">
                            {getStatusIndicator()}
                            <span className="text-slate-500 text-sm font-medium">{getStatusText()}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleToggleSession}
                        disabled={isConnecting}
                        variant={isSessionActive ? "destructive" : "primary"}
                        className={isSessionActive ? "bg-red-50 text-red-600 hover:bg-red-100 border-red-200" : ""}
                    >
                        {isConnecting ? 'Connecting...' : (isSessionActive ? <span className="flex items-center gap-2"><Square size={16} /> End Session</span> : <span className="flex items-center gap-2"><Mic size={16} /> Start Session</span>)}
                    </Button>

                    {onClose && (
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition">
                            <X size={24} />
                        </button>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-4 text-red-600 text-sm font-medium">
                    Error: {error}
                </div>
            )}

            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 rounded-xl border border-slate-100 mb-4">
                {transcriptionHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <Brain size={32} />
                        </div>
                        <div className="text-center max-w-sm">
                            <p className="font-medium text-slate-600 mb-1">Start speaking with your AI Tutor</p>
                            <p className="text-sm">Click "Start Session" and ask any question about your study materials.</p>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {transcriptionHistory.map((entry, index) => (
                        <div
                            key={index}
                            className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'
                                }`}
                        >
                            <div
                                className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${entry.speaker === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                    }`}
                            >
                                <p className={`font-bold mb-1 text-xs uppercase tracking-wider opacity-80 ${entry.speaker === 'user' ? 'text-indigo-200' : 'text-indigo-600'
                                    }`}>
                                    {entry.speaker === 'user' ? 'You' : 'AI Tutor'}
                                </p>
                                <p>{entry.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Status Footer */}
            <div className="text-center">
                {isSessionActive ? (
                    <p className="text-sm text-emerald-600 font-medium flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                        Listening... Speak now
                    </p>
                ) : (
                    <p className="text-sm text-slate-500">
                        Microphone is off. Start session to speak.
                    </p>
                )}
            </div>
        </div>
    );

    // If used inline (no onClose), just render content
    if (!onClose) {
        return renderContent();
    }

    // If modal
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
            <div className="w-full max-w-4xl h-[80vh] mx-4 animate-in zoom-in-95">
                {renderContent()}
            </div>
        </div>
    );
};

export default VoiceTutor;
