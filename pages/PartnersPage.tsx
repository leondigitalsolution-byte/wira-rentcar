import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Partner, Booking, Car, User, Transaction, BookingStatus } from '../types';
import { getStoredData, setStoredData, exportToExcel, importFromExcel, mergeData, compressImage, downloadTemplateExcel } from '../services/dataService';
import { Plus, Trash2, Phone, Edit2, X, History, Wallet, Download, Upload, Filter, Camera, UserCog, FileSpreadsheet, Building2, Search, ExternalLink, Car as CarIcon, ChevronDown, Info, Printer, Calendar, Tag, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateMonthlyReportPDF } from '../services/pdfService';

interface Props {
    currentUser: User;
}

const PartnersPage: React.FC<Props> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [historyPartner, setHistoryPartner] = useState<Partner | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'bookings' | 'deposits'>('bookings');

  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [split, setSplit] = useState(70);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isPartnerView = currentUser.role === 'partner';

  useEffect(() => {
    setPartners(getStoredData<Partner[]>('partners', []));
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

  const officePartner: Partner = {
      id: 'office', name: 'KANTOR (Aset Sendiri)', phone: '-', splitPercentage: 100,
      image: 'https://cdn-icons-png.flaticon.com/512/10149/10149258.png'
  };

  const filteredPartnersList = useMemo(() => {
    let base = isPartnerView ? partners.filter(p => p.id === currentUser.linkedPartnerId) : [officePartner, ...partners];
    if (searchTerm) {
        const low = searchTerm.toLowerCase();
        base = base.filter(p => p.name.toLowerCase().includes(low) || (p.phone && p.phone.includes(searchTerm)));
    }
    return base;
  }, [partners, isPartnerView, currentUser, searchTerm]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const compressed = await compressImage(file);
        setImagePreview(compressed);
      } catch (err) {
        alert("Gagal memproses gambar.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const openModal = (partner?: Partner) => {
    if (partner) {
        setEditingPartner(partner); setName(partner.name); setPhone(partner.phone); setSplit(partner.splitPercentage); setImagePreview(partner.image || null);
    } else {
        setEditingPartner(null); setName(''); setPhone(''); setSplit(70); setImagePreview(null);
    }
    setIsModalOpen(true);
  };

  const openHistoryModal = (partner: Partner) => {
      setHistoryPartner(partner); setActiveHistoryTab('bookings');
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      setHistoryStartDate(firstDay); setHistoryEndDate(lastDay);
      setIsHistoryModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalImage = imagePreview || `https://i.pravatar.cc/150?u=${Date.now()}`;
    const newPartner: Partner = { id: editingPartner ? editingPartner.id : Date.now().toString(), name, phone, splitPercentage: Number(split), image: finalImage };
    let updated = editingPartner ? partners.map(p => p.id === editingPartner.id ? newPartner : p) : [newPartner, ...partners];
    setPartners(updated); setStoredData('partners', updated); setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Hapus data investor ini secara permanen?')) {
          const updated = partners.filter(p => p.id !== id);
          setPartners(updated);
          setStoredData('partners', updated);
      }
  };

  const handleExport = () => {
    const data = filteredPartnersList.filter(p => p.id !== 'office').map(p => ({ Nama: p.name, WhatsApp: p.phone, Bagi_Hasil: `${p.splitPercentage}%` }));
    exportToExcel(data, `Data_Investor_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          importFromExcel(file, (data) => {
              const imported: Partner[] = data.map((d: any) => ({
                  id: `inv-${Date.now()}-${Math.random()}`,
                  name: d.Nama || d.nama || 'Tanpa Nama',
                  phone: d.WhatsApp || d.whatsapp || d.phone || '-',
                  splitPercentage: 70,
                  image: `https://i.pravatar.cc/150?u=${Math.random()}`
              }));
              const merged = mergeData(partners, imported);
              setPartners(merged);
              setStoredData('partners', merged);
              alert('Data investor berhasil diimpor!');
          });
      }
  };

  const calculatePartnerIncome = (partnerId: string) => {
      let totalIncome = 0;
      const partnerCarIds = partnerId === 'office' ? cars.filter(c => !c.partnerId).map(c => c.id) : cars.filter(c => c.partnerId === partnerId).map(c => c.id);
      const relevantBookings = bookings.filter(b => partnerCarIds.includes(b.carId) && b.status !== BookingStatus.CANCELLED);
      relevantBookings.forEach(b => {
          const car = cars.find(c => c.id === b.carId);
          if (car) {
              const diffMs = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
              const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
              if (partnerId === 'office') totalIncome += (b.basePrice + (b.overtimeFee || 0) + b.highSeasonFee);
              else totalIncome += (car.investorSetoran || 0) * days;
          }
      });
      return totalIncome;
  };

  // --- MODAL DATA CALCULATION ---
  const partnerHistoryData = useMemo(() => {
      if (!historyPartner) return { trips: [], deposits: [] };
      const start = historyStartDate || '0000-00-00';
      const end = historyEndDate || '9999-12-31';

      const partnerCarIds = historyPartner.id === 'office' 
          ? cars.filter(c => !c.partnerId).map(c => c.id)
          : cars.filter(c => c.partnerId === historyPartner.id).map(c => c.id);

      const filteredTrips = bookings.filter(b => 
          partnerCarIds.includes(b.carId) && 
          b.startDate.split('T')[0] >= start && 
          b.startDate.split('T')[0] <= end &&
          b.status !== BookingStatus.CANCELLED
      ).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

      const filteredDeposits = transactions.filter(t => 
          t.relatedId === historyPartner.id &&
          (t.category === 'Setor Investor' || t.category === 'Setor Mitra') &&
          t.date.split('T')[0] >= start && 
          t.date.split('T')[0] <= end
      ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return { trips: filteredTrips, deposits: filteredDeposits };
  }, [historyPartner, historyStartDate, historyEndDate, bookings, transactions, cars]);

  const handleExportHistoryExcel = () => {
    if (!historyPartner) return;
    const tripData = partnerHistoryData.trips.map(t => {
        const car = cars.find(c => c.id === t.carId);
        const days = Math.max(1, Math.ceil((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24)));
        return {
            Tanggal: new Date(t.startDate).toLocaleDateString('id-ID'),
            Mobil: car?.name,
            Plat: car?.plate,
            Durasi: `${days} Hari`,
            Tamu: t.customerName,
            Dividen: (car?.investorSetoran || 0) * days,
            Status: t.status
        };
    });
    const depositData = partnerHistoryData.deposits.map(d => ({
        Tanggal: new Date(d.date).toLocaleDateString('id-ID'),
        Keterangan: d.description,
        Kategori: d.category,
        Nominal: d.amount,
        Status: d.status
    }));

    const combined = [
        { Judul: `LAPORAN INVESTOR: ${historyPartner.name.toUpperCase()}` },
        { Judul: `Periode: ${historyStartDate} s/d ${historyEndDate}` },
        {},
        { Judul: "KINERJA UNIT (PENGGUNAAN)" },
        ...tripData,
        {},
        { Judul: "RIWAYAT SETORAN BAGI HASIL" },
        ...depositData
    ];

    exportToExcel(combined, `Laporan_Investor_${historyPartner.name.replace(/\s+/g, '_')}_${historyStartDate}`);
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div><h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">{isPartnerView ? 'Profil & Pendapatan' : 'Investor & Rekanan'}</h2><p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Manajemen bagi hasil unit kendaraan.</p></div>
            <div className="flex flex-wrap items-center gap-3">
                {!isPartnerView && (<div className="relative flex-1 min-w-[200px] md:w-64"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Cari investor..." className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>)}
                {!isPartnerView && (
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
                                    <button onClick={() => downloadTemplateExcel('investor')} className="w-full text-left px-4 py-2 text-sm text-indigo-600 font-medium flex items-center gap-2"><Info size={16} /> Unduh Template</button>
                                </div>
                            )}
                        </div>
                        <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg active:scale-95"><Plus size={20} /> <span className="hidden sm:inline">Tambah Investor</span></button>
                    </div>
                )}
            </div>
          </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPartnersList.map(partner => {
              const isOffice = partner.id === 'office';
              const income = calculatePartnerIncome(partner.id);
              const carCount = isOffice ? cars.filter(c => !c.partnerId).length : cars.filter(c => c.partnerId === partner.id).length;
              return (
                <div key={partner.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 group hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4"><div className={`w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden border-2 ${isOffice ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-100 border-slate-200'}`}>{isOffice ? <Building2 size={32} className="text-indigo-600"/> : <img src={partner.image || `https://i.pravatar.cc/150?u=${partner.id}`} className="w-full h-full object-cover" />}</div><div><h3 className={`text-xl font-black uppercase tracking-tighter ${isOffice ? 'text-indigo-900' : 'text-slate-800 dark:text-white'}`}>{partner.name}</h3><div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mt-1 gap-1 font-mono"><Phone size={14} className="text-green-500"/> {partner.phone}</div></div></div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`${isOffice ? 'bg-indigo-600 text-white shadow-lg' : 'bg-green-100 text-green-800'} text-[10px] font-black uppercase px-3 py-1 rounded-full`}>{isOffice ? 'ASET KANTOR' : 'MITRA INVESTOR'}</span>
                            {!isOffice && !isPartnerView && (
                                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(partner)} className="p-1.5 text-slate-400 hover:text-indigo-600 border dark:border-slate-700 rounded-lg" title="Edit Data"><Edit2 size={14}/></button>
                                    {isSuperAdmin && <button onClick={() => handleDelete(partner.id)} className="p-1.5 text-slate-400 hover:text-red-600 border dark:border-slate-700 rounded-lg" title="Hapus Permanen"><Trash2 size={14}/></button>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={`grid grid-cols-2 gap-4 p-4 rounded-2xl border mb-6 ${isOffice ? 'bg-indigo-50/50' : 'bg-slate-50'}`}><div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Jumlah Unit</p><p className="font-black text-2xl text-slate-800 dark:text-white">{carCount}</p></div><div className="text-right"><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Hak Bersih</p><p className={`font-black text-2xl ${isOffice ? 'text-indigo-600' : 'text-green-600'}`}>Rp {income.toLocaleString('id-ID')}</p></div></div>
                    <button onClick={() => openHistoryModal(partner)} className="w-full py-3 text-xs font-black uppercase tracking-widest border border-indigo-100 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center gap-2 transition-colors"><History size={16} /> Riwayat & Laporan</button>
                </div>
              );
          })}
      </div>

      {/* HISTORY MODAL */}
      {isHistoryModalOpen && historyPartner && (
          <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
                  <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border-2 border-indigo-500">
                             {historyPartner.id === 'office' ? <Building2 size={24} className="text-indigo-600"/> : <img src={historyPartner.image} className="w-full h-full object-cover rounded-lg" />}
                          </div>
                          <div>
                              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Laporan Investor: {historyPartner.name}</h3>
                              <p className="text-xs text-slate-500 font-bold flex items-center gap-2"><Calendar size={12}/> {new Date(historyStartDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={handleExportHistoryExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all"><FileSpreadsheet size={16}/> Excel</button>
                          <button onClick={() => generateMonthlyReportPDF('Investor', historyPartner, new Date(historyStartDate).toLocaleDateString('id-ID', {month:'long', year:'numeric'}), partnerHistoryData.deposits, partnerHistoryData.trips)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"><Printer size={16}/> PDF</button>
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
                          <button onClick={() => setActiveHistoryTab('bookings')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeHistoryTab === 'bookings' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Kinerja Unit</button>
                          <button onClick={() => setActiveHistoryTab('deposits')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeHistoryTab === 'deposits' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Riwayat Setoran</button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                      {activeHistoryTab === 'bookings' ? (
                          <div className="space-y-3">
                              {partnerHistoryData.trips.length === 0 ? <p className="text-center py-10 text-slate-400 italic">Tidak ada penggunaan unit pada periode ini.</p> : partnerHistoryData.trips.map(trip => {
                                  const car = cars.find(c => c.id === trip.carId);
                                  const diffMs = new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime();
                                  const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                                  const estDividend = (car?.investorSetoran || 0) * days;
                                  
                                  return (
                                    <div key={trip.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-indigo-400 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <img src={car?.image} className="w-10 h-10 rounded-xl object-cover border" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white uppercase">{car?.name} <span className="text-[10px] text-slate-400 font-mono ml-1">{car?.plate}</span></p>
                                                <p className="text-[10px] text-slate-500 font-bold">{new Date(trip.startDate).toLocaleDateString('id-ID')} • {days} Hari • {trip.customerName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-indigo-600">Rp {estDividend.toLocaleString()}</p>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${trip.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{trip.status}</span>
                                        </div>
                                    </div>
                                  );
                              })}
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {partnerHistoryData.deposits.length === 0 ? <p className="text-center py-10 text-slate-400 italic">Belum ada riwayat setoran bagi hasil.</p> : partnerHistoryData.deposits.map(tx => (
                                  <div key={tx.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 shadow-sm flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Wallet size={20}/></div>
                                          <div>
                                              <p className="text-sm font-bold text-slate-800 dark:text-white">{tx.description}</p>
                                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(tx.date).toLocaleDateString('id-ID')} • {tx.category}</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-sm font-black text-slate-800 dark:text-white">Rp {tx.amount.toLocaleString()}</p>
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${tx.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{tx.status === 'Paid' ? 'DIKIRIM' : 'PENDING'}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Unit Terpakai</p>
                          <p className="text-lg font-black text-slate-800 dark:text-white">{partnerHistoryData.trips.length} Transaksi</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Potensi Bagi Hasil</p>
                          <p className="text-lg font-black text-indigo-600">Rp {partnerHistoryData.trips.reduce((s,t) => {
                              const car = cars.find(c => c.id === t.carId);
                              const days = Math.max(1, Math.ceil((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24)));
                              return s + ((car?.investorSetoran || 0) * days);
                          }, 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Setoran Diterima</p>
                          <p className="text-lg font-black text-green-600">Rp {partnerHistoryData.deposits.filter(e=>e.status==='Paid').reduce((s,e)=>s+e.amount,0).toLocaleString()}</p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-200"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{editingPartner ? 'Edit Investor' : 'Tambah Investor'}</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-700 rounded-full p-1.5"><X size={24}/></button></div><form onSubmit={handleSave} className="space-y-6"><div className="flex flex-col items-center"><div className="relative w-28 h-28 bg-slate-100 rounded-3xl border-4 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">{imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-slate-400" />}<input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} /></div></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nama Investor</label>
          {/* Correction: Use e.target.value instead of target.value */}
          <input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={name} onChange={e => setName(e.target.value)} /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">No. Telepon</label><input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={phone} onChange={e => setPhone(e.target.value)} /></div><div className="flex gap-3 mt-8 pt-6 border-t dark:border-slate-700"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold">Batal</button><button disabled={isUploading} type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700">Simpan</button></div></form></div></div>
      )}
    </div>
  );
};

export default PartnersPage;