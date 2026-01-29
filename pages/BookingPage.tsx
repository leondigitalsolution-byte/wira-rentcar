import { 
  Search, Plus, Trash2, MessageCircle, AlertTriangle, Calendar, 
  User as UserIcon, Zap, CheckCircle, MapPin, Shield, 
  Image as ImageIcon, X, FileText, ClipboardCheck, Fuel, 
  Gauge, Car as CarIcon, Edit2, FileSpreadsheet, ChevronDown, 
  Filter, Info, Send, Wallet, CheckSquare, Clock as ClockIcon,
  DollarSign, CreditCard, Tag, ArrowRight, History, XCircle,
  Camera, Printer, ChevronLeft, ChevronRight, LayoutList, GanttChart,
  Building, UserCheck, Inbox, Tag as TagIcon, SearchIcon, Lock
} from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getStoredData, setStoredData, checkAvailability, DEFAULT_SETTINGS, compressImage } from '../services/dataService';
import { Car, Booking, BookingStatus, PaymentStatus, Transaction, Driver, HighSeason, AppSettings, Customer, User, VehicleChecklist, Partner, Vendor } from '../types';
import { generateInvoicePDF, generateWhatsAppLink, generateDriverTaskLink } from '../services/pdfService';

interface Props {
    currentUser: User;
}

