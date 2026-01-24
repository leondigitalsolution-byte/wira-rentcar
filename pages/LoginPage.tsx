
import React, { useState, useEffect } from 'react';
// @ts-ignore
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
    <div className="min-h-screen bg-[#020617] flex font-sans overflow-hidden">
      <ThemeEngine settings={settings} />
      
      {/* --- LEFT SIDE: BIG LOGO VISUAL (60%) --- */}
      <div className="hidden lg:flex flex-1 relative justify-center items-center bg-[#020617] overflow-hidden flex-col">
          {/* Cyberpunk/Futuristic Background */}
          <div className="absolute inset-0 pointer-events-none">
              {/* Grid Pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
              
              {/* Glowing Orbs */}
              <div className="absolute top-[-10%] right-[-10%] w-[1000px] h-[1000px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse"></div>
              <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[150px] animate-pulse delay-700"></div>
              
              {/* Moving Light Beam */}
              <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent opacity-50 blur-sm"></div>
          </div>

          {/* WELCOME TEXT - FUTURISTIC EFFECT */}
          <div className="relative z-10 text-center mb-28 animate-fade-in group/text">
              <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-50 to-slate-400 drop-shadow-[0_0_35px_rgba(6,182,212,0.6)] group-hover/text:scale-105 transition-transform duration-500 cursor-default select-none">
                  WELCOME BACK!
              </h1>
              {/* Decorative HUD Elements */}
              <div className="flex items-center justify-center gap-4 mt-6">
                  <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-cyan-500/80"></div>
                  <div className="px-4 py-1.5 border border-cyan-500/30 rounded-full bg-cyan-950/30 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <span className="text-cyan-400 text-[10px] font-mono tracking-[0.3em] uppercase block animate-pulse">
                        <Zap size={10} className="inline mr-2 -mt-0.5" />System Online
                    </span>
                  </div>
                  <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-cyan-500/80"></div>
              </div>
          </div>

          {/* GIANT LOGO CONTAINER */}
          <div className="relative z-10 animate-fade-in group">
              {/* Outer Glow */}
              <div className="absolute -inset-8 bg-gradient-to-tr from-cyan-500/40 via-blue-600/40 to-purple-600/40 rounded-[4rem] blur-2xl opacity-40 group-hover:opacity-70 transition duration-1000 animate-pulse"></div>
              
              {/* Logo Box (2.5x larger than original w-32 -> w-96) */}
              <div className="relative w-96 h-96 bg-slate-900/60 backdrop-blur-2xl rounded-[3rem] flex items-center justify-center border border-slate-700/50 shadow-2xl ring-1 ring-white/10">
                  {/* Logo Icon (2.5x larger than original w-20 -> w-64) */}
                  <Logo className="w-64 h-64 drop-shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-transform duration-500 group-hover:scale-105" src={settings.logoUrl} />
              </div>
          </div>
      </div>

      {/* --- RIGHT SIDE: FORM LOGIN (40%) --- */}
      <div className="w-full lg:w-[40%] xl:w-[35%] flex flex-col justify-center px-8 sm:px-12 py-12 relative z-20 bg-slate-900/90 backdrop-blur-xl border-l border-slate-800 shadow-2xl h-screen overflow-y-auto custom-scrollbar">
          
          {/* Mobile Logo (Only visible on small screens) */}
          <div className="lg:hidden flex justify-center mb-8">
             <div className="w-24 h-24 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shadow-lg relative group">
                 <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-30"></div>
                 <Logo className="w-14 h-14 relative z-10" src={settings.logoUrl} />
             </div>
          </div>

          <div className="max-w-md mx-auto w-full">
              {/* Header Text */}
              <div className="mb-12 text-center lg:text-left">
                  <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-2 leading-tight">
                      {settings.companyName || "System Login"}
                  </h1>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center lg:justify-start gap-2">
                      <ShieldCheck size={16} className="text-cyan-500"/> Secure Access Portal
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
              <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-5">
                      <div className="group">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Identity</label>
                          <div className="relative">
                              <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                                  <User size={18} />
                              </div>
                              <input
                                  type="text"
                                  className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
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
                                  className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
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
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group mt-4"
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
              <div className="mt-16 pt-6 border-t border-slate-800">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-slate-600">
                      <div className="flex items-center gap-2">
                          <Hexagon size={14} />
                          <span className="text-[10px] font-mono">ENCRYPTED CONNECTION</span>
                      </div>
                      <p className="text-[10px] font-mono opacity-60">
                          © {new Date().getFullYear()} {settings.companyName}.
                      </p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default LoginPage;
