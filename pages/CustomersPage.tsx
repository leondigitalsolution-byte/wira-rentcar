
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Customer, User } from '../types';
import { getStoredData, setStoredData, exportToExcel, importFromExcel, mergeData, compressImage, downloadTemplateExcel } from '../services/dataService';
// Added Info to lucide-react imports
import { Plus, Trash2, Edit2, Phone, MapPin, X, UserCircle, Upload, Download, Search, Filter, FileSpreadsheet, ChevronDown, Info } from 'lucide-react';

interface Props {
    currentUser: User;
}

const CustomersPage: React.FC<Props> = ({ currentUser }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const isSuperAdmin = currentUser.role === 'superadmin';

  useEffect(() => {
    setCustomers(getStoredData<Customer[]>('customers', []));
    
    const handleClickOutside = (event: MouseEvent) => {
        if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
            setIsActionMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const lower = searchTerm.toLowerCase();
    return customers.filter(c => 
        c.name.toLowerCase().includes(lower) || 
        c.phone.includes(searchTerm) ||
        (c.address && c.address.toLowerCase().includes(lower))
    );
  }, [searchTerm, customers]);

  const openModal = (cust?: Customer) => {
    if (cust) {
        setEditingCustomer(cust);
        setName(cust.name);
        setPhone(cust.phone);
        setAddress(cust.address);
    } else {
        setEditingCustomer(null);
        setName(''); setPhone(''); setAddress('');
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust: Customer = {
        id: editingCustomer ? editingCustomer.id : Date.now().toString(),
        name, phone, address
    };
    let updated = editingCustomer ? customers.map(c => c.id === editingCustomer.id ? newCust : c) : [newCust, ...customers];
    setCustomers(updated);
    setStoredData('customers', updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Hapus data pelanggan ini secara permanen?')) {
          const updated = customers.filter(c => c.id !== id);
          setCustomers(updated);
          setStoredData('customers', updated);
      }
  };

  const handleExport = () => {
    const data = filteredCustomers.map(c => ({ Nama: c.name, WhatsApp: c.phone, Alamat: c.address }));
    exportToExcel(data, `Data_Pelanggan_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          importFromExcel(file, (data) => {
              const imported: Customer[] = data.map((d: any) => ({
                  id: `cust-${Date.now()}-${Math.random()}`,
                  name: d.Nama || d.nama || 'Tanpa Nama',
                  phone: d.WhatsApp || d.whatsapp || d.phone || '-',
                  address: d.Alamat || d.alamat || ''
              }));
              const merged = mergeData(customers, imported);
              setCustomers(merged);
              setStoredData('customers', merged);
              alert('Data pelanggan berhasil diimpor!');
          });
      }
  };

  const handleWhatsApp = (phone: string) => {
      const clean = phone.replace(/\D/g, '').replace(/^0/, '62');
      window.open(`https://wa.me/${clean}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">Data Pelanggan</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Database penyewa terintegrasi.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] md:w-64">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari nama atau nomor..." className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
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
                                <button onClick={() => downloadTemplateExcel('pelanggan')} className="w-full text-left px-4 py-2 text-sm text-indigo-600 font-medium flex items-center gap-2"><Info size={16} /> Unduh Template</button>
                            </div>
                        )}
                    </div>
                    <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg active:scale-95"><Plus size={20} /> <span className="hidden sm:inline">Tambah Pelanggan</span></button>
                </div>
            </div>
          </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredCustomers.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><UserCircle size={28} /></div><div><h3 className="font-bold text-slate-800 dark:text-white text-lg">{c.name}</h3><button onClick={() => handleWhatsApp(c.phone)} className="text-sm text-green-600 font-medium flex items-center gap-1"><Phone size={14} /> {c.phone}</button></div></div>
                      <div className="flex gap-1"><button onClick={() => openModal(c)} className="p-2 bg-slate-50 dark:bg-slate-700 text-indigo-600 rounded-lg border dark:border-slate-600"><Edit2 size={18} /></button>{isSuperAdmin && <button onClick={() => handleDelete(c.id)} className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100"><Trash2 size={18} /></button>}</div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700"><div className="flex items-start gap-2 text-slate-600 dark:text-slate-400 text-sm"><MapPin size={16} className="mt-0.5 text-slate-400 flex-shrink-0" /><p>{c.address || '-'}</p></div></div>
              </div>
          ))}
          {filteredCustomers.length === 0 && (<div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700"><UserCircle size={48} className="mx-auto text-slate-300 mb-4 opacity-50" /><p className="text-slate-500 font-bold">Tidak ada data pelanggan.</p></div>)}
      </div>
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/50"><tr><th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Nama Pelanggan</th><th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Kontak</th><th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Alamat</th><th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Aksi</th></tr></thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                          <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><UserCircle size={24} /></div><span className="font-bold text-slate-800 dark:text-white">{c.name}</span></div></td>
                          <td className="px-6 py-4 text-sm text-slate-600"><button onClick={() => handleWhatsApp(c.phone)} className="flex items-center gap-2 hover:text-green-600 font-medium"><Phone size={14} /> {c.phone}</button></td>
                          <td className="px-6 py-4 text-sm text-slate-600"><div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> <span className="truncate max-w-xs">{c.address || '-'}</span></div></td>
                          <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity"><div className="flex justify-end gap-2"><button onClick={() => openModal(c)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>{isSuperAdmin && <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>}</div></td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-200 dark:border-slate-700"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-600 bg-slate-100 dark:bg-slate-700 rounded-full p-1.5"><X size={24}/></button></div><form onSubmit={handleSave} className="space-y-6"><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Nama Lengkap</label><input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={name} onChange={e => setName(e.target.value)} /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">No. WhatsApp</label><input required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={phone} onChange={e => setPhone(e.target.value)} /></div><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Alamat</label><textarea required className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-3 font-bold" value={address} onChange={e => setAddress(e.target.value)} rows={3} /></div><div className="flex gap-3 mt-8 pt-6 border-t dark:border-slate-700"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold">Batal</button><button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl active:scale-95">Simpan Data</button></div></form></div></div>
      )}
    </div>
  );
};

export default CustomersPage;
