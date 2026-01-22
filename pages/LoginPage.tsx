
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { Lock, User } from 'lucide-react';
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
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const navigate = useNavigate();

  useEffect(() => {
      const storedSettings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
      setSettings(storedSettings);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Login function now accepts username, email, or phone
    const user = login(username, password);
    if (user) {
      onLogin();
      navigate('/');
    } else {
      setError('Data login salah. Periksa username/email/no.hp dan password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <ThemeEngine settings={settings} />
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        {/* Header - Black Background for BRC */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 rounded-full blur-3xl opacity-20 transform translate-x-10 -translate-y-10"></div>
            
            <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-xl p-3 flex items-center justify-center shadow-lg overflow-hidden">
                 <Logo className="w-full h-full" src={settings.logoUrl} />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">{settings.companyName}</h2>
            <p className="text-red-400 text-sm font-medium tracking-widest mt-1 uppercase">{settings.tagline || 'MANAGEMENT SYSTEM'}</p>
        </div>
        
        <div className="p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">Silahkan Login</h3>
            
            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center border border-red-100">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Username / Email / No. HP</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            required
                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                            placeholder="admin / user@mail.com / 0812..."
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="password"
                            required
                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                            placeholder="••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                    Masuk Aplikasi
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
