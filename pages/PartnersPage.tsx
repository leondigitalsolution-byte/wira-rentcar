import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Partner, Booking, Car, User, Transaction, BookingStatus } from '../types';
import { getStoredData, setStoredData, exportToCSV, processCSVImport, mergeData, compressImage } from '../services/dataService';
import { generateMonthlyReportPDF } from '../services/pdfService';
import { Plus, Trash2, Phone, Edit2, X, History, Calendar, CheckCircle, Wallet, Download, Upload, FileText, Filter, Camera, UserCog, FileSpreadsheet, Building2, Search, ExternalLink, Car as CarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [historyPartner, setHistoryPartner] = useState<Partner | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'bookings' | 'deposits'>('bookings');

  // History Filter State
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [split, setSplit] = useState(70);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isPartnerView = currentUser.role === 'partner';

  useEffect(() => {
    setPartners(getStoredData<Partner[]>('partners', []));
    setBookings(getStoredData<Booking[]>('bookings', []));
    setCars(getStoredData<Car[]>('cars', []));
    setTransactions(getStoredData<Transaction[]>('transactions', []));
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

  const openModal = (partner?: Partner) => {
    if (partner) {
        setEditingPartner(partner);
        setName(partner.name);
        setPhone(partner.phone);
        setSplit(partner.splitPercentage);
        setImagePreview(partner.image || null);
    } else {
        setEditingPartner(null);
        setName('');
        setPhone('');
        setSplit(70);
        setImagePreview(null);
    }
    setIsModalOpen(true);
  };

  const openHistoryModal = (partner: Partner) => {
      setHistoryPartner(partner);
      setActiveHistoryTab('bookings');
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      setHistoryStartDate(firstDay);
      setHistoryEndDate(lastDay);
      setIsHistoryModalOpen(true);
  }

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

  const handleRemoveImage = () => setImagePreview(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalImage = imagePreview || `https://i.pravatar.cc/150?u=${Date.now()}`;
    const newPartner: Partner = {
        id: editingPartner ? editingPartner.id : Date.now().toString(),
        name, phone, splitPercentage: Number(split), image: finalImage
    };
    let updatedPartners = editingPartner ? partners.map(p => p.id === editingPartner.id ? newPartner : p) : [newPartner, ...partners];
    setPartners(updatedPartners);
    setStoredData('partners', updatedPartners);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(id === 'office') return;
      if(window.confirm('Hapus data investor ini secara permanen?')) {
          setPartners(prev => {
              const updated = prev.filter(p => p.id !== id);
              setStoredData('partners', updated);
              return updated;
          });
      }
  };

  const calculatePartnerIncome = (partnerId: string) => {
      let totalIncome = 0;
      const partnerCarIds = partnerId === 'office' 
          ? cars.filter(c => !c.partnerId).map(c => c.id)
          : cars.filter(c => c.partnerId === partnerId).map(c => c.id);

      const relevantBookings = bookings.filter(b => partnerCarIds.includes(b.carId) && b.status !== BookingStatus.CANCELLED);

      relevantBookings.forEach(b => {
          const car = cars.find(c => c.id === b.carId);
          if (car) {
              const diffMs = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
              const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
              
              if (partnerId === 'office') {
                  totalIncome += (b.basePrice + (b.overtimeFee || 0) + b.highSeasonFee);
              } else {
                  totalIncome += (car.investorSetoran || 0) * days;
              }
          }
      });
      return totalIncome;
  };

  const filteredHistoryBookings = useMemo(() => {
    if(!historyPartner) return [];
    let partnerCarIds = historyPartner.id === 'office' ? cars.filter(c => !c.partnerId).map(c => c.id) : cars.filter(c => c.partnerId === historyPartner.id).map(c => c.id);
    let filtered = bookings.filter(b => partnerCarIds.includes(b.carId) && b.status !== BookingStatus.CANCELLED);
    if (historyStartDate) filtered = filtered.filter(b => b.startDate.split('T')[0] >= historyStartDate);
    if (historyEndDate) filtered = filtered.filter(b => b.startDate.split('T')[0] <= historyEndDate);
    return filtered.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [historyPartner, bookings, cars, historyStartDate, historyEndDate]);

  const filteredHistoryDeposits = useMemo(() => {
    if(!historyPartner || historyPartner.id === 'office') return [];
    let filtered = transactions.filter(t => (t.category === 'Setor Investor' || t.category === 'Setor Mitra') && t.relatedId === historyPartner.id);
    if (historyStartDate) filtered = filtered.filter(t => t.date >= historyStartDate);
    if (historyEndDate) filtered = filtered.filter(t => t.date <= historyEndDate);
    return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historyPartner, transactions, historyStartDate, historyEndDate]);

  const handlePayTransaction = (id: string) => { navigate('/expenses', { state: { action: 'pay', transactionId: id } }); };

  const handleDownloadReport = () => {
      if (!historyPartner) return;
      const month = historyStartDate ? historyStartDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
      generateMonthlyReportPDF(historyPartner.id === 'office' ? 'KANTOR' as any : 'Investor', historyPartner, month, filteredHistoryDeposits, filteredHistoryBookings);
  };

  const handleExportExcel = () => {
      if (!historyPartner) return;
      const data = activeHistoryTab === 'bookings' ? filteredHistoryBookings.map(b => ({ ID: b.id, Tanggal: new Date(b.startDate).toLocaleDateString('id-ID'), Pelanggan: b.customerName, Total: b.totalPrice })) : filteredHistoryDeposits.map(t => ({ Tanggal: new Date(t.date).toLocaleDateString('id-ID'), Kategori: t.category, Deskripsi: t.description, Nominal: t.amount, Status: t.status }));
      exportToCSV(data, `Laporan_${historyPartner.name}_${activeHistoryTab}`);
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">{isPartnerView ? 'Profil & Pendapatan' : 'Investor & Rekanan'}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Manajemen bagi hasil unit kendaraan.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                {!isPartnerView && (
                    <div className="relative flex-1 min-w-[200px] md:w-64">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cari investor..." 
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
                {!isPartnerView && (
                    <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg active:scale-95">
                        <Plus size={20} /> <span className="hidden sm:inline">Tambah Investor</span>
                    </button>
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
                <div key={partner.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200 hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden border-2 ${isOffice ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-700'}`}>
                                {isOffice ? <Building2 size={32} className="text-indigo-600 dark:text-indigo-400"/> : <img src={partner.image || `https://i.pravatar.cc/150?u=${partner.id}`} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                                <h3 className={`text-xl font-black uppercase tracking-tighter ${isOffice ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-800 dark:text-white'}`}>{partner.name}</h3>
                                <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mt-1 gap-1 font-mono"><Phone size={14} className="text-green-500"/> {partner.phone}</div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`${isOffice ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'} text-[10px] font-black uppercase px-3 py-1 rounded-full`}>
                                {isOffice ? 'ASET KANTOR' : 'MITRA INVESTOR'}
                            </span>
                            {!isPartnerView && !isOffice && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(partner)} className="p-2 text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border dark:border-slate-700"><Edit2 size={16} /></button>
                                    {isSuperAdmin && <button onClick={() => handleDelete(partner.id)} className="p-2 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl hover:text-red-600 dark:hover:text-red-400 transition-all border dark:border-slate-700"><Trash2 size={16} /></button>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={`grid grid-cols-2 gap-4 p-4 rounded-2xl border mb-6 ${isOffice ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-900/50 dark:border-slate-700'}`}>
                        <div><p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">Jumlah Unit</p><p className="font-black text-2xl text-slate-800 dark:text-white">{carCount}</p></div>
                        <div className="text-right"><p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">Hak Bersih</p><p className={`font-black text-2xl ${isOffice ? 'text-indigo-600 dark:text-indigo-400' : 'text-green-600 dark:text-green-400'}`}>Rp {income.toLocaleString('id-ID')}</p></div>
                    </div>
                    <button onClick={() => openHistoryModal(partner)} className={`w-full py-3 text-xs font-black uppercase tracking-widest border rounded-xl flex items-center justify-center gap-2 transition-all ${isOffice ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-lg' : 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 border-indigo-100 dark:border-indigo-800'}`}>
                        <History size={16} /> Riwayat & Laporan
                    </button>
                </div>
              );
          })}
      </div>

       {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{editingPartner ? 'Edit Investor' : 'Tambah Investor'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-700 rounded-full p-1.5"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-6">
                      <div className="flex flex-col items-center">
                          <div className="relative w-28 h-28 bg-slate-100 dark:bg-slate-900 rounded-3xl border-4 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden group hover:border-indigo-500 transition-colors">
                              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-slate-400" />}
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                          </div>
                      </div>
                      <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Nama Investor</label><input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={name} onChange={e => setName(e.target.value)} /></div>
                      <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">No. Telepon</label><input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                      <div className="flex gap-3 mt-8 pt-6 border-t dark:border-slate-700">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold">Batal</button>
                          <button disabled={isUploading} type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700">Simpan</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {isHistoryModalOpen && historyPartner && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white"><Building2 size={24}/></div>
                          <div>
                              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Laporan Investor: {historyPartner.name}</h3>
                              <p className="text-xs text-slate-500">Monitoring laba rugi dan pembagian hasil unit.</p>
                          </div>
                      </div>
                      <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="p-4 border-b dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                          <button onClick={() => setActiveHistoryTab('bookings')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeHistoryTab === 'bookings' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Trip Unit</button>
                          {historyPartner.id !== 'office' && <button onClick={() => setActiveHistoryTab('deposits')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeHistoryTab === 'deposits' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Setoran Dana</button>}
                      </div>
                      <div className="h-8 w-px bg-slate-200 dark:border-slate-700 hidden md:block"></div>
                      <div className="flex items-center gap-2">
                          <input type="date" className="border dark:border-slate-700 dark:bg-slate-900 rounded-lg p-1.5 text-xs font-bold" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} />
                          <span className="text-slate-400 text-xs">-</span>
                          <input type="date" className="border dark:border-slate-700 dark:bg-slate-900 rounded-lg p-1.5 text-xs font-bold" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} />
                      </div>
                      <div className="ml-auto flex gap-2">
                           <button onClick={handleExportExcel} className="p-2 bg-green-50 text-green-600 rounded-lg border border-green-200"><FileSpreadsheet size={18}/></button>
                           <button onClick={handleDownloadReport} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200"><Download size={18}/></button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/30">
                      {activeHistoryTab === 'bookings' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {filteredHistoryBookings.map(b => {
                                  const car = cars.find(c => c.id === b.carId);
                                  const diffMs = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
                                  const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                                  const investorSetoran = historyPartner.id === 'office' ? (b.basePrice + (b.overtimeFee || 0) + b.highSeasonFee) : (car?.investorSetoran || 0) * days;

                                  return (
                                      <div key={b.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 shadow-sm">
                                          <div className="flex justify-between items-start mb-3">
                                              <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded uppercase">#{b.id.slice(0,6)}</span>
                                              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{days} HARI</span>
                                          </div>
                                          <div className="flex items-center gap-3 mb-3">
                                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-400"><CarIcon size={20}/></div>
                                              <div><p className="text-sm font-bold dark:text-white">{car?.name || '-'}</p><p className="text-[10px] text-slate-500 font-mono">{car?.plate || '-'}</p></div>
                                          </div>
                                          <div className="space-y-2 text-xs border-t dark:border-slate-700 pt-3">
                                              <div className="flex justify-between">
                                                  <span className="text-slate-500">Pelanggan:</span>
                                                  <span className="font-bold text-slate-700 dark:text-slate-300">{b.customerName}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                  <span className="text-slate-500">Tgl Sewa:</span>
                                                  <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(b.startDate).toLocaleDateString('id-ID')}</span>
                                              </div>
                                              <div className="flex justify-between pt-2 border-t border-dashed dark:border-slate-700">
                                                  <span className="text-slate-500 font-bold">Hak Laba:</span>
                                                  <span className="font-black text-indigo-600 dark:text-indigo-400">Rp {investorSetoran.toLocaleString('id-ID')}</span>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {filteredHistoryDeposits.map(t => (
                                  <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 flex items-center justify-between shadow-sm">
                                      <div className="flex items-center gap-4">
                                          <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><Wallet size={20}/></div>
                                          <div>
                                              <p className="text-sm font-bold dark:text-white">{t.description}</p>
                                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(t.date).toLocaleDateString('id-ID')}</p>
                                          </div>
                                      </div>
                                      <div className="text-right flex items-center gap-4">
                                          <div>
                                              <p className="text-sm font-black text-slate-800 dark:text-white">Rp {t.amount.toLocaleString('id-ID')}</p>
                                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${t.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{t.status === 'Paid' ? 'DITERIMA' : 'PENDING'}</span>
                                          </div>
                                          {!isPartnerView && t.status === 'Pending' && (
                                               <button onClick={() => handlePayTransaction(t.id)} className="p-2 bg-indigo-600 text-white rounded-lg active:scale-95 transition-all"><ExternalLink size={16}/></button>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PartnersPage;