
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Booking, BookingStatus, Car, PaymentStatus, AppSettings, Transaction } from '../types';
import { getStoredData, DEFAULT_SETTINGS } from '../services/dataService';
import { getCurrentUser } from '../services/authService';
import { AlertCircle, CheckCircle, TrendingUp, Car as CarIcon, Clock, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Map, Grid, User as UserIcon, Wallet, PieChart, UserCircle, Settings, Users, Percent, Filter, Navigation, CalendarRange, TrendingDown, Receipt, CalendarClock, UserCog, X, Calculator, Building, ReceiptText, HelpCircle } from 'lucide-react';
// @ts-ignore
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';

// --- MOBILE COMPONENTS ---

const MobileHeader = ({ user, settings }: { user: any, settings: AppSettings }) => (
    <div className="flex items-center justify-between mb-6">
        <div>
             <h1 className="font-bold text-slate-800 text-lg leading-tight">Halo, {user?.name?.split(' ')[0]} 👋</h1>
             <p className="text-xs text-slate-500">Selamat datang kembali</p>
        </div>
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100">
             <Logo className="w-full h-full p-1.5" src={settings.logoUrl} />
        </div>
    </div>
);

const MenuItem = ({ icon: Icon, label, onClick, to, state }: any) => {
    const navigate = useNavigate();
    const handleClick = () => {
        if (onClick) onClick();
        if (to) navigate(to, { state: state });
    };

    return (
        <button onClick={handleClick} className="flex flex-col items-center gap-2 p-1 active:scale-95 transition-transform w-full">
            <div className="w-14 h-14 bg-red-50 text-red-600 border border-red-100 rounded-2xl flex items-center justify-center shadow-sm">
                <Icon size={26} strokeWidth={1.5} />
            </div>
            <span className="text-xs font-medium text-slate-700 text-center leading-tight truncate w-full px-1">{label}</span>
        </button>
    );
};

// --- MAIN DASHBOARD ---

