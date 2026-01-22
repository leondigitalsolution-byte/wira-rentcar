
import React, { useState, useEffect, useRef } from 'react';
import { Customer, User } from '../types';
import { getStoredData, setStoredData, exportToCSV, processCSVImport, mergeData } from '../services/dataService';
import { Plus, Trash2, Edit2, Phone, MapPin, X, UserCircle, Upload, Download, Search } from 'lucide-react';

interface Props {
    currentUser: User;
}

const CustomersPage: React.FC<Props> = ({ currentUser }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const isSuperAdmin = currentUser.role === 'superadmin';

  useEffect(() => {
    const data = getStoredData<Customer[]>('customers', []);
    setCustomers(data);
    setFilteredCustomers(data);
  }, []);

  useEffect(() => {
    if (!searchTerm) {
        setFilteredCustomers(customers);
    } else {
        const lower = searchTerm.toLowerCase();
        setFilteredCustomers(customers.filter(c => 
            c.name.toLowerCase().includes(lower) || 
            c.phone.includes(searchTerm) ||
            c.address.toLowerCase().includes(lower)
        ));
    }
  }, [searchTerm, customers]);

  const openModal = (cust?: Customer) => {
    if (cust) {
        setEditingCustomer(cust);
        setName(cust.name);
        setPhone(cust.phone);
        setAddress(cust.address);
    } else {
        setEditingCustomer(null);
        setName('');
        setPhone('');
        setAddress('');
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust: Customer = {
        id: editingCustomer ? editingCustomer.id : Date.now().toString(),
        name,
        phone,
        address
    };

    let updated;
    if (editingCustomer) {
        updated = customers.map(c => c.id === editingCustomer.id ? newCust : c);
    } else {
        updated = [...customers, newCust];
    }

    setCustomers(updated);
    setStoredData('customers', updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Konfirmasi Persetujuan: Apakah Anda yakin ingin menghapus data pelanggan ini secara permanen? Tindakan ini hanya dapat dilakukan dengan wewenang Superadmin.')) {
          setCustomers(prev => {
              const updated = prev.filter(c => c.id !== id);
              setStoredData('customers', updated);
              return updated;
          });
      }
  };

  const handleExport = () => exportToCSV(customers, 'Data_Pelanggan_BRC');
  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          processCSVImport(file, (data) => {
              const imported: Customer[] = data.map((d: any) => d as Customer);
              const merged = mergeData(customers, imported);
              
              setCustomers(merged);
              setStoredData('customers', merged);
              alert('Data pelanggan berhasil diproses (Update/Insert)!');
          });
      }
  };

  const handleWhatsApp = (phone: string) => {
      const clean = phone.replace(/\D/g, '').replace(/^0/, '62');
      window.open(`https://wa.me/${clean}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm md:bg-transparent md:border-0 md:shadow-none md:p-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Data Pelanggan</h2>
          <p className="text-slate-500 text-sm">Kelola database penyewa.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Cari nama / no.hp..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <div className="hidden md:flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportFile} />
                    <button onClick={handleImportClick} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                        <Upload size={16} /> Import
                    </button>
                    <button onClick={handleExport} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                        <Download size={16} /> Export
                    </button>
                </div>
                <button onClick={() => openModal()} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow-sm active:scale-95 transition-transform">
                    <Plus size={18} /> <span className="md:hidden">Baru</span><span className="hidden md:inline">Tambah Pelanggan</span>
                </button>
            </div>
        </div>
      </div>

      {/* MOBILE LIST VIEW (CARDS) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredCustomers.map(c => (
              <div key={c.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <UserCircle size={28} />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-lg">{c.name}</h3>
                              <button onClick={() => handleWhatsApp(c.phone)} className="text-sm text-green-600 font-medium flex items-center gap-1 hover:underline">
                                  <Phone size={14} /> {c.phone}
                              </button>
                          </div>
                      </div>
                      <div className="flex gap-1">
                          <button onClick={() => openModal(c)} className="p-2 bg-slate-50 text-indigo-600 rounded-lg border border-slate-100 active:bg-indigo-50">
                              <Edit2 size={18} />
                          </button>
                          {isSuperAdmin && (
                              <button onClick={() => handleDelete(c.id)} className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 active:bg-red-100">
                                  <Trash2 size={18} />
                              </button>
                          )}
                      </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-start gap-2 text-slate-600 text-sm">
                          <MapPin size={16} className="mt-0.5 text-slate-400 flex-shrink-0" />
                          <p>{c.address || '-'}</p>
                      </div>
                  </div>
              </div>
          ))}
          {filteredCustomers.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                  <p>Tidak ada data pelanggan.</p>
              </div>
          )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Kontak</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Alamat</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Aksi</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                  {filteredCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                      <UserCircle size={20} />
                                  </div>
                                  <span className="font-bold text-slate-800">{c.name}</span>
                              </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                              <button onClick={() => handleWhatsApp(c.phone)} className="flex items-center gap-2 hover:text-green-600 hover:underline transition-colors">
                                  <Phone size={14} /> {c.phone}
                              </button>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                               <div className="flex items-center gap-2">
                                  <MapPin size={14} /> <span className="truncate max-w-xs">{c.address}</span>
                              </div>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button onClick={() => openModal(c)} className="p-1.5 text-slate-500 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 hover:text-indigo-600 transition-all"><Edit2 size={16} /></button>
                              {isSuperAdmin && (
                                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-500 hover:bg-red-50 rounded border border-transparent hover:border-red-100 hover:text-red-600 transition-all"><Trash2 size={16} /></button>
                              )}
                          </td>
                      </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-slate-500 italic">Data tidak ditemukan.</td></tr>
                  )}
              </tbody>
          </table>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">{editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-600 transition-colors bg-slate-100 rounded-full p-1"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Nama Lengkap</label>
                          <input required type="text" className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Nama Sesuai KTP" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">No. WhatsApp</label>
                          <input required type="tel" className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxx" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Alamat Domisili</label>
                          <textarea required className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={address} onChange={e => setAddress(e.target.value)} rows={3} placeholder="Alamat lengkap..." />
                      </div>
                      <div className="flex gap-3 mt-6 pt-4 border-t">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors">Batal</button>
                          <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">Simpan Data</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default CustomersPage;
