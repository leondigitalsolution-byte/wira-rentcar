
import { 
  Car, Driver, Partner, Customer, Booking, Transaction, AppSettings, HighSeason, 
  BookingStatus, PaymentStatus 
} from '../types';
import { supabase } from './supabaseClient';
import XLSX from 'xlsx';

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: "Wira Rent Car",
  displayName: "Wira Rent Car",
  tagline: 'Solusi Transportasi Terpercaya',
  address: 'Jl. Raya Merdeka No. 123, Jakarta',
  phone: '0851-9068-0660',
  email: 'admin@wirarentcar.com',
  website: 'wirarentcar.com',
  invoiceFooter: 'Terika kasih atas kepercayaan Anda menggunakan jasa kami.',
  themeColor: 'red',
  darkMode: false,
  paymentTerms: '1. Pembayaran DP minimal 30% saat booking.\n2. Pelunasan dilakukan saat serah terima unit.\n3. Pembayaran via Transfer BCA 1234567890 a.n Wira Rent Car.',
  termsAndConditions: `1. Persyaratan Sewa (Lepas Kunci)\nA. Untuk penyewaan tanpa pengemudi (self-drive), Penyewa wajib menyerahkan dokumen asli sebagai jaminan keamanan yang akan dikembalikan setelah masa sewa berakhir:\nB. Wajib: E-KTP Asli Penyewa.\nC. Wajib: SIM A yang masih berlaku (diperlihatkan & difotokopi/foto).\nD. Jaminan Tambahan (Pilih salah satu):\nE. Sepeda motor + STNK asli (atas nama Penyewa/Keluarga).\nF. NPWP / Kartu Keluarga / Kartu Identitas Pegawai (Karpeg).\nG. Uang deposit jaminan (Refundable) sebesar Rp1.000.000.\nH. Pihak Rental berhak menolak permohonan sewa jika identitas dirasa kurang meyakinkan atau tidak valid.\n\n2. Pembayaran dan Durasi Sewa\nA. Booking Fee (DP): Penyewa wajib membayar uang muka minimal 30-50% dari total biaya sewa untuk mengamankan jadwal.\nB. Pelunasan: Sisa pembayaran wajib dilunasi sebelum serah terima kunci mobil.\nC. Perhitungan Waktu:\nD. Paket 12 Jam / 24 Jam (Full Day).\nE. Keterlambatan pengembalian (Overtime) dikenakan denda sebesar 10% per jam dari harga sewa harian.\nF. Keterlambatan lebih dari 5 jam dihitung sebagai sewa 1 hari penuh.\nG. Pembatalan:\nI. Pembatalan H-1: DP hangus 50%.\nIi. Pembatalan pada hari H: DP hangus 100%.\n\n3. Tanggung Jawab Penyewa\nA. Kondisi Mobil: Mobil diserahkan dalam keadaan bersih dan laik jalan. Penyewa wajib mengembalikan dalam kondisi kebersihan yang sama. (Jika kotor berlebih/bau rokok tajam, dikenakan biaya salon sebesar Rp650.000,-).\nB. Bahan Bakar (BBM): Sistem pengembalian BBM adalah posisi sama dengan saat pengambilan (Return to same level).\nC. Penggunaan: Mobil hanya boleh digunakan sesuai peruntukan jalan raya (bukan untuk offroad, balapan, atau mengangkut barang yang merusak interior/bau menyengat seperti durian/ikan basah tanpa wadah kedap udara).\n\n4. Kerusakan dan Kecelakaan\nA. Kerusakan Ringan (Lecet/Penyok): Penyewa bertanggung jawab penuh atas biaya perbaikan di bengkel yang ditunjuk oleh Pihak Rental.\nB. Kerusakan Berat/Kecelakaan:\ni. Penyewa menanggung seluruh biaya perbaikan.\nii. Biaya Masa Tunggu (Idle Cost): Penyewa wajib membayar biaya sewa harian selama mobil berada di bengkel (karena mobil tidak bisa beroperasi/menghasilkan uang).\nC. Kehilangan: Jika terjadi kehilangan unit akibat kelalaian Penyewa (kunci tertinggal, parkir sembarangan), Penyewa wajib mengganti unit dengan spesifikasi setara atau membayar tunai seharga mobil tersebut di pasaran.\n\n5. Larangan Keras\nA. Penyewa dilarang keras untuk:\nB. Menggadaikan mobil.\nC. Menyewakan kembali ke pihak ketiga (over-rent).\nD. Menggunakan mobil untuk tindak kejahatan/kriminal.\nE. Mengubah bentuk atau memodifikasi komponen mobil.\n\n6. Force Majeure\nPihak Rental tidak bertanggung jawab atas kerugian Penyewa yang disebabkan oleh kejadian di luar kendali (bencana alam, huru-hara, atau kerusakan mesin murni karena faktor usia kendaraan yang bukan akibat kelalaian penggunaan).`,
  whatsappTemplate: `*INVOICE & BOOKING CONFIRMATION*\n🏢 *{company}*\n\nHalo Kak *{name}*,\nTerima kasih telah mempercayakan perjalanan Anda bersama kami. Berikut rincian booking Anda:\n\n📄 *No. Invoice:* {invoiceNo}\n🚗 *Unit:* {unit}\n📅 *Mulai:* {startDate}\n📅 *Selesai:* {endDate}\n\n--------------------------------\n💰 *Total Tagihan:* Rp {total}\n✅ *Sudah Bayar:* Rp {paid}\n⚠️ *Sisa Tagihan: Rp {remaining}*\n--------------------------------\nStatus Pembayaran: *{status}*\n\n_Mohon konfirmasi jika data sudah sesuai._\n{footer}`,
  carCategories: ['MPV', 'SUV', 'Sedan', 'City Car', 'Luxury', 'Minibus'],
  rentalPackages: ['12 Jam (Dalam Kota)', '24 Jam (Dalam Kota)', '24 Jam (Luar Kota)'],
  overtimeType: 'Percentage',
  overtimeValue: 10,
  gpsProvider: 'Simulation'
};

