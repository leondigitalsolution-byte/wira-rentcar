
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
  invoiceFooter: 'Terima kasih atas kepercayaan Anda menggunakan jasa kami.',
  themeColor: 'red',
  darkMode: false,
  paymentTerms: '1. Pembayaran DP minimal 30% saat booking.\n2. Pelunasan dilakukan saat serah terima unit.\n3. Pembayaran via Transfer BCA 1234567890 a.n Wira Rent Car.',
  termsAndConditions: `1. Persyaratan Sewa (Lepas Kunci)
A. Untuk penyewaan tanpa pengemudi (self-drive), Penyewa wajib menyerahkan dokumen asli sebagai jaminan keamanan yang akan dikembalikan setelah masa sewa berakhir:
B. Wajib: E-KTP Asli Penyewa.
C. Wajib: SIM A yang masih berlaku (diperlihatkan & difotokopi/foto).
D. Jaminan Tambahan (Pilih salah satu):
E. Sepeda motor + STNK asli (atas nama Penyewa/Keluarga).
F. NPWP / Kartu Keluarga / Kartu Identitas Pegawai (Karpeg).
G. Uang deposit jaminan (Refundable) sebesar Rp1.000.000.
H. Pihak Rental berhak menolak permohonan sewa jika identitas dirasa kurang meyakinkan atau tidak valid.

2. Pembayaran dan Durasi Sewa
A. Booking Fee (DP): Penyewa wajib membayar uang muka minimal 30-50% dari total biaya sewa untuk mengamankan jadwal.
B. Pelunasan: Sisa pembayaran wajib dilunasi sebelum serah terima kunci mobil.
C. Perhitungan Waktu:
D. Paket 12 Jam / 24 Jam (Full Day).
E. Keterlambatan pengembalian (Overtime) dikenakan denda sebesar 10% per jam dari harga sewa harian.
F. Keterlambatan lebih dari 5 jam dihitung sebagai sewa 1 hari penuh.
G. Pembatalan:
I. Pembatalan H-1: DP hangus 50%.
Ii. Pembatalan pada hari H: DP hangus 100%.

3. Tanggung Jawab Penyewa
A. Kondisi Mobil: Mobil diserahkan dalam keadaan bersih dan laik jalan. Penyewa wajib mengembalikan dalam kondisi kebersihan yang sama. (Jika kotor berlebih/bau rokok tajam, dikenakan biaya salon sebesar Rp650.000,-).
B. Bahan Bakar (BBM): Sistem pengembalian BBM adalah posisi sama dengan saat pengambilan (Return to same level).
C. Penggunaan: Mobil hanya boleh digunakan sesuai peruntukan jalan raya (bukan untuk offroad, balapan, atau mengangkut barang yang merusak interior/bau menyengat seperti durian/ikan basah tanpa wadah kedap udara).

4. Kerusakan dan Kecelakaan
A. Kerusakan Ringan (Lecet/Penyok): Penyewa bertanggung jawab penuh atas biaya perbaikan di bengkel yang ditunjuk oleh Pihak Rental.
B. Kerusakan Berat/Kecelakaan:
i. Penyewa menanggung seluruh biaya perbaikan.
ii. Biaya Masa Tunggu (Idle Cost): Penyewa wajib membayar biaya sewa harian selama mobil berada di bengkel (karena mobil tidak bisa beroperasi/menghasilkan uang).
C. Kehilangan: Jika terjadi kehilangan unit akibat kelalaian Penyewa (kunci tertinggal, parkir sembarangan), Penyewa wajib mengganti unit dengan spesifikasi setara atau membayar tunai seharga mobil tersebut di pasaran.

5. Larangan Keras
A. Penyewa dilarang keras untuk:
B. Menggadaikan mobil.
C. Menyewakan kembali ke pihak ketiga (over-rent).
D. Menggunakan mobil untuk tindak kejahatan/kriminal.
E. Mengubah bentuk atau memodifikasi komponen mobil.

6. Force Majeure
Pihak Rental tidak bertanggung jawab atas kerugian Penyewa yang disebabkan oleh kejadian di luar kendali (bencana alam, huru-hara, atau kerusakan mesin murni karena faktor usia kendaraan yang bukan akibat kelalaian penggunaan).`,
  whatsappTemplate: `*INVOICE & BOOKING CONFIRMATION*
🏢 *{company}*

Halo Kak *{name}*,
Terima kasih telah mempercayakan perjalanan Anda bersama kami. Berikut rincian booking Anda:

📄 *No. Invoice:* {invoiceNo}
🚗 *Unit:* {unit}
📅 *Mulai:* {startDate}
📅 *Selesai:* {endDate}

--------------------------------
💰 *Total Tagihan:* Rp {total}
✅ *Sudah Bayar:* Rp {paid}
⚠️ *Sisa Tagihan: Rp {remaining}*
--------------------------------
Status Pembayaran: *{status}*

_Mohon konfirmasi jika data sudah sesuai._
{footer}`,
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

// --- DUAL SYNC ENGINE ---
// 1. Write to Local Storage (Immediate UI update)
// 2. Push to Supabase (Async Cloud Backup)
export const setStoredData = async (key: string, data: any) => {
    try {
        // 1. Local Write
        localStorage.setItem(key, JSON.stringify(data));

        // 2. Cloud Sync (Fire and Forget)
        if (supabase) {
            // Note: This assumes the data is an array of objects with an 'id' field
            // which maps 1:1 to Supabase tables.
            // For settings (object), we wrap it or handle differently.
            
            if (key === KEYS.SETTINGS) {
                 await supabase.from('settings').upsert({ id: 'global', config: data });
            } else if (Array.isArray(data)) {
                 // Upsert batch data
                 const { error } = await supabase.from(key).upsert(data);
                 if (error) console.error(`Supabase sync error for ${key}:`, error);
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

    // HYDRATION FROM SUPABASE
    // If online, fetch latest data from cloud and update local storage
    if (supabase) {
        try {
            console.log("Syncing data from Cloud...");
            for (const key of Object.values(KEYS)) {
                if (key === KEYS.SETTINGS) {
                    const { data } = await supabase.from('settings').select('config').eq('id', 'global').single();
                    if (data?.config) localStorage.setItem(key, JSON.stringify(data.config));
                } else {
                    const { data } = await supabase.from(key).select('*');
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

// === EXCEL EXPORT & IMPORT SERVICES ===

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

// OPTIMIZED IMAGE COMPRESSION (Max 600px, 0.5 quality)
// Prevents LocalStorage Quota Exceeded and speeds up uploads
export const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; // Reduced from 800
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Reduced quality from 0.7 to 0.5
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
        };
        reader.onerror = reject;
    });
};
