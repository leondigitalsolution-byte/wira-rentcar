export enum BookingStatus {
  BOOKED = 'Booked',
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  MAINTENANCE = 'Maintenance'
}

export enum PaymentStatus {
  UNPAID = 'Belum Lunas',
  PARTIAL = 'DP',
  PAID = 'Lunas'
}

// Updated Roles based on requirement
export type UserRole = 'superadmin' | 'admin' | 'driver' | 'partner';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  email?: string; // New: Login by Email
  phone?: string; // New: Login by Phone
  role: UserRole;
  linkedDriverId?: string; // If role is driver
  linkedPartnerId?: string; // If role is partner
  
  // New Profile Features
  image?: string | null;
}

export interface AppSettings {
  companyName: string;
  displayName: string; // New: Short Display Name
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  invoiceFooter: string;
  logoUrl?: string | null;
  stampUrl?: string | null; // New: Corporate Stamp Image
  
  // Theme Settings
  themeColor: string; // 'red', 'blue', 'green', 'purple', 'orange', 'black'
  darkMode: boolean;

  // New Settings for Invoice Text
  paymentTerms: string;
  termsAndConditions: string;
  
  // WhatsApp Template
  whatsappTemplate: string;
  
  // Master Data
  carCategories: string[];
  rentalPackages: string[];

  // Overtime Settings
  overtimeType: 'Percentage' | 'Nominal';
  overtimeValue: number;

  // GPS Integration
  gpsProvider: 'Simulation' | 'Traccar' | 'Custom';
  gpsApiUrl?: string;
  gpsApiToken?: string; // Basic Auth or Bearer Token
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  idCardImage?: string; // Optional Foto KTP
}

export interface Partner {
  id: string;
  name: string;
  phone: string;
  splitPercentage: number; // Keep for legacy, but UI will prefer Car.investorSetoran
  image?: string;
}

export interface Vendor {
  id: string;
  name: string; // Nama Rental Rekanan
  phone: string;
  address: string;
  image?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  dailyRate: number; // Deprecated by Car.driverSalary but kept for fallback
  status: 'Active' | 'Inactive';
  image: string;
}

export interface HighSeason {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  priceIncrease: number;
}

export interface Car {
  id: string;
  name: string;
  brand?: string; // New: Merek Mobil (Toyota, Honda, etc)
  plate: string;
  type: string;
  
  // New: Dynamic Pricing Map (Package Name -> Price)
  pricing: { [packageName: string]: number };
  
  // New: Fixed Financial Schemas
  investorSetoran: number; // Setoran fixed ke investor per hari
  driverSalary: number;    // Gaji driver fixed untuk mobil ini per hari
  
  price12h?: number; 
  price24h?: number;
  
  image: string;
  partnerId?: string | null;
  status: 'Available' | 'Unavailable';

  // GPS Integration
  gpsDeviceId?: string; // IMEI or Unique ID in GPS System
}

export interface VehicleChecklist {
  odometer: number;
  fuelLevel: string; // e.g. "50%", "Full", "Bar 3"
  speedometerImage: string; // Required
  physicalImages: {
    front?: string;
    back?: string;
    left?: string;
    right?: string;
  };
  notes?: string;
  checkedAt: number;
  checkedBy?: string;
}

export interface Booking {
  id: string;
  carId: string; // Optional if Rent to Rent, but keeping string to avoid break, use logic to ignore if isRentToRent
  
  // Rent to Rent Fields
  isRentToRent?: boolean;
  vendorId?: string; // ID Rental Rekanan
  externalCarName?: string; // Nama Mobil Luar
  externalCarPlate?: string; // Plat Mobil Luar
  vendorFee?: number; // Biaya sewa ke vendor (HPP)

  driverId?: string;
  customerId?: string; // Link to Customer DB
  customerName: string; // Fallback / Cache
  customerPhone: string; // Fallback / Cache
  
  startDate: string;
  endDate: string;
  
  // New: Actual Return for Overtime calculation
  actualReturnDate?: string; 
  
  packageType: string; // Updated to dynamic string
  
  // New Fields
  destination: 'Dalam Kota' | 'Luar Kota';
  
  // Deposit Details
  securityDepositType: 'Uang' | 'Barang';
  securityDepositValue: number; // Nominal uang atau estimasi nilai barang (opsional)
  securityDepositDescription: string; // Keterangan barang (misal: KTP Asli + Motor Beat)
  securityDepositImage?: string;

  // Vehicle Checklist (Serah Terima)
  checklist?: VehicleChecklist;

  // Financials
  basePrice: number;
  driverFee: number;
  highSeasonFee: number;
  deliveryFee: number;
  overtimeFee?: number; // Denda Keterlambatan
  extraCost?: number; // New: Biaya Tambahan (BBM, Kerusakan, dll)
  extraCostDescription?: string; // New: Keterangan Biaya Tambahan
  discount?: number; // New: Diskon Manual
  
  totalPrice: number;
  amountPaid: number;
  
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  
  notes: string; // Internal/General Note
  customerNote?: string; // Catatan khusus di Nota
  driverNote?: string;   // Catatan khusus di SPJ Driver

  createdAt: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string; // E.g., 'Rental Payment', 'Fuel', 'Service', 'Gaji Driver'
  description: string;
  bookingId?: string;
  receiptImage?: string; // New: Bukti Nota
  
  // New for Reimbursement Logic
  status?: 'Pending' | 'Paid'; 
  relatedId?: string; // Links to Driver ID or Partner ID or Vendor ID
}