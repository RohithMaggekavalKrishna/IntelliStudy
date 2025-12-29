import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import LoadingSpinner from '../ui/LoadingSpinner';
import { AssessmentResult, LearningMaterial } from '../../types';
import { BarChart, Clock, Award, Target, BookOpen, X, TrendingUp } from 'lucide-react';

interface LearningAnalyticsProps {
    projectId: string;
    onClose: () => void;
}

interface AnalyticsData {
    totalStudyTime: number;
    completedAssessments: number;
    averageScore: number;
    learningMaterials: LearningMaterial[];
    assessmentResults: AssessmentResult[];
    topicProgress: { [topic: string]: number };
    weeklyProgress: { week: string; score: number; time: number }[];
}

const LearningAnalytics: React.FC<LearningAnalyticsProps> = ({ projectId, onClose }) => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'performance'>('overview');

    useEffect(() => {
        loadAnalytics();
    }, [projectId]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);

            const [materials, assessments] = await Promise.all([
                db.getLearningMaterials(projectId),
                db.getAssessmentResults(projectId)
            ]);

            const completedAssessments = assessments.length;
            const averageScore = assessments.length > 0
                ? assessments.reduce((sum: number, a: AssessmentResult) => sum + (a.score || 0), 0) / assessments.length
                : 0;

            // Mock some additional data for demonstration
            const analyticsData: AnalyticsData = {
                totalStudyTime: materials.length * 15 + assessments.length * 5, // Estimated
                completedAssessments,
                averageScore,
                learningMaterials: materials,
                assessmentResults: assessments,
                topicProgress: {
                    'Core Concepts': 85,
                    'Applications': 62,
                    'Advanced Topics': 40
                },
                weeklyProgress: [
                    { week: 'Week 1', score: 65, time: 45 },
                    { week: 'Week 2', score: 78, time: 60 },
                    { week: 'Week 3', score: 82, time: 55 },
                    { week: 'Week 4', score: 89, time: 70 }
                ]
            };

            setAnalytics(analyticsData);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string; icon: any; color: string }> =
        ({ title, value, subtitle, icon: Icon, color }) => (
            <div className={`bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition`}>
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                    <Icon size={60} />
                </div>
                <div className="relative z-10">
                    <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
                    <p className={`text-3xl font-bold ${color.replace('bg-', 'text-').replace('-500', '-600')}`}>{value}</p>
                    {subtitle && <p className="text-slate-400 text-xs mt-2 font-medium">{subtitle}</p>}
                </div>
            </div>
        );

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 flex flex-col items-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-slate-600 font-medium">Crunching your numbers...</p>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] mx-4 flex flex-col overflow-hidden animate-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <BarChart size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Learning Analytics</h2>
                            <p className="text-slate-500 text-sm">Track your progress and mastery</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="bg-white px-6 border-b border-slate-200 flex gap-6">
                    {['overview', 'progress', 'performance'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 text-sm font-bold capitalize border-b-2 transition ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard
                                    title="Study Time"
                                    value={`${analytics.totalStudyTime}m`}
                                    subtitle="Total active learning"
                                    icon={Clock}
                                    color="text-blue-600"
                                />
                                <StatCard
                                    title="Materials"
                                    value={analytics.learningMaterials.length}
                                    subtitle="AI resources generated"
                                    icon={BookOpen}
                                    color="text-emerald-600"
                                />
                                <StatCard
                                    title="Assessments"
                                    value={analytics.completedAssessments}
                                    subtitle="Quizzes taken"
                                    icon={Target}
                                    color="text-amber-600"
                                />
                                <StatCard
                                    title="Avg. Score"
                                    value={`${Math.round(analytics.averageScore)}%`}
                                    subtitle="Overall performance"
                                    icon={Award}
                                    color="text-purple-600"
                                />
                            </div>

                            {/* Recent Materials */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Clock size={18} className="text-slate-400" /> Recent Activity
                                </h3>
                                <div className="space-y-4">
                                    {analytics.learningMaterials.slice(-5).map((material) => (
                                        <div key={material.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                                                    {material.type === 'summary' && '📄'}
                                                    {material.type === 'flashcards' && '🗂️'}
                                                    {material.type === 'quiz' && '❓'}
                                                    {material.type === 'slides' && '📊'}
                                                    {material.type === 'deep_dive' && '📖'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 capitalize">
                                                        {material.title || material.type.replace('_', ' ')}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-medium">
                                                        Added {new Date(material.created_at || Date.now()).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-white px-2 py-1 rounded-md border border-slate-200">
                                                {material.type.replace('_', ' ')}
                                            </span>
                                        </div>
                                    ))}
                                    {analytics.learningMaterials.length === 0 && (
                                        <p className="text-slate-400 text-center py-4">No activity yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Progress and Performance Tabs Placeholder logic same as overview (simplified for this large file) */}
                    {(activeTab === 'progress' || activeTab === 'performance') && (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                            <TrendingUp size={48} className="mb-4 opacity-50" />
                            <h3 className="text-lg font-bold text-slate-600">Coming Soon</h3>
                            <p>Detailed charts and graphs will appear here as you collect more data.</p>

                            {/* Demo content for visual completeness */}
                            <div className="w-full max-w-2xl mt-12 grid gap-6 text-left opacity-50 pointer-events-none">
                                <div className="bg-white p-6 rounded-xl border border-slate-200">
                                    <h4 className="font-bold mb-4">Topic Mastery</h4>
                                    {Object.entries(analytics.topicProgress).map(([topic, val]) => (
                                        <div key={topic} className="mb-4">
                                            <div className="flex justify-between text-sm mb-1"><span>{topic}</span><span>{Math.round(val)}%</span></div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${val}%` }}></div></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LearningAnalytics;
