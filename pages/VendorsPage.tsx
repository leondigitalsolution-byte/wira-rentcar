
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Vendor, Booking, Transaction, BookingStatus, Car } from '../types';
import { getStoredData, setStoredData, exportToExcel, importFromExcel, mergeData, compressImage, downloadTemplateExcel } from '../services/dataService';
import { Plus, Trash2, Phone, Edit2, X, Image as ImageIcon, History, Download, Upload, Building, MapPin, Search, FileSpreadsheet, Info, ChevronDown } from 'lucide-react';

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVendors(getStoredData<Vendor[]>('vendors', []));
    setBookings(getStoredData<Booking[]>('bookings', []));

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
                    <button onClick={() => alert('Fitur laporan vendor dalam pengembangan')} className="w-full py-3 text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 rounded-xl flex items-center justify-center gap-2"><History size={16} /> Riwayat & Tagihan</button>
                </div>
          ))}
      </div>
       {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl border dark:border-slate-700"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{editingVendor ? 'Edit Vendor' : 'Tambah Vendor'}</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-700 rounded-full p-1.5"><X size={24}/></button></div><form onSubmit={handleSave} className="space-y-6"><div className="flex flex-col items-center"><div className="relative w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-3xl border-4 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden group">{imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <ImageIcon className="w-10 h-10 text-slate-400" />}<input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {const file=e.target.files?.[0]; if(file) compressImage(file).then(res => setImagePreview(res))}} /></div></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nama Rental (Vendor)</label><input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={name} onChange={e => setName(e.target.value)} /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">No. Telepon / WA</label><input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={phone} onChange={e => setPhone(e.target.value)} /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Alamat</label><textarea className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={address} onChange={e => setAddress(e.target.value)} rows={2} /></div><div className="flex gap-3 mt-8 pt-6 border-t dark:border-slate-700"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold">Batal</button><button disabled={isUploading} type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl">Simpan</button></div></form></div></div>
      )}
    </div>
  );
};

export default VendorsPage;
