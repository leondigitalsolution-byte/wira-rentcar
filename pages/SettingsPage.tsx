import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useLocation } from 'react-router-dom';
import { AppSettings, User, Driver, Partner } from '../types';
import { getStoredData, setStoredData, DEFAULT_SETTINGS, compressImage } from '../services/dataService';
import { getUsers, saveUser, deleteUser } from '../services/authService';
import { FileText, List, X, MessageCircle, Palette, Moon, Sun, Camera, Link as LinkIcon, Clock } from 'lucide-react';
import { Logo } from '../components/Logo';

interface Props {
    currentUser: User;
}

const SettingsPage: React.FC<Props> = ({ currentUser }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isSuperAdmin = currentUser.role === 'superadmin';
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<User[]>([]);
  const [driversList, setDriversList] = useState<Driver[]>([]);
  const [partnersList, setPartnersList] = useState<Partner[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('admin');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [linkedDriverId, setLinkedDriverId] = useState('');
  const [linkedPartnerId, setLinkedPartnerId] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPackage, setNewPackage] = useState('');

  useEffect(() => {
    setSettings(getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS));
    setUsers(getUsers());
    setDriversList(getStoredData<Driver[]>('drivers', []));
    setPartnersList(getStoredData<Partner[]>('partners', []));
  }, []);

  useEffect(() => {
      const tabParam = searchParams.get('tab');
      if (tabParam) setActiveTab(tabParam);
  }, [location.search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: name === 'overtimeValue' ? Number(value) : value }));
    setIsSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setStoredData('appSettings', settings);
    setIsSaved(true);
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleThemeColorChange = (color: string) => {
      setSettings(prev => ({ ...prev, themeColor: color }));
      setIsSaved(false);
  };

  const toggleDarkMode = () => {
      setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }));
      setIsSaved(false);
  };

  const handleUserImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const compressed = await compressImage(file);
        setUserImage(compressed);
      } catch (e) { alert("Gagal memproses gambar."); }
      finally { setIsUploading(false); }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploading(true);
          try {
             const compressed = await compressImage(file);
             setSettings(prev => ({ ...prev, logoUrl: compressed }));
          } catch(e) { alert("Gagal upload logo."); }
          finally { setIsUploading(false); }
      }
  };

  const handleEditUser = (u: User) => {
      setEditingUserId(u.id);
      setUsername(u.username);
      setPassword(u.password || ''); 
      setFullName(u.name);
      setEmail(u.email || '');
      setPhone(u.phone || '');
      setRole(u.role);
      setUserImage(u.image || null);
      setLinkedDriverId(u.linkedDriverId || '');
      setLinkedPartnerId(u.linkedPartnerId || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetUserForm = () => {
      setEditingUserId(null);
      setUsername(''); setPassword(''); setFullName(''); setEmail(''); setPhone(''); setUserImage(null); setRole('admin');
      setLinkedDriverId(''); setLinkedPartnerId('');
  };

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      if (!username || !password || !fullName) return;
      const userPayload: User = {
          id: editingUserId || `u-${Date.now()}`,
          username, password, name: fullName, email, phone, role: role as any, image: userImage,
          linkedDriverId: role === 'driver' ? linkedDriverId : undefined,
          linkedPartnerId: role === 'partner' ? linkedPartnerId : undefined
      };
      saveUser(userPayload);
      setUsers(getUsers());
      resetUserForm();
  };

  const handleDeleteUser = (id: string) => {
      if (id === currentUser.id) return alert("Tidak bisa menghapus akun sendiri!");
      if (confirm("Apakah Anda yakin ingin menghapus user ini?")) {
          deleteUser(id);
          setUsers(getUsers());
          if (editingUserId === id) resetUserForm();
      }
  };

  const addCategory = () => {
      if(newCategory && !settings.carCategories.includes(newCategory)) {
          setSettings(prev => ({...prev, carCategories: [...prev.carCategories, newCategory]}));
          setNewCategory('');
      }
  };
  const removeCategory = (cat: string) => {
      setSettings(prev => ({...prev, carCategories: prev.carCategories.filter(c => c !== cat)}));
  };

  const addPackage = () => {
      if(newPackage && !settings.rentalPackages.includes(newPackage)) {
          setSettings(prev => ({...prev, rentalPackages: [...prev.rentalPackages, newPackage]}));
          setNewPackage('');
      }
  };
  const removePackage = (pkg: string) => {
      setSettings(prev => ({...prev, rentalPackages: prev.rentalPackages.filter(p => p !== pkg)}));
  };

  const THEME_OPTIONS = [
      { id: 'red', name: 'Abu-abu (Default)', bg: 'bg-slate-600' }, // Updated from Red to Gray/Slate
      { id: 'blue', name: 'Biru', bg: 'bg-blue-600' },
      { id: 'green', name: 'Hijau', bg: 'bg-green-600' },
      { id: 'purple', name: 'Ungu', bg: 'bg-purple-600' },
      { id: 'orange', name: 'Orange', bg: 'bg-orange-600' },
      { id: 'black', name: 'Hitam', bg: 'bg-slate-800' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Pengaturan Sistem</h2>
          <p className="text-slate-500 dark:text-slate-400">Konfigurasi operasional dan akun pengguna.</p>
        </div>
        {isSaved && <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium animate-pulse">Tersimpan!</span>}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {isSuperAdmin ? (
              <>
                <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'general' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border dark:border-slate-600'}`}>Umum & Invoice</button>
                <button onClick={() => setActiveTab('appearance')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'appearance' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border dark:border-slate-600'}`}>Tampilan</button>
                <button onClick={() => setActiveTab('master')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'master' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border dark:border-slate-600'}`}>Kategori & Paket</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border dark:border-slate-600'}`}>Manajemen User</button>
              </>
          ) : (
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">Profil Saya</button>
          )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          
          {activeTab === 'appearance' && isSuperAdmin && (
              <div className="space-y-8 animate-fade-in">
                  <div className="flex items-center gap-3 border-b dark:border-slate-700 pb-4">
                      <Palette size={32} className="text-indigo-600" />
                      <div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tampilan Aplikasi</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Sesuaikan warna tema dan mode tampilan.</p>
                      </div>
                  </div>
                  
                  <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Warna Tema Utama</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          {THEME_OPTIONS.map(option => (
                              <button 
                                  key={option.id}
                                  onClick={() => handleThemeColorChange(option.id)}
                                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${settings.themeColor === option.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 scale-105 shadow-md' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                              >
                                  <div className={`w-8 h-8 rounded-full ${option.bg} shadow-sm`}></div>
                                  <span className={`text-sm font-medium ${settings.themeColor === option.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>
                                      {option.name}
                                  </span>
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="pt-6 border-t dark:border-slate-700">
                       <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Mode Tampilan</h4>
                       <div className="flex items-center gap-4">
                            <button
                                onClick={() => !settings.darkMode && toggleDarkMode()}
                                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${!settings.darkMode ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                            >
                                <Sun size={24} /> Mode Terang (Light)
                            </button>
                            <button
                                onClick={() => settings.darkMode && toggleDarkMode()}
                                className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${settings.darkMode ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                            >
                                <Moon size={24} /> Mode Gelap (Dark)
                            </button>
                       </div>
                  </div>

                  <div className="pt-6 border-t dark:border-slate-700">
                     <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold w-full">Simpan Pengaturan Tampilan</button>
                  </div>
              </div>
          )}

          {activeTab === 'general' && isSuperAdmin && (
             <form onSubmit={handleSave} className="space-y-6 animate-fade-in">
                 <div className="flex items-center gap-6 pb-6 border-b dark:border-slate-700">
                     <div className="w-20 h-20 border rounded-lg p-2 flex items-center justify-center bg-white">
                         <Logo src={settings.logoUrl} />
                     </div>
                     <div>
                         <label className="block text-sm font-medium mb-2 dark:text-slate-200">Ganti Logo</label>
                         <input 
                             disabled={!isSuperAdmin} 
                             type="file" 
                             accept="image/*" 
                             className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                             onChange={handleLogoUpload} 
                         />
                         {isUploading && <p className="text-xs text-indigo-600 mt-1">Mengupload...</p>}
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                         <label className="block text-sm font-medium mb-1 dark:text-slate-200">Nama Perusahaan (Lengkap)</label>
                         <input disabled={!isSuperAdmin} name="companyName" value={settings.companyName} onChange={handleChange} className="w-full border rounded p-2" />
                     </div>
                     <div>
                         <label className="block text-sm font-medium mb-1 dark:text-slate-200">Nama Display Aplikasi (Singkat)</label>
                         <input disabled={!isSuperAdmin} name="displayName" value={settings.displayName} onChange={handleChange} className="w-full border rounded p-2" placeholder="Contoh: WiraRentCar" />
                     </div>
                     <div>
                         <label className="block text-sm font-medium mb-1 dark:text-slate-200">Tagline</label>
                         <input disabled={!isSuperAdmin} name="tagline" value={settings.tagline} onChange={handleChange} className="w-full border rounded p-2" />
                     </div>
                     <div className="md:col-span-2">
                         <label className="block text-sm font-medium mb-1 dark:text-slate-200">Alamat</label>
                         <input disabled={!isSuperAdmin} name="address" value={settings.address} onChange={handleChange} className="w-full border rounded p-2" />
                     </div>
                     <div>
                         <label className="block text-sm font-medium mb-1 dark:text-slate-200">Telepon</label>
                         <input disabled={!isSuperAdmin} name="phone" value={settings.phone} onChange={handleChange} className="w-full border rounded p-2" />
                     </div>
                     <div>
                         <label className="block text-sm font-medium mb-1 dark:text-slate-200">Email</label>
                         <input disabled={!isSuperAdmin} name="email" value={settings.email} onChange={handleChange} className="w-full border rounded p-2" />
                     </div>
                     
                     <div className="md:col-span-2 pt-4 border-t mt-2 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><FileText size={18}/> Konten Invoice PDF</h3>
                     </div>

                     <div className="md:col-span-2">
                         <label className="block text-sm font-medium mb-1 dark:text-slate-200">Ketentuan Pembayaran (Muncul di Invoice)</label>
                         <textarea disabled={!isSuperAdmin} name="paymentTerms" value={settings.paymentTerms} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={3} placeholder="Masukkan nomor rekening dan ketentuan pembayaran..." />
                     </div>
                     
                     <div className="md:col-span-2">
                         <label className="block text-sm font-medium mb-1 dark:text-slate-200">Syarat & Ketentuan Sewa (Muncul di Invoice)</label>
                         <textarea disabled={!isSuperAdmin} name="termsAndConditions" value={settings.termsAndConditions} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={4} placeholder="Poin-pois syarat sewa..." />
                     </div>

                     <div className="md:col-span-2">
                         <label className="block text-sm font-medium mb-1 dark:text-slate-200">Footer (Paling Bawah)</label>
                         <textarea disabled={!isSuperAdmin} name="invoiceFooter" value={settings.invoiceFooter} onChange={handleChange} className="w-full border rounded p-2" rows={1} />
                     </div>

                     <div className="md:col-span-2 pt-4 border-t mt-2 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><MessageCircle size={18}/> Format Chat WhatsApp</h3>
                        <textarea 
                             disabled={!isSuperAdmin} 
                             name="whatsappTemplate" 
                             value={settings.whatsappTemplate} 
                             onChange={handleChange} 
                             className="w-full border rounded p-2 text-sm font-mono" 
                             rows={10} 
                        />
                     </div>
                 </div>
                 {isSuperAdmin && <button type="submit" disabled={isUploading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 shadow-lg shadow-indigo-100">Simpan Pengaturan</button>}
             </form>
          )}

          {activeTab === 'master' && isSuperAdmin && (
              <div className="space-y-8 animate-fade-in">
                  {/* OVERTIME SETTINGS */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                      <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-indigo-800 dark:text-indigo-300 uppercase tracking-tight">
                          <Clock size={20}/> Pengaturan Denda Overtime
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Tipe Denda (Per Jam)</label>
                              <div className="flex p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                  <button 
                                    onClick={() => setSettings(prev => ({...prev, overtimeType: 'Percentage'}))}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${settings.overtimeType === 'Percentage' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}
                                  >
                                      Persentase (%)
                                  </button>
                                  <button 
                                    onClick={() => setSettings(prev => ({...prev, overtimeType: 'Nominal'}))}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${settings.overtimeType === 'Nominal' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}
                                  >
                                      Nominal (Rp)
                                  </button>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                                  Nilai Denda ({settings.overtimeType === 'Percentage' ? '% dari Sewa' : 'Rupiah'})
                              </label>
                              <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">
                                      {settings.overtimeType === 'Percentage' ? '%' : 'Rp'}
                                  </span>
                                  <input 
                                    type="number"
                                    name="overtimeValue"
                                    value={settings.overtimeValue}
                                    onChange={handleChange}
                                    className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-2.5 pl-10 font-bold focus:ring-2 ring-indigo-500 outline-none"
                                  />
                              </div>
                              <p className="text-[10px] text-slate-500 mt-2 italic">
                                  {settings.overtimeType === 'Percentage' 
                                    ? '*Contoh: 10% dari harga harian unit per jam keterlambatan.' 
                                    : '*Contoh: Rp 50.000 per jam keterlambatan.'}
                              </p>
                          </div>
                      </div>
                  </div>

                  <div>
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200"><List size={20}/> Kategori Mobil</h3>
                      <div className="flex gap-2 mb-4">
                          <input 
                            className="border rounded p-2 flex-1" 
                            placeholder="Tambah Kategori (e.g. SUV, MPV)" 
                            value={newCategory} 
                            onChange={e => setNewCategory(e.target.value)}
                          />
                          <button onClick={addCategory} className="bg-indigo-600 text-white px-4 rounded font-bold hover:bg-indigo-700">Tambah</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {settings.carCategories.map(cat => (
                              <span key={cat} className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 border border-slate-200 dark:border-slate-600">
                                  {cat}
                                  <button onClick={() => removeCategory(cat)} className="text-slate-400 hover:text-red-600"><X size={14}/></button>
                              </span>
                          ))}
                      </div>
                  </div>

                  <div className="border-t pt-6 dark:border-slate-700">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200"><List size={20}/> Paket Sewa</h3>
                      <div className="flex gap-2 mb-4">
                          <input 
                            className="border rounded p-2 flex-1" 
                            placeholder="Tambah Paket (e.g. 12 Jam Dalam Kota)" 
                            value={newPackage} 
                            onChange={e => setNewPackage(e.target.value)}
                          />
                          <button onClick={addPackage} className="bg-indigo-600 text-white px-4 rounded font-bold hover:bg-indigo-700">Tambah</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {settings.rentalPackages.map(pkg => (
                              <span key={pkg} className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 border border-slate-200 dark:border-slate-600">
                                  {pkg}
                                  <button onClick={() => removePackage(pkg)} className="text-slate-400 hover:text-red-600"><X size={14}/></button>
                              </span>
                          ))}
                      </div>
                  </div>
                  
                  <div className="pt-6 border-t dark:border-slate-700">
                     <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold w-full">Simpan Master Data</button>
                  </div>
              </div>
          )}

          {activeTab === 'users' && isSuperAdmin && (
              <div className="space-y-8 animate-fade-in">
                  <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg border border-slate-100 dark:border-slate-600">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{editingUserId ? 'Edit User' : 'Tambah User Baru'}</h3>
                          {editingUserId && (
                              <button onClick={resetUserForm} className="text-sm text-red-600 hover:underline flex items-center gap-1">
                                  <X size={14}/> Batal Edit
                              </button>
                          )}
                      </div>
                      
                      <form onSubmit={handleSaveUser} className="space-y-4">
                          <div className="flex flex-col items-center mb-4">
                              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Foto Profil</label>
                              <div className="relative w-24 h-24 bg-white dark:bg-slate-800 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-500 flex items-center justify-center overflow-hidden group hover:border-indigo-500 transition-colors">
                                  {userImage ? (
                                      <>
                                          <img src={userImage} alt="Preview" className="w-full h-full object-cover" />
                                          <button 
                                              type="button"
                                              onClick={() => setUserImage(null)}
                                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                          >
                                              <X size={20} />
                                          </button>
                                      </>
                                  ) : (
                                      <div className="text-center text-slate-400 dark:text-slate-500 pointer-events-none">
                                          <Camera className="w-8 h-8 mx-auto mb-1" />
                                          <span className="text-[9px] font-bold">Ambil Foto</span>
                                      </div>
                                  )}
                                  <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      onChange={handleUserImageUpload}
                                  />
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Nama Lengkap</label>
                                <input required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full border rounded p-2" placeholder="Nama Karyawan" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Role</label>
                                <select value={role} onChange={e => setRole(e.target.value)} className="w-full border rounded p-2">
                                    <option value="admin">Admin / Staff</option>
                                    <option value="driver">Driver</option>
                                    <option value="partner">Investor (Mitra)</option>
                                    <option value="superadmin">Super Admin</option>
                                </select>
                            </div>
                            {role === 'driver' && (
                                <div className="md:col-span-2 bg-yellow-50 border border-yellow-100 p-3 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold uppercase text-yellow-800 mb-1 flex items-center gap-1">
                                        <LinkIcon size={12}/> Hubungkan dengan Data Driver
                                    </label>
                                    <select value={linkedDriverId} onChange={e => setLinkedDriverId(e.target.value)} className="w-full border border-yellow-300 rounded p-2 text-sm">
                                        <option value="">-- Pilih Data Driver --</option>
                                        {driversList.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {role === 'partner' && (
                                <div className="md:col-span-2 bg-purple-50 border border-purple-100 p-3 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold uppercase text-purple-800 mb-1 flex items-center gap-1">
                                        <LinkIcon size={12}/> Hubungkan dengan Data Investor
                                    </label>
                                    <select value={linkedPartnerId} onChange={e => setLinkedPartnerId(e.target.value)} className="w-full border border-purple-300 rounded p-2 text-sm">
                                        <option value="">-- Pilih Data Investor --</option>
                                        {partnersList.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Username</label>
                                <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full border rounded p-2" placeholder="username_login" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Password</label>
                                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded p-2" placeholder="••••••" />
                            </div>
                          </div>

                          <div className="pt-4 border-t dark:border-slate-700 flex gap-2">
                              {editingUserId && (
                                  <button type="button" onClick={resetUserForm} className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-lg font-bold">Batal</button>
                              )}
                              <button type="submit" disabled={isUploading} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50">
                                  {editingUserId ? 'Simpan Perubahan' : 'Simpan User'}
                              </button>
                          </div>
                      </form>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                          <thead className="bg-slate-50 dark:bg-slate-700">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                              {users.map(u => (
                                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                              <img className="h-8 w-8 rounded-full object-cover mr-3 bg-slate-100" src={u.image || `https://ui-avatars.com/api/?name=${u.name}`} alt="" />
                                              <div>
                                                  <div className="text-sm font-medium text-slate-900 dark:text-white">{u.name}</div>
                                                  <div className="text-xs text-slate-500">@{u.username}</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 uppercase">
                                              {u.role}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <button onClick={() => handleEditUser(u)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 mr-4">Edit</button>
                                          {u.id !== currentUser.id && (
                                              <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-900">Hapus</button>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default SettingsPage;