const BookingPage: React.FC<Props> = ({ currentUser }) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'timeline'>('list');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const [cars, setCars] = useState<Car[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [highSeasons, setHighSeasons] = useState<HighSeason[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Timeline State
  const [timelineDate, setTimelineDate] = useState(new Date());
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineBrandFilter, setTimelineBrandFilter] = useState('All');

  // List Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  
  // Requirement: Default date is today
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(todayStr);
  const [endTime, setEndTime] = useState('08:00');
  
  // Car Selection State
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [isCarDropdownOpen, setIsCarDropdownOpen] = useState(false);
  const [carSearchQuery, setCarSearchQuery] = useState('');
  const carDropdownRef = useRef<HTMLDivElement>(null);

  // Customer Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Driver Selection State
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const driverDropdownRef = useRef<HTMLDivElement>(null);

  // Vendor Selection State
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  // Rent to Rent State
  const [isRentToRent, setIsRentToRent] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [externalCarName, setExternalCarName] = useState('');
  const [externalCarPlate, setExternalCarPlate] = useState('');
  const [vendorFee, setVendorFee] = useState<number>(0);

  const [useDriver, setUseDriver] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [driverNote, setDriverNote] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [packageType, setPackageType] = useState<string>('');
  const [destination, setDestination] = useState<'Dalam Kota' | 'Luar Kota'>('Dalam Kota');
  const [customerNote, setCustomerNote] = useState('');

  // Security Deposit State
  const [securityDepositType, setSecurityDepositType] = useState<'Uang' | 'Barang'>('Barang');
  const [securityDepositValue, setSecurityDepositValue] = useState<number>(0);
  const [securityDepositDescription, setSecurityDepositDescription] = useState('');
  const [securityDepositImage, setSecurityDepositImage] = useState<string | null>(null);

  const [customBasePrice, setCustomBasePrice] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [paymentProofImage, setPaymentProofImage] = useState<string | null>(null);

  const [actualReturnDate, setActualReturnDate] = useState('');
  const [actualReturnTime, setActualReturnTime] = useState('');
  const [overtimeFee, setOvertimeFee] = useState<number>(0);
  const [extraCost, setExtraCost] = useState<number>(0);
  const [extraCostDescription, setExtraCostDescription] = useState('');
  const [discount, setDiscount] = useState<number>(0); 

  const [currentStatus, setCurrentStatus] = useState<BookingStatus>(BookingStatus.BOOKED);
  const [internalNotes, setInternalNotes] = useState('');

  const [carError, setCarError] = useState('');
  const [conflictingBooking, setConflictingBooking] = useState<Booking | null>(null);
  const [driverError, setDriverError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [durationDays, setDurationDays] = useState(0);
  const [pricing, setPricing] = useState({
    basePrice: 0,
    driverFee: 0,
    highSeasonFee: 0,
    deliveryFee: 0,
    overtimeFee: 0,
    extraCost: 0,
    discount: 0,
    totalPrice: 0
  });

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [checklistBooking, setChecklistBooking] = useState<Booking | null>(null);
  const [checkOdometer, setCheckOdometer] = useState<string>('');
  const [checkFuel, setCheckFuel] = useState<string>('');
  const [checkSpeedometerImg, setCheckSpeedometerImg] = useState<string | null>(null);
  const [checkFrontImg, setCheckFrontImg] = useState<string | null>(null);
  const [checkBackImg, setCheckBackImg] = useState<string | null>(null);
  const [checkLeftImg, setCheckLeftImg] = useState<string | null>(null);
  const [checkRightImg, setCheckRightImg] = useState<string | null>(null);
  const [checkNotes, setCheckNotes] = useState('');

  const isSuperAdmin = currentUser.role === 'superadmin';

  useEffect(() => {
    setCars(getStoredData<Car[]>('cars', []));
    setBookings(getStoredData<Booking[]>('bookings', []));
    setDrivers(getStoredData<Driver[]>('drivers', []));
    setPartners(getStoredData<Partner[]>('partners', []));
    setVendors(getStoredData<Vendor[]>('vendors', []));
    setHighSeasons(getStoredData<HighSeason[]>('highSeasons', []));
    setTransactions(getStoredData<Transaction[]>('transactions', []));
    setCustomers(getStoredData<Customer[]>('customers', []));
    const loadedSettings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    setSettings(loadedSettings);
    
    if(loadedSettings.rentalPackages && loadedSettings.rentalPackages.length > 0) {
        setPackageType(loadedSettings.rentalPackages[0]);
    } else {
        setPackageType(DEFAULT_SETTINGS.rentalPackages[0]);
    }

    const handleClickOutside = (event: MouseEvent) => {
        if (carDropdownRef.current && !carDropdownRef.current.contains(event.target as Node)) {
            setIsCarDropdownOpen(false);
        }
        if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
            setIsCustomerDropdownOpen(false);
        }
        if (driverDropdownRef.current && !driverDropdownRef.current.contains(event.target as Node)) {
            setIsDriverDropdownOpen(false);
        }
        if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
            setIsVendorDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
      if (selectedCustomerId) {
          const cust = customers.find(c => c.id === selectedCustomerId);
          if (cust) {
              setCustomerName(cust.name);
              setCustomerPhone(cust.phone);
          }
      }
  }, [selectedCustomerId, customers]);

  useEffect(() => {
      if (isRentToRent) return; 
      if (!selectedCarId || !packageType || editingBookingId) return;
      const car = cars.find(c => c.id === selectedCarId);
      if (car) {
          let price = car.price24h || 0;
          if (car.pricing && car.pricing[packageType]) {
              price = car.pricing[packageType];
          }
          setCustomBasePrice(price);
      }
  }, [selectedCarId, packageType, cars, editingBookingId, isRentToRent]);

  // Perhitungan Overtime Fee Otomatis
  useEffect(() => {
    if (actualReturnDate && actualReturnTime && endDate && endTime) {
        const actual = new Date(`${actualReturnDate}T${actualReturnTime}`);
        const scheduled = new Date(`${endDate}T${endTime}`);
        if (actual > scheduled) {
            const diffMs = actual.getTime() - scheduled.getTime();
            const overdueHours = Math.ceil(diffMs / (1000 * 60 * 60));
            
            let calculated = 0;
            const ovType = settings?.overtimeType || 'Percentage';
            const ovVal = settings?.overtimeValue || 10;

            if (ovType === 'Percentage') {
                calculated = overdueHours * ((customBasePrice || 0) * (ovVal / 100));
            } else {
                calculated = overdueHours * ovVal;
            }
            setOvertimeFee(calculated);
        } else {
            setOvertimeFee(0);
        }
    }
  }, [actualReturnDate, actualReturnTime, endDate, endTime, customBasePrice, settings]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.max(1, Math.ceil(diffHours / 24));
    setDurationDays(diffDays);

    const car = cars.find(c => c.id === selectedCarId);

    // Car Availability Check
    if (selectedCarId && !isRentToRent) {
      const conflict = bookings.find(b => {
          if (editingBookingId && b.id === editingBookingId) return false;
          if (b.status === BookingStatus.CANCELLED) return false;
          if (b.carId !== selectedCarId) return false;
          const bStart = new Date(b.startDate);
          const bEnd = new Date(b.endDate);
          return (start < bEnd && end > bStart);
      });
      
      if (conflict) {
          setCarError('Unit tidak tersedia (Bentrok)!');
          setConflictingBooking(conflict);
      } else {
          setCarError('');
          setConflictingBooking(null);
      }
    } else {
        setCarError('');
        setConflictingBooking(null);
    }

    if (useDriver && selectedDriverId) {
        const isDriverAvailable = checkAvailability(bookings, selectedDriverId, start, end, 'driver', editingBookingId || undefined);
        setDriverError(isDriverAvailable ? '' : 'Driver sudah memiliki tugas lain!');
    } else {
        setDriverError('');
    }

    if (start < end) {
        const totalBase = (customBasePrice || 0) * diffDays;
        const carDriverSalary = car?.driverSalary || 0;
        let totalDriver = useDriver ? carDriverSalary * diffDays : 0;
        
        let hsFee = 0;
        highSeasons.forEach(hs => {
            const hsStart = new Date(hs.startDate);
            const hsEnd = new Date(hs.endDate);
            if (start < hsEnd && end > hsStart) hsFee += hs.priceIncrease * diffDays;
        });

        const subTotal = totalBase + totalDriver + hsFee + deliveryFee + overtimeFee + extraCost;
        const total = Math.max(0, subTotal - discount);

        setPricing({ 
            basePrice: totalBase, 
            driverFee: totalDriver, 
            highSeasonFee: hsFee, 
            deliveryFee, 
            overtimeFee, 
            extraCost,
            discount,
            totalPrice: total 
        });
    }
  }, [selectedCarId, selectedDriverId, useDriver, startDate, startTime, endDate, endTime, customBasePrice, deliveryFee, extraCost, overtimeFee, discount, bookings, cars, drivers, highSeasons, editingBookingId, isRentToRent]);

  const handleChecklistImageUpload = async (field: 'speedometer' | 'front' | 'back' | 'left' | 'right', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        try {
            const res = await compressImage(file);
            if (field === 'speedometer') setCheckSpeedometerImg(res);
            if (field === 'front') setCheckFrontImg(res);
            if (field === 'back') setCheckBackImg(res);
            if (field === 'left') setCheckLeftImg(res);
            if (field === 'right') setCheckRightImg(res);
        } catch(e) {
            alert("Gagal memproses gambar.");
        }
    }
  };

  const handleDepositImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const res = await compressImage(file);
              setSecurityDepositImage(res);
          } catch(e) {
              alert("Gagal memproses gambar jaminan.");
          }
      }
  };

  const handleEdit = (booking: Booking) => {
      setEditingBookingId(booking.id);
      setActiveTab('create');
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.max(1, Math.ceil((diffMs / (1000 * 60 * 60)) / 24));
      
      setStartDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().slice(0,5));
      setEndDate(end.toISOString().split('T')[0]);
      setEndTime(end.toTimeString().slice(0,5));
      
      if (booking.isRentToRent) {
          setIsRentToRent(true);
          setSelectedVendorId(booking.vendorId || '');
          setExternalCarName(booking.externalCarName || '');
          setExternalCarPlate(booking.externalCarPlate || '');
          setVendorFee(booking.vendorFee || 0);
          setSelectedCarId(''); 
      } else {
          setIsRentToRent(false);
          setSelectedCarId(booking.carId);
          setSelectedVendorId('');
          setExternalCarName('');
          setExternalCarPlate('');
          setVendorFee(0);
      }

      setUseDriver(!!booking.driverId);
      setSelectedDriverId(booking.driverId || '');
      setDriverNote(booking.driverNote || '');
      
      setSelectedCustomerId(booking.customerId || '');
      setCustomerName(booking.customerName);
      setCustomerPhone(booking.customerPhone);
      setDestination(booking.destination);
      setPackageType(booking.packageType);
      setCustomerNote(booking.customerNote || '');

      setSecurityDepositType(booking.securityDepositType || 'Barang');
      setSecurityDepositValue(booking.securityDepositValue || 0);
      setSecurityDepositDescription(booking.securityDepositDescription || '');
      setSecurityDepositImage(booking.securityDepositImage || null);
      
      setCustomBasePrice(booking.basePrice / diffDays);
      setDeliveryFee(booking.deliveryFee);
      setExtraCost(booking.extraCost || 0);
      setExtraCostDescription(booking.extraCostDescription || '');
      setOvertimeFee(booking.overtimeFee || 0);
      setDiscount(booking.discount || 0);
      
      setCurrentStatus(booking.status);
      setAmountPaid(booking.amountPaid.toString());
      setInternalNotes(booking.notes);

      if (booking.actualReturnDate) {
          const act = new Date(booking.actualReturnDate);
          setActualReturnDate(act.toISOString().split('T')[0]);
          setActualReturnTime(act.toTimeString().slice(0,5));
      } else {
          setActualReturnDate('');
          setActualReturnTime('');
      }
  };

  const handleTimelineCellClick = (carId: string, date: Date) => {
      resetForm();
      // Format as YYYY-MM-DD using local time parts to avoid UTC date shift bug
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      setSelectedCarId(carId);
      setStartDate(dateStr);
      setStartTime('08:00');
      setEndDate(dateStr); 
      setEndTime('20:00');
      setActiveTab('create');
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRentToRent && carError) return;
    if (driverError) return;
    
    if (isRentToRent && !externalCarName) { alert("Nama Mobil External harus diisi!"); return; }
    if (!isRentToRent && !selectedCarId) { alert("Pilih Unit Mobil!"); return; }

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    if (end <= start) { alert('Waktu selesai harus setelah waktu mulai'); return; }

    let actReturnIso = undefined;
    if (actualReturnDate && actualReturnTime) actReturnIso = new Date(`${actualReturnDate}T${actualReturnTime}`).toISOString();

    let finalStatus = BookingStatus.BOOKED;
    if (actReturnIso) finalStatus = BookingStatus.COMPLETED;
    else if (currentStatus === BookingStatus.ACTIVE) finalStatus = BookingStatus.ACTIVE;
    else if (currentStatus === BookingStatus.CANCELLED) finalStatus = BookingStatus.CANCELLED;

    const paid = parseInt(amountPaid) || 0;
    let finalPaymentStatus = PaymentStatus.UNPAID;
    if (paid >= pricing.totalPrice && pricing.totalPrice > 0) finalPaymentStatus = PaymentStatus.PAID;
    else if (paid > 0) finalPaymentStatus = PaymentStatus.PARTIAL;

    const newBooking: Booking = {
      id: editingBookingId || Date.now().toString(),
      carId: selectedCarId,
      isRentToRent: isRentToRent,
      vendorId: isRentToRent ? selectedVendorId : undefined,
      externalCarName: isRentToRent ? externalCarName : undefined,
      externalCarPlate: isRentToRent ? externalCarPlate : undefined,
      vendorFee: isRentToRent ? Number(vendorFee) : undefined,
      driverId: useDriver ? selectedDriverId : undefined,
      driverNote: driverNote,
      customerId: selectedCustomerId || undefined,
      customerName,
      customerPhone,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      actualReturnDate: actReturnIso,
      packageType,
      destination,
      customerNote: customerNote,
      securityDepositType: securityDepositType,
      securityDepositValue: securityDepositValue,
      securityDepositDescription: securityDepositDescription,
      securityDepositImage: securityDepositImage || undefined,
      basePrice: pricing.basePrice,
      driverFee: pricing.driverFee,
      highSeasonFee: pricing.highSeasonFee,
      deliveryFee: pricing.deliveryFee,
      overtimeFee: overtimeFee,
      extraCost: extraCost,
      extraCostDescription: extraCostDescription,
      discount: discount,
      totalPrice: pricing.totalPrice,
      amountPaid: paid,
      status: finalStatus,
      paymentStatus: finalPaymentStatus,
      notes: internalNotes,
      checklist: editingBookingId ? bookings.find(b => b.id === editingBookingId)?.checklist : undefined,
      createdAt: editingBookingId ? (bookings.find(b => b.id === editingBookingId)?.createdAt || Date.now()) : Date.now()
    };

    const currentTx = getStoredData<Transaction[]>('transactions', []);
    let newTransactions: Transaction[] = [...currentTx];

    let oldPaid = editingBookingId ? (bookings.find(b => b.id === editingBookingId)?.amountPaid || 0) : 0;
    if (paid > oldPaid) {
        newTransactions.unshift({
            id: `tx-${Date.now()}`,
            date: new Date().toISOString(),
            amount: paid - oldPaid,
            type: 'Income',
            category: 'Rental Payment',
            description: `Pembayaran ${newBooking.customerName} - ${isRentToRent ? externalCarName : cars.find(c => c.id === selectedCarId)?.name}`,
            bookingId: newBooking.id,
            receiptImage: paymentProofImage || undefined,
            status: 'Paid'
        });
    }

    if (newBooking.status === BookingStatus.COMPLETED && newBooking.paymentStatus === PaymentStatus.PAID) {
        const diffMs = new Date(newBooking.endDate).getTime() - new Date(newBooking.startDate).getTime();
        const bookingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        if (newBooking.isRentToRent && newBooking.vendorId && (newBooking.vendorFee || 0) > 0) {
             const exists = newTransactions.some(t => t.bookingId === newBooking.id && t.category === 'Sewa Vendor');
             if (!exists) {
                 newTransactions.unshift({
                    id: `auto-vendor-${Date.now()}`,
                    date: new Date().toISOString(),
                    amount: Number(newBooking.vendorFee),
                    type: 'Expense',
                    category: 'Sewa Vendor',
                    description: `Bayar Vendor #${newBooking.id.slice(0,6)}`,
                    bookingId: newBooking.id,
                    relatedId: newBooking.vendorId,
                    status: 'Pending'
                 });
             }
        }

        if (!newBooking.isRentToRent) {
            const car = cars.find(c => c.id === newBooking.carId);
            if (car && car.partnerId && (car.investorSetoran || 0) > 0) {
                const exists = newTransactions.some(t => t.bookingId === newBooking.id && t.category === 'Setor Investor');
                if (!exists) {
                    const totalSetoran = car.investorSetoran * bookingDays;
                    newTransactions.unshift({
                        id: `auto-invest-${Date.now()}`,
                        date: new Date().toISOString(),
                        amount: totalSetoran,
                        type: 'Expense',
                        category: 'Setor Investor',
                        description: `Bagi Hasil #${newBooking.id.slice(0,6)} - ${car.name}`,
                        bookingId: newBooking.id,
                        relatedId: car.partnerId,
                        status: 'Pending'
                    });
                }
            }
        }

        if (newBooking.driverId && newBooking.driverFee > 0) {
             const exists = newTransactions.some(t => t.bookingId === newBooking.id && t.category === 'Gaji');
             if (!exists) {
                 newTransactions.unshift({
                    id: `auto-gaji-${Date.now()}`,
                    date: new Date().toISOString(),
                    amount: newBooking.driverFee,
                    type: 'Expense',
                    category: 'Gaji',
                    description: `Gaji Trip #${newBooking.id.slice(0,6)}`,
                    bookingId: newBooking.id,
                    relatedId: newBooking.driverId,
                    status: 'Pending'
                 });
             }
        }
    }

    const updatedBookings = editingBookingId ? bookings.map(b => b.id === editingBookingId ? newBooking : b) : [newBooking, ...bookings];
    setBookings(updatedBookings);
    setStoredData('bookings', updatedBookings);
    setStoredData('transactions', newTransactions);

    setSuccessMessage('Booking berhasil diamankan!');
    setTimeout(() => { setSuccessMessage(''); setActiveTab('list'); resetForm(); }, 2000);
  };

  const resetForm = () => {
    setEditingBookingId(null); setSelectedCarId(''); setStartDate(todayStr); setEndDate(todayStr);
    setIsRentToRent(false); setSelectedVendorId(''); setExternalCarName(''); setExternalCarPlate(''); setVendorFee(0);
    setUseDriver(false); setSelectedDriverId(''); setDriverNote('');
    setSelectedCustomerId(''); setCustomerName(''); setCustomerPhone(''); setPackageType(settings?.rentalPackages?.[0] || '');
    setDestination('Dalam Kota'); setCustomerNote(''); setCustomBasePrice(0); setDeliveryFee(0);
    setAmountPaid('0'); setActualReturnDate(''); setActualReturnTime(''); setOvertimeFee(0);
    setExtraCost(0); setExtraCostDescription(''); setInternalNotes(''); setPaymentProofImage(null);
    setDiscount(0);
    setSecurityDepositType('Barang'); setSecurityDepositValue(0); setSecurityDepositDescription(''); setSecurityDepositImage(null);
    setCurrentStatus(BookingStatus.BOOKED);
    setCarError('');
    setConflictingBooking(null);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Hapus booking ini secara permanen?')) {
          const updated = bookings.filter(b => b.id !== id);
          setBookings(updated);
          setStoredData('bookings', updated);
      }
  };

  const openChecklistModal = (booking: Booking) => {
      setChecklistBooking(booking);
      if (booking.checklist) {
          setCheckOdometer(booking.checklist.odometer.toString());
          setCheckFuel(booking.checklist.fuelLevel);
          setCheckSpeedometerImg(booking.checklist.speedometerImage);
          setCheckFrontImg(booking.checklist.physicalImages.front || null);
          setCheckBackImg(booking.checklist.physicalImages.back || null);
          setCheckLeftImg(booking.checklist.physicalImages.left || null);
          setCheckRightImg(booking.checklist.physicalImages.right || null);
          setCheckNotes(booking.checklist.notes || '');
      } else {
          setCheckOdometer(''); setCheckFuel('Full'); setCheckSpeedometerImg(null);
          setCheckFrontImg(null); setCheckBackImg(null); setCheckLeftImg(null); setCheckRightImg(null); setCheckNotes('');
      }
      setIsChecklistModalOpen(true);
  };

  const saveChecklist = (e: React.FormEvent) => {
      e.preventDefault();
      // Perubahan: Foto Speedometer menjadi Opsional
      const updatedChecklist: VehicleChecklist = {
          odometer: Number(checkOdometer), fuelLevel: checkFuel, speedometerImage: checkSpeedometerImg || '',
          physicalImages: { front: checkFrontImg || undefined, back: checkBackImg || undefined, left: checkLeftImg || undefined, right: checkRightImg || undefined },
          notes: checkNotes, checkedAt: Date.now(), checkedBy: currentUser.name
      };
      const updated = bookings.map(b => b.id === checklistBooking!.id ? { ...b, checklist: updatedChecklist, status: BookingStatus.ACTIVE } : b);
      setBookings(updated); setStoredData('bookings', updated); setIsChecklistModalOpen(false);
  };

  const handleLunasiAction = (b: Booking) => {
      handleEdit(b);
      setAmountPaid(b.totalPrice.toString());
  };

  const handleSelesaiAction = (b: Booking) => {
      handleEdit(b);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0,5);
      setActualReturnDate(dateStr);
      setActualReturnTime(timeStr);
      setCurrentStatus(BookingStatus.COMPLETED);
  };

  const handleCancelAction = (b: Booking) => {
      if(window.confirm('Batalkan pesanan ini?')) {
          const updated = bookings.map(booking => {
              if (booking.id === b.id) {
                  return { ...booking, status: BookingStatus.CANCELLED, driverId: undefined, checklist: undefined };
              }
              return booking;
          });
          setBookings(updated);
          setStoredData('bookings', updated);
      }
  };

  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = [];
      for (let i = 1; i <= daysInMonth; i++) { days.push(new Date(year, month, i)); }
      return days;
  };

  const getTimelineBookings = (carId: string) => {
      const year = timelineDate.getFullYear();
      const month = timelineDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      return bookings.filter(b => {
          if (b.carId !== carId || b.status === BookingStatus.CANCELLED) return false;
          const start = new Date(b.startDate);
          const end = new Date(b.endDate);
          return start <= lastDayOfMonth && end >= firstDayOfMonth;
      });
  };

  const selectedCarData = cars.find(c => c.id === selectedCarId);
  const selectedCustomerData = customers.find(c => c.id === selectedCustomerId);
  const selectedDriverData = drivers.find(d => d.id === selectedDriverId);
  const selectedVendorData = vendors.find(v => v.id === selectedVendorId);
  
  const statusPriority: Record<string, number> = {
      [BookingStatus.ACTIVE]: 1, [BookingStatus.BOOKED]: 2, [BookingStatus.COMPLETED]: 3, [BookingStatus.CANCELLED]: 4, [BookingStatus.MAINTENANCE]: 5
  };

  // --- TIMELINE FILTERED & GROUPED DATA ---
  const timelineBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    cars.forEach(c => c.brand && brandsSet.add(c.brand));
    return Array.from(brandsSet).sort();
  }, [cars]);

  const groupedTimelineCars = useMemo(() => {
    let filtered = cars.filter(c => 
        (c.name.toLowerCase().includes(timelineSearch.toLowerCase()) || 
         c.plate.toLowerCase().includes(timelineSearch.toLowerCase())) &&
        (timelineBrandFilter === 'All' || c.brand === timelineBrandFilter)
    );

    // Grouping by brand
    const groups: { [brand: string]: Car[] } = {};
    filtered.forEach(car => {
        const b = car.brand || 'Lainnya';
        if (!groups[b]) groups[b] = [];
        groups[b].push(car);
    });

    // Sorting within groups by name then plate
    Object.keys(groups).forEach(b => {
        groups[b].sort((a, b) => {
            const nameComp = a.name.localeCompare(b.name);
            if (nameComp !== 0) return nameComp;
            return a.plate.localeCompare(b.plate);
        });
    });

    // Return as array of objects for easier mapping
    const brandKeys = Object.keys(groups).sort((a, b) => {
        if (a === 'Lainnya') return 1;
        if (b === 'Lainnya') return -1;
        return a.localeCompare(b);
    });

    return brandKeys.map(brand => ({
        brand,
        cars: groups[brand]
    }));
  }, [cars, timelineSearch, timelineBrandFilter]);

  const filteredBookingsList = useMemo(() => {
    return bookings.filter(b => {
        const bDate = b.startDate.split('T')[0];
        const start = filterStartDate || '0000-00-00';
        const end = filterEndDate || '9999-12-31';
        const matchesDate = bDate >= start && bDate <= end;
        const matchesStatus = filterStatus === 'All' || b.status === filterStatus;
        const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (b.isRentToRent ? b.externalCarName : cars.find(c => c.id === b.carId)?.name)?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDate && matchesStatus && matchesSearch;
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [bookings, filterStartDate, filterEndDate, filterStatus, searchTerm, cars]);

  const bookingCounts = useMemo(() => {
      return {
          All: bookings.length,
          [BookingStatus.BOOKED]: bookings.filter(b => b.status === BookingStatus.BOOKED).length,
          [BookingStatus.ACTIVE]: bookings.filter(b => b.status === BookingStatus.ACTIVE).length,
          [BookingStatus.COMPLETED]: bookings.filter(b => b.status === BookingStatus.COMPLETED).length,
          [BookingStatus.CANCELLED]: bookings.filter(b => b.status === BookingStatus.CANCELLED).length,
      };
  }, [bookings]);

  // Search Logic for Dropdowns
  const searchableCars = useMemo(() => {
      if (!carSearchQuery) return cars;
      return cars.filter(c => 
        c.name.toLowerCase().includes(carSearchQuery.toLowerCase()) || 
        c.plate.toLowerCase().includes(carSearchQuery.toLowerCase())
      );
  }, [cars, carSearchQuery]);

  const searchableCustomers = useMemo(() => {
      if (!customerSearchQuery) return customers;
      return customers.filter(c => 
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || 
        c.phone.includes(customerSearchQuery)
      );
  }, [customers, customerSearchQuery]);

  const searchableDrivers = useMemo(() => {
      if (!driverSearchQuery) return drivers;
      return drivers.filter(d => 
        d.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) || 
        d.phone.includes(driverSearchQuery)
      );
  }, [drivers, driverSearchQuery]);

  const searchableVendors = useMemo(() => {
      if (!vendorSearchQuery) return vendors;
      return vendors.filter(v => 
        v.name.toLowerCase().includes(vendorSearchQuery.toLowerCase())
      );
  }, [vendors, vendorSearchQuery]);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">Booking & Jadwal</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Sistem manajemen ketersediaan armada terintegrasi.</p>
            </div>
            
            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
               <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'list' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                   <LayoutList size={16}/> Daftar
               </button>
               <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'timeline' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                   <GanttChart size={16}/> Timeline
               </button>
               <button onClick={() => setActiveTab('create')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'create' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                   <Plus size={16}/> Input Baru
               </button>
            </div>
          </div>
      </div>

      {successMessage && (
        <div className="bg-green-600 text-white px-4 py-3 rounded-xl flex items-center gap-3 animate-bounce">
          <CheckCircle size={20} /> <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {activeTab === 'timeline' && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center bg-slate-50 dark:bg-slate-900/50 gap-4 flex-shrink-0">
                  <div className="flex items-center gap-2 order-1 sm:order-none">
                      <button onClick={() => setTimelineDate(new Date(timelineDate.setMonth(timelineDate.getMonth() - 1)))} className="p-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg hover:bg-slate-50"><ChevronLeft size={16}/></button>
                      <h3 className="font-bold text-slate-800 dark:text-white w-40 text-center">{timelineDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>
                      <button onClick={() => setTimelineDate(new Date(timelineDate.setMonth(timelineDate.getMonth() + 1)))} className="p-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg hover:bg-slate-50"><ChevronRight size={16}/></button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px] justify-center sm:justify-end">
                      <div className="relative w-full sm:w-48">
                          <TagIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select 
                            className="w-full pl-9 pr-3 py-2 border dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none dark:bg-slate-900 dark:text-white appearance-none" 
                            value={timelineBrandFilter} 
                            onChange={e => setTimelineBrandFilter(e.target.value)}
                          >
                              <option value="All">Semua Merek</option>
                              {timelineBrands.map(b => <option key={b} value={b}>{b.toUpperCase()}</option>)}
                          </select>
                      </div>
                      <div className="relative w-full sm:w-48">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" placeholder="Cari Unit..." className="w-full pl-9 pr-3 py-2 border dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-red-500 outline-none dark:bg-slate-900 dark:text-white" value={timelineSearch} onChange={e => setTimelineSearch(e.target.value)} />
                      </div>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider dark:text-slate-300 w-full sm:w-auto justify-center">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500"></span> Booked</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500"></span> Active</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-400"></span> Selesai</span>
                  </div>
              </div>
              <div className="overflow-auto relative custom-scrollbar flex-1">
                  <div className="min-w-[1000px] inline-block w-full">
                      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 shadow-sm">
                          <div className="w-48 p-3 font-bold text-xs text-slate-500 uppercase flex-shrink-0 sticky left-0 top-0 bg-slate-50 dark:bg-slate-900 z-30 border-r border-slate-200 dark:border-slate-700 flex items-center">Unit Armada</div>
                          <div className="flex flex-1">
                              {getDaysInMonth(timelineDate).map(d => (
                                  <div key={d.getDate()} className={`flex-1 min-w-[30px] text-center border-r border-slate-100 dark:border-slate-800 py-2 text-xs font-medium ${d.getDay() === 0 ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'dark:text-slate-400'}`}>{d.getDate()}</div>
                              ))}
                          </div>
                      </div>
                      
                      {groupedTimelineCars.map(group => (
                          <React.Fragment key={group.brand}>
                              {/* Brand Header */}
                              <div className="flex bg-slate-100/50 dark:bg-slate-800/80 sticky left-0 z-10 border-b border-slate-200 dark:border-slate-700">
                                  <div className="w-full px-4 py-1.5 text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-2">
                                      <TagIcon size={12}/> {group.brand}
                                  </div>
                              </div>
                              
                              {group.cars.map(car => (
                                  <div key={car.id} className="flex border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 relative h-16 group">
                                      <div className="w-48 p-3 flex items-center gap-3 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 sticky left-0 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-700 transition-colors">
                                          {car.image ? <img src={car.image} className="w-10 h-10 rounded-lg object-cover shadow-sm border border-slate-100 dark:border-slate-700" /> : <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-400"><CarIcon size={16}/></div>}
                                          <div className="min-w-0 flex-1">
                                              <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{car.name}</p>
                                              <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 font-mono tracking-tighter">{car.plate}</p>
                                          </div>
                                      </div>
                                      <div className="flex flex-1 relative">
                                          {getDaysInMonth(timelineDate).map(d => (
                                              <div key={d.getDate()} className={`flex-1 min-w-[30px] border-r border-slate-100 dark:border-slate-800 h-full ${d.getDay() === 0 ? 'bg-red-50/30 dark:bg-red-900/10' : ''} hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors`} onClick={() => handleTimelineCellClick(car.id, d)}></div>
                                          ))}
                                          {getTimelineBookings(car.id).map(b => {
                                              const daysInMonth = new Date(timelineDate.getFullYear(), timelineDate.getMonth() + 1, 0).getDate();
                                              const start = new Date(b.startDate);
                                              const end = new Date(b.endDate);
                                              const monthStart = new Date(timelineDate.getFullYear(), timelineDate.getMonth(), 1);
                                              let startDay = start.getDate();
                                              let duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                                              if (start < monthStart) {
                                                  const offset = Math.ceil((monthStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                                                  duration -= offset; startDay = 1;
                                              }
                                              if (startDay + duration > daysInMonth + 1) duration = (daysInMonth + 1) - startDay;
                                              if (duration <= 0) return null;
                                              const leftPos = ((startDay - 1) / daysInMonth) * 100;
                                              const width = (duration / daysInMonth) * 100;
                                              const colorClass = b.status === 'Active' ? 'bg-green-500 shadow-green-100' : b.status === 'Completed' ? 'bg-slate-400' : 'bg-blue-500 shadow-blue-100';
                                              return (
                                                  <div key={b.id} className={`absolute top-3 bottom-3 rounded-md shadow-sm text-[10px] text-white flex items-center justify-center font-bold px-1 overflow-hidden whitespace-nowrap cursor-pointer z-0 hover:z-20 hover:scale-[1.02] transition-all border border-white/20 ${colorClass}`} style={{ left: `${leftPos}%`, width: `${width}%` }} onClick={(e) => { e.stopPropagation(); handleEdit(b); }}>{b.customerName}</div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              ))}
                          </React.Fragment>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-visible">
             <form onSubmit={handleCreateBooking} className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] min-h-[600px]">
                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-6 border-r border-slate-100 dark:border-slate-700 space-y-6">
                    <section className="space-y-4">
                        <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 border-b dark:border-slate-700 pb-3 uppercase tracking-widest text-[10px]"><ClockIcon size={16} className="text-red-600"/> Waktu & Unit</h4>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Mulai Sewa</label>
                                <div className="flex gap-1">
                                    <input required type="date" className={`w-full border rounded-lg p-2.5 text-sm font-bold dark:bg-slate-950 ${carError ? 'border-red-500 bg-red-50 text-red-700' : ''}`} value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    <input type="time" className={`w-24 border rounded-lg p-2.5 text-sm font-bold dark:bg-slate-950 ${carError ? 'border-red-500 bg-red-50 text-red-700' : ''}`} value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Selesai Sewa</label>
                                <div className="flex gap-1">
                                    <input required type="date" className={`w-full border rounded-lg p-2.5 text-sm font-bold dark:bg-slate-950 ${carError ? 'border-red-500 bg-red-50 text-red-700' : ''}`} value={endDate} onChange={e => setEndDate(e.target.value)} />
                                    <input type="time" className={`w-24 border rounded-lg p-2.5 text-sm font-bold dark:bg-slate-950 ${carError ? 'border-red-500 bg-red-50 text-red-700' : ''}`} value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 text-yellow-600 rounded-md border-slate-300" checked={isRentToRent} onChange={e => setIsRentToRent(e.target.checked)} />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Building size={16}/> Unit Luar (Vendor)</span>
                            </label>
                        </div>

                        {isRentToRent ? (
                            <div className="space-y-3 animate-fade-in">
                                <div className="space-y-1 relative" ref={vendorDropdownRef}>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Database Vendor (Search)</label>
                                    <div 
                                        onClick={() => { setIsVendorDropdownOpen(!isVendorDropdownOpen); setVendorSearchQuery(''); }} 
                                        className={`w-full border rounded-xl p-2.5 text-sm font-bold cursor-pointer flex justify-between items-center bg-white dark:bg-slate-950 dark:text-white dark:border-slate-700`}
                                    >
                                        {selectedVendorData ? (
                                            <span>{selectedVendorData.name}</span>
                                        ) : <span className="text-slate-400">Pilih vendor...</span>}
                                        <ChevronDown size={16} className="text-slate-400" />
                                    </div>
                                    {isVendorDropdownOpen && (
                                        <div className="absolute top-full z-[60] w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 flex flex-col overflow-hidden">
                                            <div className="p-3 border-b dark:border-slate-800 flex items-center gap-2">
                                                <Search size={14} className="text-slate-400" />
                                                <input 
                                                    autoFocus
                                                    type="text" 
                                                    placeholder="Ketik nama vendor..." 
                                                    className="w-full text-xs outline-none bg-transparent dark:text-white"
                                                    value={vendorSearchQuery}
                                                    onChange={e => setVendorSearchQuery(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            </div>
                                            <div className="overflow-y-auto custom-scrollbar flex-1">
                                                {searchableVendors.length === 0 ? (
                                                    <p className="p-4 text-center text-xs text-slate-400">Vendor tidak ditemukan.</p>
                                                ) : (
                                                    searchableVendors.map(v => (
                                                        <div key={v.id} onClick={() => { setSelectedVendorId(v.id); setIsVendorDropdownOpen(false); }} className={`p-3 border-b dark:border-slate-800 last:border-0 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer text-xs font-bold text-slate-800 dark:text-white`}>
                                                            {v.name}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Nama Mobil (External)</label>
                                    <input required type="text" className="w-full border rounded-lg p-2.5 text-sm font-bold dark:bg-slate-950" value={externalCarName} onChange={e => setExternalCarName(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Plat Nomor</label>
                                    <input required type="text" className="w-full border rounded-lg p-2.5 text-sm font-bold uppercase dark:bg-slate-950" value={externalCarPlate} onChange={e => setExternalCarPlate(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-red-500 uppercase">HPP Vendor (Rp)</label>
                                    <input required type="number" className="w-full border rounded-lg p-2.5 text-sm font-bold border-red-200 bg-red-50 dark:bg-red-900/10" value={vendorFee} onChange={e => setVendorFee(Number(e.target.value))} />
                                </div>
                            </div>
                        ) : (
                            <div className="relative" ref={carDropdownRef}>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Unit Armada (Search)</label>
                                <div onClick={() => { setIsCarDropdownOpen(!isCarDropdownOpen); setCarSearchQuery(''); }} className={`w-full border rounded-xl p-3 cursor-pointer flex items-center justify-between transition-all dark:bg-slate-950 ${carError ? 'border-red-500 bg-red-50 ring-2 ring-red-100' : 'bg-white hover:border-red-400 shadow-sm dark:border-slate-700'}`}>
                                    {selectedCarData ? (
                                        <div className="flex items-center gap-3 text-slate-800 dark:text-white">
                                            <img src={selectedCarData.image} className="w-10 h-7 object-cover rounded shadow-sm" />
                                            <div><p className="font-bold text-xs">{selectedCarData.name}</p><p className="text-[9px] text-slate-500 font-mono">{selectedCarData.plate}</p></div>
                                        </div>
                                    ) : <span className="text-xs text-slate-400">Pilih unit...</span>}
                                    <ChevronDown size={18} className="text-slate-400"/>
                                </div>
                                {isCarDropdownOpen && (
                                    <div className="absolute top-full z-[60] w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-80 flex flex-col overflow-hidden">
                                        <div className="p-3 border-b dark:border-slate-800 flex items-center gap-2">
                                            <Search size={14} className="text-slate-400" />
                                            <input 
                                                autoFocus
                                                type="text" 
                                                placeholder="Ketik nama mobil/nopol..." 
                                                className="w-full text-xs outline-none bg-transparent dark:text-white"
                                                value={carSearchQuery}
                                                onChange={e => setCarSearchQuery(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="overflow-y-auto custom-scrollbar flex-1">
                                            {searchableCars.length === 0 ? (
                                                <p className="p-4 text-center text-xs text-slate-400">Unit tidak ditemukan.</p>
                                            ) : (
                                                searchableCars.map(car => {
                                                    const isAvailable = (!startDate || !endDate) ? true : checkAvailability(bookings, car.id, new Date(`${startDate}T${startTime}`), new Date(`${endDate}T${endTime}`), 'car', editingBookingId || undefined);
                                                    return (
                                                        <div key={car.id} onClick={() => isAvailable && (setSelectedCarId(car.id), setIsCarDropdownOpen(false))} className={`p-3 border-b dark:border-slate-800 last:border-0 flex items-center gap-4 transition-colors ${!isAvailable ? 'bg-slate-100 dark:bg-slate-800 opacity-40 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer'}`}>
                                                            <img src={car.image} className="w-12 h-8 object-cover rounded shadow-sm" />
                                                            <div className="flex-1"><p className="font-bold text-xs text-slate-800 dark:text-white">{car.name}</p><p className="text-[9px] text-slate-500 dark:text-slate-400">{car.plate}</p></div>
                                                            {!isAvailable && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black uppercase">Bentrok</span>}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                                {carError && conflictingBooking && (
                                    <div className="mt-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-3">
                                        <p className="text-red-700 dark:text-red-400 text-[10px] font-bold flex items-center gap-1 mb-1"><AlertTriangle size={12}/> JADWAL BENTROK!</p>
                                        <div className="text-[10px] text-slate-600 dark:text-slate-400"><p>Oleh: <span className="font-bold">{conflictingBooking.customerName}</span></p></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                    <section className="space-y-4 pt-4 border-t dark:border-slate-700">
                        <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-widest text-[10px]"><UserIcon size={16} className="text-red-600"/> Supir</h4>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                             <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 text-red-600 rounded-md border-slate-300" checked={useDriver} onChange={e => setUseDriver(e.target.checked)} />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Pakai Jasa Driver</span>
                             </label>
                             {useDriver && (
                                <div className="space-y-3 animate-fade-in">
                                    <div className="relative" ref={driverDropdownRef}>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Data Driver (Search)</label>
                                        <div 
                                            onClick={() => { setIsDriverDropdownOpen(!isDriverDropdownOpen); setDriverSearchQuery(''); }} 
                                            className={`w-full border rounded-xl p-2.5 text-sm font-bold cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-700`}
                                        >
                                            {selectedDriverData ? (
                                                <div className="flex items-center gap-2">
                                                    <img src={selectedDriverData.image} className="w-5 h-5 rounded-full object-cover" />
                                                    <span>{selectedDriverData.name}</span>
                                                </div>
                                            ) : <span className="text-slate-400">Pilih driver...</span>}
                                            <ChevronDown size={16} className="text-slate-400" />
                                        </div>
                                        {isDriverDropdownOpen && (
                                            <div className="absolute bottom-full z-[60] w-full mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 flex flex-col overflow-hidden">
                                                <div className="p-3 border-b dark:border-slate-800 flex items-center gap-2">
                                                    <Search size={14} className="text-slate-400" />
                                                    <input 
                                                        autoFocus
                                                        type="text" 
                                                        placeholder="Ketik nama/phone..." 
                                                        className="w-full text-xs outline-none bg-transparent dark:text-white"
                                                        value={driverSearchQuery}
                                                        onChange={e => setDriverSearchQuery(e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="overflow-y-auto custom-scrollbar flex-1">
                                                    {searchableDrivers.length === 0 ? (
                                                        <p className="p-4 text-center text-xs text-slate-400">Driver tidak ditemukan.</p>
                                                    ) : (
                                                        searchableDrivers.map(d => {
                                                            const isAvail = (!startDate || !endDate) ? true : checkAvailability(bookings, d.id, new Date(`${startDate}T${startTime}`), new Date(`${endDate}T${endTime}`), 'driver', editingBookingId || undefined);
                                                            const carSalary = selectedCarData?.driverSalary || 0;
                                                            return (
                                                                <div key={d.id} onClick={() => isAvail && (setSelectedDriverId(d.id), setIsDriverDropdownOpen(false))} className={`p-3 border-b dark:border-slate-800 last:border-0 flex items-center gap-3 transition-colors ${!isAvail ? 'opacity-40 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer'}`}>
                                                                    <img src={d.image} className="w-8 h-8 rounded-full object-cover" />
                                                                    <div className="flex-1">
                                                                        <p className="font-bold text-xs text-slate-800 dark:text-white">{d.name}</p>
                                                                        <p className="text-[10px] text-slate-500">Salary: Rp {carSalary.toLocaleString()}/hr</p>
                                                                    </div>
                                                                    {!isAvail && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black uppercase">Sibuk</span>}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <textarea className="w-full border rounded-lg p-3 text-xs dark:bg-slate-950 dark:text-white" rows={2} placeholder="Catatan driver..." value={driverNote} onChange={e => setDriverNote(e.target.value)} />
                                </div>
                             )}
                        </div>
                    </section>
                </div>
                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    <section className="space-y-5">
                        <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 border-b dark:border-slate-700 pb-3 uppercase tracking-widest text-xs"><UserIcon size={18} className="text-red-600"/> 1. Data Pelanggan</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1 relative" ref={customerDropdownRef}>
                                <label className="text-[10px] font-black text-slate-400 uppercase">Cari Database Pelanggan</label>
                                <div 
                                    onClick={() => { setIsCustomerDropdownOpen(!isCustomerDropdownOpen); setCustomerSearchQuery(''); }} 
                                    className={`w-full border rounded-xl p-2.5 text-sm font-bold cursor-pointer flex justify-between items-center bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-700`}
                                >
                                    {selectedCustomerData ? (
                                        <span>{selectedCustomerData.name}</span>
                                    ) : <span className="text-slate-400">Pilih pelanggan lama...</span>}
                                    <ChevronDown size={16} className="text-slate-400" />
                                </div>
                                {isCustomerDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-80 flex flex-col overflow-hidden">
                                        <div className="p-3 border-b dark:border-slate-800 flex items-center gap-2">
                                            <Search size={14} className="text-slate-400" />
                                            <input 
                                                autoFocus
                                                type="text" 
                                                placeholder="Ketik nama/no HP..." 
                                                className="w-full text-xs outline-none bg-transparent dark:text-white"
                                                value={customerSearchQuery}
                                                onChange={e => setCustomerSearchQuery(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="overflow-y-auto custom-scrollbar flex-1">
                                            <div 
                                                onClick={() => { setSelectedCustomerId(''); setIsCustomerDropdownOpen(false); setCustomerName(''); setCustomerPhone(''); }} 
                                                className="p-3 border-b dark:border-slate-800 last:border-0 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer text-xs font-bold text-red-600"
                                            >
                                                -- Pelanggan Baru --
                                            </div>
                                            {searchableCustomers.length === 0 ? (
                                                <p className="p-4 text-center text-xs text-slate-400">Tidak ditemukan.</p>
                                            ) : (
                                                searchableCustomers.map(cust => (
                                                    <div key={cust.id} onClick={() => { setSelectedCustomerId(cust.id); setIsCustomerDropdownOpen(false); }} className={`p-3 border-b dark:border-slate-800 last:border-0 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer flex flex-col gap-0.5`}>
                                                        <p className="font-bold text-xs text-slate-800 dark:text-white">{cust.name}</p>
                                                        <p className="text-[10px] text-slate-500">{cust.phone}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Nama Lengkap</label>
                                <input required type="text" className="w-full border rounded-xl p-2.5 text-sm font-bold dark:bg-slate-950 dark:text-white" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">WA Pelanggan</label>
                                <input required type="tel" className="w-full border rounded-xl p-2.5 text-sm font-bold dark:bg-slate-950 dark:text-white" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Paket Sewa</label>
                                <select className="w-full border rounded-xl p-2.5 text-sm font-bold dark:bg-slate-950 dark:text-white" value={packageType} onChange={e => setPackageType(e.target.value)}>
                                    {settings?.rentalPackages?.map((p: string) => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-5">
                        <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 border-b dark:border-slate-700 pb-3 uppercase tracking-widest text-xs"><Lock size={18} className="text-red-600"/> 2. Jaminan (Guarantee)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Tipe Jaminan</label>
                                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                                    <button type="button" onClick={() => setSecurityDepositType('Uang')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${securityDepositType === 'Uang' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Uang (Cash)</button>
                                    <button type="button" onClick={() => setSecurityDepositType('Barang')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${securityDepositType === 'Barang' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Barang / Dokumen</button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">{securityDepositType === 'Uang' ? 'Nominal Jaminan (Rp)' : 'Estimasi Nilai (Opsional)'}</label>
                                <input type="number" className="w-full border rounded-xl p-2.5 text-sm font-bold dark:bg-slate-950 dark:text-white" value={securityDepositValue} onChange={e => setSecurityDepositValue(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Keterangan Jaminan</label>
                                <input type="text" className="w-full border rounded-xl p-2.5 text-sm font-bold dark:bg-slate-950 dark:text-white" placeholder="Contoh: KTP Asli + Motor Beat B 1234 ABC" value={securityDepositDescription} onChange={e => setSecurityDepositDescription(e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Foto Bukti Jaminan / Barang</label>
                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-900 relative h-32 flex flex-col items-center justify-center overflow-hidden">
                                    {securityDepositImage ? (
                                        <>
                                            <img src={securityDepositImage} className="absolute inset-0 w-full h-full object-cover" />
                                            <button type="button" onClick={() => setSecurityDepositImage(null)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg z-10"><X size={14} /></button>
                                        </>
                                    ) : (
                                        <div className="text-slate-400 opacity-50 flex flex-col items-center">
                                            <Camera size={24} className="mb-1" />
                                            <span className="text-[9px] font-black uppercase">Klik Untuk Upload Foto Jaminan</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleDepositImageUpload} />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-5">
                        <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 border-b dark:border-slate-700 pb-3 uppercase tracking-widest text-xs"><Zap size={18} className="text-red-600"/> 3. Rincian & Biaya</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Harga Unit / Hari</label>
                                    <input type="number" className="w-full border rounded-xl p-2.5 text-sm font-black text-red-700 bg-red-50/30 dark:bg-red-900/10" value={customBasePrice} onChange={e => setCustomBasePrice(Number(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Biaya Antar</label>
                                    <input type="number" className="w-full border rounded-xl p-2.5 text-sm font-bold dark:bg-slate-950 dark:text-white" value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Diskon</label>
                                    <input type="number" className="w-full border rounded-xl p-2.5 text-sm font-bold text-green-600 bg-green-50 dark:bg-green-900/10" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 text-white space-y-3 shadow-2xl">
                                <h5 className="font-black text-[10px] uppercase tracking-widest text-red-400">Ringkasan Biaya</h5>
                                <div className="space-y-1 text-xs font-medium border-b border-white/10 pb-3">
                                    <div className="flex justify-between text-slate-400"><span>Sewa Unit ({durationDays} hr)</span><span>Rp {pricing.basePrice.toLocaleString()}</span></div>
                                    {pricing.driverFee > 0 && <div className="flex justify-between text-slate-400"><span>Driver ({durationDays} hr)</span><span>Rp {pricing.driverFee.toLocaleString()}</span></div>}
                                    {pricing.highSeasonFee > 0 && <div className="flex justify-between text-orange-400"><span>High Season</span><span>Rp {pricing.highSeasonFee.toLocaleString()}</span></div>}
                                    {pricing.deliveryFee > 0 && <div className="flex justify-between text-slate-400"><span>Antar/Jemput</span><span>Rp {pricing.deliveryFee.toLocaleString()}</span></div>}
                                    {overtimeFee > 0 && <div className="flex justify-between text-red-400"><span>Overtime</span><span>Rp {overtimeFee.toLocaleString()}</span></div>}
                                    {extraCost > 0 && <div className="flex justify-between text-orange-300"><span>Biaya Extra</span><span>Rp {extraCost.toLocaleString()}</span></div>}
                                    {discount > 0 && <div className="flex justify-between text-green-400"><span>Diskon</span><span>- Rp {discount.toLocaleString()}</span></div>}
                                </div>
                                <div className="flex justify-between font-black text-lg text-red-300"><span>TOTAL</span><span>Rp {pricing.totalPrice.toLocaleString()}</span></div>
                            </div>
                        </div>
                    </section>
                    <section className="space-y-5">
                        <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 border-b dark:border-slate-700 pb-3 uppercase tracking-widest text-xs"><Wallet size={18} className="text-red-600"/> 4. Pembayaran</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">DP / Pelunasan (Masuk)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-4 text-lg font-black text-green-700/50">Rp</span>
                                    <input type="number" className="w-full border-2 border-green-500 bg-green-50 dark:bg-green-900/10 rounded-2xl p-5 pl-12 text-2xl font-black text-green-700 dark:text-green-400 outline-none" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Status Nota</p>
                                <span className={`text-xl font-black uppercase tracking-tighter px-6 py-2 rounded-full shadow-sm ${parseInt(amountPaid) >= pricing.totalPrice && pricing.totalPrice > 0 ? 'bg-green-600 text-white' : parseInt(amountPaid) > 0 ? 'bg-orange-50 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                    {parseInt(amountPaid) >= pricing.totalPrice && pricing.totalPrice > 0 ? 'LUNAS' : parseInt(amountPaid) > 0 ? 'D P' : 'BELUM BAYAR'}
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-5">
                        <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2 border-b dark:border-slate-700 pb-3 uppercase tracking-widest text-xs"><History size={18} className="text-red-600"/> 5. Pengembalian & Biaya Tambahan</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Kembali (Aktual)</label>
                                <div className="flex gap-1">
                                    <input type="date" className="w-full border rounded-xl p-2.5 text-sm font-bold dark:bg-slate-950 dark:text-white border-slate-200 dark:border-slate-700" value={actualReturnDate} onChange={e => setActualReturnDate(e.target.value)} />
                                    <input type="time" className="w-24 border rounded-xl p-2.5 text-sm font-bold dark:bg-slate-950 dark:text-white border-slate-200 dark:border-slate-700" value={actualReturnTime} onChange={e => setActualReturnTime(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Denda Overtime (Otomatis)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">Rp</span>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded-xl p-2.5 pl-10 text-sm font-black text-red-600 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30" 
                                        value={overtimeFee} 
                                        onChange={e => setOvertimeFee(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Biaya Tambahan (BBM/Klaim)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">Rp</span>
                                    <input type="number" className="w-full border rounded-xl p-2.5 pl-10 text-sm font-bold dark:bg-slate-950 dark:text-white border-slate-200 dark:border-slate-700" value={extraCost} onChange={e => setExtraCost(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan Tambahan</label>
                                <input type="text" className="w-full border rounded-xl p-2.5 text-sm font-bold dark:bg-slate-950 dark:text-white border-slate-200 dark:border-slate-700" value={extraCostDescription} onChange={e => setExtraCostDescription(e.target.value)} placeholder="Misal: Kurang BBM / Lecet / Dll" />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                            *Overtime dihitung otomatis: {settings?.overtimeType === 'Percentage' ? `${settings?.overtimeValue}% dari harga harian` : `Rp ${settings?.overtimeValue?.toLocaleString('id-ID')}`} per jam keterlambatan.
                        </p>
                    </section>

                    <div className="pt-6 border-t dark:border-slate-700">
                        <button type="submit" disabled={!isRentToRent && (!!carError || !selectedCarId)} className="w-full bg-red-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-red-700 shadow-2xl active:scale-95 flex items-center justify-center gap-3 transition-all">
                            <Plus size={24}/> Simpan & Kunci Jadwal
                        </button>
                    </div>
                </div>
             </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="space-y-6">
            <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Cari nama tamu atau unit..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none dark:text-white"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <input type="date" className="flex-1 border dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 dark:bg-slate-900 outline-none" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} title="Tanggal Mulai" />
                    <span className="text-slate-400 font-bold">-</span>
                    <input type="date" className="flex-1 border dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 dark:bg-slate-900 outline-none" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} title="Tanggal Selesai" />
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                    { id: 'All', label: 'Semua', icon: Inbox, color: 'text-red-600' },
                    { id: BookingStatus.BOOKED, label: 'Booked', icon: ClockIcon, color: 'text-orange-500' },
                    { id: BookingStatus.ACTIVE, label: 'Aktif', icon: Zap, color: 'text-green-600' },
                    { id: BookingStatus.COMPLETED, label: 'Selesai', icon: CheckCircle, color: 'text-blue-600' },
                    { id: BookingStatus.CANCELLED, label: 'Dibatalkan', icon: XCircle, color: 'text-red-500' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                            filterStatus === tab.id 
                                ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100' 
                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-red-300 dark:hover:border-red-800'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filterStatus === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                            {bookingCounts[tab.id as keyof typeof bookingCounts]}
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredBookingsList.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
                        <Inbox size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-sm">Tidak ada transaksi ditemukan</p>
                        <button onClick={() => { setSearchTerm(''); setFilterStatus('All'); setFilterStartDate(''); setFilterEndDate(''); }} className="mt-4 text-red-600 font-black text-xs hover:underline uppercase">Reset Filter</button>
                    </div>
                ) : (
                    filteredBookingsList.map(b => {
                        let carName = b.isRentToRent ? b.externalCarName : cars.find(c => c.id === b.carId)?.name || 'Unknown';
                        let carPlate = b.isRentToRent ? b.externalCarPlate : cars.find(c => c.id === b.carId)?.plate || '-';
                        let carImage = b.isRentToRent ? null : cars.find(c => c.id === b.carId)?.image;
                        const isDue = b.totalPrice > b.amountPaid;
                        const diffDays = Math.max(1, Math.ceil((new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24)));
                        
                        return (
                            <div key={b.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col gap-6 relative overflow-hidden group animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-6 w-full">
                                    <div className="flex items-center gap-5 w-full">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                                            {carImage ? <img src={carImage} className="w-full h-full object-cover" /> : <CarIcon size={32} className="text-slate-400"/>}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tight">{carName} <span className="text-xs bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-[10px] font-black border border-slate-200 dark:border-slate-700 ml-2">{carPlate}</span></h4>
                                                {b.isRentToRent && <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[9px] font-bold px-2 py-0.5 rounded border border-yellow-200 dark:border-yellow-900/50 uppercase">Unit Vendor</span>}
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-red-600"/> {new Date(b.startDate).toLocaleDateString('id-ID')}</span>
                                                <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 dark:bg-orange-900/10 px-1.5 py-0.5 rounded-md"><ClockIcon size={14}/> {diffDays} HR</span>
                                                <span className="flex items-center gap-1.5 text-red-600 uppercase"><UserIcon size={14}/> {b.customerName}</span>
                                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${isDue ? 'bg-red-50 text-red-700 dark:bg-red-900/20' : 'bg-green-50 text-green-700 dark:bg-green-900/20'}`}>
                                                    <Wallet size={14}/> Rp {b.totalPrice.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="hidden lg:block text-right">
                                            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                                                b.status === 'Active' ? 'bg-green-600 text-white' : 
                                                b.status === 'Booked' ? 'bg-orange-50 text-white' : 
                                                b.status === 'Completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                            }`}>{b.status}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 w-full justify-start border-t dark:border-slate-700 pt-4">
                                    {isDue && b.status !== BookingStatus.CANCELLED && <button onClick={() => handleLunasiAction(b)} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-colors active:scale-95 shadow-lg shadow-green-100 dark:shadow-none"><CheckCircle size={16}/> Lunasi</button>}
                                    {b.status === BookingStatus.ACTIVE && <button onClick={() => handleSelesaiAction(b)} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors active:scale-95 shadow-lg shadow-red-100/30 dark:shadow-none"><History size={16}/> Selesai</button>}
                                    {b.status === BookingStatus.BOOKED && <button onClick={() => handleCancelAction(b)} className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-200 transition-colors active:scale-95"><XCircle size={16}/> Cancel</button>}
                                    <div className="h-8 w-px bg-slate-100 dark:bg-slate-700 mx-2 hidden md:block"></div>
                                    <button onClick={() => { const c = cars.find(car=>car.id===b.carId); if(c || b.isRentToRent) window.open(generateWhatsAppLink(b, c || {name: b.externalCarName || '', plate: b.externalCarPlate || ''} as any), '_blank') }} className="px-3 py-2 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 border border-green-100 dark:border-green-900/30 flex items-center gap-2 text-xs font-bold transition-colors"><MessageCircle size={16}/> Kirim WA</button>
                                    <button onClick={() => { const c = cars.find(car=>car.id===b.carId); if(c || b.isRentToRent) generateInvoicePDF(b, c || {name: b.externalCarName || '', plate: b.externalCarPlate || ''} as any) }} className="px-3 py-2 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 border border-blue-100 dark:border-blue-900/30 flex items-center gap-2 text-xs font-bold transition-colors"><Printer size={16}/> Nota</button>
                                    <button onClick={() => handleEdit(b)} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-red-50 dark:hover:bg-slate-600 border border-slate-100 dark:border-slate-600 transition-colors" title="Edit Data"><Edit2 size={20}/></button>
                                    {b.status !== BookingStatus.CANCELLED && <button onClick={() => openChecklistModal(b)} className={`p-2.5 rounded-xl border transition-colors ${b.checklist ? 'bg-green-600 text-white border-green-700 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/30'}`} title="Checklist Kendaraan"><ClipboardCheck size={20}/></button>}
                                    {isSuperAdmin && <button onClick={() => handleDelete(b.id)} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 border border-slate-100 dark:border-slate-600 transition-all" title="Hapus Permanen"><Trash2 size={20}/></button>}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      )}
      
      {isChecklistModalOpen && checklistBooking && (
          <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
             <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl p-8 shadow-2xl max-h-[95vh] overflow-y-auto border-t-8 border-red-600 dark:border-red-800">
                 <div className="flex justify-between items-center mb-8 border-b dark:border-slate-700 pb-6">
                     <div><h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Checklist Serah Terima</h3><p className="text-slate-500 dark:text-slate-400 font-bold">ID Transaksi: <span className="font-mono text-red-600">#{checklistBooking.id.slice(0,8)}</span></p></div>
                     <button onClick={() => setIsChecklistModalOpen(false)} className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full text-slate-400 hover:text-red-600 transition-colors"><X size={28} /></button>
                 </div>
                 <form onSubmit={saveChecklist} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 border-b dark:border-slate-700 pb-2 uppercase tracking-widest text-[10px]"><Gauge size={20} className="text-red-600" /> Indikator</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">KM (Odometer)</label><input required type="number" className="w-full border-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white rounded-xl p-3 text-lg font-black focus:border-red-500 outline-none" value={checkOdometer} onChange={e => setCheckOdometer(e.target.value)} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Posisi BBM</label><select className="w-full border-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white rounded-xl p-3 text-sm font-bold bg-white focus:border-red-500 outline-none" value={checkFuel} onChange={e => setCheckFuel(e.target.value)}><option value="Full">FULL</option><option value="3/4">3/4</option><option value="1/2">1/2</option><option value="1/4">1/4</option><option value="Empty">RESERVE</option></select></div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Foto Dashboard (Opsional)</label>
                                <div className="border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900 relative h-56 flex flex-col items-center justify-center overflow-hidden">
                                    {checkSpeedometerImg ? <img src={checkSpeedometerImg} className="absolute inset-0 w-full h-full object-cover" /> : <div className="text-slate-400 opacity-50"><Gauge size={48} className="mx-auto mb-3" /><span className="text-xs font-black uppercase">Klik Untuk Upload</span></div>}
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleChecklistImageUpload('speedometer', e)} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 border-b dark:border-slate-700 pb-2 uppercase tracking-widest text-[10px]"><CarIcon size={20} className="text-red-600" /> Foto Fisik</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {['front', 'back', 'left', 'right'].map((k) => {
                                    const imageSrc = k === 'front' ? checkFrontImg : k === 'back' ? checkBackImg : k === 'left' ? checkLeftImg : checkRightImg;
                                    return (
                                        <div key={k} className="border-2 border-slate-100 dark:border-slate-700 rounded-2xl h-32 relative bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                            { imageSrc ? <img src={imageSrc} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-slate-400 uppercase">{k}</span>}
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleChecklistImageUpload(k as any, e)} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="pt-6 border-t dark:border-slate-700 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsChecklistModalOpen(false)} className="px-8 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-xs">Batal</button>
                        <button type="submit" className="px-10 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform">Simpan & Aktifkan Sewa</button>
                    </div>
                 </form>
             </div>
          </div>
      )}
    </div>
  );
};

export default BookingPage;