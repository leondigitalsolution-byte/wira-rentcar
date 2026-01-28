
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Car, CalendarRange, Users, Wallet, RefreshCw, FileText, Palette, List, HelpCircle, Map, ChevronLeft, Calculator, Building, ReceiptText, UserCircle, UserCog, CalendarClock, Settings, LogOut, Receipt, PieChart } from 'lucide-react';
import { initializeData, getStoredData, DEFAULT_SETTINGS } from './services/dataService';
import { getCurrentUser, logout } from './services/authService';
import { User, AppSettings } from './types';
import { Logo, LogoText } from './components/Logo';
import { ThemeEngine } from './components/ThemeEngine';
import Dashboard from './pages/Dashboard';
import BookingPage from './pages/BookingPage';
import FleetPage from './pages/FleetPage';
import PartnersPage from './pages/PartnersPage';
import DriversPage from './pages/DriversPage';
import VendorsPage from './pages/VendorsPage';
import HighSeasonPage from './pages/HighSeasonPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';
import LoginPage from './pages/LoginPage';
import CustomersPage from './pages/CustomersPage';
import ExpensesPage from './pages/ExpensesPage';
import StatisticsPage from './pages/StatisticsPage';
import CalculatorPage from './pages/CalculatorPage';
import CollectiveInvoicePage from './pages/CollectiveInvoicePage';

const SidebarItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'}`}>
      <Icon size={18} />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
};

const BottomNavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link to={to} className={`flex flex-col items-center justify-center p-2 flex-1 transition-colors ${isActive ? 'text-red-600' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>
      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </Link>
  );
};

interface AppLayoutProps {
  children?: React.ReactNode;
  user: User;
  onLogout: () => void;
}

const AppLayout = ({ children, user, onLogout }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const isSuperAdmin = user.role === 'superadmin';
  const isStaff = user.role === 'admin';
  const isDriver = user.role === 'driver';
  const isPartner = user.role === 'partner';
  
  const isOperational = isStaff || isSuperAdmin;
  const isHome = location.pathname === '/';

  useEffect(() => {
    const loadedSettings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    setSettings(loadedSettings);
  }, []);

  const handleRefresh = async () => {
      setIsRefreshing(true);
      await initializeData();
      setIsRefreshing(false);
      window.location.reload(); 
  };

  const getPageTitle = () => {
      switch(location.pathname) {
          case '/booking': return 'Booking';
          case '/fleet': return 'Armada';
          case '/partners': return isPartner ? 'Saldo Saya' : 'Investor';
          case '/vendors': return 'Vendor';
          case '/drivers': return isDriver ? 'Profil' : 'Driver';
          case '/customers': return 'Pelanggan';
          case '/expenses': return isDriver ? 'Reimbursement' : 'Keuangan';
          case '/statistics': return 'Statistik';
          case '/calculator': return 'Kalkulator';
          case '/collective-invoice': return 'Invoice Kolektif';
          case '/high-season': return 'High Season';
          case '/settings': return 'Pengaturan';
          case '/help': return 'Pusat Bantuan';
          default: return settings.companyName;
      }
  };

  const UserProfile = ({ showName = true }: { showName?: boolean }) => (
      <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border border-slate-200 overflow-hidden bg-slate-100 dark:bg-slate-700 dark:border-slate-600">
             {user.image ? (
                 <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
             ) : (
                 <span className="text-slate-500 dark:text-slate-300">{user.name.charAt(0)}</span>
             )}
          </div>
          {showName && (
              <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role === 'partner' ? 'Investor' : user.role}</p>
              </div>
          )}
      </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-200">
      <ThemeEngine settings={settings} />
      
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 fixed h-full z-20">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
           <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-none text-white">
               <Logo className="w-full h-full p-1" src={settings.logoUrl} />
           </div>
           <LogoText title={settings.displayName || settings.companyName} />
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
          {isOperational && (
              <>
                <div className="mb-6">
                    <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Utama</h3>
                    <div className="space-y-1">
                        <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
                        <SidebarItem to="/booking" icon={CalendarRange} label="Booking & Jadwal" />
                        <SidebarItem to="/collective-invoice" icon={ReceiptText} label="Invoice Kolektif" />
                        <SidebarItem to="/calculator" icon={Calculator} label="Kalkulator" />
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Master Data</h3>
                    <div className="space-y-1">
                        <SidebarItem to="/fleet" icon={Car} label="Armada Mobil" />
                        <SidebarItem to="/customers" icon={Users} label="Data Pelanggan" />
                        <SidebarItem to="/drivers" icon={UserCircle} label="Data Driver" />
                        <SidebarItem to="/partners" icon={UserCog} label="Investor & Rekanan" />
                        <SidebarItem to="/vendors" icon={Building} label="Vendor" />
                        <SidebarItem to="/high-season" icon={CalendarClock} label="High Season" />
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Keuangan</h3>
                    <div className="space-y-1">
                        <SidebarItem to="/expenses" icon={Wallet} label="Keuangan" />
                        <SidebarItem to="/statistics" icon={PieChart} label="Laporan & Statistik" />
                    </div>
                </div>
              </>
          )}

          {isDriver && (
              <div className="mb-6">
                <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Menu Driver</h3>
                <div className="space-y-1">
                    <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <SidebarItem to="/expenses" icon={Wallet} label="Reimbursement" />
                    <SidebarItem to="/drivers" icon={UserCircle} label="Profil Saya" />
                </div>
              </div>
          )}

          {isPartner && (
              <div className="mb-6">
                <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Menu Investor</h3>
                <div className="space-y-1">
                    <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <SidebarItem to="/partners" icon={Wallet} label="Pendapatan" />
                    <SidebarItem to="/expenses" icon={List} label="Riwayat Setoran" />
                </div>
              </div>
          )}

          <div className="mb-6">
              <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Layanan</h3>
              <div className="space-y-1">
                  <SidebarItem to="/help" icon={HelpCircle} label="Pusat Bantuan" />
                  <SidebarItem to="/settings" icon={Settings} label="Pengaturan" />
              </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600">
                <UserProfile />
                <button onClick={onLogout} className="text-slate-400 hover:text-red-600 transition-colors p-2" title="Keluar">
                    <LogOut size={18} />
                </button>
            </div>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 w-full bg-white dark:bg-slate-800 z-30 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-between items-center pt-safe shadow-sm transition-all">
          <div className="flex items-center gap-2">
             {isHome ? (
                 <>
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white">
                        <Logo className="w-full h-full p-1" src={settings.logoUrl} />
                    </div>
                    <span className="font-black text-lg text-slate-800 dark:text-white tracking-tight">{settings.displayName || settings.companyName.split(' ')[0]}</span>
                 </>
             ) : (
                 <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-700 dark:text-white active:opacity-70">
                     <div className="p-1 rounded-full bg-slate-100 dark:bg-slate-700"><ChevronLeft size={24} /></div>
                     <span className="font-bold text-lg">{getPageTitle()}</span>
                 </button>
             )}
          </div>
          
          <div className="flex items-center gap-3">
              <button onClick={handleRefresh} className={`p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}>
                  <RefreshCw size={20} />
              </button>
              <div className="relative">
                  <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                      <UserProfile showName={false} />
                  </button>
                  {isProfileMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1 animate-in fade-in zoom-in-95 duration-200">
                          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role === 'partner' ? 'Investor' : user.role}</p>
                          </div>
                          <Link to="/settings" className="block px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => setIsProfileMenuOpen(false)}>Pengaturan</Link>
                          <Link to="/help" className="block px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => setIsProfileMenuOpen(false)}>Bantuan</Link>
                          <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Keluar</button>
                      </div>
                  )}
              </div>
          </div>
      </div>

      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 pb-24 md:pb-8 min-h-screen">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-30 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-end px-2 pb-2 pt-1">
          
          {isOperational ? (
              <>
                <BottomNavItem to="/booking" icon={CalendarRange} label="Booking" />
                <BottomNavItem to="/fleet" icon={Car} label="Armada" />
                
                <div className="relative -top-5 mx-1 flex flex-col items-center justify-center">
                    <Link to="/" className="flex items-center justify-center w-16 h-16 bg-red-600 rounded-full shadow-lg border-4 border-slate-100 dark:border-slate-800 text-white hover:bg-red-700 transition-transform active:scale-95">
                        <LayoutDashboard size={28} strokeWidth={2} />
                    </Link>
                </div>

                <BottomNavItem to="/expenses" icon={Wallet} label="Keuangan" />
                <BottomNavItem to="/help" icon={HelpCircle} label="Bantuan" />
              </>
          ) : isDriver ? (
              <>
                <BottomNavItem to="/" icon={LayoutDashboard} label="Home" />
                <BottomNavItem to="/expenses" icon={Wallet} label="Klaim" />
                
                <div className="relative -top-5 mx-1 flex flex-col items-center justify-center">
                    <Link to="/" className="flex items-center justify-center w-16 h-16 bg-red-600 rounded-full shadow-lg border-4 border-slate-100 dark:border-slate-800 text-white hover:bg-red-700 transition-transform active:scale-95">
                        <LayoutDashboard size={28} strokeWidth={2} />
                    </Link>
                </div>

                <BottomNavItem to="/drivers" icon={UserCircle} label="Profil" />
                <BottomNavItem to="/help" icon={HelpCircle} label="Bantuan" />
              </>
          ) : (
              <>
                <BottomNavItem to="/" icon={LayoutDashboard} label="Home" />
                <BottomNavItem to="/partners" icon={Wallet} label="Pendapatan" />
                
                <div className="relative -top-5 mx-1 flex flex-col items-center justify-center">
                    <Link to="/" className="flex items-center justify-center w-16 h-16 bg-red-600 rounded-full shadow-lg border-4 border-slate-100 dark:border-slate-800 text-white hover:bg-red-700 transition-transform active:scale-95">
                        <LayoutDashboard size={28} strokeWidth={2} />
                    </Link>
                </div>

                <BottomNavItem to="/expenses" icon={List} label="Riwayat" />
                <BottomNavItem to="/help" icon={HelpCircle} label="Bantuan" />
              </>
          )}
        </div>
      </nav>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
        await initializeData();
        const currentUser = getCurrentUser();
        setUser(currentUser);
        setIsLoading(false);
    };
    init();
  }, []);

  const handleLogin = () => {
    setUser(getCurrentUser());
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  if (isLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
              <div className="w-16 h-16 border-4 border-slate-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium animate-pulse">Memuat Sistem...</p>
          </div>
      );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <AppLayout user={user} onLogout={handleLogout}><Dashboard /></AppLayout> : <Navigate to="/login" />} />
        
        <Route path="/booking" element={
            user && (user.role === 'admin' || user.role === 'superadmin') ? <AppLayout user={user} onLogout={handleLogout}><BookingPage currentUser={user}/></AppLayout> : <Navigate to="/" />
        } />
        
        <Route path="/collective-invoice" element={
            user && (user.role === 'admin' || user.role === 'superadmin') ? <AppLayout user={user} onLogout={handleLogout}><CollectiveInvoicePage/></AppLayout> : <Navigate to="/" />
        } />

        <Route path="/calculator" element={
            user && (user.role === 'admin' || user.role === 'superadmin') ? <AppLayout user={user} onLogout={handleLogout}><CalculatorPage/></AppLayout> : <Navigate to="/" />
        } />

        <Route path="/fleet" element={
            user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'partner') ? <AppLayout user={user} onLogout={handleLogout}><FleetPage currentUser={user}/></AppLayout> : <Navigate to="/" />
        } />
        
        <Route path="/partners" element={
            user ? <AppLayout user={user} onLogout={handleLogout}><PartnersPage currentUser={user}/></AppLayout> : <Navigate to="/" />
        } />

        <Route path="/vendors" element={
            user && (user.role === 'admin' || user.role === 'superadmin') ? <AppLayout user={user} onLogout={handleLogout}><VendorsPage /></AppLayout> : <Navigate to="/" />
        } />
        
        <Route path="/drivers" element={
            user ? <AppLayout user={user} onLogout={handleLogout}><DriversPage currentUser={user}/></AppLayout> : <Navigate to="/" />
        } />
        
        <Route path="/customers" element={
            user && (user.role === 'admin' || user.role === 'superadmin') ? <AppLayout user={user} onLogout={handleLogout}><CustomersPage currentUser={user}/></AppLayout> : <Navigate to="/" />
        } />
        
        <Route path="/expenses" element={
            user ? <AppLayout user={user} onLogout={handleLogout}><ExpensesPage isDriverView={user.role === 'driver'} isPartnerView={user.role === 'partner'} /></AppLayout> : <Navigate to="/login" />
        } />
        
        <Route path="/statistics" element={
            user ? <AppLayout user={user} onLogout={handleLogout}><StatisticsPage /></AppLayout> : <Navigate to="/" />
        } />
        
        <Route path="/high-season" element={
            user && (user.role === 'admin' || user.role === 'superadmin') ? <AppLayout user={user} onLogout={handleLogout}><HighSeasonPage currentUser={user}/></AppLayout> : <Navigate to="/" />
        } />
        
        <Route path="/settings" element={
            user ? <AppLayout user={user} onLogout={handleLogout}><SettingsPage currentUser={user}/></AppLayout> : <Navigate to="/login" />
        } />

        <Route path="/help" element={
            user ? <AppLayout user={user} onLogout={handleLogout}><HelpPage currentUser={user}/></AppLayout> : <Navigate to="/login" />
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;