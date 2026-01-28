import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Vendor, Booking, Transaction, BookingStatus, Car } from '../types';
import { getStoredData, setStoredData, exportToExcel, importFromExcel, mergeData, compressImage, downloadTemplateExcel } from '../services/dataService';
import { Plus, Trash2, Phone, Edit2, X, Image as ImageIcon, History, Download, Upload, Building, MapPin, Search, FileSpreadsheet, Info, ChevronDown, Calendar, Printer, Wallet, Car as CarIcon } from 'lucide-react';
import { generateMonthlyReportPDF } from '../services/pdfService';

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [historyVendor, setHistoryVendor] = useState<Vendor | null>(null);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVendors(getStoredData<Vendor[]>('vendors', []));
    setBookings(getStoredData<Booking[]>('bookings', []));
    setTransactions(getStoredData<Transaction[]>('transactions', []));

    const handleClickOutside = (event: MouseEvent) => {
        if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
            setIsActionMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredVendorsList = useMemo(() => {
    if (!searchTerm) return vendors;
    const low = searchTerm.toLowerCase();
    return vendors.filter(v => v.name.toLowerCase().includes(low) || (v.phone && v.phone.includes(searchTerm)));
  }, [vendors, searchTerm]);

  const openModal = (vendor?: Vendor) => {
    if (vendor) {
        setEditingVendor(vendor); setName(vendor.name); setPhone(vendor.phone); setAddress(vendor.address); setImagePreview(vendor.image || null);
    } else {
        setEditingVendor(null); setName(''); setPhone(''); setAddress(''); setImagePreview(null);
    }
    setIsModalOpen(true);
  };

  const openHistoryModal = (vendor: Vendor) => {
      setHistoryVendor(vendor);
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      setHistoryStartDate(firstDay); setHistoryEndDate(lastDay);
      setIsHistoryModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalImage = imagePreview || `https://i.pravatar.cc/150?u=${Date.now()}`;
    const newVendor: Vendor = { id: editingVendor ? editingVendor.id : Date.now().toString(), name, phone, address, image: finalImage };
    let updated = editingVendor ? vendors.map(v => v.id === editingVendor.id ? newVendor : v) : [newVendor, ...vendors];
    setVendors(updated); setStoredData('vendors', updated); setIsModalOpen(false);
  };

  const handleExport = () => {
    const data = filteredVendorsList.map(v => ({ Nama_Rental: v.name, WhatsApp: v.phone, Alamat: v.address }));
    exportToExcel(data, `Data_Vendor_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          importFromExcel(file, (data) => {
              const imported: Vendor[] = data.map((d: any) => ({
                  id: `vdr-${Date.now()}-${Math.random()}`,
                  name: d.Nama_Rental || d.nama_rental || d.name || 'Tanpa Nama',
                  phone: d.WhatsApp || d.whatsapp || d.phone || '-',
                  address: d.Alamat || d.alamat || '',
                  image: `https://i.pravatar.cc/150?u=${Math.random()}`
              }));
              const merged = mergeData(vendors, imported);
              setVendors(merged);
              setStoredData('vendors', merged);
              alert('Data vendor berhasil diimpor!');
          });
      }
  };

  // --- VENDOR HISTORY LOGIC ---
  const vendorHistoryData = useMemo(() => {
      if (!historyVendor) return { trips: [], expenses: [] };
      const start = historyStartDate || '0000-00-00';
      const end = historyEndDate || '9999-12-31';

      const filteredTrips = bookings.filter(b => 
          b.isRentToRent && b.vendorId === historyVendor.id && 
          b.startDate.split('T')[0] >= start && 
          b.startDate.split('T')[0] <= end &&
          b.status !== BookingStatus.CANCELLED
      ).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

      const filteredExpenses = transactions.filter(t => 
          t.relatedId === historyVendor.id &&
          t.category === 'Sewa Vendor' &&
          t.date.split('T')[0] >= start && 
          t.date.split('T')[0] <= end
      );

      return { trips: filteredTrips, expenses: filteredExpenses };
  }, [historyVendor, historyStartDate, historyEndDate, bookings, transactions]);

  const handleExportHistoryExcel = () => {
    if (!historyVendor) return;
    const historyData = vendorHistoryData.trips.map(t => ({
        Tanggal: new Date(t.startDate).toLocaleDateString('id-ID'),
        Mobil_Vendor: t.externalCarName,
        Nopol: t.externalCarPlate,
        Customer: t.customerName,
        HPP_Vendor: t.vendorFee,
        Status: t.status
    }));

    const combined = [
        { Judul: `LAPORAN VENDOR: ${historyVendor.name.toUpperCase()}` },
        { Judul: `Periode: ${historyStartDate} s/d ${historyEndDate}` },
        {},
        { Judul: "RIWAYAT SEWA UNIT LUAR" },
        ...historyData
    ];

    exportToExcel(combined, `Laporan_Vendor_${historyVendor.name.replace(/\s+/g, '_')}_${historyStartDate}`);
  };

  const handlePrintResume = () => {
    if (!historyVendor) return;
    const monthStr = new Date(historyStartDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    generateMonthlyReportPDF('Vendor', historyVendor, monthStr, vendorHistoryData.expenses, vendorHistoryData.trips);
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div><h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">Manajemen Vendor</h2><p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Rental rekanan (Vendor) untuk unit eksternal.</p></div>
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] md:w-64"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Cari vendor..." className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
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
                                <button onClick={() => downloadTemplateExcel('vendor')} className="w-full text-left px-4 py-2 text-sm text-indigo-600 font-medium flex items-center gap-2"><Info size={16} /> Unduh Template</button>
                            </div>
                        )}
                    </div>
                    <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg active:scale-95"><Plus size={20} /> <span className="hidden sm:inline">Tambah Vendor</span></button>
                </div>
            </div>
          </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendorsList.map(vendor => (
                <div key={vendor.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 group hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-6"><div className="flex items-center gap-4"><div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden"><img src={vendor.image || `https://i.pravatar.cc/150?u=${vendor.id}`} className="w-full h-full object-cover" /></div><div><h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{vendor.name}</h3><div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mt-1 gap-1 font-mono"><Phone size={14} className="text-green-500" /> {vendor.phone}</div></div></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openModal(vendor)} className="p-2 text-slate-400 hover:text-indigo-600 border dark:border-slate-700"><Edit2 size={16} /></button><button onClick={() => {if(confirm('Hapus vendor?')) setVendors(prev => prev.filter(v => v.id !== vendor.id))}} className="p-2 text-slate-400 hover:text-red-600 border dark:border-slate-700"><Trash2 size={16} /></button></div></div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border dark:border-slate-700 mb-6"><div className="flex items-center justify-between"><div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Status Kerjasama</p><p className="font-black text-sm text-green-600">AKTIF</p></div><Building size={32} className="text-slate-300 dark:text-slate-700" /></div>{vendor.address && <div className="mt-3 pt-3 border-t dark:border-slate-700 text-xs text-slate-600 flex items-start gap-1"><MapPin size={12} className="mt-0.5 flex-shrink-0 text-red-500" /> {vendor.address}</div>}</div>
                    <button onClick={() => openHistoryModal(vendor)} className="w-full py-3 text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 rounded-xl flex items-center justify-center gap-2 transition-colors"><History size={16} /> Riwayat & Tagihan</button>
                </div>
          ))}
      </div>

      {/* VENDOR HISTORY MODAL */}
      {isHistoryModalOpen && historyVendor && (
          <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 border dark:border-slate-700">
                  <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border-2 border-red-500">
                              <Building size={24} className="text-red-600"/>
                          </div>
                          <div>
                              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Laporan Vendor: {historyVendor.name}</h3>
                              <p className="text-xs text-slate-500 font-bold flex items-center gap-2"><Calendar size={12}/> {new Date(historyStartDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={handleExportHistoryExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all"><FileSpreadsheet size={16}/> Excel</button>
                          <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-800 border rounded-full ml-2 transition-colors"><X size={24}/></button>
                      </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-800 border-b dark:border-slate-700 flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border dark:border-slate-700">
                          <input type="date" className="bg-transparent text-xs font-bold outline-none dark:text-white" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} />
                          <span className="text-slate-400">-</span>
                          <input type="date" className="bg-transparent text-xs font-bold outline-none dark:text-white" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} />
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                      <div className="space-y-4">
                          <h4 className="font-bold text-xs uppercase text-slate-400 tracking-widest px-2">Daftar Transaksi Sewa Unit Luar</h4>
                          {vendorHistoryData.trips.length === 0 ? <p className="text-center py-10 text-slate-400 italic">Tidak ada transaksi sewa pada periode ini.</p> : vendorHistoryData.trips.map(trip => (
                              <div key={trip.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-red-400 transition-colors">
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400"><CarIcon size={20}/></div>
                                      <div>
                                          <p className="text-sm font-bold text-slate-800 dark:text-white uppercase">{trip.externalCarName} <span className="text-[10px] text-slate-400 font-mono ml-1">{trip.externalCarPlate}</span></p>
                                          <p className="text-[10px] text-slate-500 font-bold">{new Date(trip.startDate).toLocaleDateString('id-ID')} • {trip.customerName}</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-sm font-black text-red-600">Rp {(trip.vendorFee || 0).toLocaleString()}</p>
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600`}>{trip.status}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-between items-center">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tagihan Vendor</p>
                          <p className="text-2xl font-black text-red-600">Rp {vendorHistoryData.trips.reduce((s,t)=>s+(t.vendorFee||0), 0).toLocaleString()}</p>
                      </div>
                      <button onClick={handlePrintResume} className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform"><Printer size={18}/> Cetak Resume</button>
                  </div>
              </div>
          </div>
      )}

       {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl border dark:border-slate-700"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{editingVendor ? 'Edit Vendor' : 'Tambah Vendor'}</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-700 rounded-full p-1.5"><X size={24}/></button></div><form onSubmit={handleSave} className="space-y-6"><div className="flex flex-col items-center"><div className="relative w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-3xl border-4 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden group">{imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <ImageIcon className="w-10 h-10 text-slate-400" />}<input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {const file=e.target.files?.[0]; if(file) compressImage(file).then(res => setImagePreview(res))}} /></div></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nama Rental (Vendor)</label><input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={name} onChange={e => setName(e.target.value)} /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">No. Telepon / WA</label><input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={phone} onChange={e => setPhone(e.target.value)} /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Alamat</label><textarea className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={address} onChange={e => setAddress(e.target.value)} rows={2} /></div><div className="flex gap-3 mt-8 pt-6 border-t dark:border-slate-700"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold">Batal</button><button disabled={isUploading} type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl">Simpan</button></div></form></div></div>
      )}
    </div>
  );
};

export default VendorsPage;
