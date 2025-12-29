import React, { useState, useEffect } from 'react';
import { User, SessionData } from '../types';
import { db } from '../services/db';
import { ArrowLeft, Clock, Calendar, BookOpen, AlertCircle, TrendingUp, BarChart2, PieChart } from 'lucide-react';
import { formatDuration } from '../utils/metrics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';

interface AnalyticsDashboardProps {
    user: User;
    onBack: () => void;
}

// Robust Mock Data for demonstration
const MOCK_HISTORY: SessionData[] = Array.from({ length: 20 }).map((_, i) => ({
    id: `mock-${i}`,
    userId: 'mock-user',
    subject: ['Mathematics', 'Computer Science', 'History', 'Physics'][i % 4],
    topic: ['Calculus II', 'Algorithms', 'World War II', 'Quantum Mechanics', 'Linear Algebra'][i % 5],
    timestamp: Date.now() - (i * 24 * 60 * 60 * 1000) - (Math.random() * 3600000), // Spread over days
    startTime: Date.now() - (i * 24 * 60 * 60 * 1000),
    endTime: Date.now() - (i * 24 * 60 * 60 * 1000) + (1800000 + Math.random() * 3600000), // 30m to 1.5h
    plannedMinutes: 60,
    slices: [],
    metrics: {
        focusedTime: 1500 + Math.random() * 3000, // 25m to 75m
        outsideTime: Math.random() * 300,
        wordsRead: 500 + Math.random() * 1000,
        pagesTurned: 5 + Math.floor(Math.random() * 10)
    }
}));

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ user, onBack }) => {
    const [history, setHistory] = useState<SessionData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            let data = await db.getUserHistory(user.id);

            // If no real data, use mock data
            if (!data || data.length === 0) {
                data = MOCK_HISTORY;
            }

            // Sort by timestamp desc
            data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setHistory(data);
            setLoading(false);
        };
        loadHistory();
    }, [user.id]);

    const totalSeconds = history.reduce((acc, sess) => acc + (sess.metrics?.focusedTime || 0), 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);

    // Prepare chart data
    const subjectData = history.reduce((acc: any, sess) => {
        const subj = sess.subject || 'Other';
        if (!acc[subj]) acc[subj] = 0;
        acc[subj] += (sess.metrics?.focusedTime || 0) / 60; // Minutes
        return acc;
    }, {});

    const chartData = Object.keys(subjectData).map(key => ({
        name: key,
        minutes: Math.round(subjectData[key])
    }));

    const weeklyTrends = history.slice(0, 7).reverse().map(sess => ({
        date: new Date(sess.timestamp || 0).toLocaleDateString(undefined, { weekday: 'short' }),
        minutes: Math.round((sess.metrics?.focusedTime || 0) / 60)
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Study History</h1>
                    <p className="text-slate-500">Detailed analytics of all your sessions.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
                        <div className="flex items-center gap-2 mb-2 text-indigo-100">
                            <TrendingUp size={20} />
                            <span className="font-medium uppercase tracking-wider text-xs">Total Focused Time</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold tracking-tight">{totalHours}h</span>
                            <span className="text-sm text-indigo-200 font-medium">all time</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-slate-500">
                            <BarChart2 size={20} />
                            <span className="font-medium uppercase tracking-wider text-xs">Sessions</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold tracking-tight text-slate-900">{history.length}</span>
                            <span className="text-sm text-slate-400 font-medium">completed</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-slate-500">
                            <BookOpen size={20} />
                            <span className="font-medium uppercase tracking-wider text-xs">Top Subject</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-slate-900 truncate">
                                {chartData.sort((a, b) => b.minutes - a.minutes)[0]?.name || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Subject Distribution */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <PieChart size={18} className="text-slate-400" /> Subject Distribution (Minutes)
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="minutes" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Weekly Trends */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <TrendingUp size={18} className="text-slate-400" /> Recent Focus Trends
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weeklyTrends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Line type="monotone" dataKey="minutes" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* History Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock size={18} className="text-slate-400" /> Session Log
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400">Loading history...</div>
                        ) : history.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">No sessions recorded start. Start studying!</div>
                        ) : (
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Subject</th>
                                        <th className="px-6 py-4">Topic</th>
                                        <th className="px-6 py-4 text-right">Focused Time</th>
                                        <th className="px-6 py-4 text-right">Distracted Time</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.map((sess) => (
                                        <tr key={sess.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {new Date(sess.timestamp || 0).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-slate-400 ml-6">
                                                    {new Date(sess.timestamp || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen size={14} className="text-indigo-400" />
                                                    {sess.subject}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{sess.topic}</td>
                                            <td className="px-6 py-4 text-right font-mono font-medium text-indigo-600">
                                                {formatDuration(sess.metrics?.focusedTime || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-500">
                                                {formatDuration(sess.metrics?.outsideTime || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {sess.endTime ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                        Incomplete
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
