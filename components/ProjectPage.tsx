import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Project, ContentSource, LectureSession, LearningMaterial, User } from '../types';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner';
import {
    ArrowLeft,
    Plus,
    BookOpen,
    Video,
    FileText,
    MessageSquare,
    Brain,
    Mic,
    BarChart2,
    MoreVertical,
    Calendar,
    Clock,
    Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Child Components
import PdfUploader from './content/PdfUploader';
import ContentSourceManager from './content/ContentSourceManager';
import LectureRecorder from './lecture/LectureRecorder';
import LectureDashboard from './lecture/LectureDashboard';
import TutorChat from './ai/TutorChat';
import VoiceTutor from './ai/VoiceTutor';
import StudyWorkspace from './study/StudyWorkspace';
import LearningAnalytics from './analytics/LearningAnalytics';

interface ProjectPageProps {
    user: User;
    projectId: string;
    onNavigate: (route: string) => void;
}

export const ProjectPage: React.FC<ProjectPageProps> = ({ user, projectId, onNavigate }) => {
    const [project, setProject] = useState<Project | null>(null);
    const [contentSources, setContentSources] = useState<ContentSource[]>([]);
    const [lectureSessions, setLectureSessions] = useState<LectureSession[]>([]);
    const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [showPdfUploader, setShowPdfUploader] = useState(false);
    const [showContentManager, setShowContentManager] = useState(false);
    const [showLectureRecorder, setShowLectureRecorder] = useState(false);
    const [showTutorChat, setShowTutorChat] = useState(false);
    const [showVoiceTutor, setShowVoiceTutor] = useState(false);
    const [showStudyWorkspace, setShowStudyWorkspace] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [selectedLecture, setSelectedLecture] = useState<LectureSession | null>(null);

    useEffect(() => {
        loadProjectData();
    }, [projectId]);

    const loadProjectData = async () => {
        try {
            setLoading(true);
            // Fetch project details - filtering from user projects since we lack a direct detail endpoint currently
            const projects = await db.getProjects(user.id);
            const foundProject = projects.find(p => p.id === projectId);

            if (foundProject) {
                setProject(foundProject);

                // Load related data parallelly
                const [sources, lectures, materials] = await Promise.all([
                    db.getContentSources(projectId),
                    db.getProjectLectureSessions(projectId),
                    db.getLearningMaterials(projectId)
                ]);

                setContentSources(sources);
                setLectureSessions(lectures);
                setLearningMaterials(materials);
            } else {
                toast.error('Project not found');
                onNavigate('HOME');
            }
        } catch (error) {
            console.error('Failed to load project:', error);
            toast.error('Failed to load project data');
        } finally {
            setLoading(false);
        }
    };

    const handlePdfUpload = async (content: any) => {
        // Refresh content sources
        const sources = await db.getContentSources(projectId);
        setContentSources(sources);
        setShowPdfUploader(false);
        toast.success('PDF uploaded successfully');
    };

    const handleLectureComplete = async () => {
        const lectures = await db.getProjectLectureSessions(projectId);
        setLectureSessions(lectures);
        setShowLectureRecorder(false);
        toast.success('Lecture saved successfully');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => onNavigate('HOME')}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    {project.title}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {project.status}
                                    </span>
                                </h1>
                                <p className="text-sm text-slate-500 truncate max-w-md">{project.description}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowAnalytics(true)}>
                                <BarChart2 size={16} className="mr-2" /> Analytics
                            </Button>
                            <Button size="sm" onClick={() => setShowStudyWorkspace(true)}>
                                <Brain size={16} className="mr-2" /> Study Space
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Quick Actions */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => setShowPdfUploader(true)}
                        className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition group"
                    >
                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition">
                            <FileText size={24} />
                        </div>
                        <span className="font-semibold text-slate-700">Upload PDF</span>
                    </button>

                    <button
                        onClick={() => setShowLectureRecorder(true)}
                        className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-red-500 hover:shadow-md transition group"
                    >
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-3 group-hover:scale-110 transition">
                            <Mic size={24} />
                        </div>
                        <span className="font-semibold text-slate-700">Record Lecture</span>
                    </button>

                    <button
                        onClick={() => setShowTutorChat(true)}
                        className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-md transition group"
                    >
                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition">
                            <MessageSquare size={24} />
                        </div>
                        <span className="font-semibold text-slate-700">AI Tutor Chat</span>
                    </button>

                    <button
                        onClick={() => setShowVoiceTutor(true)}
                        className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-violet-500 hover:shadow-md transition group"
                    >
                        <div className="w-12 h-12 bg-violet-50 rounded-full flex items-center justify-center text-violet-600 mb-3 group-hover:scale-110 transition">
                            <Video size={24} />
                        </div>
                        <span className="font-semibold text-slate-700">Voice Tutor</span>
                    </button>
                </section>

                {/* Content Sources & Lectures Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Content Sources */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <BookOpen size={20} className="text-indigo-600" /> Course Materials
                            </h2>
                            <Button size="sm" variant="ghost" onClick={() => setShowContentManager(true)}>Manage</Button>
                        </div>

                        <div className="space-y-3">
                            {contentSources.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                                    <FileText className="mx-auto mb-2 opacity-50" />
                                    <p>No materials uploaded yet</p>
                                </div>
                            ) : (
                                contentSources.map(source => (
                                    <div key={source.id} className="flex items-center p-3 hover:bg-slate-50 rounded-lg border border-slate-100 transition">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded mr-3">
                                            <FileText size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium truncate">{source.title}</h4>
                                            <p className="text-xs text-slate-500 capitalize">{source.type} • {new Date(source.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <button className="text-slate-400 hover:text-red-500 p-2">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Lecture Sessions */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Mic size={20} className="text-red-600" /> Lecture Recordings
                            </h2>
                            <Button size="sm" variant="ghost" onClick={() => setShowLectureRecorder(true)}>New Recording</Button>
                        </div>

                        <div className="space-y-3">
                            {lectureSessions.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                                    <Mic className="mx-auto mb-2 opacity-50" />
                                    <p>No lectures recorded yet</p>
                                </div>
                            ) : (
                                lectureSessions.map(lecture => (
                                    <div
                                        key={lecture.id}
                                        onClick={() => setSelectedLecture(lecture)}
                                        className="flex items-center p-3 hover:bg-slate-50 rounded-lg border border-slate-100 transition cursor-pointer"
                                    >
                                        <div className="p-2 bg-red-50 text-red-600 rounded mr-3">
                                            <Video size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium truncate">{lecture.title}</h4>
                                            <p className="text-xs text-slate-500 flex items-center gap-2">
                                                {lecture.status === 'processing' ? (
                                                    <span className="text-amber-500 flex items-center gap-1"><Clock size={10} /> Processing</span>
                                                ) : (
                                                    <span>{Math.round(lecture.duration)}s</span>
                                                )}
                                                <span>•</span>
                                                <span>{new Date(lecture.createdAt).toLocaleDateString()}</span>
                                            </p>
                                        </div>
                                        <div className="text-slate-400">
                                            <MoreVertical size={16} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

            </main>

            {/* Modals */}
            {showPdfUploader && (
                <PdfUploader
                    projectId={projectId}
                    onUploadComplete={handlePdfUpload}
                    onClose={() => setShowPdfUploader(false)}
                />
            )}

            {showContentManager && (
                <ContentSourceManager
                    projectId={projectId}
                    onContentAdded={() => loadProjectData()}
                    onClose={() => setShowContentManager(false)}
                />
            )}

            {showLectureRecorder && (
                <LectureRecorder
                    projectId={projectId}
                    onRecordingComplete={handleLectureComplete}
                    onClose={() => setShowLectureRecorder(false)}
                />
            )}

            {selectedLecture && (
                <LectureDashboard
                    lecture={selectedLecture}
                    onClose={() => setSelectedLecture(null)}
                />
            )}

            {showTutorChat && (
                <TutorChat
                    projectContent={""} // Pass concatenated content here later
                    onClose={() => setShowTutorChat(false)}
                />
            )}

            {showVoiceTutor && (
                <VoiceTutor
                    systemInstruction="You are a helpful tutor."
                    onClose={() => setShowVoiceTutor(false)}
                />
            )}

            {showStudyWorkspace && (
                <StudyWorkspace
                    projectId={projectId}
                    contentSources={contentSources}
                    onContentGenerated={() => loadProjectData()}
                    onClose={() => setShowStudyWorkspace(false)}
                />
            )}

            {showAnalytics && (
                <LearningAnalytics
                    projectId={projectId}
                    onClose={() => setShowAnalytics(false)}
                />
            )}

        </div>
    );
};
