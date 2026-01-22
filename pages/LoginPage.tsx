
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { Lock, User, ArrowRight, ShieldCheck, Zap, Hexagon, KeyRound } from 'lucide-react';
import { Logo } from '../components/Logo';
import { getStoredData, DEFAULT_SETTINGS } from '../services/dataService';
import { AppSettings } from '../types';
import { ThemeEngine } from '../components/ThemeEngine';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const navigate = useNavigate();

  useEffect(() => {
      const storedSettings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
      setSettings(storedSettings);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Simulate network delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));

    const user = login(username, password);
    if (user) {
      onLogin();
      navigate('/');
    } else {
      setError('Akses Ditolak: Kredensial tidak valid.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <ThemeEngine settings={settings} />
      
      {/* --- Cyberpunk/Futuristic Background --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
          
          {/* Glowing Orbs */}
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[120px] animate-pulse"></div>
          
          {/* Moving Light Beam */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent opacity-50 blur-sm"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
          {/* Logo Section Floating Above */}
          <div className="flex justify-center mb-8">
              <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
                  <div className="relative w-20 h-20 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 shadow-2xl">
                      <Logo className="w-12 h-12" src={settings.logoUrl} />
                  </div>
              </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl ring-1 ring-white/10 relative overflow-hidden">
              {/* Card Header */}
              <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
                      {settings.companyName || "System Login"}
                  </h1>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
                      Secure Access Portal
                  </p>
              </div>

              {/* Error Message */}
              {error && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-400 text-xs font-bold animate-pulse">
                      <ShieldCheck size={16} />
                      {error}
                  </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-4">
                      <div className="group">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Identity</label>
                          <div className="relative">
                              <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                                  <User size={18} />
                              </div>
                              <input
                                  type="text"
                                  className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                                  placeholder="Username ID"
                                  value={username}
                                  onChange={(e) => setUsername(e.target.value)}
                              />
                          </div>
                      </div>

                      <div className="group">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Security Key</label>
                          <div className="relative">
                              <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                                  <KeyRound size={18} />
                              </div>
                              <input
                                  type="password"
                                  className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                                  placeholder="••••••••"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                              />
                          </div>
                      </div>
                  </div>

                  <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
                  >
                      {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                          <>
                              Authenticate <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </>
                      )}
                  </button>
              </form>

              {/* Footer Decor */}
              <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                  <div className="flex justify-center items-center gap-4 text-slate-600">
                      <Hexagon size={16} />
                      <span className="text-[10px] font-mono">ENCRYPTED CONNECTION</span>
                      <Zap size={16} />
                  </div>
              </div>
          </div>
          
          <p className="text-center text-slate-600 text-[10px] mt-6 font-mono">
              © {new Date().getFullYear()} {settings.companyName}. All Rights Reserved.
          </p>
      </div>
    </div>
  );
};

export default LoginPage;
