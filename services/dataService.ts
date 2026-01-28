import { 
  Car, Driver, Partner, Customer, Booking, Transaction, AppSettings, HighSeason, 
  BookingStatus, PaymentStatus 
} from '../types';
import { db } from './firebaseConfig';
import { collection, getDocs, doc, writeBatch, setDoc, getDoc } from 'firebase/firestore';

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
    USERS: 'users'
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

// Fungsi Sinkronisasi Koleksi Array (List) ke Firestore
const syncToFirestore = async (key: string, data: any) => {
    if (!db) {
        console.warn("[Firebase] Cannot sync: DB not initialized.");
        return;
    }
    if (!Array.isArray(data)) return; 

    try {
        const colRef = collection(db, key);
        
        // PENTING: Firestore menolak 'undefined'. Kita harus membersihkannya.
        // JSON.stringify secara otomatis menghapus key yang bernilai undefined.
        // JSON.parse mengembalikannya menjadi objek bersih.
        const cleanData = JSON.parse(JSON.stringify(data));

        // 1. Ambil data eksisting di Firestore untuk cek diff
        // NOTE: This might fail if offline or permissions are wrong
        const snapshot = await getDocs(colRef);
        const newIds = new Set(cleanData.map((item: any) => item.id));
        
        const operations: { type: 'set' | 'delete', ref: any, data?: any }[] = [];

        // Identify Deletes
        snapshot.docs.forEach(docSnap => {
            if (!newIds.has(docSnap.id)) {
                operations.push({ type: 'delete', ref: docSnap.ref });
            }
        });

        // Identify Writes/Updates
        cleanData.forEach((item: any) => {
            if (item.id) {
                const docRef = doc(db, key, item.id);
                operations.push({ type: 'set', ref: docRef, data: item });
            }
        });

        // 2. Commit in Chunks
        const CHUNK_SIZE = 450; 
        for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = operations.slice(i, i + CHUNK_SIZE);
            
            chunk.forEach(op => {
                if (op.type === 'delete') {
                    batch.delete(op.ref);
                } else {
                    batch.set(op.ref, op.data, { merge: true });
                }
            });
            
            await batch.commit();
        }

        console.log(`[Firebase] Successfully synced collection ${key} (${operations.length} ops)`);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.error(`[Firebase] Permission Denied for ${key}. Check Firestore Security Rules!`);
        } else {
            console.error(`[Firebase] Error syncing ${key}:`, error);
        }
    }
};

// Fungsi Khusus untuk Sync Pengaturan (Single Document)
const syncSettingsToCloud = async (settings: AppSettings) => {
    if (!db) return;
    try {
        // Bersihkan undefined dari settings juga
        const cleanSettings = JSON.parse(JSON.stringify(settings));
        
        // Simpan sebagai dokumen tunggal 'system/appSettings'
        await setDoc(doc(db, 'system', 'appSettings'), cleanSettings);
        console.log("[Firebase] Settings synced to cloud.");
    } catch (e: any) {
        console.error("Error syncing settings:", e);
        if (e.code === 'permission-denied') {
            alert("Gagal menyimpan ke Cloud: Izin Ditolak. Pastikan aturan Firestore diatur ke publik (allow read, write: if true;)");
        }
    }
};

// Changed to ASYNC to ensure data is written before reload
export const setStoredData = async (key: string, data: any) => {
    try {
        // 1. Simpan ke LocalStorage (Untuk performa UI instan)
        localStorage.setItem(key, JSON.stringify(data));
        
        // 2. Sinkron ke Firebase
        // We trigger this WITHOUT awaiting to prevent UI blocking if network is slow/offline
        // The data is already safe in LocalStorage
        if (key === KEYS.SETTINGS) {
            syncSettingsToCloud(data).catch(e => console.warn("[Firebase] Background sync failed:", e));
        } else {
            syncToFirestore(key, data).catch(e => console.warn("[Firebase] Background sync failed:", e));
        }
    } catch (e) {
        console.error(`Error saving ${key} to localStorage`, e);
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
        // Anti bentrok: Abaikan pesanan yang dicancel
        if (b.status === BookingStatus.CANCELLED) return false;
        
        if (type === 'car' && b.carId !== resourceId) return false;
        if (type === 'driver' && b.driverId !== resourceId) return false;

        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        
        return (start < bEnd && end > bStart);
    });
};