const Dashboard = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [user, setUser] = useState<any>(null);
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCarFilter, setSelectedCarFilter] = useState<string>('All');

  // Mobile Menu State
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    const loadedBookings = getStoredData<Booking[]>('bookings', []);
    const loadedCars = getStoredData<Car[]>('cars', []);
    const loadedTx = getStoredData<Transaction[]>('transactions', []);
    setBookings(loadedBookings);
    setCars(loadedCars);
    setTransactions(loadedTx);
    setSettings(getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS));
    setUser(getCurrentUser());

    // Prepare chart data (Revenue last 7 days) - Only for Admin
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const data = last7Days.map(date => {
      const dailyTotal = loadedBookings
        .filter(b => b.startDate.startsWith(date) && b.status !== BookingStatus.CANCELLED)
        .reduce((sum, b) => sum + b.totalPrice, 0);
      return {
        name: new Date(date).toLocaleDateString('id-ID', { weekday: 'short' }),
        total: dailyTotal
      };
    });
    setChartData(data);
  }, []);

  const isDriver = user?.role === 'driver';
  const isPartner = user?.role === 'partner';
  
  // --- DATA FILTERING LOGIC ---

  // 1. Filter Cars based on Role
  const myCars = isPartner 
    ? cars.filter(c => c.partnerId === user?.linkedPartnerId)
    : cars;

  // 2. Filter Bookings based on Role
  let myBookings = bookings;
  if (isDriver) {
      myBookings = bookings.filter(b => b.driverId === user?.linkedDriverId && b.status !== BookingStatus.CANCELLED);
  } else if (isPartner) {
      const partnerCarIds = myCars.map(c => c.id);
      myBookings = bookings.filter(b => partnerCarIds.includes(b.carId) && b.status !== BookingStatus.CANCELLED);
  } else {
      // Admin sees active/booked/completed (excludes cancelled from main view usually, but we keep all for admin except logic below)
      myBookings = bookings;
  }

  // --- STATS CALCULATION ---

  const activeUnits = myBookings.filter(b => b.status === BookingStatus.ACTIVE).length;

  const upcomingReturns = myBookings.filter(b => {
      if(b.status !== BookingStatus.ACTIVE) return false;
      const end = new Date(b.endDate);
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      return diff > 0 && diff < 86400000;
  }).length;
  
  // For Driver: "Total Tasks This Month"
  // For Partner/Admin: "Today's Revenue" (Omset Hari Ini from THEIR bookings)
  const driverMonthTasks = myBookings.filter(b => {
      const bDate = new Date(b.startDate);
      const now = new Date();
      return bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear();
  }).length;

  const todayRevenue = myBookings
    .filter(b => {
        const today = new Date().toISOString().split('T')[0];
        return b.startDate.startsWith(today) && b.status !== BookingStatus.CANCELLED;
    })
    .reduce((sum, b) => sum + b.totalPrice, 0);

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
    
    const days = [];
    // Empty slots for previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(null);
    }
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }
    return days;
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const isToday = (date: Date) => {
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
  };

  // Filter Bookings for Calendar
  const getCalendarBookings = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      return myBookings.filter(b => {
          const start = b.startDate.split('T')[0];
          const end = b.endDate.split('T')[0];
          
          const inRange = dateStr >= start && dateStr <= end;
          const notCancelled = b.status !== BookingStatus.CANCELLED;
          
          if (selectedCarFilter === 'All') {
              return inRange && notCancelled;
          } else {
              return inRange && notCancelled && b.carId === selectedCarFilter;
          }
      });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Mobile Header (Hidden on Desktop) */}
      <div className="md:hidden">
          <MobileHeader user={user} settings={settings} />
      </div>

      {/* Mobile Quick Actions Grid */}
      <div className="md:hidden">
          <h3 className="font-bold text-slate-800 mb-3">Menu Cepat</h3>
          <div className="grid grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              {isDriver ? (
                  <>
                    <MenuItem to="/expenses" icon={Wallet} label="Klaim" />
                    <MenuItem to="/drivers" icon={UserCircle} label="Profil" />
                    <MenuItem to="/settings" icon={Settings} label="Akun" />
                    <MenuItem to="/help" icon={HelpCircle} label="Bantuan" />
                  </>
              ) : isPartner ? (
                  <>
                    <MenuItem to="/fleet" icon={CarIcon} label="Unit Saya" />
                    <MenuItem to="/partners" icon={Wallet} label="Pendapatan" />
                    <MenuItem to="/expenses" icon={Receipt} label="Riwayat" />
                    <MenuItem icon={Grid} label="Lainnya" onClick={() => setIsMoreMenuOpen(true)} />
                  </>
              ) : (
                  <>
                    <MenuItem to="/booking" icon={CalendarRange} label="Booking" />
                    <MenuItem to="/expenses" state={{ action: 'create' }} icon={TrendingDown} label="Pengeluaran" />
                    <MenuItem to="/fleet" icon={CarIcon} label="Armada" />
                    <MenuItem to="/customers" icon={Users} label="Pelanggan" />
                    
                    <MenuItem to="/expenses" icon={Wallet} label="Keuangan" />
                    <MenuItem to="/calculator" icon={Calculator} label="Kalkulator" />
                    <MenuItem to="/statistics" icon={PieChart} label="Statistik" />
                    <MenuItem icon={Grid} label="Lainnya" onClick={() => setIsMoreMenuOpen(true)} />
                  </>
              )}
          </div>
      </div>

      {/* MORE MENU MODAL */}
      {isMoreMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg text-slate-800">Menu Lainnya</h3>
                      <button onClick={() => setIsMoreMenuOpen(false)} className="p-1 rounded-full bg-slate-100 text-slate-500 hover:text-red-600"><X size={20}/></button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      {isPartner ? (
                          <>
                            <MenuItem to="/settings" icon={Settings} label="Akun" onClick={() => setIsMoreMenuOpen(false)} />
                            <MenuItem to="/help" icon={HelpCircle} label="Bantuan" onClick={() => setIsMoreMenuOpen(false)} />
                          </>
                      ) : (
                          <>
                            <MenuItem to="/collective-invoice" icon={ReceiptText} label="Inv. Kolektif" onClick={() => setIsMoreMenuOpen(false)} />
                            <MenuItem to="/vendors" icon={Building} label="Vendor" onClick={() => setIsMoreMenuOpen(false)} />
                            <MenuItem to="/drivers" icon={UserCircle} label="Driver" onClick={() => setIsMoreMenuOpen(false)} />
                            
                            <MenuItem to="/partners" icon={UserCog} label="Mitra" onClick={() => setIsMoreMenuOpen(false)} />
                            <MenuItem to="/high-season" icon={CalendarClock} label="Highseason" onClick={() => setIsMoreMenuOpen(false)} />
                            <MenuItem to="/settings" icon={Settings} label="Setting" onClick={() => setIsMoreMenuOpen(false)} />
                            <div className="col-span-3 border-t border-slate-100 pt-2 mt-2">
                                <MenuItem to="/help" icon={HelpCircle} label="Pusat Bantuan" onClick={() => setIsMoreMenuOpen(false)} />
                            </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Calendar Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <div className="flex items-center gap-4">
                  <h3 className="font-bold text-slate-800">Kalender {isDriver ? 'Tugas Saya' : 'Booking'}</h3>
                  <div className="flex items-center bg-slate-100 rounded-lg p-1">
                      <button onClick={prevMonth} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronLeft size={18}/></button>
                      <span className="px-3 text-sm font-bold text-slate-700 w-32 text-center">
                          {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={nextMonth} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronRight size={18}/></button>
                  </div>
                  <button onClick={goToToday} className="text-xs text-indigo-600 font-bold hover:underline">Hari Ini</button>
              </div>

              {/* Car Filter Dropdown */}
              {!isDriver && (
                  <div className="flex items-center gap-2 w-full md:w-auto">
                      <Filter size={16} className="text-slate-400" />
                      <select 
                          className="border rounded px-2 py-1.5 text-sm text-slate-600 bg-white w-full md:w-48"
                          value={selectedCarFilter}
                          onChange={e => setSelectedCarFilter(e.target.value)}
                      >
                          <option value="All">Semua Mobil</option>
                          {/* LIST CARS BASED ON ROLE (Admin=All, Partner=MyCars) */}
                          {myCars.map(c => (
                              <option key={c.id} value={c.id}>{c.name} - {c.plate}</option>
                          ))}
                      </select>
                  </div>
              )}
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                  <div key={day} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase">
                      {day}
                  </div>
              ))}
              {getDaysInMonth(currentDate).map((date, idx) => {
                  const dayBookings = date ? getCalendarBookings(date) : [];
                  const isTodayDate = date ? isToday(date) : false;

                  return (
                      <div key={idx} className={`bg-white min-h-[80px] p-1 md:p-2 relative ${isTodayDate ? 'bg-blue-50/50' : ''}`}>
                          {date && (
                              <>
                                  <span className={`text-xs font-medium mb-1 block ${isTodayDate ? 'bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center font-bold mx-auto md:mx-0' : 'text-slate-400'}`}>
                                      {date.getDate()}
                                  </span>
                                  <div className="space-y-1 overflow-y-auto max-h-[60px] custom-scrollbar">
                                      {dayBookings.map(b => {
                                          const car = cars.find(c => c.id === b.carId);
                                          return (
                                              <div key={b.id} className={`text-[9px] md:text-[10px] px-1.5 py-0.5 rounded truncate border-l-2 ${
                                                  b.status === 'Completed' ? 'bg-blue-50 border-blue-400 text-blue-700' :
                                                  b.status === 'Active' ? 'bg-green-50 border-green-400 text-green-700' :
                                                  'bg-slate-100 border-slate-400 text-slate-600'
                                              }`}>
                                                  {isDriver ? `${b.destination}` : car?.name}
                                              </div>
                                          );
                                      })}
                                  </div>
                              </>
                          )}
                      </div>
                  );
              })}
          </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{isDriver ? 'Tugas Sedang Jalan' : 'Unit Sedang Jalan'}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeUnits}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <CarIcon size={24} />
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{isDriver ? 'Kembali Hari Ini' : 'Kembali Hari Ini'}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{upcomingReturns}</h3>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                <Clock size={24} />
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{isDriver ? 'Tugas Bulan Ini' : 'Omset Hari Ini'}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{isDriver ? driverMonthTasks : `Rp ${(todayRevenue/1000).toFixed(0)}k`}</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <TrendingUp size={24} />
            </div>
        </div>
      </div>

      {/* Chart Section - HIDE FOR DRIVER AND PARTNER (To keep Partner view simple like Driver) */}
      {!isDriver && !isPartner && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
            <h3 className="font-bold text-slate-800 mb-4">Grafik Pendapatan (7 Hari)</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#DC2626" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(val) => `${val/1000}k`} />
                        <Tooltip contentStyle={{borderRadius: '8px'}} formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
                        <Area type="monotone" dataKey="total" stroke="#DC2626" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>
      )}

      {/* Recent Bookings List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{isDriver ? 'Tugas Terbaru' : 'Booking Terbaru'}</h3>
              <Link to={isDriver ? "/expenses" : "/booking"} className="text-xs text-indigo-600 font-bold hover:underline">Lihat Semua</Link>
          </div>
          <div className="divide-y divide-slate-100">
              {myBookings.slice(0, 5).map(booking => {
                  const car = cars.find(c => c.id === booking.carId);
                  return (
                      <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${booking.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                  <CarIcon size={18} />
                              </div>
                              <div>
                                  <p className="font-bold text-sm text-slate-800">{isDriver ? booking.destination : booking.customerName}</p>
                                  <p className="text-xs text-slate-500">{new Date(booking.startDate).toLocaleDateString('id-ID')} • {isDriver ? car?.name : booking.destination}</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                                  booking.status === 'Active' ? 'bg-green-100 text-green-700' : 
                                  booking.status === 'Completed' ? 'bg-blue-100 text-blue-700' : 
                                  booking.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                              }`}>
                                  {booking.status}
                              </span>
                          </div>
                      </div>
                  );
              })}
              {myBookings.length === 0 && (
                  <div className="p-8 text-center text-slate-500 text-sm">Belum ada data tugas.</div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
