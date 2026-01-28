
import React, { useState, useEffect } from 'react';
import { AppSettings, User } from '../types';
import { getStoredData, DEFAULT_SETTINGS } from '../services/dataService';
import { 
  BookOpen, HelpCircle, ChevronUp, ChevronDown, Smartphone, 
  Share, PlusSquare, Activity, Shield, Calculator, Building, 
  Wallet, Zap, ReceiptText, Cloud, MessageCircle, ShieldCheck, 
  Database, UserPlus, Car as CarIcon, Users, UserCog, ClipboardList
} from 'lucide-react';

interface Props {
    currentUser: User;
}

const FaqItem = ({ question, answer, icon: Icon = HelpCircle }: { question: string, answer: React.ReactNode, icon?: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-900">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-3">
                    <Icon size={18} className="text-indigo-600 flex-shrink-0"/> {question}
                </span>
                {isOpen ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
            </button>
            {isOpen && (
                <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30">
                    <div className="pt-3 animate-fade-in">{answer}</div>
                </div>
            )}
        </div>
    );
};

const HelpPage: React.FC<Props> = ({ currentUser }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS));
  }, []);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
        <div className="flex items-center gap-4 border-b dark:border-slate-700 pb-6">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
            <BookOpen size={36} />
            </div>
            <div>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Pusat Bantuan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Panduan operasional dan manajemen sistem Wira Rent Car.</p>
            </div>
        </div>

        {/* INSTALLATION GUIDE SECTION */}
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <h4 className="text-lg font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
                <Smartphone size={24}/> Akses Cepat (Instalasi PWA)
            </h4>
            <p className="text-sm text-indigo-100 mb-6 leading-relaxed">Gunakan aplikasi seperti aplikasi Play Store tanpa download. Cukup tambahkan ke Layar Utama HP Anda.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <h5 className="font-bold text-xs mb-3 uppercase tracking-widest text-indigo-200 flex items-center gap-2"><Smartphone size={14}/> Android / Chrome</h5>
                    <p className="text-[11px] leading-relaxed">Klik Tiga Titik (⋮) di Chrome {' > '} Pilih <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <h5 className="font-bold text-xs mb-3 uppercase tracking-widest text-indigo-200 flex items-center gap-2"><Share size={14}/> iOS / Safari</h5>
                    <p className="text-[11px] leading-relaxed">Klik tombol Share di Safari {' > '} Gulir ke bawah {' > '} Pilih <strong>"Add to Home Screen"</strong> (<PlusSquare size={12} className="inline"/>).</p>
                </div>
            </div>
        </div>

        {/* GUIDES FOR MASTER DATA AND ORDERS */}
        <div className="space-y-4">
            <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <ClipboardList size={14}/> Panduan Penggunaan Dasar
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FaqItem 
                    icon={CarIcon}
                    question="Cara Menambahkan Unit Mobil Baru" 
                    answer={
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Buka menu <strong>"Armada Mobil"</strong> di sidebar.</li>
                            <li>Klik tombol biru <strong>"+ Tambah Mobil"</strong> di pojok kanan atas.</li>
                            <li>Lengkapi data: Nama, Plat, Kategori, Foto, dan <strong>Skema Harga</strong>.</li>
                            <li>Klik <strong>"Simpan Data"</strong>.</li>
                        </ol>
                    }
                />
                <FaqItem 
                    icon={Users}
                    question="Cara Menambahkan Data Pelanggan" 
                    answer={
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Buka menu <strong>"Data Pelanggan"</strong>.</li>
                            <li>Klik <strong>"+ Tambah Pelanggan"</strong>.</li>
                            <li>Isi Nama Lengkap, Nomor WA (gunakan format 08...), dan Alamat.</li>
                            <li>Klik <strong>"Simpan Data"</strong>. Database ini akan memudahkan saat input order nanti.</li>
                        </ol>
                    }
                />
                <FaqItem 
                    icon={UserPlus}
                    question="Cara Menambahkan Driver" 
                    answer={
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Buka menu <strong>"Data Driver"</strong>.</li>
                            <li>Klik <strong>"+ Tambah Driver"</strong>.</li>
                            <li>Upload foto profil dan isi nomor telepon aktif untuk notifikasi tugas via WhatsApp.</li>
                            <li>Klik <strong>"Simpan"</strong>.</li>
                        </ol>
                    }
                />
                <FaqItem 
                    icon={UserCog}
                    question="Cara Menambahkan Investor / Mitra" 
                    answer={
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Buka menu <strong>"Investor & Rekanan"</strong>.</li>
                            <li>Klik <strong>"+ Tambah Investor"</strong>.</li>
                            <li>Data ini digunakan untuk menentukan pemilik unit yang akan menerima setoran hasil sewa.</li>
                            <li>Setelah disimpan, Anda bisa menghubungkan unit mobil ke investor ini di menu 'Armada'.</li>
                        </ol>
                    }
                />
                <FaqItem 
                    icon={Building}
                    question="Cara Menambahkan Vendor (Rent-to-Rent)" 
                    answer={
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Buka menu <strong>"Vendor"</strong>.</li>
                            <li>Klik <strong>"+ Tambah Vendor"</strong>.</li>
                            <li>Vendor adalah rekanan rental lain tempat kita meminjam unit jika stok internal kosong.</li>
                            <li>Klik <strong>"Simpan"</strong>.</li>
                        </ol>
                    }
                />
                <FaqItem 
                    icon={Zap}
                    question="Cara Membuat Order / Booking Baru" 
                    answer={
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Buka menu <strong>"Booking & Jadwal"</strong>.</li>
                            <li>Pilih tab <strong>"Input Baru"</strong> di bagian atas.</li>
                            <li>Tentukan <strong>Waktu Sewa</strong> (Mulai & Selesai).</li>
                            <li>Pilih <strong>Unit Mobil</strong>. Sistem akan otomatis memvalidasi ketersediaan.</li>
                            <li>Pilih <strong>Pelanggan</strong> dari database atau ketik manual.</li>
                            <li>Tentukan biaya, paket sewa, dan nominal DP/Bayar.</li>
                            <li>Klik <strong>"Simpan & Kunci Jadwal"</strong>.</li>
                        </ol>
                    }
                />
            </div>
        </div>

        {/* MAIN WORKFLOW SECTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Operations */}
            <div className="space-y-4">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <Activity size={14}/> Manajemen Operasional
                </h4>
                <FaqItem 
                icon={Shield}
                question="Bagaimana Sistem Anti-Bentrok bekerja?" 
                answer="Sistem memvalidasi ketersediaan unit dan driver secara real-time. Saat Anda menginput tanggal dan jam, sistem akan menyembunyikan atau menandai unit yang sudah memiliki jadwal 'Booked' atau 'Active' yang tumpang tindih. Status 'Cancelled' tidak akan menghalangi unit untuk disewa kembali."
                />
                <FaqItem 
                icon={Calculator}
                question="Cara menggunakan Kalkulator Estimasi?" 
                answer={
                    <div className="space-y-2">
                        <p>Gunakan Kalkulator untuk menghitung penawaran harga ke pelanggan sebelum membuat booking resmi. Fitur ini mencakup:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Biaya Inap:</strong> Gaji tambahan driver jika menginap.</li>
                            <li><strong>Estimasi BBM:</strong> Berdasarkan jarak (KM) dan rasio konsumsi unit.</li>
                            <li><strong>Coverage:</strong> Biaya tambahan area luar kota/daerah tertentu.</li>
                        </ul>
                    </div>
                }
                />
            </div>

            {/* Right Column: Finance & System */}
            <div className="space-y-4">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <Wallet size={14}/> Skema Keuangan & Laporan
                </h4>
                <FaqItem 
                icon={Zap}
                question="Skema Setoran Investor & Gaji Driver" 
                answer="Di menu 'Armada', Anda dapat mengatur nilai setoran tetap (fixed) per hari untuk investor dan gaji driver per unit. Setiap kali booking selesai (Completed), sistem akan otomatis membuat draf transaksi pengeluaran (Expense) ke dompet Investor dan Driver terkait."
                />
                <FaqItem 
                icon={Cloud}
                question="Keamanan Data & Sinkronisasi Cloud" 
                answer={
                    <div className="space-y-2">
                        <p>Aplikasi ini menggunakan teknologi <strong>Cloud Sync (Firebase)</strong>. Keuntungannya:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Offline First:</strong> Anda tetap bisa input data saat sinyal hilang, data akan sinkron otomatis saat online kembali.</li>
                            <li><strong>Multi-Device:</strong> Admin, Driver, and Investor melihat data yang sama secara real-time.</li>
                        </ul>
                    </div>
                }
                />
            </div>
        </div>

        {/* ACCOUNT SUMMARY FOR USER */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden">
                    <img src={currentUser.image || `https://ui-avatars.com/api/?name=${currentUser.name}`} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">{currentUser.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Anda masuk sebagai <span className="text-indigo-600 font-bold uppercase">{currentUser.role === 'partner' ? 'Investor' : currentUser.role}</span></p>
                    <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-2">
                        <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-[10px] font-bold border dark:border-slate-700 flex items-center gap-1"><ShieldCheck size={12} className="text-green-500"/> Akses Terverifikasi</span>
                        <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-[10px] font-bold border dark:border-slate-700 flex items-center gap-1"><Database size={12} className="text-blue-500"/> Cloud Sync Aktif</span>
                    </div>
                </div>
                <button onClick={() => window.open(`https://wa.me/6285190680660`, '_blank')} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-green-100 dark:shadow-none flex items-center gap-2 transition-all active:scale-95">
                    <MessageCircle size={20}/> Chat Support
                </button>
            </div>
        </div>

        <div className="text-center pt-4">
            <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium uppercase tracking-[0.2em]">Wira Rent Car Management System • Version 2.1.0 (PRO)</p>
        </div>
    </div>
  );
};

export default HelpPage;