const KEYS = {
    CARS: 'cars',
    DRIVERS: 'drivers',
    PARTNERS: 'partners',
    CUSTOMERS: 'customers',
    BOOKINGS: 'bookings',
    TRANSACTIONS: 'transactions',
    SETTINGS: 'appSettings',
    HIGH_SEASONS: 'highSeasons',
    USERS: 'users',
    VENDORS: 'vendors'
};

export const getStoredData = <T>(key: string, defaultValue: T): T => {
    try {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error(`Error parsing ${key} from localStorage`, e);
    }
    return defaultValue;
};

export const setStoredData = async (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));

        if (supabase) {
            // MAPPING: Local key 'appSettings' map to Supabase table 'settings'
            const tableName = key === KEYS.SETTINGS ? 'settings' : key;
            
            if (key === KEYS.SETTINGS) {
                 await supabase.from('settings').upsert({ id: 'global', config: data });
            } else if (Array.isArray(data)) {
                 const { error } = await supabase.from(tableName).upsert(data);
                 if (error) console.error(`Supabase sync error for ${tableName}:`, error);
            }
        }
    } catch (e) {
        console.error(`Error saving ${key}`, e);
    }
};

export const checkAvailability = (
    bookings: Booking[], 
    resourceId: string, 
    start: Date, 
    end: Date, 
    type: 'car' | 'driver', 
    excludeBookingId?: string
): boolean => {
    return !bookings.some(b => {
        if (excludeBookingId && b.id === excludeBookingId) return false;
        if (b.status === BookingStatus.CANCELLED) return false;
        if (type === 'car' && b.carId !== resourceId) return false;
        if (type === 'driver' && b.driverId !== resourceId) return false;
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        return (start < bEnd && end > bStart);
    });
};

export const initializeData = async () => {
    const hasSettings = localStorage.getItem(KEYS.SETTINGS);
    if (!hasSettings) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }

    if (supabase) {
        try {
            console.log("Syncing data from Cloud...");
            for (const key of Object.values(KEYS)) {
                // Table mapping for settings
                const tableName = key === KEYS.SETTINGS ? 'settings' : key;
                
                if (key === KEYS.SETTINGS) {
                    const { data } = await supabase.from('settings').select('config').eq('id', 'global').single();
                    if (data?.config) localStorage.setItem(key, JSON.stringify(data.config));
                } else {
                    const { data } = await supabase.from(tableName).select('*');
                    if (data) localStorage.setItem(key, JSON.stringify(data));
                }
            }
            console.log("Data sync complete.");
        } catch (e) {
            console.warn("Cloud sync failed, using local data.", e);
        }
    }

    return true;
};

export const exportToExcel = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const importFromExcel = (file: File, callback: (data: any[]) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    callback(jsonData);
  };
  reader.readAsArrayBuffer(file);
};

export const downloadTemplateExcel = (type: 'armada' | 'pelanggan' | 'driver' | 'investor' | 'vendor') => {
  let headers: any[] = [];
  const settings = getStoredData<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  
  switch(type) {
    case 'armada':
      const carTemplate: any = { 
        nama_mobil: "Avanza G 2023", 
        merek: "Toyota", 
        plat_nomor: "B 1234 ABC", 
        kategori: "MPV",
        setoran_investor: 300000,
        gaji_driver: 150000
      };
      settings.rentalPackages.forEach(pkg => {
          carTemplate[pkg] = 600000;
      });
      headers = [carTemplate];
      break;
    case 'pelanggan':
      headers = [{ nama: "Andi Saputra", whatsapp: "08123456789", alamat: "Jl. Melati No. 10, Jakarta" }];
      break;
    case 'driver':
      headers = [{ nama: "Budi Santoso", whatsapp: "085712345678" }];
      break;
    case 'investor':
      headers = [{ nama: "PT Investama Raya", whatsapp: "08111222333" }];
      break;
    case 'vendor':
      headers = [{ nama_rental: "Abadi Rent", whatsapp: "0899888777", alamat: "Kuta, Bali" }];
      break;
  }

  exportToExcel(headers, `Template_Impor_${type}`);
};

export const mergeData = (existing: any[], imported: any[], key = 'id') => {
    const map = new Map();
    existing.forEach(i => map.set(i[key], i));
    imported.forEach(i => {
        const id = i[key] || `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        map.set(id, { ...i, [key]: id });
    });
    return Array.from(map.values());
};

export const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
        };
        reader.onerror = reject;
    });
};
