import React, { useState, useEffect, useRef } from 'react';
import { Partner, Booking, Car, User, Transaction, BookingStatus } from '../types';
import { getStoredData, setStoredData, exportToCSV, processCSVImport, mergeData, compressImage } from '../services/dataService';
import { generateMonthlyReportPDF } from '../services/pdfService';
import { Plus, Trash2, Phone, Edit2, X, History, Calendar, CheckCircle, Wallet, Download, Upload, FileText, Filter, Camera, UserCog, FileSpreadsheet, Building2 } from 'lucide-react';
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
    let updatedPartners = editingPartner ? partners.map(p => p.id === editingPartner.id ? newPartner : p) : [...partners, newPartner];
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

  // NEW LOGIC: Calculate income based on fixed investorSetoran per car
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
                  // Office revenue = Total Price - Driver Fee (if any) - External Cost - Investor Share (if any)
                  // Simplified: Office keeps 100% of profit from own assets
                  totalIncome += (b.basePrice + (b.overtimeFee || 0) + b.highSeasonFee);
              } else {
                  // Investor revenue = Fixed Setoran from car model x days
                  totalIncome += (car.investorSetoran || 0) * days;
              }
          }
      });

      return totalIncome;
  };

  const officePartner: Partner = {
      id: 'office', name: 'KANTOR (Aset Sendiri)', phone: '-', splitPercentage: 100,
      image: 'https://cdn-icons-png.flaticon.com/512/10149/10149258.png'
  };

  const allPartnersList = isPartnerView ? partners.filter(p => p.id === currentUser.linkedPartnerId) : [officePartner, ...partners];

  const getPartnerBookings = () => {
      if(!historyPartner) return [];
      let partnerCarIds = historyPartner.id === 'office' ? cars.filter(c => !c.partnerId).map(c => c.id) : cars.filter(c => c.partnerId === historyPartner.id).map(c => c.id);
      let filtered = bookings.filter(b => partnerCarIds.includes(b.carId) && b.status !== BookingStatus.CANCELLED);
      if (historyStartDate || historyEndDate) {
          filtered = filtered.filter(b => {
              const date = b.startDate.split('T')[0];
              return date >= (historyStartDate || '0000-00-00') && date <= (historyEndDate || '9999-12-31');
          });
      }
      return filtered.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  };

  const getPartnerDeposits = () => {
      if(!historyPartner || historyPartner.id === 'office') return [];
      let filtered = transactions.filter(t => (t.category === 'Setor Investor') && t.relatedId === historyPartner.id);
      if (historyStartDate || historyEndDate) {
          filtered = filtered.filter(t => {
              const date = t.date.split('T')[0];
              return date >= (historyStartDate || '0000-00-00') && date <= (historyEndDate || '9999-12-31');
          });
      }
      return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handlePayTransaction = (id: string) => { navigate('/expenses', { state: { action: 'pay', transactionId: id } }); };

  const handleDownloadReport = () => {
      if (!historyPartner) return;
      const month = historyStartDate ? historyStartDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
      generateMonthlyReportPDF(historyPartner.id === 'office' ? 'KANTOR' as any : 'Investor', historyPartner, month, getPartnerDeposits(), getPartnerBookings());
  };

  const handleExportExcel = () => {
      if (!historyPartner) return;
      const data = activeHistoryTab === 'bookings' ? getPartnerBookings().map(b => ({ ID: b.id, Tanggal: new Date(b.startDate).toLocaleDateString('id-ID'), Pelanggan: b.customerName, Total: b.totalPrice })) : getPartnerDeposits().map(t => ({ Tanggal: new Date(t.date).toLocaleDateString('id-ID'), Kategori: t.category, Deskripsi: t.description, Nominal: t.amount, Status: t.status }));
      exportToCSV(data, `Laporan_${historyPartner.name}_${activeHistoryTab}`);
  };

  const handleExport = () => exportToCSV(partners, 'Data_Investor');
  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) processCSVImport(file, (data) => {
          const merged = mergeData(partners, data as Partner[]);
          setPartners(merged); setStoredData('partners', merged); alert('Data investor diproses!');
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{isPartnerView ? 'Profil & Pendapatan' : 'Investor & Rekanan'}</h2>
          <p className="text-slate-500">Kelola investor pemilik mobil dan unit internal kantor.</p>
        </div>
        {!isPartnerView && (
            <div className="flex gap-2">
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportFile} />
                <button onClick={handleImportClick} className="bg-white border text-slate-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"><Upload size={16} /> Import</button>
                <button onClick={handleExport} className="bg-white border text-slate-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"><Download size={16} /> Export</button>
                <button onClick={() => openModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={18} /> Tambah Investor</button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allPartnersList.map(partner => {
              const isOffice = partner.id === 'office';
              const income = calculatePartnerIncome(partner.id);
              const carCount = isOffice ? cars.filter(c => !c.partnerId).length : cars.filter(c => c.partnerId === partner.id).length;
              return (
                <div key={partner.id} className={`bg-white p-6 rounded-xl shadow-sm border ${isOffice ? 'border-indigo-300 ring-1 ring-indigo-50' : 'border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden border ${isOffice ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-100 border-slate-200'}`}>
                                {isOffice ? <Building2 size={28} className="text-indigo-600"/> : <img src={partner.image || `https://i.pravatar.cc/150?u=${partner.id}`} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                                <h3 className={`text-xl font-bold ${isOffice ? 'text-indigo-900' : 'text-slate-800'}`}>{partner.name}</h3>
                                <div className="flex items-center text-slate-500 text-sm mt-1 gap-1"><Phone size={14} /> {partner.phone}</div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`${isOffice ? 'bg-indigo-600 text-white' : 'bg-green-100 text-green-800'} text-[10px] font-black uppercase px-3 py-1 rounded-full`}>
                                {isOffice ? 'ASET KANTOR' : 'MITRA INVESTOR'}
                            </span>
                            {!isPartnerView && !isOffice && (
                                <div className="flex gap-1">
                                    <button onClick={() => openModal(partner)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded border"><Edit2 size={16} /></button>
                                    {isSuperAdmin && <button onClick={() => handleDelete(partner.id)} className="p-1.5 text-slate-500 hover:bg-red-50 rounded border"><Trash2 size={16} /></button>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={`grid grid-cols-2 gap-4 p-4 rounded-lg border mb-4 ${isOffice ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div><p className="text-[10px] text-slate-500 uppercase font-black">Unit</p><p className="font-bold text-xl">{carCount}</p></div>
                        <div><p className="text-[10px] text-slate-500 uppercase font-black">Hak Bersih</p><p className={`font-bold text-xl ${isOffice ? 'text-indigo-600' : 'text-green-600'}`}>Rp {income.toLocaleString('id-ID')}</p></div>
                    </div>
                    <button onClick={() => openHistoryModal(partner)} className={`w-full py-2 text-sm font-bold border rounded-lg flex items-center justify-center gap-2 transition-colors ${isOffice ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700' : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'}`}>
                        <History size={16} /> Riwayat & Laporan
                    </button>
                    <div className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
                        <p className="mb-2 font-bold uppercase text-[9px] tracking-wider">Unit Terkait:</p>
                        <div className="grid grid-cols-1 gap-1">
                            {cars.filter(c => isOffice ? !c.partnerId : c.partnerId === partner.id).map(c => (
                                <div key={c.id} className="flex justify-between items-center py-1">
                                    <span className="font-medium text-slate-700">{c.name}</span>
                                    <span className="text-[10px] font-bold text-indigo-600">Rp {c.investorSetoran?.toLocaleString() || 0}/hr</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              );
          })}
      </div>

       {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">{editingPartner ? 'Edit Investor' : 'Tambah Investor'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div className="flex flex-col items-center mb-4">
                          <div className="relative w-28 h-28 bg-slate-100 rounded-full border-4 border-slate-50 flex items-center justify-center overflow-hidden">
                              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-slate-400" />}
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                          </div>
                      </div>
                      <div><label className="block text-sm font-medium">Nama Investor</label><input required className="w-full border rounded-lg p-2.5 mt-1" value={name} onChange={e => setName(e.target.value)} /></div>
                      <div><label className="block text-sm font-medium">No. Telepon</label><input required className="w-full border rounded-lg p-2.5 mt-1" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                      <div className="flex gap-3 mt-6 pt-4 border-t">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg">Batal</button>
                          <button disabled={isUploading} type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold">Simpan</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {isHistoryModalOpen && historyPartner && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl w-full max-w-3xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                         <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 overflow-hidden">
                                {historyPartner.id === 'office' ? <Building2 className="text-indigo-600"/> : <img src={historyPartner.image} className="w-full h-full object-cover" />}
                            </div>
                            <h3 className="font-bold text-xl text-slate-800">{historyPartner.name}</h3>
                         </div>
                         <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={handleExportExcel} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"><FileSpreadsheet size={16}/> Excel</button>
                            <button onClick={handleDownloadReport} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold"><FileText size={16}/> PDF</button>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400"><X size={24}/></button>
                         </div>
                    </div>
                    <div className="flex gap-2 border-b mb-4">
                        <button onClick={() => setActiveHistoryTab('bookings')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeHistoryTab === 'bookings' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'}`}>Data Penyewaan</button>
                        {historyPartner.id !== 'office' && <button onClick={() => setActiveHistoryTab('deposits')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeHistoryTab === 'deposits' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'}`}>Riwayat Pembayaran</button>}
                    </div>
                    <div className="flex items-center gap-2 mb-4 bg-slate-50 p-2 rounded-lg border">
                        <Filter size={14} className="text-slate-500 ml-1" />
                        <input type="date" className="border rounded px-2 py-1 text-xs" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} />
                        <span className="text-xs text-slate-400">-</span>
                        <input type="date" className="border rounded px-2 py-1 text-xs" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} />
                    </div>
                    <div className="min-h-[300px]">
                        {activeHistoryTab === 'bookings' ? (
                            <div className="space-y-3">
                                {getPartnerBookings().map(booking => {
                                    const car = cars.find(c => c.id === booking.carId);
                                    const diffMs = new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime();
                                    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                                    const setoran = historyPartner.id === 'office' ? (booking.basePrice + (booking.overtimeFee || 0) + booking.highSeasonFee) : (car?.investorSetoran || 0) * days;
                                    return (
                                        <div key={booking.id} className="p-3 border rounded-lg bg-slate-50 flex justify-between items-center">
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{booking.customerName}</div>
                                                <div className="text-xs text-slate-500">{new Date(booking.startDate).toLocaleDateString('id-ID')} ({days} hr) • {car?.name}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-indigo-600">Rp {setoran.toLocaleString()}</div>
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${booking.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{booking.status}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {getPartnerDeposits().map(tx => (
                                    <div key={tx.id} className="p-3 border rounded-lg bg-white flex justify-between items-center">
                                        <div>
                                            <div className="text-sm font-bold">{tx.description}</div>
                                            <div className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString('id-ID')}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-green-600">Rp {tx.amount.toLocaleString()}</div>
                                            <span className={`text-[10px] font-bold ${tx.status === 'Paid' ? 'text-green-600' : 'text-orange-600'}`}>{tx.status === 'Paid' ? 'DIBAYAR' : 'PENDING'}</span>
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