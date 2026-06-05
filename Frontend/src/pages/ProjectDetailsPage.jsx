import React, { useState } from 'react';
import axios from 'axios';
import { X, Check, ShieldAlert } from 'lucide-react';

const ProjectDetailsPage = ({ userSession, activeAux, setActiveAux, metrics, setMetrics }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAux, setSelectedAux] = useState(activeAux);
  
  const SHIFT_ONLINE_LIMIT = 6 * 3600; 
  const SHIFT_OFFLINE_LIMIT = 1 * 3600; 

  const isShiftLimitBreached = metrics.onlineSeconds >= SHIFT_ONLINE_LIMIT || metrics.offlineSeconds >= SHIFT_OFFLINE_LIMIT;

  const handleApplyAuxChanges = async () => {
    try {
      await axios.post('http://localhost:5000/api/user/sync-aux', { 
        userId: userSession.id, 
        activeAux: selectedAux 
      });
      
      setActiveAux(selectedAux);
      
      if (selectedAux === 'Off-Shift') {
        setMetrics({ onlineSeconds: 0, offlineSeconds: 0 });
      }
      
      setIsModalOpen(false);
    } catch (err) {
      alert('Error updating auxiliary settings.');
    }
  };

  const formatDuration = (totalSeconds) => {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 relative">
      
      {isShiftLimitBreached && (
        <div className="bg-gradient-to-r from-amber-950 via-rose-950 to-amber-950 p-4 rounded-xl border border-rose-800 flex items-center gap-3 animate-pulse">
          <ShieldAlert className="text-rose-400 shrink-0" size={18} />
          <div className="text-xs">
            <span className="font-bold text-white block">SHIFT COMPLIANCE CAP LIMIT ENFORCED</span>
            <span className="text-slate-300">You have completed your mandatory interval (Max 6h Online / 1h Break). Open the allocation badge to cycle your active state code structure manually.</span>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">The Cryptic</h2>
        </div>
        
        <div onClick={() => { setSelectedAux(activeAux); setIsModalOpen(true); }} className="bg-slate-950 p-4 rounded-xl border border-slate-800 shrink-0 min-w-[200px] cursor-pointer hover:border-indigo-500/50 transition-all">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Punched Status</p>
          <p className={`text-sm font-black uppercase mt-1 tracking-wide flex items-center gap-1.5 ${activeAux === 'Online' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {activeAux} Mode
          </p>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Punch Auxiliary Tracker</h3>
            <div className="space-y-1.5">
              {['Online', 'Lunch', 'Break', 'Bio Break', 'Meeting', 'Off-Shift'].map((option) => (
                <button key={option} type="button" onClick={() => setSelectedAux(option)} className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${selectedAux === option ? 'border-indigo-500 bg-indigo-600/10 text-indigo-300' : 'border-slate-800 bg-slate-950/40 text-slate-400'}`}>
                  <span>{option} Mode</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancel</button>
              <button type="button" onClick={handleApplyAuxChanges} className="flex-1 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl">Apply</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase text-slate-500 font-bold block">Login Hours</span>
          <span className="text-sm font-mono font-bold text-emerald-400">{formatDuration(metrics.onlineSeconds)} / 06h 00m</span>
        </div>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase text-slate-500 font-bold block">Break Hours</span>
          <span className="text-sm font-mono font-bold text-amber-400">{formatDuration(metrics.offlineSeconds)} / 01h 00m</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;