import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserMinus, Clock, Activity, ShieldCheck, BarChart3, ShieldAlert, Users } from 'lucide-react';

const TeamLeaderLiveMonitor = ({ userSession, targetView = 'monitor' }) => {
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  
  // Navigation for the monitor deck
  const [monitorTab, setMonitorTab] = useState('presence'); // presence, analytics, audit
  
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('User');

  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [inputHours, setInputHours] = useState('');
  const [targetType, setTargetType] = useState('Online');
  const [leaderPassword, setLeaderPassword] = useState('');
  const [actionReason, setActionReason] = useState('');

  const fetchWorkforceLogs = async () => {
    try {
      if (targetView === 'monitor') {
        const [empRes, auditRes, histRes] = await Promise.all([
          axios.get('http://localhost:5000/api/team-leader/employees'),
          axios.get('http://localhost:5000/api/team-leader/audit-logs'),
          axios.get('http://localhost:5000/api/team-leader/attendance-history')
        ]);
        setEmployees(empRes.data);
        setAuditLogs(auditRes.data);
        setHistoryLogs(histRes.data);
      }
    } catch (err) {
      console.error("Error syncing workforce databases:", err);
    }
  };

  useEffect(() => {
    fetchWorkforceLogs();
    const livePoll = setInterval(fetchWorkforceLogs, 2500);
    return () => clearInterval(livePoll);
  }, [targetView]);

  const handleProvisionNewUser = async (e) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) return;
    try {
      await axios.post('http://localhost:5000/api/team-leader/provision', {
        name: regName, email: regEmail, password: regPassword, role: regRole
      });
      alert(`Account provisioned securely for ${regName}.`);
      setRegName(''); setRegEmail(''); setRegPassword(''); setRegRole('User');
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing request.');
    }
  };

  const handleTimeOverrideExecution = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/team-leader/time-override', {
        leaderId: userSession.id, employeeId: selectedEmp._id,
        targetSeconds: parseFloat(inputHours) * 3600, targetType, reason: actionReason
      });
      setIsOverrideOpen(false); setInputHours(''); setActionReason('');
      fetchWorkforceLogs();
    } catch (err) {
      alert('Error execution time adjust override.');
    }
  };

  const handlePurgeAccountExecution = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/team-leader/delete-account', {
        leaderId: userSession.id, password: leaderPassword,
        targetEmployeeId: selectedEmp._id, reason: actionReason
      });
      setIsDeleteOpen(false); setLeaderPassword(''); setActionReason('');
      fetchWorkforceLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Authorization failed.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER & TABS */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
          {targetView === 'monitor' ? 'Live Aux Panel & Analytics' : 'Corporate Provision Desk'}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {targetView === 'monitor' ? 'Track parameters, view historical metrics, and audit system integrity' : 'Generate secure credential access points for incoming staff'}
        </p>

        {targetView === 'monitor' && (
          <div className="flex gap-2 mt-4">
            <button onClick={() => setMonitorTab('presence')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${monitorTab === 'presence' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}><Users size={14}/> Live Presence</button>
            <button onClick={() => setMonitorTab('analytics')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${monitorTab === 'analytics' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}><BarChart3 size={14}/> Weekly Analytics</button>
            <button onClick={() => setMonitorTab('audit')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${monitorTab === 'audit' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}><ShieldAlert size={14}/> Security Ledger</button>
          </div>
        )}
      </div>

      {/* VIEW 1: LIVE PRESENCE */}
      {targetView === 'monitor' && monitorTab === 'presence' && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/20 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                <th className="p-4">Engineer / Member</th>
                <th className="p-4">Live Status</th>
                <th className="p-4">Metrics Tracked</th>
                <th className="p-4 text-center">Overrides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-xs text-slate-400">
              {employees.map((member) => (
                <tr key={member._id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 font-bold text-white">{member.name} <span className="block text-[10px] text-slate-500 font-normal mt-0.5">{member.email}</span></td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase border ${member.activeAux === 'Online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : member.activeAux === 'Off-Shift' ? 'bg-slate-900 text-slate-500 border-slate-800' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      <Activity size={12} className={member.activeAux === 'Online' ? 'animate-pulse' : ''} />
                      {member.activeAux || 'Off-Shift'}
                    </span>
                  </td>
                  <td className="p-4 font-mono">
                    <span className="text-emerald-400 block">Online: {Math.floor(member.onlineSeconds / 3600)}h {Math.floor((member.onlineSeconds % 3600) / 60)}m</span>
                    <span className="text-amber-400 block mt-0.5">Breaks: {Math.floor(member.offlineSeconds / 3600)}h {Math.floor((member.offlineSeconds % 3600) / 60)}m</span>
                  </td>
                  <td className="p-4 flex justify-center gap-2">
                    <button type="button" onClick={() => { setSelectedEmp(member); setInputHours(String(member.onlineSeconds / 3600)); setIsOverrideOpen(true); }} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg flex items-center gap-1 border border-slate-800 transition-colors"><Clock size={12} /> Adjust</button>
                    {member._id !== userSession?.id && (
                      <button type="button" onClick={() => { setSelectedEmp(member); setIsDeleteOpen(true); }} className="px-3 py-1.5 bg-rose-950/20 hover:bg-rose-900 text-rose-400 hover:text-white rounded-lg flex items-center gap-1 border border-rose-900/30 transition-colors"><UserMinus size={12} /> Purge</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: CSS VISUAL ANALYTICS */}
      {targetView === 'monitor' && monitorTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historyLogs.map((log) => {
              const maxHours = 40; // Assuming 40 hour work week for bar max
              const onlineWidth = Math.min((log.totalOnlineHours / maxHours) * 100, 100);
              
              return (
                <div key={log._id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 group hover:border-indigo-500/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">{log.employeeName}</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Year {log.year} • Week {log.weekNumber}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/30 px-2 py-1 rounded border border-indigo-900/50">{log.totalOnlineHours}h Total</span>
                  </div>
                  
                  {/* CSS Hover Magic Bar Chart */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>Online Velocity</span>
                    </div>
                    <div className="h-4 bg-slate-900 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all duration-1000 group-hover:opacity-80"
                        style={{ width: `${onlineWidth}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
            {historyLogs.length === 0 && <p className="text-slate-500 text-sm italic">No weekly archives processed yet.</p>}
          </div>
        </div>
      )}

      {/* VIEW 3: SECURITY AUDIT LEDGER */}
      {targetView === 'monitor' && monitorTab === 'audit' && (
        <div className="bg-[#0a0a0f] rounded-2xl border border-rose-900/30 overflow-hidden shadow-2xl font-mono relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50"></div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-rose-950/20 text-rose-500/70 text-[10px] uppercase font-bold tracking-widest border-b border-rose-900/30">
                <th className="p-4">Timestamp (UTC)</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">Action Signature</th>
                <th className="p-4">Justification Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-950/30 text-xs text-slate-400">
              {auditLogs.map((log) => (
                <tr key={log._id} className="hover:bg-rose-950/10 transition-colors">
                  <td className="p-4 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-4 font-bold text-slate-300">{log.targetEmployeeName}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-rose-950/40 text-rose-400 rounded border border-rose-900/50 text-[10px]">{log.actionType}</span></td>
                  <td className="p-4 text-slate-500">{log.reason}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-600">Secure. No administrative overrides logged.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* PROVISION DESK */}
      {targetView === 'provision' && (
        <div className="max-w-xl mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center gap-2.5 border-b border-slate-900 pb-3">
            <ShieldCheck className="text-indigo-400" size={20} />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Account Key Generation Box</h2>
          </div>
          <form onSubmit={handleProvisionNewUser} className="space-y-4">
             {/* Same form fields as before */}
            <div><label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Employee Name</label><input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500" /></div>
            <div><label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Corporate Email</label><input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500" /></div>
            <div><label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">System Passphrase</label><input type="text" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-indigo-500" /></div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Permission Group</label>
              <select value={regRole} onChange={(e) => setRegRole(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500">
                <option value="User">Regular Employee</option><option value="TeamLeader">Team Leader</option>
              </select>
            </div>
            <button type="submit" className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg">Commit Configuration & Save</button>
          </form>
        </div>
      )}

      {/* OVERLAY EXCEPTION MODALS (Kept exact same functionality) */}
      {isOverrideOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleTimeOverrideExecution} className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Override Time Matrix</h3>
            <div><input type="number" step="0.01" required value={inputHours} onChange={(e) => setInputHours(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none" placeholder="Hours"/></div>
            <div><select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"><option value="Online">Online</option><option value="Offline">Offline</option></select></div>
            <div><textarea required value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white h-20 resize-none outline-none" placeholder="Reason..." /></div>
            <div className="flex gap-3"><button type="button" onClick={() => setIsOverrideOpen(false)} className="flex-1 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl">Cancel</button><button type="submit" className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Apply</button></div>
          </form>
        </div>
      )}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handlePurgeAccountExecution} className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-rose-400">Purge Credentials</h3>
            <div><input type="password" required value={leaderPassword} onChange={(e) => setLeaderPassword(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-rose-900/40 rounded-xl text-xs text-white outline-none" placeholder="Your Password"/></div>
            <div><textarea required value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white h-16 resize-none outline-none" placeholder="Offboarding Reason..." /></div>
            <div className="flex gap-3"><button type="button" onClick={() => setIsDeleteOpen(false)} className="flex-1 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl">Cancel</button><button type="submit" className="flex-1 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl">Purge</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TeamLeaderLiveMonitor;