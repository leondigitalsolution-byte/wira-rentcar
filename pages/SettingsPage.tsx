
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useLocation } from 'react-router-dom';
import { AppSettings, User, Driver, Partner } from '../types';
import { getStoredData, setStoredData, DEFAULT_SETTINGS, compressImage } from '../services/dataService';
import { getUsers, saveUser, deleteUser } from '../services/authService';
import { FileText, Trash2, List, UserCog, X, MessageCircle, Image as ImageIcon, HelpCircle, Palette, Moon, Sun, ChevronDown, ChevronUp, BookOpen, Link as LinkIcon, Camera, Zap, Building, Wallet, ReceiptText, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/Logo';

interface Props {
    currentUser: User;
}

// Helper Component for FAQ Accordion
const FaqItem = ({ question, answer }: { question: string, answer: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-3">
                    <HelpCircle size={18} className="text-indigo-600 flex-shrink-0"/> {question}
                </span>
                {isOpen ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
            </button>
            {isOpen && (
                <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30">
                    <div className="pt-3">{answer}</div>
                </div>
            )}
        </div>
    );
};

const SettingsPage: React.FC<Props> = ({ currentUser }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isSuperAdmin = currentUser.role === 'superadmin';
  
  // Initialize tab from URL param or default
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || (isSuperAdmin ? 'general' : 'help'));
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<User[]>([]);
  
  // Reference Data for Linking
  const [driversList, setDriversList] = useState<Driver[]>([]);
  const [partnersList, setPartnersList] = useState<Partner[]>([]);

  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Users Form
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('admin');
  const [userImage, setUserImage] = useState<string | null>(null);
  
  // User Linking State
  const [linkedDriverId, setLinkedDriverId] = useState('');
  const [linkedPartnerId, setLinkedPartnerId] = useState('');
  
  // Master Data State
  const [newCategory, setNewCategory] = useState('');
  const [newPackage, setNewPackage] = useState('');

  useEffect(() => {
    setSettings(getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS));
    setUsers(getUsers());
    setDriversList(getStoredData<Driver[]>('drivers', []));
    setPartnersList(getStoredData<Partner[]>('partners', []));
  }, []);

  // Sync tab with URL param changes
  useEffect(() => {
      const tabParam = searchParams.get('tab');
      if (tabParam) {
          setActiveTab(tabParam);
      }
  }, [location.search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
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

  // User Management
  const handleUserImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const compressed = await compressImage(file);
        setUserImage(compressed);
      } catch (e) {
        alert("Gagal memproses gambar.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploading(true);
          try {
             const compressed = await compressImage(file);
             setSettings(prev => ({ ...prev, logoUrl: compressed }));
          } catch(e) {
              alert("Gagal upload logo.");
          } finally {
              setIsUploading(false);
          }
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
      if (confirm("Konfirmasi Persetujuan: Apakah Anda yakin ingin menghapus user ini secara permanen?")) {
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
      { id: 'red', name: 'Merah (Default)', bg: 'bg-red-600' },
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
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Pengaturan & Bantuan</h2>
          <p className="text-slate-500 dark:text-slate-400">Konfigurasi sistem dan panduan penggunaan aplikasi.</p>
        </div>
        {isSaved && <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium animate-pulse">Tersimpan!</span>}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {isSuperAdmin && (
              <>
                <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'general' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border dark:border-slate-600'}`}>Umum & Invoice</button>
                <button onClick={() => setActiveTab('appearance')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'appearance' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border dark:border-slate-600'}`}>Tampilan</button>
                <button onClick={() => setActiveTab('master')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'master' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border dark:border-slate-600'}`}>Kategori & Paket</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border dark:border-slate-600'}`}>Manajemen User</button>
              </>
          )}
          <button onClick={() => setActiveTab('help')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'help' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border dark:border-slate-600'}`}>Pusat Bantuan</button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          
          {/* HELP TAB - UPDATED CONTENT */}
          {activeTab === 'help' && (
              <div className="space-y-8 animate-fade-in">
                  <div className="flex items-center gap-4 border-b dark:border-slate-700 pb-6">
                      <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                        <BookOpen size={36} />
                      </div>
                      <div>
                          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Pusat Bantuan Rento.click</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Pelajari otomasi sistem dan manajemen rental profesional.</p>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-green-500"/> Akses Anda
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Role: <span className="uppercase font-bold text-indigo-600">{currentUser.role === 'partner' ? 'Investor' : currentUser.role}</span>. 
                                Anda memiliki izin untuk mengelola {currentUser.role === 'superadmin' ? 'seluruh sistem' : 'data operasional harian'}.
                            </p>
                        </div>
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <h4 className="font-bold text-indigo-800 dark:text-indigo-200 mb-2 flex items-center gap-2">
                                <Zap size={16}/> Sistem Otomatis
                            </h4>
                            <p className="text-xs text-indigo-600 dark:text-indigo-300 leading-relaxed">
                                Aplikasi ini menggunakan sistem **Anti-Bentrok Otomatis** yang mengunci jadwal secara real-time saat booking dikonfirmasi.
                            </p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                            <h4 className="font-bold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                                <MessageCircle size={16}/> Hubungi Support
                            </h4>
                            <p className="text-xs text-purple-600 dark:text-purple-300 leading-relaxed">
                                WhatsApp: <strong>{settings.phone}</strong><br/>
                                Email: <strong>{settings.email}</strong>
                            </p>
                        </div>
                  </div>

                  {/* FAQ SECTIONS - UPDATED */}
                  <div className="space-y-4">
                      <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                          <Zap size={14}/> Operasional & Jadwal
                      </h4>
                      <FaqItem 
                        question="Bagaimana cara kerja fitur Anti-Bentrok?" 
                        answer={
                            <div className="space-y-2">
                                <p>Sistem melakukan pengecekan ketersediaan secara instan. Saat Anda memilih tanggal/jam sewa di tab <strong>'Input Baru'</strong>, sistem akan menyaring armada yang sedang jalan (Active) atau sudah dipesan (Booked) pada jam tersebut.</p>
                                <p className="font-bold text-indigo-600 italic">Tips: Gunakan menu 'Timeline' untuk melihat visualisasi jadwal seluruh armada dalam satu bulan.</p>
                            </div>
                        }
                      />
                      <FaqItem 
                        question="Apa itu fitur Rent to Rent / Unit Luar?" 
                        answer="Fitur ini digunakan jika Anda menyewa mobil dari rental lain (Vendor) untuk disewakan kembali ke pelanggan Anda. Anda bisa mencatat Biaya Vendor (HPP) yang akan otomatis tercatat sebagai pengeluaran (Expense) saat transaksi selesai." 
                      />
                      <FaqItem 
                        question="Kapan status Booking berubah otomatis?" 
                        answer="Status otomatis menjadi 'Active' setelah Anda menyimpan Checklist Serah Terima. Status menjadi 'Completed' saat Anda mengisi Tanggal/Jam Pengembalian Aktual di form edit booking." 
                      />

                      <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-8 mb-4 flex items-center gap-2">
                          <ReceiptText size={14}/> Invoice & Dokumentasi
                      </h4>
                      <FaqItem 
                        question="Bagaimana cara kirim Nota lewat WhatsApp?" 
                        answer="Di tab 'Daftar Booking', klik tombol ikon WhatsApp pada baris transaksi. Sistem akan membuka WhatsApp Web/Aplikasi dengan template pesan profesional yang sudah terisi rincian unit, harga, dan sisa tagihan." 
                      />
                      <FaqItem 
                        question="Apa kegunaan fitur Invoice Kolektif?" 
                        answer="Digunakan khusus untuk pelanggan tetap atau instansi yang menyewa berkali-kali namun pembayarannya digabung di akhir bulan. Anda bisa memilih beberapa transaksi sekaligus dan sistem akan menghasilkan satu file PDF gabungan." 
                      />
                      <FaqItem 
                        question="Mengapa saya harus mengunggah foto Dashboard?" 
                        answer="Foto Dashboard (Speedometer & Fuel) pada saat Checklist Serah Terima sangat penting sebagai bukti otentik posisi KM dan Bahan Bakar untuk mencegah perselisihan dengan penyewa saat unit kembali." 
                      />

                      <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-8 mb-4 flex items-center gap-2">
                          <Wallet size={14}/> Keuangan & Bagi Hasil
                      </h4>
                      <FaqItem 
                        question="Bagaimana sistem mencatat bagi hasil Investor?" 
                        answer={
                            <div className="space-y-2">
                                <p>Jika mobil diatur sebagai milik <strong>'Investor'</strong> di menu Armada, maka setiap transaksi yang lunas (Paid) dan selesai (Completed) akan otomatis memicu <strong>Pengeluaran (Expense) Pending</strong> untuk setoran investor tersebut.</p>
                                <p>Nominal dihitung dari (Harga Sewa + Overtime + Highseason) dikali persentase split yang diatur di data Investor.</p>
                            </div>
                        }
                      />
                      <FaqItem 
                        question="Cara mencatat Gaji Driver atau Komisi?" 
                        answer="Sama seperti Investor, jika booking menggunakan Driver, sistem akan otomatis membuat draf pengeluaran 'Gaji' di menu Keuangan saat status sewa diselesaikan. Admin hanya perlu mengklik 'Bayar' dan upload bukti transfer untuk menyelesaikannya." 
                      />
                      <FaqItem 
                        question="Bagaimana melihat laporan Laba Rugi?" 
                        answer="Buka menu 'Statistik'. Sistem akan menampilkan grafik Pemasukan vs Pengeluaran. Total keuntungan bersih dihitung dari Pemasukan Lunas dikurangi Pengeluaran Lunas (Gaji, Vendor, Investor, dan Operasional Kantor)." 
                      />
                  </div>

                  <div className="bg-slate-900 rounded-2xl p-6 text-white text-center">
                      <h4 className="font-bold text-lg mb-2">Masih bingung dengan sistem?</h4>
                      <p className="text-slate-400 text-sm mb-4">Kami siap membantu optimasi operasional rental Anda.</p>
                      <button onClick={() => window.open(`https://wa.me/${settings.phone.replace(/\D/g, '')}`, '_blank')} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-full font-bold transition-all inline-flex items-center gap-2">
                          <MessageCircle size={18}/> Konsultasi Langsung
                      </button>
                  </div>
              </div>
          )}

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
                         <label className="block text-sm font-medium mb-2 dark:text-slate-200">Ganti Logo (Upload/Kamera)</label>
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
                         <input disabled={!isSuperAdmin} name="displayName" value={settings.displayName} onChange={handleChange} className="w-full border rounded p-2" placeholder="Contoh: BRC" />
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
                 {isSuperAdmin && <button type="submit" disabled={isUploading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50">Simpan Pengaturan</button>}
             </form>
          )}

          {activeTab === 'master' && isSuperAdmin && (
              <div className="space-y-8 animate-fade-in">
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
                              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Foto Profil {isUploading && '(Mengompres...)'}</label>
                              <div className="relative w-24 h-24 bg-white dark:bg-slate-800 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-500 flex items-center justify-center overflow-hidden group hover:border-indigo-500 transition-colors">
                                  {userImage ? (
                                      <>
                                          <img src={userImage} alt="Preview" className="w-full h-full object-cover" />
                                          <button 
                                              type="button"
                                              onClick={() => setUserImage(null)}
                                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                              title="Hapus Foto"
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
                                    <p className="text-[10px] text-yellow-700 mt-1">
                                        *User ini hanya akan melihat tugas dan pendapatan milik Driver yang dipilih.
                                    </p>
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
                                    <p className="text-[10px] text-purple-700 mt-1">
                                        *User ini hanya akan melihat unit mobil dan laporan keuangan milik Investor yang dipilih.
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Username</label>
                                <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full border rounded p-2" placeholder="username_login" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Password</label>
                                <div className="relative">
                                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded p-2" placeholder="••••••" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Email (Optional)</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded p-2" placeholder="email@company.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">No. HP (Optional)</label>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border rounded p-2" placeholder="08xxxxxxxx" />
                            </div>
                          </div>

                          <div className="pt-4 border-t dark:border-slate-700 flex gap-2">
                              {editingUserId && (
                                  <button type="button" onClick={resetUserForm} className="px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-lg font-bold">Batal</button>
                              )}
                              <button type="submit" disabled={isUploading} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50">
                                  {isUploading ? 'Memproses...' : (editingUserId ? 'Simpan Perubahan' : 'Simpan User')}
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
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kontak</th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                              {users.map(u => (
                                  <tr key={u.id}>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                              <div className="flex-shrink-0 h-10 w-10">
                                                  <img className="h-10 w-10 rounded-full object-cover bg-slate-100" src={u.image || `https://ui-avatars.com/api/?name=${u.name}`} alt="" />
                                              </div>
                                              <div className="ml-4">
                                                  <div className="text-sm font-medium text-slate-900 dark:text-white">{u.name}</div>
                                                  <div className="text-sm text-slate-500 dark:text-slate-400">@{u.username}</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800 uppercase">
                                              {u.role === 'partner' ? 'Investor' : u.role}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                          <div>{u.email}</div>
                                          <div>{u.phone}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <button onClick={() => handleEditUser(u)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
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
