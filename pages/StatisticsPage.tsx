
import React, { useState, useEffect } from 'react';
import { Transaction, Booking, Car, Customer, Driver } from '../types';
import { getStoredData } from '../services/dataService';
import { generateStatisticsPDF } from '../services/pdfService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownLeft, Wallet, Calendar, Package, Download, User as UserIcon, CheckCircle, Clock, CalendarDays, ShieldCheck, DollarSign, Users, Car as CarIcon } from 'lucide-react';
import { getCurrentUser } from '../services/authService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const StatisticsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const currentUser = getCurrentUser();
  const isPartner = currentUser?.role === 'partner';

  useEffect(() => {
    setTransactions(getStoredData<Transaction[]>('transactions', []));
    setBookings(getStoredData<Booking[]>('bookings', []));
    setCars(getStoredData<Car[]>('cars', []));
    setCustomers(getStoredData<Customer[]>('customers', []));
    setDrivers(getStoredData<Driver[]>('drivers', []));

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

  const filterDateRange = (dateStr: string) => {
      if(!startDate || !endDate) return true;
      const d = dateStr.split('T')[0];
      return d >= startDate && d <= endDate;
  };

  let filteredTransactions = transactions.filter(t => filterDateRange(t.date));
  let filteredBookings = bookings.filter(b => filterDateRange(b.startDate));

  if (isPartner && currentUser.linkedPartnerId) {
      filteredTransactions = filteredTransactions.filter(t => 
          (t.category === 'Setor Investor' || t.category === 'Setor Mitra') && t.relatedId === currentUser.linkedPartnerId
      );
      const partnerCarIds = cars.filter(c => c.partnerId === currentUser.linkedPartnerId).map(c => c.id);
      filteredBookings = filteredBookings.filter(b => partnerCarIds.includes(b.carId));
  }

  const income = isPartner 
    ? filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0)
    : filteredTransactions.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);

  const expense = isPartner
    ? 0 
    : filteredTransactions
        .filter(t => t.type === 'Expense' && t.status === 'Paid')
        .reduce((acc, curr) => acc + curr.amount, 0);
    
  const profit = income - expense;

  // --- DATA CALCULATIONS ---

  const statusCounts = {
      Booked: filteredBookings.filter(b => b.status === 'Booked').length,
      Active: filteredBookings.filter(b => b.status === 'Active').length,
      Completed: filteredBookings.filter(b => b.status === 'Completed').length
  };

  const getOwnershipStats = () => {
      let company = 0;
      let partner = 0;
      filteredBookings.forEach(b => {
          const car = cars.find(c => c.id === b.carId);
          if (car) {
              if (car.partnerId) partner++;
              else company++;
          }
      });
      return [
          { name: 'Mobil Perusahaan', value: company },
          { name: 'Mobil Investor', value: partner }
      ].filter(d => d.value > 0);
  };

  const getDriverStats = () => {
      const counts: {[key: string]: number} = {};
      filteredBookings.forEach(b => {
          if (b.driverId) {
              const driverName = drivers.find(d => d.id === b.driverId)?.name || 'Unknown Driver';
              counts[driverName] = (counts[driverName] || 0) + 1;
          }
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value)
        .slice(0, 5);
  };

  const getPaymentStats = () => {
      const paid = filteredBookings.filter(b => b.paymentStatus === 'Lunas').length;
      const unpaid = filteredBookings.filter(b => b.paymentStatus !== 'Lunas').length;
      return [
          { name: 'Lunas', value: paid },
          { name: 'Belum Lunas/DP', value: unpaid }
      ].filter(d => d.value > 0);
  };

  const getDailyHistogram = () => {
      const daysMap = new Map();
      const start = new Date(startDate);
      const end = new Date(endDate);
      for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayStr = d.toISOString().split('T')[0];
          daysMap.set(dayStr, { name: d.getDate().toString(), Pemasukan: 0, Pengeluaran: 0 });
      }
      filteredTransactions.forEach(t => {
          const dayStr = t.date.split('T')[0]; 
          if(daysMap.has(dayStr)) {
              const current = daysMap.get(dayStr);
              if (isPartner) current.Pemasukan += t.amount;
              else {
                  if(t.type === 'Income') current.Pemasukan += t.amount;
                  else if (t.status === 'Paid') current.Pengeluaran += t.amount;
              }
          }
      });
      return Array.from(daysMap.values());
  };

  const getTopFleet = () => {
      const counts: {[key: string]: number} = {};
      filteredBookings.forEach(b => {
          const carName = cars.find(c => c.id === b.carId)?.name || 'Unknown';
          counts[carName] = (counts[carName] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value)
        .slice(0, 5);
  };

  const getTopCustomers = () => {
      const counts: {[key: string]: number} = {};
      filteredBookings.forEach(b => {
          const name = b.customerName || 'Unknown';
          counts[name] = (counts[name] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value)
        .slice(0, 5);
  };

  const getPackageStats = () => {
      const counts: {[key: string]: number} = {};
      filteredBookings.forEach(b => {
          const pkg = b.packageType || 'Unknown';
          counts[pkg] = (counts[pkg] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const handleDownloadPDF = () => {
      generateStatisticsPDF(
          income, 
          expense, 
          profit, 
          startDate, 
          endDate, 
          getTopFleet(), 
          getTopCustomers(),
          statusCounts,
          getOwnershipStats(),
          getDriverStats(),
          getPaymentStats(),
          getPackageStats(),
          getDailyHistogram()
      );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Laporan & Statistik</h2>
          <p className="text-slate-500">Analisis menyeluruh performa bisnis rental Anda.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleDownloadPDF} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm">
                 <Download size={18} /> Export PDF
            </button>
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <Calendar size={18} className="text-slate-500 ml-2" />
                <input type="date" className="border-none text-sm focus:ring-0 text-slate-600" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-slate-400">-</span>
                <input type="date" className="border-none text-sm focus:ring-0 text-slate-600" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
        </div>
      </div>

      {/* 1. Summary Status Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-l-blue-500 border border-slate-200 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Booked (Booking)</p>
                  <h3 className="text-2xl font-bold text-blue-600">{statusCounts.Booked}</h3>
              </div>
              <CalendarDays className="text-blue-100 w-10 h-10" />
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-l-green-500 border border-slate-200 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Active (Jalan)</p>
                  <h3 className="text-2xl font-bold text-green-600">{statusCounts.Active}</h3>
              </div>
              <Clock className="text-green-100 w-10 h-10" />
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-l-slate-500 border border-slate-200 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Completed (Selesai)</p>
                  <h3 className="text-2xl font-bold text-slate-600">{statusCounts.Completed}</h3>
              </div>
              <CheckCircle className="text-slate-200 w-10 h-10" />
          </div>
      </div>

      {/* 2. GROUP: PENDAPATAN */}
      <section className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
              <DollarSign className="text-indigo-600" size={24} />
              <h3 className="text-xl font-bold text-slate-800">Grup: Pendapatan</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-100 text-green-600 rounded-lg"><ArrowDownLeft size={20} /></div>
                      <span className="text-sm font-medium text-slate-500">Pemasukan</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 truncate">Rp {income.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-red-100 text-red-600 rounded-lg"><ArrowUpRight size={20} /></div>
                      <span className="text-sm font-medium text-slate-500">Pengeluaran</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 truncate">Rp {expense.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Wallet size={20} /></div>
                      <span className="text-sm font-medium text-slate-500">Profit Bersih</span>
                  </div>
                  <p className={`text-2xl font-bold truncate ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Rp {profit.toLocaleString('id-ID')}</p>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-w-0">
                  <h4 className="font-bold text-slate-700 mb-4">Grafik Pendapatan Harian</h4>
                  {/* Fixed container size for Recharts */}
                  <div style={{ width: '100%', height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getDailyHistogram()}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" />
                              <YAxis tickFormatter={(val) => `${val/1000}k`} />
                              <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
                              <Legend />
                              <Bar dataKey="Pemasukan" fill="#22c55e" radius={[4, 4, 0, 0]} />
                              {!isPartner && <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />}
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-w-0">
                  <h4 className="font-bold text-slate-700 mb-4">Status Pembayaran</h4>
                  {/* Fixed container size for Recharts */}
                  <div style={{ width: '100%', height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={getPaymentStats()}
                                  cx="50%" cy="50%"
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                              >
                                  <Cell fill="#22c55e" />
                                  <Cell fill="#ef4444" />
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      </section>

      {/* 3. GROUP: PELANGGAN */}
      <section className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
              <Users className="text-indigo-600" size={24} />
              <h3 className="text-xl font-bold text-slate-800">Grup: Pelanggan</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-w-0">
              <h4 className="font-bold text-slate-700 mb-4">Top 5 Pelanggan Teraktif</h4>
              <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getTopCustomers()} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={30} name="Jumlah Booking" />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </section>

      {/* 4. GROUP: ARMADA */}
      <section className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
              <CarIcon className="text-indigo-600" size={24} />
              <h3 className="text-xl font-bold text-slate-800">Grup: Armada & Driver</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-w-0">
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Package size={18}/> Top Unit Terlaris</h4>
                  <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={getTopFleet()}
                                  cx="50%" cy="50%"
                                  outerRadius={80}
                                  dataKey="value"
                                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                              >
                                  {getTopFleet().map((_, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                              </Pie>
                              <Tooltip />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
              
              {/* Hidden Ownership Stats */}
              {/* <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-w-0">
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><ShieldCheck size={18}/> Transaksi Perusahaan vs Investor</h4>
                  <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={getOwnershipStats()}
                                  cx="50%" cy="50%"
                                  outerRadius={80}
                                  dataKey="value"
                                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                              >
                                  <Cell fill="#3b82f6" />
                                  <Cell fill="#f59e0b" />
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div> */}
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-w-0">
              <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><UserIcon size={18}/> Performa Driver (Jumlah Trip)</h4>
              <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getDriverStats()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{fontSize: 10}} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Trip" />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </section>
    </div>
  );
};

export default StatisticsPage;
