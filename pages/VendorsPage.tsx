import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Vendor, Booking, Transaction, BookingStatus, Car } from '../types';
import { getStoredData, setStoredData, exportToCSV, processCSVImport, mergeData, compressImage } from '../services/dataService';
import { generateMonthlyReportPDF } from '../services/pdfService';
import { Plus, Trash2, Phone, Edit2, X, Image as ImageIcon, History, Calendar, CheckCircle, Wallet, Download, Upload, Filter, Building, MapPin, DollarSign, FileText, FileSpreadsheet, Search, ExternalLink, Car as CarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VendorsPage = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [historyVendor, setHistoryVendor] = useState<Vendor | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'bookings' | 'payments'>('bookings');

  // History Filter State
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVendors(getStoredData<Vendor[]>('vendors', []));
    setBookings(getStoredData<Booking[]>('bookings', []));
    setTransactions(getStoredData<Transaction[]>('transactions', []));
    setCars(getStoredData<Car[]>('cars', []));
  }, []);

  const filteredVendorsList = useMemo(() => {
    if (!searchTerm) return vendors;
    const low = searchTerm.toLowerCase();
    return vendors.filter(v => v.name.toLowerCase().includes(low) || (v.phone && v.phone.includes(searchTerm)));
  }, [vendors, searchTerm]);

  const openModal = (vendor?: Vendor) => {
    if (vendor) {
        setEditingVendor(vendor);
        setName(vendor.name);
        setPhone(vendor.phone);
        setAddress(vendor.address);
        setImagePreview(vendor.image || null);
    } else {
        setEditingVendor(null);
        setName('');
        setPhone('');
        setAddress('');
        setImagePreview(null);
    }
    setIsModalOpen(true);
  };

  const openHistoryModal = (vendor: Vendor) => {
      setHistoryVendor(vendor);
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
    const newVendor: Vendor = {
        id: editingVendor ? editingVendor.id : Date.now().toString(),
        name, phone, address, image: finalImage
    };
    let updatedVendors = editingVendor ? vendors.map(v => v.id === editingVendor.id ? newVendor : v) : [newVendor, ...vendors];
    setVendors(updatedVendors);
    setStoredData('vendors', updatedVendors);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Hapus data vendor ini secara permanen?')) {
          setVendors(prev => {
              const updated = prev.filter(v => v.id !== id);
              setStoredData('vendors', updated);
              return updated;
          });
      }
  };

  const filteredVendorBookings = useMemo(() => {
    if(!historyVendor) return [];
    let filtered = bookings.filter(b => b.isRentToRent && b.vendorId === historyVendor.id && b.status !== BookingStatus.CANCELLED);
    if (historyStartDate) filtered = filtered.filter(b => b.startDate.split('T')[0] >= historyStartDate);
    if (historyEndDate) filtered = filtered.filter(b => b.startDate.split('T')[0] <= historyEndDate);
    return filtered.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [historyVendor, bookings, historyStartDate, historyEndDate]);

  const filteredVendorPayments = useMemo(() => {
    if(!historyVendor) return [];
    let filtered = transactions.filter(t => (t.category === 'Sewa Vendor' || (t.category === 'Setor Mitra' && t.relatedId === historyVendor.id)) && t.relatedId === historyVendor.id);
    if (historyStartDate) filtered = filtered.filter(t => t.date >= historyStartDate);
    if (historyEndDate) filtered = filtered.filter(t => t.date <= historyEndDate);
    return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historyVendor, transactions, historyStartDate, historyEndDate]);

  const handlePayTransaction = (id: string) => { navigate('/expenses', { state: { action: 'pay', transactionId: id } }); };

  const handleDownloadReport = () => {
      if (!historyVendor) return;
      const month = historyStartDate ? historyStartDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
      generateMonthlyReportPDF('Vendor', historyVendor, month, filteredVendorPayments, filteredVendorBookings);
  };

  const handleExportExcel = () => {
      if (!historyVendor) return;
      const data = activeHistoryTab === 'bookings' ? filteredVendorBookings.map(b => ({
          ID: b.id,
          Tanggal: new Date(b.startDate).toLocaleDateString('id-ID'),
          Pelanggan: b.customerName,
          Unit_External: b.externalCarName,
          HPP_Vendor: b.vendorFee,
          Status: b.status
      })) : filteredVendorPayments.map(t => ({
          Tanggal: new Date(t.date).toLocaleDateString('id-ID'),
          Kategori: t.category,
          Deskripsi: t.description,
          Nominal: t.amount,
          Status: t.status
      }));
      exportToCSV(data, `Laporan_Vendor_${historyVendor.name}_${activeHistoryTab}`);
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">Manajemen Vendor</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Rental rekanan (Vendor) untuk unit eksternal.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] md:w-64">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Cari vendor..." 
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg active:scale-95">
                    <Plus size={20} /> <span className="hidden sm:inline">Tambah Vendor</span>
                </button>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendorsList.map(vendor => {
              const activeRents = bookings.filter(b => b.isRentToRent && b.vendorId === vendor.id && b.status === 'Active').length;
              return (
                <div key={vendor.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <img src={vendor.image || `https://i.pravatar.cc/150?u=${vendor.id}`} alt={vendor.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{vendor.name}</h3>
                                <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mt-1 gap-1 font-mono"><Phone size={14} className="text-green-500" /> {vendor.phone}</div>
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(vendor)} className="p-2 text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl hover:text-indigo-600 transition-all border dark:border-slate-700"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(vendor.id)} className="p-2 text-slate-400 hover:bg-red-50 rounded-xl hover:text-red-600 transition-all border dark:border-slate-700"><Trash2 size={16} /></button>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6">
                        <div className="flex items-center justify-between">
                            <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Unit Dipinjam</p><p className="font-black text-2xl text-slate-800 dark:text-white">{activeRents}</p></div>
                            <Building size={32} className="text-slate-300 dark:text-slate-700" />
                        </div>
                        {vendor.address && <div className="mt-3 pt-3 border-t dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1"><MapPin size={12} className="mt-0.5 flex-shrink-0 text-red-500" /> {vendor.address}</div>}
                    </div>
                    <button onClick={() => openHistoryModal(vendor)} className="w-full py-3 text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 rounded-xl flex items-center justify-center gap-2 transition-colors border border-indigo-100 dark:border-indigo-800">
                        <History size={16} /> Riwayat & Tagihan
                    </button>
                </div>
              );
          })}
      </div>

       {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{editingVendor ? 'Edit Vendor' : 'Tambah Vendor'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-700 rounded-full p-1.5"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-6">
                      <div className="flex flex-col items-center">
                          <div className="relative w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-3xl border-4 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden group hover:border-indigo-500 cursor-pointer">
                              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <ImageIcon className="w-10 h-10 text-slate-400" />}
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                          </div>
                      </div>
                      <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nama Rental (Vendor)</label><input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={name} onChange={e => setName(e.target.value)} /></div>
                      <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">No. Telepon / WA</label><input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                      <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Alamat</label><textarea className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={address} onChange={e => setAddress(e.target.value)} rows={2} /></div>
                      <div className="flex gap-3 mt-8 pt-6 border-t dark:border-slate-700">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold">Batal</button>
                          <button disabled={isUploading} type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Simpan</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {isHistoryModalOpen && historyVendor && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-4">
                          <Building size={32} className="text-indigo-600" />
                          <div><h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Tagihan Vendor: {historyVendor.name}</h3><p className="text-xs text-slate-500">Monitoring penyewaan unit external.</p></div>
                      </div>
                      <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-red-50 text-slate-400 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="p-4 border-b dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                          <button onClick={() => setActiveHistoryTab('bookings')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeHistoryTab === 'bookings' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Unit Dipinjam</button>
                          <button onClick={() => setActiveHistoryTab('payments')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeHistoryTab === 'payments' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Pembayaran</button>
                      </div>
                      <div className="ml-auto flex gap-2">
                           <button onClick={handleExportExcel} className="p-2 bg-green-50 text-green-600 rounded-lg border border-green-200"><FileSpreadsheet size={18}/></button>
                           <button onClick={handleDownloadReport} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200"><Download size={18}/></button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/30">
                      {activeHistoryTab === 'bookings' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {filteredVendorBookings.map(b => (
                                  <div key={b.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 shadow-sm">
                                      <div className="flex justify-between items-start mb-3"><span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900 text-indigo-700 px-2 py-0.5 rounded uppercase">#{b.id.slice(0,6)}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{b.status}</span></div>
                                      <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-400"><CarIcon size={20}/></div><div><p className="text-sm font-bold dark:text-white">{b.externalCarName}</p><p className="text-[10px] text-slate-500 font-mono">{b.externalCarPlate}</p></div></div>
                                      <div className="space-y-2 text-xs border-t dark:border-slate-700 pt-3"><div className="flex justify-between"><span className="text-slate-500">Tgl Sewa:</span><span className="font-medium text-slate-700 dark:text-slate-300">{new Date(b.startDate).toLocaleDateString('id-ID')}</span></div><div className="flex justify-between pt-2 border-t border-dashed dark:border-slate-700"><span className="text-slate-500 font-bold">HPP Vendor:</span><span className="font-black text-red-600 dark:text-red-400">Rp {(b.vendorFee || 0).toLocaleString('id-ID')}</span></div></div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {filteredVendorPayments.map(t => (
                                  <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 flex items-center justify-between shadow-sm">
                                      <div className="flex items-center gap-4"><div className="p-2 rounded-xl bg-red-50 text-red-600"><Wallet size={20}/></div><div><p className="text-sm font-bold dark:text-white">{t.description}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(t.date).toLocaleDateString('id-ID')}</p></div></div>
                                      <div className="text-right flex items-center gap-4"><div><p className="text-sm font-black text-slate-800 dark:text-white">Rp {t.amount.toLocaleString('id-ID')}</p><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${t.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{t.status === 'Paid' ? 'LUNAS' : 'PIUTANG'}</span></div>{t.status === 'Pending' && <button onClick={() => handlePayTransaction(t.id)} className="p-2 bg-indigo-600 text-white rounded-lg active:scale-95 transition-all"><ExternalLink size={16}/></button>}</div>
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

export default VendorsPage;