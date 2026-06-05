import React, { useState } from 'react';
import axios from 'axios';

const LoginPage = ({ setSession }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      
      // Save user record configuration data locally
      localStorage.setItem('activeUserSession', JSON.stringify(res.data.user));
      setSession(res.data.user);
      
      // Set to step 2 to prompt simulated YubiKey verification hardware tap
      setStep(2);
      
      setTimeout(() => {
        window.location.href = '/project';
      }, 2200);
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid credentials or database offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full bg-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-800">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">The Cryptic Space</h2>
          <p className="text-xs text-slate-400 mt-1.5">Industrial Training Portal Management Core</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Corporate Email</label>
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-slate-200 outline-none transition-all"
                placeholder="something@gmail.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Security Password</label>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-slate-200 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition-colors mt-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Verify Identity'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6 py-4">
            <div className="flex justify-center">
              <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 animate-pulse border border-indigo-500/20 text-2xl">
                🔑
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">YubiKey Hardware Required</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Hardware validation asset signature requested. Touch the flashing gold contact point on your security key to complete login clearance.
              </p>
            </div>
            <div className="text-[11px] text-slate-500 italic animate-bounce">
              Waiting for hardware verification handshake signal...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;