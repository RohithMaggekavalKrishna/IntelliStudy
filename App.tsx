import React, { useState, useEffect, useCallback, useRef } from "react";
import WebcamTracker from "./components/WebcamTracker";
import Dashboard from "./components/Dashboard";
import { AuthForms } from "./components/AuthForms";
import { Homepage } from "./components/Homepage";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { db } from "./services/db";
import { SessionData, TrackingState, TimeSlice, FocusStatus, DistractionType, BrowserState, DomainCategory, User } from "./types";
import { Play, Pause, Square, ChevronRight, Brain, AlertTriangle, TrendingUp, Clock, Globe, X, Check, Smartphone, Monitor, PlugZap, LogOut, History } from "lucide-react";
import { formatDuration } from "./utils/metrics";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from "recharts";

import { ProjectPage } from "./components/ProjectPage";
import { Toaster } from "react-hot-toast";

enum AppState {
  AUTH,
  HOME,
  SETUP,
  RUNNING,
  PAUSED,
  SUMMARY,
  ANALYTICS,
  PROJECT_VIEW
}

// SIMULATED BROWSER EXTENSION STATE
const DEFAULT_BROWSER_STATE: BrowserState = {
  url: "https://canvas.school.edu/courses/101",
  domain: "canvas.school.edu",
  category: "STUDY",
  title: "LMS - Calculus 101"
};

