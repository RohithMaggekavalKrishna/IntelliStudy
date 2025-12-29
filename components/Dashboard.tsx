import React from "react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis 
} from "recharts";
import { AlertCircle, Smartphone, Monitor, Globe, CheckCircle2, Share2, Clock } from "lucide-react";
import { SessionData, TimeSlice } from "../types";
import { calculateSessionMetrics, formatDuration } from "../utils/metrics";

interface DashboardProps {
  session: SessionData;
  onRestart: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ session, onRestart }) => {
  const metrics = calculateSessionMetrics(session.slices);

  const pieData = [
    { name: "Focused Study", value: metrics.focusedTime, color: "#22c55e" },
    { name: "Phone Usage", value: metrics.phoneTime, color: "#ef4444" },
    { name: "Bad Websites", value: metrics.webTime, color: "#f59e0b" },
    { name: "Away/Idle", value: metrics.absentTime, color: "#64748b" },
  ].filter(d => d.value > 0);

  // Compress slices for timeline visualization
  const timelineData = [];
  const chunkSize = 10;
  for (let i = 0; i < session.slices.length; i += chunkSize) {
    const chunk = session.slices.slice(i, i + chunkSize);
    const statusCounts = chunk.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const dominantStatus = Object.keys(statusCounts).reduce((a, b) => statusCounts[a] > statusCounts[b] ? a : b);
    
    timelineData.push({
      time: formatDuration(i),
      status: dominantStatus === 'FOCUSED' ? 1 : dominantStatus === 'PARTIAL' ? 0.5 : 0,
    });
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Session Report</h1>
          <p className="text-slate-500">{session.subject} - {session.topic}</p>
        </div>
        <button onClick={onRestart} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition">
          Start New Session
        </button>
      </header>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Focus Score</span>
          <div className="text-5xl font-bold text-indigo-600 mt-2">{metrics.focusScore}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Time</span>
          <div className="text-3xl font-semibold text-slate-800 mt-2">{formatDuration(metrics.totalDuration)}</div>
          <div className="text-xs text-slate-400 mt-1">Goal: {session.plannedMinutes}m</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Phone Time</span>
          <div className={`text-3xl font-semibold mt-2 ${metrics.phoneTime > 0 ? 'text-red-500' : 'text-slate-700'}`}>
            {formatDuration(metrics.phoneTime)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Web Distraction</span>
          <div className={`text-3xl font-semibold mt-2 ${metrics.webTime > 0 ? 'text-amber-500' : 'text-slate-700'}`}>
            {formatDuration(metrics.webTime)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Focus Timeline</h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timelineData} barGap={0} barCategoryGap={0}>
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="status" maxBarSize={4}>
                        {timelineData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.status === 1 ? '#22c55e' : entry.status === 0.5 ? '#f59e0b' : '#ef4444'} 
                            />
                        ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* WEB TRAFFIC TABLE (New Feature) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Globe size={18} className="text-slate-400" /> Website Traffic
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-4 py-3">Domain</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3 text-right">Time Spent</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {metrics.topSites.map((site) => (
                                <tr key={site.domain} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-700">{site.domain}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            site.category === 'STUDY' ? 'bg-green-100 text-green-700' : 
                                            site.category === 'NON_STUDY' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {site.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                                        {formatDuration(site.duration)}
                                    </td>
                                </tr>
                            ))}
                            {metrics.topSites.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-6 text-center text-slate-400 italic">
                                        No website data recorded.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Distraction Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Time Breakdown</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {pieData.map((d) => (
                <div key={d.name} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}} />
                        <span className="text-slate-600">{d.name}</span>
                    </div>
                    <span className="font-medium text-slate-800">{formatDuration(d.value)}</span>
                </div>
            ))}
          </div>
          
          <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-700 text-xs uppercase mb-2">Algorithm Insights</h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-2">
                • <b>Phone:</b> Detected by shape & hold posture.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mb-2">
                • <b>Web:</b> "Non-Study" domains override face attention.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
                • <b>Focused:</b> Study domain + Screen attention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;