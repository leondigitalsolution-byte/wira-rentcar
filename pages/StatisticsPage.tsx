
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Booking, Car, Customer, Driver, Partner, Vendor, BookingStatus } from '../types';
import { getStoredData, exportToCSV } from '../services/dataService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line 
} from 'recharts';
import { 
  Download, Calendar, Filter, FileSpreadsheet, 
  Car as CarIcon, User, Users, Briefcase, Building, Wallet 
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const StatisticsPage = () => {
  // Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // UI States
  const [activeTab, setActiveTab] = useState<'booking' | 'fleet' | 'investor' | 'driver' | 'vendor' | 'finance'>('booking');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setTransactions(getStoredData<Transaction[]>('transactions', []));
    setBookings(getStoredData<Booking[]>('bookings', []));
    setCars(getStoredData<Car[]>('cars', []));
    setDrivers(getStoredData<Driver[]>('drivers', []));
    setPartners(getStoredData<Partner[]>('partners', []));
    setVendors(getStoredData<Vendor[]>('vendors', []));

    // Default Filter: Current Month
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const toLocalISO = (d: Date) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };

    setStartDate(toLocalISO(firstDay));
    setEndDate(toLocalISO(lastDay));
  }, []);

  // --- GLOBAL FILTER HELPERS ---
  const isDateInRange = (dateStr: string) => {
      if(!startDate || !endDate) return true;
      const d = dateStr.split('T')[0];
      return d >= startDate && d <= endDate;
  };

  // Base Filtered Data (Excluding Cancelled)
  const filteredBookings = useMemo(() => bookings.filter(b => 
      isDateInRange(b.startDate) && b.status !== BookingStatus.CANCELLED
  ), [bookings, startDate, endDate]);

  const filteredTransactions = useMemo(() => transactions.filter(t => 
      isDateInRange(t.date)
  ), [transactions, startDate, endDate]);

  // --- DATA AGGREGATION PER TAB ---

  // 1. BOOKING DATA
  const bookingChartData = useMemo(() => {
      const grouped: {[key: string]: number} = {};
      filteredBookings.forEach(b => {
          const date = new Date(b.startDate).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'});
          grouped[date] = (grouped[date] || 0) + 1;
      });
      return Object.keys(grouped).map(k => ({ name: k, bookings: grouped[k] }));
  }, [filteredBookings]);

  // 2. FLEET DATA
  const fleetStats = useMemo(() => {
      const stats: any[] = cars.map(car => {
          const carBookings = filteredBookings.filter(b => b.carId === car.id);
          const revenue = carBookings.reduce((sum, b) => sum + b.basePrice + (b.overtimeFee || 0) + b.highSeasonFee, 0);
          return {
              id: car.id,
              name: car.name,
              plate: car.plate,
              trips: carBookings.length,
              revenue: revenue
          };
      });
      return stats.sort((a,b) => b.revenue - a.revenue);
  }, [cars, filteredBookings]);

  // 3. INVESTOR DATA
  const investorStats = useMemo(() => {
      return partners.map(p => {
          const partnerCars = cars.filter(c => c.partnerId === p.id).map(c => c.id);
          const partnerBookings = filteredBookings.filter(b => partnerCars.includes(b.carId));
          const grossRevenue = partnerBookings.reduce((sum, b) => sum + b.basePrice + (b.overtimeFee || 0) + b.highSeasonFee, 0);
          const estShare = grossRevenue * (p.splitPercentage / 100);
          
          return {
              name: p.name,
              units: partnerCars.length,
              revenue: grossRevenue,
              share: estShare
          };
      }).filter(p => p.revenue > 0); // Only show active investors
  }, [partners, cars, filteredBookings]);

  // 4. DRIVER DATA
  const driverStats = useMemo(() => {
      return drivers.map(d => {
          const trips = filteredBookings.filter(b => b.driverId === d.id);
          const fee = trips.reduce((sum, b) => sum + b.driverFee, 0);
          return {
              name: d.name,
              trips: trips.length,
              fee: fee
          };
      }).sort((a,b) => b.trips - a.trips);
  }, [drivers, filteredBookings]);

  // 5. VENDOR DATA (Rent to Rent)
  const vendorStats = useMemo(() => {
      return vendors.map(v => {
          const trips = filteredBookings.filter(b => b.isRentToRent && b.vendorId === v.id);
          const cost = trips.reduce((sum, b) => sum + (b.vendorFee || 0), 0);
          return {
              name: v.name,
              trips: trips.length,
              cost: cost
          };
      }).filter(v => v.trips > 0);
  }, [vendors, filteredBookings]);

  // 6. FINANCE DATA
  const financeChartData = useMemo(() => {
      const grouped: {[key: string]: {date: string, income: number, expense: number}} = {};
      
      // Init dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().split('T')[0];
          const label = d.toLocaleDateString('id-ID', {day: '2-digit', month: 'short'});
          grouped[key] = { date: label, income: 0, expense: 0 };
      }

      filteredTransactions.forEach(t => {
          const key = t.date.split('T')[0];
          if (grouped[key]) {
              if (t.type === 'Income') grouped[key].income += t.amount;
              else grouped[key].expense += t.amount;
          }
      });

      return Object.values(grouped);
  }, [filteredTransactions, startDate, endDate]);


  // --- EXPORT HANDLER ---
  const handleExportExcel = () => {
      let dataToExport: any[] = [];
      let filename = `Laporan_${activeTab}_${startDate}`;

      switch(activeTab) {
          case 'booking':
              dataToExport = filteredBookings.map(b => ({
                  ID: b.id,
                  Tanggal: new Date(b.startDate).toLocaleDateString('id-ID'),
                  Pelanggan: b.customerName,
                  Unit: b.isRentToRent ? b.externalCarName : cars.find(c => c.id === b.carId)?.name,
                  Total_Harga: b.totalPrice,
                  Status_Bayar: b.paymentStatus
              }));
              break;
          case 'fleet':
              dataToExport = fleetStats.map(f => ({
                  Unit: f.name,
                  Plat: f.plate,
                  Total_Trip: f.trips,
                  Total_Pendapatan: f.revenue
              }));
              break;
          case 'investor':
              dataToExport = investorStats.map(i => ({
                  Investor: i.name,
                  Jumlah_Unit: i.units,
                  Pendapatan_Kotor: i.revenue,
                  Bagi_Hasil: i.share
              }));
              break;
          case 'driver':
              dataToExport = driverStats.map(d => ({
                  Driver: d.name,
                  Total_Trip: d.trips,
                  Total_Fee: d.fee
              }));
              break;
          case 'vendor':
              dataToExport = vendorStats.map(v => ({
                  Vendor: v.name,
                  Unit_Dipinjam: v.trips,
                  Total_Biaya: v.cost
              }));
              break;
          case 'finance':
              dataToExport = filteredTransactions.map(t => ({
                  Tanggal: new Date(t.date).toLocaleDateString('id-ID'),
                  Tipe: t.type,
                  Kategori: t.category,
                  Deskripsi: t.description,
                  Jumlah: t.amount,
                  Status: t.status
              }));
              break;
      }

      exportToCSV(dataToExport, filename);
  };

  // --- RENDERERS ---

  const renderTabButton = (id: typeof activeTab, label: string, Icon: any) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === id ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
      >
          <Icon size={16}/> {label}
      </button>
  );

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">Laporan & Statistik</h2>
                  <p className="text-slate-500 text-sm">Analisa performa berdasarkan periode.</p>
              </div>
              <div className="flex gap-2">
                  <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm">
                      <FileSpreadsheet size={16}/> Download Excel
                  </button>
              </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 w-fit">
              <Filter size={16} className="text-slate-400 ml-2" />
              <span className="text-xs font-bold text-slate-600">Filter Tanggal:</span>
              <input type="date" className="border rounded px-2 py-1 text-xs text-slate-600 focus:outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="text-slate-400 text-xs">-</span>
              <input type="date" className="border rounded px-2 py-1 text-xs text-slate-600 focus:outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto border-b border-slate-200">
              {renderTabButton('booking', 'Booking', Calendar)}
              {renderTabButton('fleet', 'Kendaraan', CarIcon)}
              {renderTabButton('investor', 'Investor', Users)}
              {renderTabButton('driver', 'Driver', User)}
              {renderTabButton('vendor', 'Vendor', Building)}
              {renderTabButton('finance', 'Keuangan', Wallet)}
          </div>

          <div className="p-6 bg-slate-50 min-h-[400px]">
              
              {/* === TAB 1: BOOKING === */}
              {activeTab === 'booking' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                              <h4 className="font-bold text-slate-700 mb-4">Tren Booking Harian</h4>
                              <div className="h-64 w-full">
                                  <ResponsiveContainer>
                                      <LineChart data={bookingChartData}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                          <XAxis dataKey="name" tick={{fontSize: 10}} />
                                          <YAxis allowDecimals={false} />
                                          <Tooltip />
                                          <Line type="monotone" dataKey="bookings" stroke="#4f46e5" strokeWidth={3} dot={{r: 4}} />
                                      </LineChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                              <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 mb-3"><Calendar size={32}/></div>
                              <h3 className="text-4xl font-black text-slate-800">{filteredBookings.length}</h3>
                              <p className="text-slate-500 font-medium">Total Transaksi Valid</p>
                              <p className="text-xs text-slate-400 mt-1">(Tidak termasuk Cancelled)</p>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-sm text-slate-700">Rincian Data Booking</div>
                          <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-slate-200">
                                  <thead className="bg-white">
                                      <tr>
                                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">ID / Tanggal</th>
                                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Pelanggan</th>
                                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Unit</th>
                                          <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                      {filteredBookings.map(b => (
                                          <tr key={b.id} className="hover:bg-slate-50">
                                              <td className="px-6 py-3">
                                                  <div className="font-bold text-slate-800 text-xs">#{b.id.slice(0,6)}</div>
                                                  <div className="text-xs text-slate-500">{new Date(b.startDate).toLocaleDateString('id-ID')}</div>
                                              </td>
                                              <td className="px-6 py-3 text-sm text-slate-700">{b.customerName}</td>
                                              <td className="px-6 py-3 text-sm text-slate-600">
                                                  {b.isRentToRent ? b.externalCarName : cars.find(c => c.id === b.carId)?.name}
                                              </td>
                                              <td className="px-6 py-3 text-sm font-bold text-right text-slate-800">Rp {b.totalPrice.toLocaleString('id-ID')}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              )}

              {/* === TAB 2: KENDARAAN === */}
              {activeTab === 'fleet' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                          <h4 className="font-bold text-slate-700 mb-4">Top 5 Unit Berdasarkan Pendapatan</h4>
                          <div className="h-72 w-full">
                              <ResponsiveContainer>
                                  <BarChart data={fleetStats.slice(0, 5)} layout="vertical">
                                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                      <XAxis type="number" hide />
                                      <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                                      <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
                                      <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <table className="min-w-full divide-y divide-slate-200">
                              <thead className="bg-slate-50">
                                  <tr>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Unit Mobil</th>
                                      <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Total Trip</th>
                                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Pendapatan Kotor</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                  {fleetStats.map(f => (
                                      <tr key={f.id} className="hover:bg-slate-50">
                                          <td className="px-6 py-3 font-medium text-slate-800 text-sm">{f.name} <span className="text-slate-400 text-xs">({f.plate})</span></td>
                                          <td className="px-6 py-3 text-center text-sm font-bold bg-slate-50">{f.trips}</td>
                                          <td className="px-6 py-3 text-right text-sm font-bold text-green-600">Rp {f.revenue.toLocaleString('id-ID')}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* === TAB 3: INVESTOR === */}
              {activeTab === 'investor' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                              <div className="h-64 w-full">
                                  <ResponsiveContainer>
                                      <PieChart>
                                          <Pie
                                              data={investorStats}
                                              cx="50%" cy="50%"
                                              innerRadius={60}
                                              outerRadius={80}
                                              paddingAngle={5}
                                              dataKey="share"
                                          >
                                              {investorStats.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                              ))}
                                          </Pie>
                                          <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
                                          <Legend />
                                      </PieChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                              <h4 className="font-bold text-slate-700 mb-4">Total Bagi Hasil Investor</h4>
                              <p className="text-3xl font-black text-indigo-600">
                                  Rp {investorStats.reduce((acc, curr) => acc + curr.share, 0).toLocaleString('id-ID')}
                              </p>
                              <p className="text-sm text-slate-500 mt-2">Dari total {partners.length} investor aktif pada periode ini.</p>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <table className="min-w-full divide-y divide-slate-200">
                              <thead className="bg-slate-50">
                                  <tr>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nama Investor</th>
                                      <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Unit</th>
                                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Pendapatan Kotor</th>
                                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase text-indigo-600">Bagi Hasil</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                  {investorStats.map((i, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                          <td className="px-6 py-3 font-medium text-slate-800 text-sm">{i.name}</td>
                                          <td className="px-6 py-3 text-center text-sm">{i.units}</td>
                                          <td className="px-6 py-3 text-right text-sm text-slate-500">Rp {i.revenue.toLocaleString('id-ID')}</td>
                                          <td className="px-6 py-3 text-right text-sm font-bold text-indigo-600">Rp {i.share.toLocaleString('id-ID')}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* === TAB 4: DRIVER === */}
              {activeTab === 'driver' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                          <h4 className="font-bold text-slate-700 mb-4">Performa Trip Driver</h4>
                          <div className="h-72 w-full">
                              <ResponsiveContainer>
                                  <BarChart data={driverStats}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                      <XAxis dataKey="name" />
                                      <YAxis />
                                      <Tooltip />
                                      <Bar dataKey="trips" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Jumlah Trip" barSize={40} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <table className="min-w-full divide-y divide-slate-200">
                              <thead className="bg-slate-50">
                                  <tr>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nama Driver</th>
                                      <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Jumlah Trip</th>
                                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total Fee (Gaji)</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                  {driverStats.map((d, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                          <td className="px-6 py-3 font-medium text-slate-800 text-sm">{d.name}</td>
                                          <td className="px-6 py-3 text-center text-sm font-bold">{d.trips}</td>
                                          <td className="px-6 py-3 text-right text-sm font-bold text-green-600">Rp {d.fee.toLocaleString('id-ID')}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* === TAB 5: VENDOR === */}
              {activeTab === 'vendor' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                          <h4 className="font-bold text-slate-700 mb-4">Pengeluaran Sewa ke Vendor (Unit Luar)</h4>
                          <div className="h-72 w-full">
                              <ResponsiveContainer>
                                  <BarChart data={vendorStats} layout="vertical">
                                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                      <XAxis type="number" hide />
                                      <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                                      <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
                                      <Bar dataKey="cost" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} name="Total Bayar" />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <table className="min-w-full divide-y divide-slate-200">
                              <thead className="bg-slate-50">
                                  <tr>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nama Vendor</th>
                                      <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Unit Dipinjam</th>
                                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total Biaya Vendor</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                  {vendorStats.map((v, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                          <td className="px-6 py-3 font-medium text-slate-800 text-sm">{v.name}</td>
                                          <td className="px-6 py-3 text-center text-sm">{v.trips}</td>
                                          <td className="px-6 py-3 text-right text-sm font-bold text-red-600">Rp {v.cost.toLocaleString('id-ID')}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* === TAB 6: KEUANGAN === */}
              {activeTab === 'finance' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                          <h4 className="font-bold text-slate-700 mb-4">Arus Kas (Pemasukan vs Pengeluaran)</h4>
                          <div className="h-72 w-full">
                              <ResponsiveContainer>
                                  <AreaChart data={financeChartData}>
                                      <defs>
                                          <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                          </linearGradient>
                                          <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                          </linearGradient>
                                      </defs>
                                      <XAxis dataKey="date" />
                                      <YAxis hide />
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                      <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
                                      <Area type="monotone" dataKey="income" stroke="#22c55e" fillOpacity={1} fill="url(#colorIn)" name="Pemasukan" />
                                      <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" name="Pengeluaran" />
                                      <Legend />
                                  </AreaChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                              <h4 className="font-bold text-sm text-slate-700">Rincian Transaksi</h4>
                              <div className="flex gap-4 text-xs font-bold">
                                  <span className="text-green-600">Total Masuk: Rp {filteredTransactions.filter(t=>t.type==='Income').reduce((s,t)=>s+t.amount,0).toLocaleString('id-ID')}</span>
                                  <span className="text-red-600">Total Keluar: Rp {filteredTransactions.filter(t=>t.type==='Expense').reduce((s,t)=>s+t.amount,0).toLocaleString('id-ID')}</span>
                              </div>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-slate-200">
                                  <thead className="bg-white">
                                      <tr>
                                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tanggal</th>
                                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tipe</th>
                                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Kategori</th>
                                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Deskripsi</th>
                                          <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Nominal</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                      {filteredTransactions.map(t => (
                                          <tr key={t.id} className="hover:bg-slate-50">
                                              <td className="px-6 py-3 text-xs text-slate-500">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                                              <td className="px-6 py-3">
                                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                      {t.type === 'Income' ? 'MASUK' : 'KELUAR'}
                                                  </span>
                                              </td>
                                              <td className="px-6 py-3 text-xs text-slate-600">{t.category}</td>
                                              <td className="px-6 py-3 text-xs text-slate-700 max-w-[200px] truncate" title={t.description}>{t.description}</td>
                                              <td className={`px-6 py-3 text-right text-sm font-bold ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                                  Rp {t.amount.toLocaleString('id-ID')}
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              )}

          </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