const classifyDomain = (domain: string): DomainCategory => {
  const d = domain.toLowerCase();
  if (d.includes('canvas') || d.includes('wikipedia') || d.includes('github') || d.includes('stackoverflow') || d.includes('edu')) return 'STUDY';
  if (d.includes('youtube') || d.includes('instagram') || d.includes('twitter') || d.includes('facebook') || d.includes('tiktok') || d.includes('reddit')) return 'NON_STUDY';
  return 'NEUTRAL';
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<SessionData[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [plannedTime, setPlannedTime] = useState(25);

  // Real-time tracking state
  const [trackingState, setTrackingState] = useState<TrackingState | null>(null);
  const [browserState, setBrowserState] = useState<BrowserState>(DEFAULT_BROWSER_STATE);
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);

  const trackingStateRef = useRef<TrackingState | null>(null);
  const browserStateRef = useRef<BrowserState>(DEFAULT_BROWSER_STATE);

  // Sync refs
  useEffect(() => { trackingStateRef.current = trackingState; }, [trackingState]);
  useEffect(() => { browserStateRef.current = browserState; }, [browserState]);

  // Load History on Auth Success
  useEffect(() => {
    if (user) {
      db.getUserHistory(user.id).then(data => setHistory(data));
    }
  }, [user, appState]); // Reload history when app state changes (e.g. after a session)

  // Extension Message Listener
  useEffect(() => {
    const handleExtensionMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data.type === 'INTELLI_STUDY_UPDATE') {
        setIsExtensionConnected(true);
        const { url, title } = event.data.payload;
        try {
          const domain = new URL(url).hostname;
          setBrowserState({
            url,
            domain,
            title: title || domain,
            category: classifyDomain(domain)
          });
        } catch (e) { }
      }
    };
    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, []);

  const [sessionData, setSessionData] = useState<SessionData>({
    subject: "",
    topic: "",
    plannedMinutes: 0,
    startTime: null,
    endTime: null,
    slices: [],
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const lastTickRef = useRef<number>(0);

  // CORE CLASSIFICATION
  const classifyMoment = useCallback((vision: TrackingState | null, browser: BrowserState): { status: FocusStatus; type: DistractionType } => {
    if (vision?.isPhoneDetected) return { status: 'DISTRACTED', type: 'PHONE' };
    if (browser.category === 'NON_STUDY') return { status: 'DISTRACTED', type: 'WEB_DISTRACTION' };
    if (!vision || !vision.isFacePresent) return { status: 'DISTRACTED', type: 'ABSENT' };
    if (vision.isHeadDown) return { status: 'DISTRACTED', type: 'PHONE' };
    if (!vision.isLookingAtScreen) return { status: 'PARTIAL', type: 'LOOKING_AWAY' };
    if (browser.category === 'STUDY') return { status: 'FOCUSED', type: 'NONE' };
    return { status: 'PARTIAL', type: 'NONE' };
  }, []);

  // Timer Loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (appState === AppState.RUNNING) {
      if (lastTickRef.current === 0) lastTickRef.current = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickRef.current;
        if (delta >= 1000) {
          const secondsPassed = Math.round(delta / 1000);
          setElapsedSeconds((prev) => prev + secondsPassed);
          const newSlices: TimeSlice[] = [];
          const currentVision = trackingStateRef.current;
          const currentBrowser = browserStateRef.current;
          for (let i = 0; i < secondsPassed; i++) {
            const { status, type } = classifyMoment(currentVision, currentBrowser);
            newSlices.push({
              timestamp: now - ((secondsPassed - 1 - i) * 1000),
              status,
              distractionType: type,
              metadata: { url: currentBrowser.url, domain: currentBrowser.domain }
            });
          }
          setSessionData((prev) => ({ ...prev, slices: [...prev.slices, ...newSlices] }));
          lastTickRef.current = now;
        }
      }, 1000);
    } else {
      lastTickRef.current = 0;
    }
    return () => clearInterval(interval);
  }, [appState, classifyMoment]);

  const handleStart = () => {
    if (!subject) return;
    setSessionData({
      subject,
      topic,
      plannedMinutes: plannedTime,
      startTime: Date.now(),
      endTime: null,
      slices: [],
    });
    setElapsedSeconds(0);
    lastTickRef.current = Date.now();
    setAppState(AppState.RUNNING);
  };

  const handleStop = () => {
    const endTime = Date.now();
    const finalSession = { ...sessionData, endTime };
    setSessionData(finalSession);

    // Save to Database
    if (user) {
      db.saveSession(finalSession, user.id);
    }

    setAppState(AppState.SUMMARY);
  };

  const handleLogout = () => {
    setUser(null);
    setAppState(AppState.AUTH);
    db.logout();
  };

  // --- RENDER ---

  if (appState === AppState.AUTH) {
    return <AuthForms onLogin={(u) => { setUser(u); setAppState(AppState.HOME); }} />;
  }

  if (appState === AppState.HOME && user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
        <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-2 text-indigo-600 cursor-pointer" onClick={() => setAppState(AppState.HOME)}>
            <Brain className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight">IntelliStudy</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAppState(AppState.SETUP)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition"
            >
              Start Session
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <span className="text-sm font-medium text-slate-600">{user.name}</span>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </nav>
        <Homepage user={user} onNavigate={(route, data) => {
          if (route === 'SETUP') setAppState(AppState.SETUP);
          if (route === 'ANALYTICS') setAppState(AppState.ANALYTICS);
          if (route === 'PROJECT' && data) {
            setActiveProjectId(data);
            setAppState(AppState.PROJECT_VIEW);
          }
        }} />
      </div>
    );
  }

  if (appState === AppState.ANALYTICS && user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
        <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-2 text-indigo-600 cursor-pointer" onClick={() => setAppState(AppState.HOME)}>
            <Brain className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight">IntelliStudy</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <span className="text-sm font-medium text-slate-600">{user.name}</span>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </nav>
        <AnalyticsDashboard user={user} onBack={() => setAppState(AppState.HOME)} />
      </div>
    );
  }

  if (appState === AppState.PROJECT_VIEW && user && activeProjectId) {
    return (
      <>
        <Toaster position="top-right" />
        <ProjectPage
          user={user}
          projectId={activeProjectId}
          onNavigate={(route) => {
            if (route === 'HOME') setAppState(AppState.HOME);
          }}
        />
      </>
    );
  }

  // UI Helpers
  const classification = classifyMoment(trackingState, browserState);
  const currentStatus = classification.status;

  const statusColor =
    currentStatus === 'FOCUSED' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' :
      currentStatus === 'PARTIAL' ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)]' :
        'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]';

  const statusText =
    classification.type === 'PHONE' ? 'Phone Detected' :
      classification.type === 'WEB_DISTRACTION' ? 'Distracting Website' :
        classification.type === 'ABSENT' ? 'User Absent' :
          currentStatus === 'FOCUSED' ? 'Deep Focus' :
            'Partial Focus';

  // Prepare Chart Data for History
  const historyChartData = history.slice(0, 7).reverse().map(s => ({
    date: new Date(s.timestamp || 0).toLocaleDateString(undefined, { weekday: 'short' }),
    focus: s.metrics?.focusedTime ? Math.round(s.metrics.focusedTime / 60) : 0,
    distraction: s.metrics?.outsideTime ? Math.round(s.metrics.outsideTime / 60) : 0
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 text-indigo-600 cursor-pointer" onClick={() => setAppState(AppState.HOME)}>
          <Brain className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight">IntelliStudy</span>
        </div>
        <div className="flex items-center gap-4">
          {(appState === AppState.RUNNING || appState === AppState.PAUSED) && (
            <div className={`text-xs px-3 py-1 rounded-full flex items-center gap-2 font-medium border ${isExtensionConnected ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              <PlugZap size={14} className={isExtensionConnected ? 'fill-indigo-700' : ''} />
              {isExtensionConnected ? 'Extension Active' : 'Simulation Mode'}
            </div>
          )}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <span className="text-sm font-medium text-slate-600">{user?.name}</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 relative">

        {/* SETUP SCREEN (MAIN DASHBOARD) */}
        {appState === AppState.SETUP && (
          <div className="max-w-6xl mx-auto mt-4 animate-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500 mt-2">Track your progress and start a new flow.</p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-2xl font-bold text-indigo-600">{history.length}</div>
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Sessions</div>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Analytics */}
              <div className="lg:col-span-2 space-y-6">
                {/* History Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <History size={20} />
                      <span className="font-bold text-sm uppercase tracking-wide">Recent Activity (Mins)</span>
                    </div>
                  </div>

                  {history.length > 0 ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyChartData} barGap={4}>
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <Tooltip
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="focus" name="Focused" stackId="a" fill="#4f46e5" radius={[0, 0, 4, 4]} />
                          <Bar dataKey="distraction" name="Distracted" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                      <TrendingUp size={32} className="mb-2 opacity-50" />
                      <p>No sessions recorded yet.</p>
                    </div>
                  )}
                </div>

                {/* Recent Sessions List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-sm text-slate-700">Recent Sessions</h3>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {history.slice(0, 5).map(session => (
                      <div key={session.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition">
                        <div>
                          <div className="font-bold text-slate-800">{session.subject}</div>
                          <div className="text-xs text-slate-500">{session.topic} • {new Date(session.timestamp || 0).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono font-bold text-indigo-600">
                            {formatDuration(session.metrics?.focusedTime || 0)}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Focus Time</div>
                        </div>
                      </div>
                    ))}
                    {history.length === 0 && (
                      <div className="p-6 text-center text-sm text-slate-500">Start your first session to see history here.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Start Session Form */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100 h-full flex flex-col">
                  <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                    <Play className="fill-indigo-600 text-indigo-600 w-5 h-5" /> Start New Session
                  </h2>

                  <div className="space-y-6 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Mathematics"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Topic</label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Calculus"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Planned Duration</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 25, 45, 60].map(m => (
                          <button
                            key={m}
                            onClick={() => setPlannedTime(m)}
                            className={`py-2 rounded-lg text-sm font-bold transition border-2 ${plannedTime === m ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleStart}
                    disabled={!subject}
                    className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  >
                    Start Session <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE SESSION SCREEN */}
        {(appState === AppState.RUNNING || appState === AppState.PAUSED) && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 animate-in fade-in duration-500">

            {/* Left Col: BROWSER CONTEXT */}
            <div className="lg:col-span-3 space-y-6">
              <div className={`p-5 rounded-2xl shadow-sm border border-slate-200 ${isExtensionConnected ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}`}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Globe size={14} /> {isExtensionConnected ? 'Real-Time Extension' : 'Simulation Mode'}
                </h3>

                {isExtensionConnected ? (
                  <div className="text-sm text-indigo-800">
                    <p className="mb-2">Tracking active tabs...</p>
                    <div className="flex items-center gap-2 mt-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-medium">Live Connected</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 mb-2">Simulate browser activity:</p>
                    <button onClick={() => setBrowserState({ url: 'https://canvas.edu', domain: 'canvas.edu', category: 'STUDY', title: 'LMS' })} className="w-full text-left px-3 py-2 rounded-lg text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600">Open Study Site</button>
                    <button onClick={() => setBrowserState({ url: 'https://youtube.com', domain: 'youtube.com', category: 'NON_STUDY', title: 'YouTube' })} className="w-full text-left px-3 py-2 rounded-lg text-sm bg-red-50 hover:bg-red-100 border border-red-200 text-red-600">Open Distraction</button>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Col: Camera & Tracking */}
            <div className="lg:col-span-6 space-y-6">
              <div className={`relative rounded-2xl overflow-hidden border-4 transition-all duration-500 ${statusColor}`}>
                <WebcamTracker onUpdate={setTrackingState} />
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm font-medium flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentStatus === 'FOCUSED' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  {statusText}
                </div>
              </div>
            </div>

            {/* Right Col: Timer & Controls */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 text-center relative overflow-hidden">
                <div className="text-5xl font-mono font-bold text-slate-800 tracking-tighter mb-8">
                  {formatDuration(elapsedSeconds)}
                </div>
                <div className="flex flex-col gap-3">
                  {appState === AppState.RUNNING ? (
                    <button onClick={() => setAppState(AppState.PAUSED)} className="w-full py-3 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl font-bold flex items-center justify-center gap-2 transition"><Pause size={20} /> Pause</button>
                  ) : (
                    <button onClick={() => setAppState(AppState.RUNNING)} className="w-full py-3 bg-green-100 text-green-700 hover:bg-green-200 rounded-xl font-bold flex items-center justify-center gap-2 transition"><Play size={20} /> Resume</button>
                  )}
                  <button onClick={handleStop} className="w-full py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 transition"><Square size={20} /> End Session</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {appState === AppState.SUMMARY && (
          <Dashboard
            session={sessionData}
            onRestart={() => {
              setAppState(AppState.HOME);
            }}
          />
        )}

      </main>
    </div>
  );
};

export default App;