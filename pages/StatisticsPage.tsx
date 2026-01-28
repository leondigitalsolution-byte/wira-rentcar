import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Booking, Car, Customer, Driver, Partner, Vendor, BookingStatus, PaymentStatus } from '../types';
import { getStoredData, exportToCSV } from '../services/dataService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line 
} from 'recharts';
import { 
  Download, Calendar, Filter, FileSpreadsheet, 
  Car as CarIcon, User, Users, Briefcase, Building, Wallet,
  Clock, CheckCircle, AlertCircle, Phone, TrendingUp
} from 'lucide-react';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

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
          const driverFees = carBookings.reduce((sum, b) => sum + b.driverFee, 0);
          
          // Calculate Investor Share
          let investorShare = 0;
          if (car.partnerId) {
             carBookings.forEach(b => {
                 const diffMs = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
                 const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                 investorShare += (car.investorSetoran || 0) * days;
             });
          }

          return {
              id: car.id,
              name: car.name,
              brand: car.brand || '-',
              plate: car.plate,
              trips: carBookings.length,
              revenue: revenue,
              investorShare: investorShare,
              driverFee: driverFees,
              avgPerTrip: carBookings.length > 0 ? revenue / carBookings.length : 0
          };
      });
      return stats.sort((a,b) => b.revenue - a.revenue);
  }, [cars, filteredBookings]);

  // 3. INVESTOR DATA
  const investorStats = useMemo(() => {
      const partnerList = partners.map(p => {
          const partnerCars = cars.filter(c => c.partnerId === p.id).map(c => c.id);
          const partnerBookings = filteredBookings.filter(b => partnerCars.includes(b.carId));
          const grossRevenue = partnerBookings.reduce((sum, b) => sum + (b.basePrice + (b.overtimeFee || 0) + b.highSeasonFee), 0);
          
          let estShare = 0;
          partnerBookings.forEach(b => {
              const car = cars.find(c => c.id === b.carId);
              const diffMs = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
              const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
              estShare += (car?.investorSetoran || 0) * days;
          });

          const paidSetoran = filteredTransactions
              .filter(t => t.relatedId === p.id && (t.category === 'Setor Investor' || t.category === 'Setor Mitra') && t.status === 'Paid')
              .reduce((sum, t) => sum + t.amount, 0);

          return {
              id: p.id,
              name: p.name,
              phone: p.phone,
              units: partnerCars.length,
              revenue: grossRevenue,
              share: estShare,
              paid: paidSetoran,
              balance: estShare - paidSetoran
          };
      });

      // Office Stats
      const officeCars = cars.filter(c => !c.partnerId).map(c => c.id);
      const officeBookings = filteredBookings.filter(b => officeCars.includes(b.carId));
      const officeRevenue = officeBookings.reduce((sum, b) => sum + (b.basePrice + (b.overtimeFee || 0) + b.highSeasonFee), 0);
      
      const officeData = {
          id: 'office',
          name: 'KANTOR (Aset Sendiri)',
          phone: '-',
          units: officeCars.length,
          revenue: officeRevenue,
          share: officeRevenue,
          paid: officeRevenue,
          balance: 0
      };

      return [officeData, ...partnerList].filter(p => p.units > 0 || p.revenue > 0);
  }, [partners, cars, filteredBookings, filteredTransactions]);

  // 4. DRIVER DATA
  const driverStats = useMemo(() => {
      return drivers.map(d => {
          const trips = filteredBookings.filter(b => b.driverId === d.id);
          const totalFee = trips.reduce((sum, b) => sum + b.driverFee, 0);
          const paidFee = filteredTransactions
              .filter(t => t.relatedId === d.id && t.category === 'Gaji' && t.status === 'Paid')
              .reduce((sum, t) => sum + t.amount, 0);

          return {
              id: d.id,
              name: d.name,
              phone: d.phone,
              trips: trips.length,
              fee: totalFee,
              paid: paidFee,
              balance: totalFee - paidFee
          };
      }).sort((a,b) => b.trips - a.trips);
  }, [drivers, filteredBookings, filteredTransactions]);

  // 5. VENDOR DATA
  const vendorStats = useMemo(() => {
      return vendors.map(v => {
          const trips = filteredBookings.filter(b => b.isRentToRent && b.vendorId === v.id);
          const totalCost = trips.reduce((sum, b) => sum + (b.vendorFee || 0), 0);
          const paidCost = filteredTransactions
              .filter(t => t.relatedId === v.id && t.category === 'Sewa Vendor' && t.status === 'Paid')
              .reduce((sum, t) => sum + t.amount, 0);

          return {
              id: v.id,
              name: v.name,
              phone: v.phone,
              trips: trips.length,
              cost: totalCost,
              paid: paidCost,
              balance: totalCost - paidCost
          };
      }).filter(v => v.trips > 0);
  }, [vendors, filteredBookings, filteredTransactions]);

  // 6. FINANCE DATA
  const financeChartData = useMemo(() => {
      const grouped: {[key: string]: {date: string, income: number, expense: number}} = {};
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
      let filename = `Laporan_${activeTab}_${startDate}_sd_${endDate}`;

      switch(activeTab) {
          case 'booking':
              dataToExport = filteredBookings.map(b => ({
                  ID: b.id,
                  Tanggal: new Date(b.startDate).toLocaleDateString('id-ID'),
                  Pelanggan: b.customerName,
                  Unit: b.isRentToRent ? b.externalCarName : cars.find(c => c.id === b.carId)?.name,
                  Paket: b.packageType,
                  Tujuan: b.destination,
                  Total_Harga: b.totalPrice,
                  Dibayar: b.amountPaid,
                  Sisa: b.totalPrice - b.amountPaid,
                  Payment_Status: b.paymentStatus,
                  Booking_Status: b.status
              }));
              break;
          case 'fleet':
              dataToExport = fleetStats.map(f => ({
                  Unit: f.name,
                  Merek: f.brand,
                  Plat: f.plate,
                  Total_Trip: f.trips,
                  Pendapatan_Gross: f.revenue,
                  Hak_Investor: f.investorShare,
                  Fee_Driver: f.driverFee,
                  Avg_Revenue_per_Trip: f.avgPerTrip
              }));
              break;
          case 'investor':
              dataToExport = investorStats.map(i => ({
                  Nama: i.name,
                  WhatsApp: i.phone,
                  Jumlah_Unit: i.units,
                  Gross_Revenue: i.revenue,
                  Hak_Bagi_Hasil: i.share,
                  Sudah_Disetor: i.paid,
                  Sisa_Hutang_Kantor: i.balance
              }));
              break;
          case 'driver':
              dataToExport = driverStats.map(d => ({
                  Driver: d.name,
                  WhatsApp: d.phone,
                  Total_Trip: d.trips,
                  Total_Fee_Gaji: d.fee,
                  Gaji_Terbayar: d.paid,
                  Sisa_Gaji_Pending: d.balance
              }));
              break;
          case 'vendor':
              dataToExport = vendorStats.map(v => ({
                  Vendor: v.name,
                  WhatsApp: v.phone,
                  Unit_Dipinjam: v.trips,
                  Total_Tagihan_Vendor: v.cost,
                  Sudah_Dibayar: v.paid,
                  Sisa_Tagihan: v.balance
              }));
              break;
          case 'finance':
              dataToExport = filteredTransactions.map(t => ({
                  Tanggal: new Date(t.date).toLocaleDateString('id-ID'),
                  Tipe: t.type,
                  Kategori: t.category,
                  Deskripsi: t.description,
                  Jumlah: t.amount,
                  Status: t.status,
                  Bukti: t.receiptImage ? 'Ada' : 'Tidak Ada'
              }));
              break;
      }

      exportToCSV(dataToExport, filename);
  };

  const renderTabButton = (id: typeof activeTab, label: string, Icon: any) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-black uppercase tracking-widest border-b-4 transition-all ${activeTab === id ? 'border-red-600 text-red-600 bg-red-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
      >
          <Icon size={18}/> {label}
      </button>
  );

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-6">
              <div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Laporan & Statistik</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Analisa mendalam performa bisnis Wira Rent Car.</p>
              </div>
              <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-black uppercase tracking-widest shadow-lg shadow-green-100 dark:shadow-none transition-all active:scale-95">
                  <FileSpreadsheet size={20}/> Export Laporan Detail (.CSV)
              </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
              <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                  <Calendar size={16} className="text-red-600" /> Periode Laporan:
              </div>
              <div className="flex items-center gap-2">
                <input type="date" className="border dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-200 dark:bg-slate-800 focus:ring-2 ring-red-500 outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-slate-400 font-bold">-</span>
                <input type="date" className="border dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-200 dark:bg-slate-800 focus:ring-2 ring-red-500 outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
          </div>
      </div>

      {/* TABS CONTAINER */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-700 no-scrollbar">
              {renderTabButton('booking', 'Booking', Calendar)}
              {renderTabButton('fleet', 'Armada', CarIcon)}
              {renderTabButton('investor', 'Investor', Users)}
              {renderTabButton('driver', 'Driver', User)}
              {renderTabButton('vendor', 'Vendor', Building)}
              {renderTabButton('finance', 'Keuangan', Wallet)}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/20 min-h-[500px]">
              
              {/* === TAB 1: BOOKING === */}
              {activeTab === 'booking' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                              {/* Fix: Added missing TrendingUp icon */}
                              <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-6 flex items-center gap-2"><TrendingUp size={16} className="text-red-600"/> Grafik Pertumbuhan Booking</h4>
                              <div className="h-64 w-full">
                                  <ResponsiveContainer>
                                      <LineChart data={bookingChartData}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                          <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                          <Line type="monotone" dataKey="bookings" stroke="#dc2626" strokeWidth={4} dot={{r: 4, fill: '#dc2626', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                                      </LineChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>
                          <div className="bg-red-600 rounded-2xl p-8 text-white shadow-xl shadow-red-100 dark:shadow-none flex flex-col justify-center items-center text-center relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                              <div className="p-4 bg-white/20 rounded-full mb-4 backdrop-blur-sm"><Calendar size={32}/></div>
                              <h3 className="text-5xl font-black">{filteredBookings.length}</h3>
                              <p className="text-red-100 font-bold uppercase tracking-widest text-xs mt-2">Booking Berhasil</p>
                              <p className="text-[10px] text-red-200/70 mt-4 italic">Periode: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</p>
                          </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 font-black text-xs uppercase tracking-widest text-slate-500">Rincian Perjalanan Lengkap</div>
                          <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                  <thead className="bg-white dark:bg-slate-800">
                                      <tr>
                                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Tanggal</th>
                                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Pelanggan</th>
                                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit & Paket</th>
                                          <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Bayar</th>
                                          <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Harga</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                      {filteredBookings.map(b => {
                                          const sisa = b.totalPrice - b.amountPaid;
                                          return (
                                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                              <td className="px-6 py-4">
                                                  <div className="font-black text-slate-800 dark:text-white text-xs font-mono">#{b.id.slice(0,8)}</div>
                                                  <div className="text-[10px] text-slate-500 font-bold uppercase">{new Date(b.startDate).toLocaleDateString('id-ID')}</div>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">{b.customerName}</p>
                                                  <p className="text-[10px] text-slate-400 font-medium">{b.customerPhone}</p>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <p className="text-xs font-black text-red-600 uppercase">{b.isRentToRent ? b.externalCarName : cars.find(c => c.id === b.carId)?.name}</p>
                                                  <p className="text-[10px] text-slate-500 font-bold">{b.packageType}</p>
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${b.paymentStatus === PaymentStatus.PAID ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                      {b.paymentStatus}
                                                  </span>
                                                  {sisa > 0 && <p className="text-[9px] text-red-500 font-bold mt-1">Sisa: Rp {sisa.toLocaleString()}</p>}
                                              </td>
                                              <td className="px-6 py-4 text-sm font-black text-right text-slate-800 dark:text-white">Rp {b.totalPrice.toLocaleString('id-ID')}</td>
                                          </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              )}

              {/* === TAB 2: FLEET === */}
              {activeTab === 'fleet' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-6 flex items-center gap-2"><CarIcon size={16} className="text-red-600"/> Analisa Utilisasi & Pendapatan Unit</h4>
                          <div className="h-80 w-full">
                              <ResponsiveContainer>
                                  <BarChart data={fleetStats.slice(0, 10)} layout="vertical" margin={{left: 20}}>
                                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                      <XAxis type="number" hide />
                                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                      <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} contentStyle={{borderRadius: '12px'}} />
                                      <Bar dataKey="revenue" fill="#dc2626" radius={[0, 6, 6, 0]} barSize={24} name="Total Pendapatan" />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                              <thead className="bg-slate-50 dark:bg-slate-900/50">
                                  <tr>
                                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Armada</th>
                                      <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Trip</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Gross</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Bagi Hasil</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-red-600">Profit Kantor</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                  {fleetStats.map(f => (
                                      <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                          <td className="px-6 py-4">
                                              <p className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-tight">{f.name}</p>
                                              <p className="text-[10px] text-slate-400 font-mono">{f.plate}</p>
                                          </td>
                                          <td className="px-6 py-4 text-center text-xs font-black text-slate-600 dark:text-slate-400">{f.trips}</td>
                                          <td className="px-6 py-4 text-right text-xs font-bold text-slate-500">Rp {f.revenue.toLocaleString()}</td>
                                          <td className="px-6 py-4 text-right text-xs font-bold text-purple-600">Rp {f.investorShare.toLocaleString()}</td>
                                          <td className="px-6 py-4 text-right text-sm font-black text-red-600">Rp {(f.revenue - f.investorShare - f.driverFee).toLocaleString()}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* === TAB 3: INVESTOR === */}
              {activeTab === 'investor' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                              <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-6 flex items-center gap-2"><Users size={16} className="text-red-600"/> Distribusi Pendapatan Investor</h4>
                              <div className="h-64 w-full">
                                  <ResponsiveContainer>
                                      <PieChart>
                                          <Pie
                                              data={investorStats}
                                              cx="50%" cy="50%"
                                              innerRadius={60}
                                              outerRadius={80}
                                              paddingAngle={8}
                                              dataKey="share"
                                          >
                                              {investorStats.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                              ))}
                                          </Pie>
                                          <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
                                          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                                      </PieChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>
                          <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-center gap-4">
                              <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Hak Investor</p>
                                  <p className="text-3xl font-black text-red-500">Rp {investorStats.reduce((a,c)=>a+c.share,0).toLocaleString()}</p>
                              </div>
                              <div className="pt-4 border-t border-white/10 space-y-2">
                                  <div className="flex justify-between text-xs font-bold text-slate-400"><span>Sudah Disetor:</span><span className="text-green-400">Rp {investorStats.reduce((a,c)=>a+c.paid,0).toLocaleString()}</span></div>
                                  <div className="flex justify-between text-xs font-bold text-slate-400"><span>Sisa Hutang:</span><span className="text-orange-400">Rp {investorStats.reduce((a,c)=>a+c.balance,0).toLocaleString()}</span></div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                              <thead className="bg-slate-50 dark:bg-slate-900/50">
                                  <tr>
                                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Investor</th>
                                      <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendapatan Kotor</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Hak Bersih</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-red-600">Sisa Hutang</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                  {investorStats.map((i, idx) => (
                                      <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 ${i.id === 'office' ? 'bg-red-50/20' : ''}`}>
                                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-white text-xs uppercase">{i.name}</td>
                                          <td className="px-6 py-4 text-center text-xs font-black">{i.units}</td>
                                          <td className="px-6 py-4 text-right text-xs text-slate-500 font-medium">Rp {i.revenue.toLocaleString()}</td>
                                          <td className="px-6 py-4 text-right text-xs font-black text-green-600">Rp {i.share.toLocaleString()}</td>
                                          <td className="px-6 py-4 text-right text-xs font-black text-red-600">Rp {Math.max(0, i.balance).toLocaleString()}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* === TAB 4: DRIVER === */}
              {activeTab === 'driver' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                         <div className="flex-1">
                             <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-6 flex items-center gap-2"><User size={16} className="text-red-600"/> Distribusi Gaji & Trip Driver</h4>
                             <div className="h-64 w-full">
                                 <ResponsiveContainer>
                                     <BarChart data={driverStats}>
                                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                         <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                         <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                         <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px'}} />
                                         <Bar dataKey="trips" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Total Trip" barSize={32} />
                                     </BarChart>
                                 </ResponsiveContainer>
                             </div>
                         </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                              <thead className="bg-slate-50 dark:bg-slate-900/50">
                                  <tr>
                                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Driver</th>
                                      <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Trip</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Potensi Gaji</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-green-600">Gaji Terbayar</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-red-600">Gaji Pending</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                  {driverStats.map((d, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                          <td className="px-6 py-4">
                                              <p className="font-bold text-slate-800 dark:text-white text-xs uppercase">{d.name}</p>
                                              <p className="text-[10px] text-slate-400 font-mono">{d.phone}</p>
                                          </td>
                                          <td className="px-6 py-4 text-center text-xs font-black text-slate-600 dark:text-slate-400">{d.trips}</td>
                                          <td className="px-6 py-4 text-right text-xs font-bold text-slate-500">Rp {d.fee.toLocaleString()}</td>
                                          <td className="px-6 py-4 text-right text-xs font-black text-green-600">Rp {d.paid.toLocaleString()}</td>
                                          <td className="px-6 py-4 text-right text-xs font-black text-red-600">Rp {Math.max(0, d.balance).toLocaleString()}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* === TAB 5: VENDOR === */}
              {activeTab === 'vendor' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-6 flex items-center gap-2"><Building size={16} className="text-red-600"/> Performa Pinjam Unit Luar (Vendor)</h4>
                          <div className="h-72 w-full">
                              <ResponsiveContainer>
                                  <BarChart data={vendorStats} layout="vertical" margin={{left: 20}}>
                                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                      <XAxis type="number" hide />
                                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                      <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
                                      <Bar dataKey="cost" fill="#f43f5e" radius={[0, 6, 6, 0]} barSize={24} name="Total Tagihan" />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                              <thead className="bg-slate-50 dark:bg-slate-900/50">
                                  <tr>
                                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Vendor</th>
                                      <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Unit</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total HPP</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Sudah Dibayar</th>
                                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest text-red-600">Sisa Tagihan</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                  {vendorStats.map((v, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                          <td className="px-6 py-4">
                                              <p className="font-bold text-slate-800 dark:text-white text-xs uppercase">{v.name}</p>
                                              <p className="text-[10px] text-slate-400 font-mono">{v.phone}</p>
                                          </td>
                                          <td className="px-6 py-4 text-center text-xs font-black">{v.trips}</td>
                                          <td className="px-6 py-4 text-right text-xs font-bold text-slate-500">Rp {v.cost.toLocaleString()}</td>
                                          <td className="px-6 py-4 text-right text-xs font-black text-green-600">Rp {v.paid.toLocaleString()}</td>
                                          <td className="px-6 py-4 text-right text-xs font-black text-red-600">Rp {Math.max(0, v.balance).toLocaleString()}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* === TAB 6: KEUANGAN === */}
              {activeTab === 'finance' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-6 flex items-center gap-2"><Wallet size={16} className="text-red-600"/> Perbandingan Arus Kas (In vs Out)</h4>
                          <div className="h-80 w-full">
                              <ResponsiveContainer>
                                  <AreaChart data={financeChartData}>
                                      <defs>
                                          <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/>
                                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                          </linearGradient>
                                          <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15}/>
                                              <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                                          </linearGradient>
                                      </defs>
                                      <XAxis dataKey="date" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                      <YAxis hide />
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                      <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} contentStyle={{borderRadius: '12px'}} />
                                      <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" name="Pemasukan (+)" />
                                      <Area type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" name="Pengeluaran (-)" />
                                      <Legend iconType="circle" />
                                  </AreaChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                              <h4 className="font-black text-xs uppercase tracking-widest text-slate-500">Rekapitulasi Jurnal Keuangan</h4>
                              <div className="flex gap-4">
                                  <div className="bg-green-50 dark:bg-green-900/10 px-4 py-1.5 rounded-xl border border-green-100 dark:border-green-800">
                                      <p className="text-[8px] font-black text-green-600 uppercase tracking-widest leading-none">Total Masuk</p>
                                      <p className="text-sm font-black text-green-700 dark:text-green-400">Rp {filteredTransactions.filter(t=>t.type==='Income').reduce((s,t)=>s+t.amount,0).toLocaleString('id-ID')}</p>
                                  </div>
                                  <div className="bg-red-50 dark:bg-red-900/10 px-4 py-1.5 rounded-xl border border-red-100 dark:border-red-800">
                                      <p className="text-[8px] font-black text-red-600 uppercase tracking-widest leading-none">Total Keluar</p>
                                      <p className="text-sm font-black text-red-700 dark:text-red-400">Rp {filteredTransactions.filter(t=>t.type==='Expense').reduce((s,t)=>s+t.amount,0).toLocaleString('id-ID')}</p>
                                  </div>
                              </div>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                  <thead className="bg-white dark:bg-slate-800">
                                      <tr>
                                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tgl / Kategori</th>
                                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Deskripsi Jurnal</th>
                                          <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                          <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                      {filteredTransactions.map(t => (
                                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                              <td className="px-6 py-4">
                                                  <div className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{new Date(t.date).toLocaleDateString('id-ID')}</div>
                                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{t.category}</div>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1">{t.description}</p>
                                                  {t.receiptImage && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-black mt-1 inline-block">ADA BUKTI NOTA</span>}
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${t.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                      {t.status === 'Paid' ? 'PAID' : 'PENDING'}
                                                  </span>
                                              </td>
                                              <td className={`px-6 py-4 text-right text-sm font-black ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                                  {t.type === 'Income' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
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