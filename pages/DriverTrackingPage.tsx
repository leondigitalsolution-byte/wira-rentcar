
import React, { useState, useEffect } from 'react';
import { Booking, Driver, Car, AppSettings, BookingStatus } from '../types';
import { getStoredData, DEFAULT_SETTINGS } from '../services/dataService';
import { MapPin, Phone, Calendar, Clock, Car as CarIcon, User, List, Map as MapIcon, Navigation, Battery, Signal, CheckCircle, History, AlertCircle, MessageCircle, Send, ShieldCheck } from 'lucide-react';

interface Props {
    isDriverView?: boolean;
    isPartnerView?: boolean;
    driverId?: string;
    partnerId?: string;
}

// Interface for Live Location
interface LiveLocation {
    bookingId: string;
    lat: number;
    lng: number;
    speed: number;
    battery: number;
    lastUpdate: number;
    isMock: boolean;
}

const DriverTrackingPage: React.FC<Props> = ({ isDriverView = false, isPartnerView = false, driverId, partnerId }) => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [driverTab, setDriverTab] = useState<'tasks' | 'history'>('tasks');
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setBookings(getStoredData<Booking[]>('bookings', []));
    setDrivers(getStoredData<Driver[]>('drivers', []));
    setCars(getStoredData<Car[]>('cars', []));
    setSettings(getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS));
  }, []);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const isBookingActiveToday = (b: Booking) => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      const isActiveNow = now >= start && now <= end;
      
      // Update logic: Only show units that are currently running (time-wise) OR explicitly Active status.
      // Exclude Cancelled and Completed bookings.
      return (b.status === BookingStatus.ACTIVE || isActiveNow) && 
             b.status !== BookingStatus.CANCELLED && 
             b.status !== BookingStatus.COMPLETED;
  };

  // 1. Base Active Bookings (All)
  const adminActiveBookings = bookings.filter(b => isBookingActiveToday(b));

  // 2. Partner Logic: Filter active bookings ONLY for their cars
  let partnerActiveBookings: Booking[] = [];
  if (isPartnerView && partnerId) {
      const partnerCarIds = cars.filter(c => c.partnerId === partnerId).map(c => c.id);
      partnerActiveBookings = adminActiveBookings.filter(b => partnerCarIds.includes(b.carId));
  }

  // 3. Driver Logic
  const myTasks = bookings.filter(b => b.driverId === driverId && b.status !== BookingStatus.CANCELLED);
  const myActiveTasks = myTasks.filter(b => 
      b.status === BookingStatus.BOOKED || b.status === BookingStatus.ACTIVE
  ).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const myHistoryTasks = myTasks.filter(b => b.status === BookingStatus.COMPLETED);

  // DETERMINE DISPLAY DATA BASED ON ROLE
  const displayBookings = isDriverView ? myActiveTasks.filter(b => b.status === BookingStatus.ACTIVE) 
                        : isPartnerView ? partnerActiveBookings 
                        : adminActiveBookings;

  // REAL-TIME FETCHING LOGIC
  useEffect(() => {
      if (displayBookings.length === 0) return;

      const fetchLocations = async () => {
          // Simulation Logic
          setLiveLocations(prev => {
              const newLocs = displayBookings.map(b => {
                  const existing = prev.find(p => p.bookingId === b.id);
                  const car = cars.find(c => c.id === b.carId);
                  
                  if (existing) {
                      return {
                          ...existing,
                          lat: existing.lat + (Math.random() - 0.5) * 0.001,
                          lng: existing.lng + (Math.random() - 0.5) * 0.001,
                          speed: Math.floor(Math.random() * 60) + 20,
                          lastUpdate: Date.now(),
                          isMock: settings.gpsProvider === 'Simulation'
                      };
                  } else {
                      return {
                          bookingId: b.id,
                          lat: -6.200000 + (Math.random() * 0.1), // Jakarta area mock
                          lng: 106.816666 + (Math.random() * 0.1),
                          speed: 40,
                          battery: 85 + Math.floor(Math.random() * 15),
                          lastUpdate: Date.now(),
                          isMock: settings.gpsProvider === 'Simulation'
                      };
                  }
              });
              return newLocs;
          });
      };

      const timer = setInterval(fetchLocations, 5000);
      fetchLocations();
      return () => clearInterval(timer);
  }, [displayBookings.length, isDriverView, isPartnerView, settings.gpsProvider]);

  const handleWhatsApp = (phone: string, name: string, type: 'driver' | 'customer') => {
      if (!phone) return;
      const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '62');
      let text = '';
      if (type === 'driver') {
          text = `Halo ${name}, Admin ${settings.companyName} here. Bagaimana status perjalanan dan kondisi unit?`;
      } else {
          text = `Halo Kak ${name}, ini dari Admin ${settings.companyName}. Semoga perjalanan Anda nyaman.`;
      }
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };


  // --- DRIVER VIEW RENDER ---
  if (isDriverView) {
      return (
          <div className="space-y-6">
              <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-bold text-slate-800">Halo, Driver 👋</h2>
                  <p className="text-slate-500 text-sm">Berikut adalah jadwal tugas dan riwayat perjalanan Anda.</p>
              </div>
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button onClick={() => setDriverTab('tasks')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${driverTab === 'tasks' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      <Navigation size={16} /> Tugas Aktif
                  </button>
                  <button onClick={() => setDriverTab('history')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${driverTab === 'history' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      <History size={16} /> Riwayat
                  </button>
              </div>
              {driverTab === 'tasks' && (
                  <div className="space-y-4">
                      {myActiveTasks.length === 0 ? (
                          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                              <p className="text-slate-500 font-medium">Tidak ada tugas aktif.</p>
                          </div>
                      ) : (
                          myActiveTasks.map(booking => {
                              const car = cars.find(c => c.id === booking.carId);
                              const isRunning = booking.status === BookingStatus.ACTIVE;
                              const loc = liveLocations.find(l => l.bookingId === booking.id);
                              return (
                                  <div key={booking.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden relative ${isRunning ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200'}`}>
                                      {isRunning && (
                                          <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 flex justify-between items-center">
                                              <span className="flex items-center gap-1 animate-pulse"><Navigation size={12}/> SEDANG BERJALAN (LIVE)</span>
                                              {loc && <span className="font-mono">{loc.speed} km/h</span>}
                                          </div>
                                      )}
                                      <div className="p-5 space-y-4">
                                          <div className="flex justify-between items-start">
                                              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                  <Calendar size={16} className="text-indigo-500"/>
                                                  {new Date(booking.startDate).toLocaleDateString('id-ID')}
                                                  <span className="text-slate-300">|</span>
                                                  <Clock size={16} className="text-indigo-500"/>
                                                  {new Date(booking.startDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                              </div>
                                              <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${booking.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{booking.status}</span>
                                          </div>
                                          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200"><CarIcon size={24} /></div>
                                              <div><h3 className="font-bold text-slate-800">{car?.name}</h3><p className="text-xs font-mono text-slate-500 bg-white px-1 rounded border inline-block mt-1">{car?.plate}</p></div>
                                          </div>
                                          <div className="border-t border-slate-100 pt-3">
                                              <div className="grid grid-cols-2 gap-4">
                                                  <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Tamu</p><p className="text-sm font-semibold text-slate-800 flex items-center gap-1"><User size={14}/> {booking.customerName}</p></div>
                                                  <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Tujuan</p><p className="text-sm font-semibold text-slate-800 flex items-center gap-1"><MapPin size={14} className="text-red-500"/> {booking.destination}</p></div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })
                      )}
                  </div>
              )}
              {driverTab === 'history' && (
                  <div className="space-y-3">
                      {myHistoryTasks.map(booking => {
                          const car = cars.find(c => c.id === booking.carId);
                          return (
                              <div key={booking.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 opacity-75">
                                  <div className="flex justify-between items-center border-b pb-2"><div className="flex items-center gap-2 text-sm font-medium"><Calendar size={14}/> {new Date(booking.startDate).toLocaleDateString('id-ID')}</div><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">SELESAI</span></div>
                                  <div className="flex items-center justify-between"><div><p className="font-bold text-slate-800">{car?.name}</p><p className="text-xs text-slate-500">{car?.plate}</p></div><div className="text-right"><p className="text-xs text-slate-400">Tujuan</p><p className="text-sm font-medium">{booking.destination}</p></div></div>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      );
  }

  // --- ADMIN & PARTNER VIEW RENDER ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Tracking Unit {isPartnerView ? '(Milik Saya)' : ''}</h2>
          <p className="text-slate-500">Monitor lokasi {isPartnerView ? 'unit kendaraan anda' : 'armada'} secara real-time.</p>
        </div>
        
        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <List size={18} /> List
            </button>
            <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <MapIcon size={18} /> Map
            </button>
        </div>
      </div>
      
      {!isPartnerView && settings.gpsProvider !== 'Simulation' && (
          <div className="bg-green-50 text-green-800 px-4 py-2 rounded-lg border border-green-200 text-sm flex items-center gap-2">
              <Signal size={16} className="animate-pulse"/> Terhubung ke GPS Server: <strong>{settings.gpsProvider}</strong>
          </div>
      )}

      {viewMode === 'map' ? (
        <div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 h-[600px] relative">
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
            <div className="absolute inset-0 border-t border-l border-slate-800 opacity-30 grid grid-cols-4 grid-rows-4">{[...Array(16)].map((_, i) => <div key={i} className="border-r border-b border-slate-800"></div>)}</div>

            <div className="absolute top-4 left-4 z-10 bg-slate-800/90 backdrop-blur text-white p-3 rounded-lg border border-slate-600 shadow-lg">
                <h4 className="font-bold text-sm flex items-center gap-2"><Navigation size={16} className="text-green-400" /> Unit Aktif: {displayBookings.length}</h4>
            </div>

            {displayBookings.map(booking => {
                const driver = drivers.find(d => d.id === booking.driverId);
                const car = cars.find(c => c.id === booking.carId);
                const loc = liveLocations.find(l => l.bookingId === booking.id) || { lat: 50, lng: 50, speed: 0, battery: 0 };
                
                return (
                    <div key={booking.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all duration-1000 ease-linear" style={{ top: `${loc.lat}%`, left: `${loc.lng}%` }}>
                        <div className="absolute -inset-4 bg-green-500 rounded-full opacity-30 animate-ping"></div>
                        <div className="relative bg-white p-1 rounded-full border-2 border-indigo-600 shadow-lg z-20">
                            <img src={isPartnerView ? car?.image : (driver?.image || car?.image)} className="w-8 h-8 rounded-full object-cover" alt="Unit" />
                        </div>

                        {/* Tooltip Logic: Partner View Hides People */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none text-slate-800">
                            <div className="text-xs font-bold text-slate-800 mb-1">{car?.name}</div>
                            <div className="text-[10px] text-slate-500 mb-2">{car?.plate}</div>
                            
                            {!isPartnerView && (
                                <div className="space-y-1 border-t border-slate-100 pt-2 mt-1">
                                    <div className="text-[10px] flex justify-between"><span className="text-slate-500">Penyewa:</span><span className="font-bold">{booking.customerName.split(' ')[0]}</span></div>
                                    <div className="text-[10px] flex justify-between"><span className="text-slate-500">Driver:</span><span className="font-bold">{driver?.name || 'Lepas Kunci'}</span></div>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-[10px] text-slate-600 border-t border-slate-100 pt-2 mt-2">
                                <span className="flex items-center gap-1"><Navigation size={10} /> {loc.speed} km/h</span>
                                <span className="flex items-center gap-1"><Battery size={10} className="text-green-600"/> {loc.battery}%</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      ) : (
        /* List View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayBookings.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <Navigation size={48} className="mx-auto text-slate-300 mb-4"/>
                    <p className="text-slate-500 font-medium">Tidak ada unit yang aktif berjalan.</p>
                </div>
            )}

            {displayBookings.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(booking => {
                const driver = drivers.find(d => d.id === booking.driverId);
                const car = cars.find(c => c.id === booking.carId);
                const isNow = new Date(booking.startDate) <= now && new Date(booking.endDate) >= now;
                const loc = liveLocations.find(l => l.bookingId === booking.id) || { speed: 0, battery: 0 };

                return (
                    <div key={booking.id} className={`rounded-xl shadow-sm border overflow-hidden flex flex-col ${isNow || booking.status === BookingStatus.ACTIVE ? 'bg-white border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-slate-200'}`}>
                        <div className={`px-4 py-2 text-xs font-bold flex justify-between items-center ${isNow || booking.status === BookingStatus.ACTIVE ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-600'}`}>
                            <span className="flex items-center gap-1">
                                {(isNow || booking.status === BookingStatus.ACTIVE) ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> : <Clock size={12}/>}
                                {(isNow || booking.status === BookingStatus.ACTIVE) ? 'SEDANG BERJALAN' : 'AKAN DATANG'}
                            </span>
                            <span className="font-mono">{booking.id.slice(0,6)}</span>
                        </div>

                        <div className="p-5 flex-1 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <CarIcon size={24} className="text-slate-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{car?.name}</h3>
                                    <p className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded inline-block text-slate-600 border border-slate-200">{car?.plate}</p>
                                    {car?.gpsDeviceId && (
                                        <p className="text-[10px] text-green-600 flex items-center gap-1 mt-1">
                                            <Signal size={10} /> GPS ID: {car.gpsDeviceId}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* PARTNER VIEW: HIDE CUSTOMER/DRIVER */}
                            {!isPartnerView && (
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Penyewa</p>
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-slate-400"/>
                                            <span className="text-sm font-semibold text-slate-700 truncate">{booking.customerName.split(' ')[0]}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Driver</p>
                                        <div className="flex items-center gap-2">
                                            {driver ? (
                                                <>
                                                    <img src={driver.image} className="w-4 h-4 rounded-full" />
                                                    <span className="text-sm font-semibold text-slate-700 truncate">{driver.name.split(' ')[0]}</span>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">Lepas Kunci</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(isNow || booking.status === BookingStatus.ACTIVE) && (
                                <div className="bg-slate-900 rounded-lg p-3 text-green-400 font-mono text-xs flex justify-between items-center shadow-inner">
                                    <div className="flex gap-4">
                                        <span>SPD: {loc.speed} KM/H</span>
                                        <span className={loc.battery < 20 ? 'text-red-500 animate-pulse' : 'text-green-400'}>BAT: {loc.battery}%</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">LIVE</span>
                                </div>
                            )}
                        </div>

                        {/* Buttons: Only for Admin */}
                        {!isPartnerView && (
                            <div className="grid grid-cols-2 gap-px bg-slate-100 border-t border-slate-200">
                                {driver && (
                                    <button onClick={() => handleWhatsApp(driver.phone, driver.name, 'driver')} className="py-3 bg-white hover:bg-green-50 text-slate-600 hover:text-green-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                                        <MessageCircle size={16} /> Chat Driver
                                    </button>
                                )}
                                <button onClick={() => handleWhatsApp(booking.customerPhone, booking.customerName, 'customer')} className={`py-3 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${!driver ? 'col-span-2' : ''}`}>
                                    <Send size={16} /> Chat Penyewa
                                </button>
                            </div>
                        )}
                        {/* Status Footer for Partner */}
                        {isPartnerView && (
                            <div className="bg-slate-50 border-t border-slate-200 py-2 px-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                                <ShieldCheck size={12} className="text-green-600"/> Status Aman Terkendali
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
};

export default DriverTrackingPage;
