import React, { useState, useEffect, useMemo } from 'react';
import { User, Assignment, Exam, Project } from '../types';
import { db } from '../services/db';
import { Plus, Calendar, CheckCircle, Circle, FileText, GraduationCap, TrendingUp, Target, Smartphone, Globe, UserX, Clock, BookOpen, X } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell, PieChart, Pie } from "recharts";
import { formatDuration } from '../utils/metrics';

interface HomepageProps {
    user: User;
    onNavigate: (route: string, data?: any) => void;
}

export const Homepage: React.FC<HomepageProps> = ({ user, onNavigate }) => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [showProjectModal, setShowProjectModal] = useState(false);

    // Form states
    const [newAssignmentName, setNewAssignmentName] = useState('');
    const [newAssignmentDate, setNewAssignmentDate] = useState('');
    const [newExamName, setNewExamName] = useState('');
    const [newExamDate, setNewExamDate] = useState('');

    // Project Form
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const [newProjectDescription, setNewProjectDescription] = useState('');

    // Load data with CS Mocks Fallback
    useEffect(() => {
        const loadData = async () => {
            let loadedAssignments = await db.getAssignments(user.id);
            let loadedExams = await db.getExams(user.id);
            let loadedProjects = await db.getProjects(user.id);

            if (loadedAssignments.length === 0) {
                const now = Date.now();
                const day = 24 * 60 * 60 * 1000;
                loadedAssignments = [
                    { id: 'mock1', userId: user.id, name: 'Linear Algebra Problem Set 4', dueDate: new Date(now + day).toISOString(), completed: false },
                    { id: 'mock2', userId: user.id, name: 'Data Structures Project: RB-Trees', dueDate: new Date(now + 3 * day).toISOString(), completed: false },
                    { id: 'mock3', userId: user.id, name: 'OS Lab: Process Scheduling', dueDate: new Date(now + 5 * day).toISOString(), completed: false },
                    { id: 'mock4', userId: user.id, name: 'Web Dev: Backend API', dueDate: new Date(now + 7 * day).toISOString(), completed: false },
                ];
            }

            if (loadedExams.length === 0) {
                const now = Date.now();
                const day = 24 * 60 * 60 * 1000;
                loadedExams = [
                    { id: 'mock_exam1', userId: user.id, name: 'Analysis of Algorithms Midterm', date: new Date(now + 14 * day).toISOString() },
                    { id: 'mock_exam2', userId: user.id, name: 'Database Systems Final', date: new Date(now + 30 * day).toISOString() },
                ];
            }

            setAssignments(loadedAssignments);
            setExams(loadedExams);
            setProjects(loadedProjects);
        };
        loadData();
    }, [user.id]);

    // MOCK ANALYTICS DATA
    const mockWeeklyData = [
        { day: 'Mon', minutes: 120 },
        { day: 'Tue', minutes: 90 },
        { day: 'Wed', minutes: 150 },
        { day: 'Thu', minutes: 60 },
        { day: 'Fri', minutes: 180 },
        { day: 'Sat', minutes: 200 },
        { day: 'Sun', minutes: 0 },
    ];

    const mockDailyData = [
        { name: 'Focused', value: 45, color: '#4f46e5', icon: Target },
        { name: 'Phone', value: 10, color: '#f87171', icon: Smartphone },
        { name: 'Web', value: 5, color: '#fbbf24', icon: Globe },
        { name: 'Absent', value: 0, color: '#94a3b8', icon: UserX },
    ];

    const totalWeeklyMinutes = mockWeeklyData.reduce((acc, curr) => acc + curr.minutes, 0);
    const totalWeeklyHours = (totalWeeklyMinutes / 60).toFixed(1);
    const averageDailyMinutes = Math.round(totalWeeklyMinutes / 7);

    const handleAddAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAssignmentName || !newAssignmentDate) return;

        const newItem = await db.addAssignment({
            userId: user.id,
            name: newAssignmentName,
            dueDate: newAssignmentDate,
            completed: false
        });

        setAssignments([...assignments, newItem]);
        setNewAssignmentName('');
        setNewAssignmentDate('');
    };

    const handleAddExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExamName || !newExamDate) return;

        const newItem = await db.addExam({
            userId: user.id,
            name: newExamName,
            date: newExamDate
        });

        setExams([...exams, newItem]);
        setNewExamName('');
        setNewExamDate('');
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectTitle) return;

        const newItem = await db.createProject({
            userId: user.id,
            title: newProjectTitle,
            description: newProjectDescription,
            status: 'active'
        });

        setProjects([newItem, ...projects]);
        setNewProjectTitle('');
        setNewProjectDescription('');
        setShowProjectModal(false);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 relative">

            {/* Greeting Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Hi, {user.name}</h1>
                <p className="text-slate-500 text-lg">Your dashboard for academic success.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT COLUMN: ASSIGNMENTS & EXAMS (4 cols) */}
                <div className="lg:col-span-4 space-y-6">

                    {/* ASSIGNMENTS BOX */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md">
                                    <FileText size={18} />
                                </div>
                                <h2 className="font-bold text-slate-800">Assignments</h2>
                            </div>
                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{assignments.length}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {assignments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                                    <CheckCircle size={32} className="mb-2 opacity-20" />
                                    <p>No active assignments.</p>
                                </div>
                            ) : (
                                assignments.map(a => (
                                    <div key={a.id} className="group p-3 bg-white border border-slate-100 rounded-lg hover:border-indigo-100 hover:shadow-sm transition">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 ${a.completed ? 'text-green-500' : 'text-slate-300'}`}>
                                                {a.completed ? <CheckCircle size={16} /> : <Circle size={16} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-medium text-sm truncate ${a.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{a.name}</h3>
                                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                    Due: {new Date(a.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-100">
                            <form onSubmit={handleAddAssignment} className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Add assignment..."
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newAssignmentName}
                                    onChange={e => setNewAssignmentName(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600"
                                        value={newAssignmentDate}
                                        onChange={e => setNewAssignmentDate(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newAssignmentName || !newAssignmentDate}
                                        className="px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition shadow-sm flex items-center justify-center"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* EXAMS BOX */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
                        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-100 text-amber-600 rounded-md">
                                    <GraduationCap size={18} />
                                </div>
                                <h2 className="font-bold text-slate-800">Exams</h2>
                            </div>
                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{exams.length}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {exams.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                                    <Calendar size={32} className="mb-2 opacity-20" />
                                    <p>No exams coming up.</p>
                                </div>
                            ) : (
                                exams.map(e => (
                                    <div key={e.id} className="group p-3 bg-white border border-slate-100 rounded-lg hover:border-amber-100 hover:shadow-sm transition flex items-center gap-3">
                                        <div className="flex flex-col items-center justify-center w-10 h-10 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 shrink-0">
                                            <span className="text-[10px] font-bold uppercase">{new Date(e.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                            <span className="text-sm font-bold leading-none">{new Date(e.date).getDate()}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-medium text-sm text-slate-700 truncate">{e.name}</h3>
                                            <p className="text-xs text-slate-400">
                                                {Math.ceil((new Date(e.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-100">
                            <form onSubmit={handleAddExam} className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Add exam..."
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newExamName}
                                    onChange={e => setNewExamName(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600"
                                        value={newExamDate}
                                        onChange={e => setNewExamDate(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newExamName || !newExamDate}
                                        className="px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition shadow-sm flex items-center justify-center"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: ANALYTICS & PROJECTS (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-6">

                    {/* ANALYTICS SECTION */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="text-indigo-600" /> Study Analytics
                                </h2>
                                <button
                                    onClick={() => onNavigate('ANALYTICS')}
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full transition"
                                >
                                    View History
                                </button>
                            </div>
                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Clock size={16} /></div>
                                    <div>
                                        <div className="text-lg font-bold text-slate-800 leading-none">{totalWeeklyHours}h</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Weekly Total</div>
                                    </div>
                                </div>
                                <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Target size={16} /></div>
                                    <div>
                                        <div className="text-lg font-bold text-slate-800 leading-none">{averageDailyMinutes}m</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Daily Avg</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Focus Chart */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Weekly Focused Study Time</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={mockWeeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <XAxis
                                            dataKey="day"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 500 }}
                                            dy={10}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                padding: '12px 16px'
                                            }}
                                            formatter={(value: number) => [`${value} min`, 'Focused Time']}
                                        />
                                        <Bar dataKey="minutes" radius={[6, 6, 6, 6]} barSize={40}>
                                            {mockWeeklyData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.minutes > 100 ? '#4f46e5' : '#818cf8'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Daily Distribution Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {mockDailyData.map((stat) => (
                                <div key={stat.name} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                                    <div className="mb-3 p-3 rounded-full bg-opacity-10" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                                        <stat.icon size={20} />
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800">{stat.value}<span className="text-sm font-medium text-slate-400">m</span></div>
                                    <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mt-1">{stat.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PROJECTS SECTION */}
                    <div className="flex flex-col gap-6 mt-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <BookOpen className="text-indigo-600" /> Subjects
                            </h2>
                            <button
                                onClick={() => setShowProjectModal(true)}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition shadow-sm font-bold text-sm"
                            >
                                <Plus size={18} /> New Subject
                            </button>
                        </div>

                        {projects.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <BookOpen size={24} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">No subjects yet</h3>
                                <p className="text-slate-500 max-w-sm mb-6">Create your first subject to start organizing your learning materials and tracking progress.</p>
                                <button
                                    onClick={() => setShowProjectModal(true)}
                                    className="text-indigo-600 font-bold hover:underline"
                                >
                                    Create one now
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {projects.map(p => (
                                    <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition cursor-pointer group" onClick={() => onNavigate('PROJECT', p.id)}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-bold text-slate-800 group-hover:text-indigo-700 transition">{p.title}</h3>
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' :
                                                p.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{p.description || 'No description provided.'}</p>
                                        <div className="flex items-center text-xs text-slate-400 pt-3 border-t border-slate-50">
                                            Created {new Date(p.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </div>

            {/* CREATE PROJECT MODAL */}
            {showProjectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-900">Create New Subject</h3>
                            <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Subject Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Advanced Machine Learning"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    value={newProjectTitle}
                                    onChange={e => setNewProjectTitle(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                <textarea
                                    placeholder="What are your learning goals?"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none h-32"
                                    value={newProjectDescription}
                                    onChange={e => setNewProjectDescription(e.target.value)}
                                />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowProjectModal(false)}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newProjectTitle}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition disabled:opacity-50"
                                >
                                    Create Subject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