export const initializeData = async () => {
    // 1. Cek Setting Local
    const hasSettings = localStorage.getItem(KEYS.SETTINGS);
    if (!hasSettings) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }

    // 2. Integrasi Firebase (Non-Blocking / Offline First)
    if (db) {
        const syncTask = async () => {
            try {
                console.log("[Firebase] Connecting to cloud...");

                // A. Sync Settings (Single Document)
                try {
                    const settingsRef = doc(db, 'system', 'appSettings');
                    const settingsSnap = await getDoc(settingsRef);
                    if (settingsSnap.exists()) {
                        console.log("[Firebase] Found cloud settings. Syncing DOWN...");
                        const cloudSettings = settingsSnap.data() as AppSettings;
                        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(cloudSettings));
                    } else {
                        // Jika cloud kosong, push settings default/lokal ke cloud
                        console.log("[Firebase] Cloud settings empty. Syncing UP...");
                        const localSettings = getStoredData(KEYS.SETTINGS, DEFAULT_SETTINGS);
                        await syncSettingsToCloud(localSettings);
                    }
                } catch (e) {
                    console.warn("[Firebase] Settings sync warning:", e);
                }

                // B. Sync Collections (Arrays) - Added USERS
                const collectionsToSync = [
                    KEYS.CARS, KEYS.DRIVERS, KEYS.PARTNERS, KEYS.CUSTOMERS, 
                    KEYS.BOOKINGS, KEYS.TRANSACTIONS, KEYS.HIGH_SEASONS, KEYS.USERS
                ];

                // Attempt to read one collection to verify connection/permissions
                const carCol = collection(db, KEYS.CARS);
                const carSnap = await getDocs(carCol);

                if (!carSnap.empty) {
                    console.log("[Firebase] Found cloud data. Syncing DOWN...");
                    await Promise.all(collectionsToSync.map(async (key) => {
                        const colRef = collection(db, key);
                        const snapshot = await getDocs(colRef);
                        if (!snapshot.empty) {
                            const cloudData = snapshot.docs.map(doc => doc.data());
                            
                            // FIX: Merge with local data instead of overwriting
                            // This prevents data loss if local has new items not yet in cloud
                            const localData = getStoredData(key, []);
                            const merged = mergeData(localData, cloudData);
                            
                            localStorage.setItem(key, JSON.stringify(merged));
                        }
                    }));
                } else {
                    console.log("[Firebase] Cloud collections empty.");
                    const hasLocalCars = localStorage.getItem(KEYS.CARS);
                    if (hasLocalCars) {
                        console.log("[Firebase] Local data found. Syncing UP to cloud...");
                        for (const key of collectionsToSync) {
                            const localData = getStoredData(key, []);
                            if (localData.length > 0) {
                                await syncToFirestore(key, localData);
                            }
                        }
                    } else {
                        console.log("[Firebase] Fresh install. Generating dummy data...");
                        await generateDummyData();
                    }
                }
            } catch (e: any) {
                // Only log warning if truly offline/error
                console.warn("[Firebase] Sync interrupted or offline:", e);
                if (e.code === 'permission-denied') {
                    console.error("CRITICAL: Firebase Permission Denied. Data cannot sync!");
                }
            }
        };

        // RACE: Wait maximum 2.5s for sync. If timeout, proceed with local data (Offline Mode)
        // Background sync might continue if the promise allows, but we unblock the UI.
        await Promise.race([
            syncTask(),
            new Promise(resolve => setTimeout(resolve, 2500))
        ]);
    }
    return true;
};

