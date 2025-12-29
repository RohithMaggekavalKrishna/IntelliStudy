import React, { useState } from 'react';
import { LectureSession } from '../../types';
import { X, Play, FileText, CheckCircle, Brain, Target, MessageSquare } from 'lucide-react';
import Button from '../ui/Button';

interface LectureDashboardProps {
    lecture: LectureSession;
    onClose: () => void;
}

const LectureDashboard: React.FC<LectureDashboardProps> = ({ lecture, onClose }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'qa' | 'transcript'>('summary');
    const { analysis } = lecture;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{lecture.title}</h2>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                            <span>Recorded {new Date(lecture.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{Math.round(lecture.duration / 60)} mins</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-2 overflow-y-auto">
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition ${activeTab === 'summary' ? 'bg-white shadow-sm text-indigo-700 ring-1 ring-indigo-500/10' : 'text-slate-600 hover:bg-white/50'}`}
                        >
                            <FileText size={18} /> Summary
                        </button>
                        <button
                            onClick={() => setActiveTab('qa')}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition ${activeTab === 'qa' ? 'bg-white shadow-sm text-indigo-700 ring-1 ring-indigo-500/10' : 'text-slate-600 hover:bg-white/50'}`}
                        >
                            <Brain size={18} /> Q&A & Quiz
                        </button>
                        <button
                            onClick={() => setActiveTab('transcript')}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition ${activeTab === 'transcript' ? 'bg-white shadow-sm text-indigo-700 ring-1 ring-indigo-500/10' : 'text-slate-600 hover:bg-white/50'}`}
                        >
                            <MessageSquare size={18} /> Transcript
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 bg-white">
                        {activeTab === 'summary' && analysis && (
                            <div className="space-y-8">
                                <section>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <Target className="text-indigo-600" /> Key Takeaways
                                    </h3>
                                    <ul className="space-y-3">
                                        {analysis.keyTakeaways?.map((point, i) => (
                                            <li key={i} className="flex gap-3 text-slate-700 leading-relaxed">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </section>

                                <div className="h-px bg-slate-100"></div>

                                <section>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Summary</h3>
                                    <p className="text-slate-600 leading-7">{analysis.summary}</p>
                                </section>

                                {analysis.mainTopics && (
                                    <section>
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Topics Covered</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.mainTopics.map((topic, i) => (
                                                <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">{topic}</span>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}

                        {activeTab === 'qa' && analysis && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold mb-6">Generated Questions</h3>
                                    <div className="space-y-4">
                                        {analysis.questions?.map((q, i) => (
                                            <div key={i} className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                                                <p className="font-medium text-slate-800 mb-3">{q}</p>
                                                {/* We could add hidden answers here if available */}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'transcript' && (
                            <div>
                                <h3 className="text-lg font-bold mb-4">Full Transcript</h3>
                                <div className="p-6 bg-slate-50 rounded-xl text-slate-700 leading-relaxed font-serif text-lg">
                                    {lecture.finalTranscript || lecture.liveTranscript || "No transcript available."}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LectureDashboard;
