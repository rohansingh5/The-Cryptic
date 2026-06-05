import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { FolderGit2, MessageSquare, ShieldAlert, LogIn, UserPlus } from 'lucide-react';
import axios from 'axios';

import LoginPage from './pages/LoginPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import TeamChatHub from './pages/TeamChatHub';
import TeamLeaderLiveMonitor from './pages/TeamLeaderLiveMonitor';
import ProjectManagementWorkspace from './pages/ProjectManagementWorkspace';

const ShellLayout = ({ children, userSession, metrics }) => {
  const location = useLocation();
  const hideSidebar = location.pathname === '/login' || location.pathname === '/';

  if (hideSidebar) return <>{children}</>;

  const formatDuration = (totalSeconds) => {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="flex bg-slate-900 min-h-screen text-slate-300 antialiased font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col p-5 space-y-6 shrink-0">
        <div>
          <h1 className="text-lg font-black text-white tracking-wider flex items-center gap-2">
            <span className="p-1.5 bg-indigo-600 rounded-lg text-white text-xs">TC</span>
            THE CRYPTIC
          </h1>
          <p className="text-[10px] uppercase font-bold text-slate-500 mt-1 tracking-widest">Workspace Core</p>
        </div>

        <nav className="flex-1 space-y-1">
          <Link to="/project" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${location.pathname === '/project' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}>
            <FolderGit2 size={16} /> Project Suite
          </Link>
          
          {/* SPRINT KANBAN WORKSPACE SIDEBAR NAVIGATION */}
          <Link to="/tasks" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${location.pathname === '/tasks' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}>
            <span className="text-sm">📋</span> Task Workspace
          </Link>

          <Link to="/chat" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${location.pathname === '/chat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}>
            <MessageSquare size={16} /> Operations Chat
          </Link>
          
          {/* LEADERSHIP SHELL */}
          {userSession?.role === 'TeamLeader' && (
            <div className="pt-6 space-y-1">
              <p className="text-[9px] uppercase font-bold text-slate-600 px-4 mb-2 tracking-widest">Leadership Shell</p>
              
              <Link to="/leader-monitor" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide border transition-all ${location.pathname === '/leader-monitor' ? 'bg-indigo-950/40 text-indigo-200 border-indigo-800/60' : 'text-slate-500 hover:bg-slate-900 border-transparent'}`}>
                <ShieldAlert size={16} className="text-indigo-400" /> Live Aux Panel
              </Link>

              <Link to="/leader-provision" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide border transition-all ${location.pathname === '/leader-provision' ? 'bg-indigo-950/40 text-indigo-200 border-indigo-800/60' : 'text-slate-500 hover:bg-slate-900 border-transparent'}`}>
                <UserPlus size={16} className="text-indigo-400" /> Provision Desk
              </Link>
            </div>
          )}
        </nav>

        {/* Live Sidebar Footer Mini Tracker */}
        {userSession?.role === 'User' && (
          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-1 font-mono text-[11px]">
            <div className="flex justify-between"><span className="text-slate-500">ON:</span> <span className="text-emerald-400 font-bold">{formatDuration(metrics.onlineSeconds)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">AUX:</span> <span className="text-amber-400 font-bold">{formatDuration(metrics.offlineSeconds)}</span></div>
          </div>
        )}

        <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-900/40 border border-indigo-700/50 flex items-center justify-center text-xs font-bold text-indigo-200 uppercase">
              {userSession?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300">{userSession?.name || 'User Profile'}</p>
              <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">{userSession?.role || 'User'}</p>
            </div>
          </div>
          <Link to="/login" onClick={() => { localStorage.clear(); window.location.reload(); }} className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-300">
            <LogIn size={14} />
          </Link>
        </div>
      </aside>

      <main className="flex-1 bg-slate-900 overflow-y-auto">{children}</main>
    </div>
  );
};

function App() {
  const [userSession, setUserSession] = useState(null);
  const [activeAux, setActiveAux] = useState('Off-Shift');
  const [metrics, setMetrics] = useState({ onlineSeconds: 0, offlineSeconds: 0 });
  
  const activeAuxRef = useRef(activeAux);
  const metricsRef = useRef(metrics);

  useEffect(() => {
    activeAuxRef.current = activeAux;
  }, [activeAux]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    const session = localStorage.getItem('activeUserSession');
    if (session) {
      const parsedUser = JSON.parse(session);
      setUserSession(parsedUser);

      axios.get('http://localhost:5000/api/team-leader/employees')
        .then(res => {
          const profile = res.data.find(e => e._id === parsedUser.id);
          if (profile) {
            setActiveAux(profile.activeAux || 'Off-Shift');
            setMetrics({ onlineSeconds: profile.onlineSeconds || 0, offlineSeconds: profile.offlineSeconds || 0 });
          }
        }).catch(err => console.error(err));
    }
  }, []);

  // PERMANENT BACKGROUND TIME ENGINE TIMER SYNC LOOP
  useEffect(() => {
    const clockLoop = setInterval(() => {
      if (!userSession?.id || activeAuxRef.current === 'Off-Shift') return;

      const SHIFT_ONLINE_LIMIT = 6 * 3600;
      const SHIFT_OFFLINE_LIMIT = 1 * 3600;
      if (metricsRef.current.onlineSeconds >= SHIFT_ONLINE_LIMIT || metricsRef.current.offlineSeconds >= SHIFT_OFFLINE_LIMIT) return;

      let nextOnline = metricsRef.current.onlineSeconds;
      let nextOffline = metricsRef.current.offlineSeconds;

      if (activeAuxRef.current === 'Online') {
        nextOnline += 1;
      } else {
        nextOffline += 1;
      }

      const updatedMetrics = { onlineSeconds: nextOnline, offlineSeconds: nextOffline };
      setMetrics(updatedMetrics);

      axios.post('http://localhost:5000/api/user/sync-metrics', {
        userId: userSession.id,
        onlineSeconds: nextOnline,
        offlineSeconds: nextOffline
      }).catch(() => {});

    }, 1000);

    return () => clearInterval(clockLoop);
  }, [userSession]);

  return (
    <Router>
      <ShellLayout userSession={userSession} metrics={metrics}>
        <Routes>
          <Route path="/" element={<LoginPage setSession={setUserSession} />} />
          <Route path="/login" element={<LoginPage setSession={setUserSession} />} />
          <Route 
            path="/project" 
            element={
              <ProjectDetailsPage 
                userSession={userSession} 
                activeAux={activeAux} 
                setActiveAux={setActiveAux} 
                metrics={metrics} 
                setMetrics={setMetrics} 
              />
            } 
          />
          
          {/* SPRINT TARGET DISPATCHING BOARD ELEMENT */}
          <Route path="/tasks" element={<ProjectManagementWorkspace userSession={userSession} />} />
          
          <Route path="/chat" element={<TeamChatHub userSession={userSession} />} />
          <Route 
            path="/leader-monitor" 
            element={userSession?.role === 'TeamLeader' ? <TeamLeaderLiveMonitor userSession={userSession} targetView="monitor" /> : <Navigate to="/project" />} 
          />
          <Route 
            path="/leader-provision" 
            element={userSession?.role === 'TeamLeader' ? <TeamLeaderLiveMonitor userSession={userSession} targetView="provision" /> : <Navigate to="/project" />} 
          />
        </Routes>
      </ShellLayout>
    </Router>
  );
}

export default App;