// Changed to Async
export const clearAllData = async () => {
    // Note: We deliberately exclude KEYS.USERS from clearAllData to prevent accidental lockout of admin accounts
    const keysToRemove = [KEYS.CARS, KEYS.DRIVERS, KEYS.PARTNERS, KEYS.CUSTOMERS, KEYS.BOOKINGS, KEYS.TRANSACTIONS, KEYS.HIGH_SEASONS];
    
    // Clear All
    await Promise.all(keysToRemove.map(async k => {
        localStorage.removeItem(k);
        await syncToFirestore(k, []); 
    }));
    
    window.location.reload();
};

// GENERATE REAL DUMMY DATA
const generateDummyDataObjects = () => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    
    const cars: Car[] = [
        { id: 'c1', name: 'Avanza Veloz', brand: 'Toyota', plate: 'B 1234 ABC', type: 'MPV', pricing: {'12 Jam (Dalam Kota)': 350000, '24 Jam (Dalam Kota)': 500000, '24 Jam (Luar Kota)': 600000}, price12h: 350000, price24h: 500000, image: 'https://img.mobilmo.com/2019/01/16/f8286LtF/toyota-avanza-2019-3-e028.jpg', status: 'Available', investorSetoran: 0, driverSalary: 150000 },
        { id: 'c2', name: 'Brio RS', brand: 'Honda', plate: 'B 5678 XYZ', type: 'City Car', pricing: {'12 Jam (Dalam Kota)': 300000, '24 Jam (Dalam Kota)': 400000, '24 Jam (Luar Kota)': 500000}, price12h: 300000, price24h: 400000, image: 'https://asset.honda-indonesia.com/2023/05/05/9670b30a-6029-430c-b24e-72b65727932d.jpg', status: 'Available', investorSetoran: 0, driverSalary: 150000 },
        { id: 'c3', name: 'Innova Reborn', brand: 'Toyota', plate: 'D 9999 AA', type: 'MPV', pricing: {'12 Jam (Dalam Kota)': 500000, '24 Jam (Dalam Kota)': 750000, '24 Jam (Luar Kota)': 900000}, price12h: 500000, price24h: 750000, image: 'https://images.tokopedia.net/img/cache/700/VqbcmM/2022/8/20/47f73003-7303-4f96-b072-002d28743936.jpg', status: 'Available', partnerId: 'p1', investorSetoran: 300000, driverSalary: 150000 },
        { id: 'c4', name: 'Alphard', brand: 'Toyota', plate: 'B 1 BOS', type: 'Luxury', pricing: {'12 Jam (Dalam Kota)': 2500000, '24 Jam (Dalam Kota)': 3500000, '24 Jam (Luar Kota)': 4000000}, price12h: 2500000, price24h: 3500000, image: 'https://auto2000.co.id/berita-dan-tips/images/alphard-2023.jpg', status: 'Available', investorSetoran: 0, driverSalary: 250000 },
    ];

    const drivers: Driver[] = [
        { id: 'd1', name: 'Budi Santoso', phone: '081234567890', dailyRate: 150000, status: 'Active', image: 'https://i.pravatar.cc/150?u=d1' },
        { id: 'd2', name: 'Asep Saepul', phone: '081987654321', dailyRate: 175000, status: 'Active', image: 'https://i.pravatar.cc/150?u=d2' }
    ];

    const partners: Partner[] = [
        { id: 'p1', name: 'Investor Sejahtera', phone: '081233334444', splitPercentage: 70, image: 'https://i.pravatar.cc/150?u=p1' }
    ];

    const customers: Customer[] = [
        { id: 'cust1', name: 'Rina Wati', phone: '085677778888', address: 'Jl. Melati No. 5' },
        { id: 'cust2', name: 'PT. Maju Mundur', phone: '02155556666', address: 'Gedung Cyber Lt. 2' }
    ];

    const bookings: Booking[] = [
        {
            id: 'b1', carId: 'c1', customerId: 'cust1', customerName: 'Rina Wati', customerPhone: '085677778888',
            startDate: `${today}T08:00:00`, endDate: `${today}T20:00:00`, packageType: '12 Jam (Dalam Kota)', destination: 'Dalam Kota',
            basePrice: 350000, driverFee: 0, highSeasonFee: 0, deliveryFee: 50000, totalPrice: 400000, amountPaid: 200000,
            status: BookingStatus.ACTIVE, paymentStatus: PaymentStatus.PARTIAL, notes: 'Jemput di bandara', createdAt: now - 86400000,
            securityDepositType: 'Barang', securityDepositValue: 0, securityDepositDescription: 'KTP Asli'
        },
        {
            id: 'b2', carId: 'c3', driverId: 'd1', customerId: 'cust2', customerName: 'PT. Maju Mundur', customerPhone: '02155556666',
            startDate: `${today}T07:00:00`, endDate: `${today}T23:00:00`, packageType: '24 Jam (Luar Kota)', destination: 'Luar Kota',
            basePrice: 900000, driverFee: 150000, highSeasonFee: 0, deliveryFee: 0, totalPrice: 1050000, amountPaid: 1050000,
            status: BookingStatus.ACTIVE, paymentStatus: PaymentStatus.PAID, notes: 'Tujuan Bandung', createdAt: now - 172800000,
            securityDepositType: 'Uang', securityDepositValue: 1000000, securityDepositDescription: 'Transfer BCA'
        }
    ];

    const transactions: Transaction[] = [
        { id: 'tx1', date: today, amount: 200000, type: 'Income', category: 'Rental Payment', description: 'DP Booking Rina Wati', bookingId: 'b1', status: 'Paid' },
        { id: 'tx2', date: today, amount: 1050000, type: 'Income', category: 'Rental Payment', description: 'Pelunasan PT. Maju Mundur', bookingId: 'b2', status: 'Paid' },
        { id: 'tx3', date: today, amount: 50000, type: 'Expense', category: 'BBM', description: 'Isi Bensin Awal Avanza', relatedId: 'd1', status: 'Paid' }
    ];

    return { cars, drivers, partners, customers, bookings, transactions, highSeasons: [] };
};

