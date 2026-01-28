import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Driver, User, Booking, Car, Transaction, BookingStatus } from '../types';
import { getStoredData, setStoredData, exportToExcel, importFromExcel, mergeData, compressImage, downloadTemplateExcel } from '../services/dataService';
import { Plus, Trash2, Edit2, Phone, X, History, Download, Upload, Filter, Camera, FileSpreadsheet, Search, UserCircle, ExternalLink, Car as CarIcon, ChevronDown, Info, Printer, Calendar, Wallet, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateMonthlyReportPDF } from '../services/pdfService';

interface Props {
    currentUser: User;
}

const DriversPage: React.FC<Props> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [historyDriver, setHistoryDriver] = useState<Driver | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'trips' | 'expenses'>('trips');
  const [isUploading, setIsUploading] = useState(false);

  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isDriverView = currentUser.role === 'driver';

  useEffect(() => {
    setDrivers(getStoredData<Driver[]>('drivers', []));
    setBookings(getStoredData<Booking[]>('bookings', []));
    setCars(getStoredData<Car[]>('cars', []));
    setTransactions(getStoredData<Transaction[]>('transactions', []));

    const handleClickOutside = (event: MouseEvent) => {
        if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
            setIsActionMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDriversList = useMemo(() => {
    let result = isDriverView ? drivers.filter(d => d.id === currentUser.linkedDriverId) : drivers;
    if (searchTerm) {
        const low = searchTerm.toLowerCase();
        result = result.filter(d => d.name.toLowerCase().includes(low) || d.phone.includes(searchTerm));
    }
    return result;
  }, [drivers, isDriverView, currentUser, searchTerm]);

  const openModal = (driver?: Driver) => {
    if (driver) {
        setEditingDriver(driver); setName(driver.name); setPhone(driver.phone); setImagePreview(driver.image);
    } else {
        setEditingDriver(null); setName(''); setPhone(''); setImagePreview(null);
    }
    setIsModalOpen(true);
  };

  const openHistoryModal = (driver: Driver) => {
      setHistoryDriver(driver); setActiveHistoryTab('trips');
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      setHistoryStartDate(firstDay); setHistoryEndDate(lastDay);
      setIsHistoryModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try { const compressed = await compressImage(file); setImagePreview(compressed); } 
      catch (err) { alert("Gagal memproses gambar."); } 
      finally { setIsUploading(false); }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalImage = imagePreview || `https://i.pravatar.cc/150?u=${Date.now()}`;
    const newDriver: Driver = {
        id: editingDriver ? editingDriver.id : Date.now().toString(),
        name, phone, dailyRate: editingDriver ? editingDriver.dailyRate : 0, status: 'Active', image: finalImage
    };
    let updated = editingDriver ? drivers.map(d => d.id === editingDriver.id ? newDriver : d) : [newDriver, ...drivers];
    setDrivers(updated);
    setStoredData('drivers', updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Hapus data driver ini secara permanen?')) {
          const updated = drivers.filter(d => d.id !== id);
          setDrivers(updated);
          setStoredData('drivers', updated);
      }
  };

  const handleExport = () => {
    const data = filteredDriversList.map(d => ({ Nama: d.name, WhatsApp: d.phone, Status: d.status }));
    exportToExcel(data, `Data_Driver_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          importFromExcel(file, (data) => {
              const imported: Driver[] = data.map((d: any) => ({
                  id: `drv-${Date.now()}-${Math.random()}`,
                  name: d.Nama || d.nama || 'Tanpa Nama',
                  phone: d.WhatsApp || d.whatsapp || d.phone || '-',
                  dailyRate: 0,
                  status: 'Active',
                  image: `https://i.pravatar.cc/150?u=${Math.random()}`
              }));
              const merged = mergeData(drivers, imported);
              setDrivers(merged);
              setStoredData('drivers', merged);
              alert('Data driver berhasil diimpor!');
          });
      }
  };

  // --- MODAL DATA CALCULATION ---
  const driverHistoryData = useMemo(() => {
      if (!historyDriver) return { trips: [], expenses: [] };
      const start = historyStartDate || '0000-00-00';
      const end = historyEndDate || '9999-12-31';

      const filteredTrips = bookings.filter(b => 
          b.driverId === historyDriver.id && 
          b.startDate.split('T')[0] >= start && 
          b.startDate.split('T')[0] <= end &&
          b.status !== BookingStatus.CANCELLED
      ).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

      const filteredExpenses = transactions.filter(t => 
          t.relatedId === historyDriver.id &&
          t.date.split('T')[0] >= start && 
          t.date.split('T')[0] <= end
      ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return { trips: filteredTrips, expenses: filteredExpenses };
  }, [historyDriver, historyStartDate, historyEndDate, bookings, transactions]);

  const handleExportHistoryExcel = () => {
      if (!historyDriver) return;
      const tripData = driverHistoryData.trips.map(t => ({
          Tanggal: new Date(t.startDate).toLocaleDateString('id-ID'),
          Customer: t.customerName,
          Tujuan: t.destination,
          Gaji: t.driverFee,
          Status: t.status
      }));
      const financialData = driverHistoryData.expenses.map(e => ({
          Tanggal: new Date(e.date).toLocaleDateString('id-ID'),
          Kategori: e.category,
          Keterangan: e.description,
          Nominal: e.amount,
          Status: e.status
      }));
      
      // Combine for export
      const combined = [
          { Judul: `LAPORAN DRIVER: ${historyDriver.name.toUpperCase()}` },
          { Judul: `Periode: ${historyStartDate} s/d ${historyEndDate}` },
          {},
          { Judul: "DATA PERJALANAN" },
          ...tripData,
          {},
          { Judul: "DATA KEUANGAN (GAJI & KLAIM)" },
          ...financialData
      ];

      exportToExcel(combined, `Laporan_Driver_${historyDriver.name.replace(/\s+/g, '_')}_${historyStartDate}`);
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div><h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">{isDriverView ? 'Profil Saya' : 'Manajemen Driver'}</h2><p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Kelola data supir dan statistik kinerja.</p></div>
            <div className="flex flex-wrap items-center gap-3">
                {!isDriverView && (<div className="relative flex-1 min-w-[200px] md:w-64"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Cari driver..." className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>)}
                {!isDriverView && (
                    <div className="flex items-center gap-2">
                        <div className="relative" ref={actionMenuRef}>
                            <button onClick={() => setIsActionMenuOpen(!isActionMenuOpen)} className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-700 px-3 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm">
                                <FileSpreadsheet size={20} className="text-green-600" /> <span className="hidden sm:inline">Aksi Data</span> <ChevronDown size={16} />
                            </button>
                            {isActionMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 py-2 z-30">
                                    <button onClick={handleExport} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><Download size={16} /> Ekspor Excel</button>
                                    <label className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"><Upload size={16} /> Impor Excel<input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleImportFile} /></label>
                                    <div className="border-t dark:border-slate-700 my-1"></div>
                                    <button onClick={() => downloadTemplateExcel('driver')} className="w-full text-left px-4 py-2 text-sm text-indigo-600 font-medium flex items-center gap-2"><Info size={16} /> Unduh Template</button>
                                </div>
                            )}
                        </div>
                        <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg active:scale-95"><Plus size={20} /> <span className="hidden sm:inline">Tambah Driver</span></button>
                    </div>
                )}
            </div>
          </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDriversList.map(driver => (
            <div key={driver.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all p-6 group">
                <div className="flex items-center gap-5 mb-6"><img src={driver.image} alt={driver.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-700 shadow-sm" /><div><h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tight uppercase">{driver.name}</h3><div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1"><Phone size={14} className="text-green-500" /> {driver.phone}</div></div></div>
                <div className="flex flex-col gap-3">
                    <button onClick={() => openHistoryModal(driver)} className="w-full py-3 text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 rounded-xl flex items-center justify-center gap-2 transition-colors"><History size={16} /> Riwayat & Laporan</button>
                    {!isDriverView && (
                        <div className="flex gap-2"><button onClick={() => openModal(driver)} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 border dark:border-slate-700 rounded-xl flex items-center justify-center gap-2"><Edit2 size={14} /> Edit</button>{isSuperAdmin && (<button onClick={() => handleDelete(driver.id)} className="p-3 text-red-600 hover:bg-red-50 border border-red-100 rounded-xl"><Trash2 size={18} /></button>)}</div>
                    )}
                </div>
            </div>
        ))}
      </div>

      {/* HISTORY MODAL */}
      {isHistoryModalOpen && historyDriver && (
          <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
                  <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-4">
                          <img src={historyDriver.image} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500 shadow-sm" />
                          <div>
                              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Laporan Driver: {historyDriver.name}</h3>
                              <p className="text-xs text-slate-500 font-bold flex items-center gap-2"><Calendar size={12}/> {new Date(historyStartDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={handleExportHistoryExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-green-700 transition-all active:scale-95"><FileSpreadsheet size={16}/> Excel</button>
                          <button onClick={() => generateMonthlyReportPDF('Driver', historyDriver, new Date(historyStartDate).toLocaleDateString('id-ID', {month:'long', year:'numeric'}), driverHistoryData.expenses, driverHistoryData.trips)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95"><Printer size={16}/> PDF</button>
                          <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-800 border rounded-full transition-colors ml-2"><X size={24}/></button>
                      </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-800 border-b dark:border-slate-700 flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border dark:border-slate-700">
                          <input type="date" className="bg-transparent text-xs font-bold outline-none dark:text-white" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} />
                          <span className="text-slate-400">-</span>
                          <input type="date" className="bg-transparent text-xs font-bold outline-none dark:text-white" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} />
                      </div>
                      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border dark:border-slate-700">
                          <button onClick={() => setActiveHistoryTab('trips')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeHistoryTab === 'trips' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Daftar Perjalanan</button>
                          <button onClick={() => setActiveHistoryTab('expenses')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeHistoryTab === 'expenses' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Gaji & Klaim</button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                      {activeHistoryTab === 'trips' ? (
                          <div className="space-y-3">
                              {driverHistoryData.trips.length === 0 ? <p className="text-center py-10 text-slate-400 italic">Tidak ada perjalanan pada periode ini.</p> : driverHistoryData.trips.map(trip => (
                                  <div key={trip.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-indigo-400 transition-colors">
                                      <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400"><CarIcon size={20}/></div>
                                          <div>
                                              <p className="text-sm font-bold text-slate-800 dark:text-white uppercase">{trip.destination}</p>
                                              <p className="text-[10px] text-slate-500 font-bold">{new Date(trip.startDate).toLocaleDateString('id-ID')} • {trip.customerName}</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-sm font-black text-indigo-600">Rp {trip.driverFee.toLocaleString()}</p>
                                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${trip.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{trip.status}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {driverHistoryData.expenses.length === 0 ? <p className="text-center py-10 text-slate-400 italic">Belum ada catatan keuangan.</p> : driverHistoryData.expenses.map(tx => (
                                  <div key={tx.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 shadow-sm flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.category === 'Gaji' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}><Wallet size={20}/></div>
                                          <div>
                                              <p className="text-sm font-bold text-slate-800 dark:text-white">{tx.description}</p>
                                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(tx.date).toLocaleDateString('id-ID')} • {tx.category}</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-sm font-black text-slate-800 dark:text-white">Rp {tx.amount.toLocaleString()}</p>
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${tx.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{tx.status === 'Paid' ? 'LUNAS' : 'PENDING'}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Trip</p><p className="text-lg font-black text-slate-800 dark:text-white">{driverHistoryData.trips.length}</p></div>
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Gaji (Est)</p><p className="text-lg font-black text-indigo-600">Rp {driverHistoryData.trips.reduce((s,t)=>s+t.driverFee,0).toLocaleString()}</p></div>
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Gaji Terbayar</p><p className="text-lg font-black text-green-600">Rp {driverHistoryData.expenses.filter(e=>e.category==='Gaji'&&e.status==='Paid').reduce((s,e)=>s+e.amount,0).toLocaleString()}</p></div>
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Klaim BBM</p><p className="text-lg font-black text-orange-600">Rp {driverHistoryData.expenses.filter(e=>e.category==='BBM').reduce((s,e)=>s+e.amount,0).toLocaleString()}</p></div>
                  </div>
              </div>
          </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-slate-200 dark:border-slate-700"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{editingDriver ? 'Edit Driver' : 'Tambah Driver'}</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-700 rounded-full p-1.5"><X size={24}/></button></div><form onSubmit={handleSave} className="space-y-6"><div className="flex flex-col items-center"><div className="relative w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-3xl border-4 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden group hover:border-indigo-500 cursor-pointer">{imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <Camera className="w-10 h-10 text-slate-400" />}<input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} /></div></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nama Lengkap</label><input required type="text" className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={name} onChange={e => setName(e.target.value)} /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nomor WA</label><input required type="tel" className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={phone} onChange={e => setPhone(e.target.value)} /></div><div className="flex gap-3 mt-8 pt-6 border-t dark:border-slate-700"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold">Batal</button><button disabled={isUploading} type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700">Simpan</button></div></form></div></div>
      )}
    </div>
  );
};

export default DriversPage;