// Changed to Async
export const generateDummyData = async () => {
    const data = generateDummyDataObjects();
    
    // Write all to storage and wait for completion
    // Since setStoredData is now non-blocking for Firebase, this returns quickly after LocalStorage update
    await Promise.all([
        setStoredData(KEYS.PARTNERS, data.partners),
        setStoredData(KEYS.DRIVERS, data.drivers),
        setStoredData(KEYS.CARS, data.cars),
        setStoredData(KEYS.CUSTOMERS, data.customers),
        setStoredData(KEYS.BOOKINGS, data.bookings),
        setStoredData(KEYS.TRANSACTIONS, data.transactions),
        setStoredData(KEYS.HIGH_SEASONS, data.highSeasons)
    ]);

    window.location.reload();
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
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
        reader.onerror = reject;
    });
};

export const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => `"${String(row[fieldName]).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.click();
};

export const processCSVImport = (file: File, callback: (data: any[]) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const result = lines.slice(1).filter(l => l.trim()).map(line => {
            const currentline = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            const obj: any = {};
            headers.forEach((h, idx) => {
                let val = currentline?.[idx] || "";
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                obj[h] = val;
            });
            return obj;
        });
        callback(result);
    };
    reader.readAsText(file);
};

export const mergeData = (existing: any[], imported: any[], key = 'id') => {
    const map = new Map();
    existing.forEach(i => map.set(i[key], i));
    imported.forEach(i => map.set(i[key] || Date.now() + Math.random(), { ...i, [key]: i[key] || (Date.now() + Math.random()).toString() }));
    return Array.from(map.values());
};