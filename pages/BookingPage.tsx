import { 
  Search, Plus, Trash2, MessageCircle, AlertTriangle, Calendar, 
  User as UserIcon, Zap, CheckCircle, MapPin, Shield, 
  Image as ImageIcon, X, FileText, ClipboardCheck, Fuel, 
  Gauge, Car as CarIcon, Edit2, FileSpreadsheet, ChevronDown, 
  Filter, Info, Send, Wallet, CheckSquare, Clock as ClockIcon,
  DollarSign, CreditCard, Tag, ArrowRight, History, XCircle,
  Camera, Printer, ChevronLeft, ChevronRight, LayoutList, GanttChart,
  Building, UserCheck
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
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

  // Timeline State
  const [timelineDate, setTimelineDate] = useState(new Date());
  const [timelineSearch, setTimelineSearch] = useState('');

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('08:00');
  
  // Car Selection State
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [isCarDropdownOpen, setIsCarDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Rent to Rent State
  const [isRentToRent, setIsRentToRent] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [externalCarName, setExternalCarName] = useState('');
  const [externalCarPlate, setExternalCarPlate] = useState('');
  const [vendorFee, setVendorFee] = useState<number>(0);

  const [useDriver, setUseDriver] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [driverNote, setDriverNote] = useState('');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [packageType, setPackageType] = useState<string>('');
  const [destination, setDestination] = useState<'Dalam Kota' | 'Luar Kota'>('Dalam Kota');
  const [customerNote, setCustomerNote] = useState('');

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
    setCustomers(getStoredData<Customer[]>('customers', []));
    const loadedSettings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    setSettings(loadedSettings);
    if(loadedSettings.rentalPackages.length > 0) {
        setPackageType(loadedSettings.rentalPackages[0]);
    }

    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsCarDropdownOpen(false);
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

  // Separate Effect for Auto Overdue Calculation
  useEffect(() => {
    if (actualReturnDate && actualReturnTime && endDate && endTime) {
        const actual = new Date(`${actualReturnDate}T${actualReturnTime}`);
        const scheduled = new Date(`${endDate}T${endTime}`);
        if (actual > scheduled) {
            const diffMs = actual.getTime() - scheduled.getTime();
            const overdueHours = Math.ceil(diffMs / (1000 * 60 * 60));
            const calculated = overdueHours * ((customBasePrice || 0) / 10);
            setOvertimeFee(calculated);
        } else {
            setOvertimeFee(0);
        }
    }
  }, [actualReturnDate, actualReturnTime, endDate, endTime, customBasePrice]);

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
        
        // NEW LOGIC: Use car.driverSalary instead of driver.dailyRate
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
      const dateStr = date.toISOString().split('T')[0];
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
      securityDepositType: 'Barang',
      securityDepositValue: 0,
      securityDepositDescription: '',
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

        // A. Setor Vendor
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

        // B. NEW LOGIC: Setor Investor (Fixed per hari dari Car model)
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

        // C. Gaji Driver
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
    setEditingBookingId(null); setSelectedCarId(''); setStartDate(''); setEndDate('');
    setIsRentToRent(false); setSelectedVendorId(''); setExternalCarName(''); setExternalCarPlate(''); setVendorFee(0);
    setUseDriver(false); setSelectedDriverId(''); setDriverNote('');
    setSelectedCustomerId(''); setCustomerName(''); setCustomerPhone(''); setPackageType(settings.rentalPackages[0]);
    setDestination('Dalam Kota'); setCustomerNote(''); setCustomBasePrice(0); setDeliveryFee(0);
    setAmountPaid('0'); setActualReturnDate(''); setActualReturnTime(''); setOvertimeFee(0);
    setExtraCost(0); setExtraCostDescription(''); setInternalNotes(''); setPaymentProofImage(null);
    setDiscount(0);
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
      if (!checklistBooking || !checkSpeedometerImg) { alert("Foto Speedometer Wajib!"); return; }
      const updatedChecklist: VehicleChecklist = {
          odometer: Number(checkOdometer), fuelLevel: checkFuel, speedometerImage: checkSpeedometerImg,
          physicalImages: { front: checkFrontImg || undefined, back: checkBackImg || undefined, left: checkLeftImg || undefined, right: checkRightImg || undefined },
          notes: checkNotes, checkedAt: Date.now(), checkedBy: currentUser.name
      };
      const updated = bookings.map(b => b.id === checklistBooking.id ? { ...b, checklist: updatedChecklist, status: BookingStatus.ACTIVE } : b);
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
  const carUpcomingBookings = selectedCarId 
      ? bookings.filter(b => b.carId === selectedCarId && b.status !== BookingStatus.CANCELLED && new Date(b.endDate) >= new Date())
                .sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .slice(0, 3)
      : [];

  const statusPriority: Record<string, number> = {
      [BookingStatus.ACTIVE]: 1, [BookingStatus.BOOKED]: 2, [BookingStatus.COMPLETED]: 3, [BookingStatus.CANCELLED]: 4, [BookingStatus.MAINTENANCE]: 5
  };

  const filteredTimelineCars = cars.filter(c => 
      c.name.toLowerCase().includes(timelineSearch.toLowerCase()) || 
      c.plate.toLowerCase().includes(timelineSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Booking & Jadwal</h2>
          <p className="text-slate-500 font-medium">Sistem manajemen ketersediaan armada terintegrasi.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
           <button onClick={() => setActiveTab('list')} className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
               <LayoutList size={16}/> Daftar
           </button>
           <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'timeline' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
               <GanttChart size={16}/> Timeline
           </button>
           <button onClick={() => setActiveTab('create')} className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'create' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
               <Plus size={16}/> Input Baru
           </button>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-600 text-white px-4 py-3 rounded-xl flex items-center gap-3 animate-bounce">
          <CheckCircle size={20} /> <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {activeTab === 'timeline' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center bg-slate-50 gap-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                      <button onClick={() => setTimelineDate(new Date(timelineDate.setMonth(timelineDate.getMonth() - 1)))} className="p-2 bg-white border rounded-lg hover:bg-slate-50"><ChevronLeft size={16}/></button>
                      <h3 className="font-bold text-slate-800 w-40 text-center">{timelineDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>
                      <button onClick={() => setTimelineDate(new Date(timelineDate.setMonth(timelineDate.getMonth() + 1)))} className="p-2 bg-white border rounded-lg hover:bg-slate-50"><ChevronRight size={16}/></button>
                  </div>
                  <div className="relative w-full sm:w-64">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Cari Unit..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={timelineSearch} onChange={e => setTimelineSearch(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500"></span> Booked</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500"></span> Active</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-400"></span> Selesai</span>
                  </div>
              </div>
              <div className="overflow-auto relative custom-scrollbar flex-1">
                  <div className="min-w-[1000px] inline-block w-full">
                      <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-sm">
                          <div className="w-48 p-3 font-bold text-xs text-slate-500 uppercase flex-shrink-0 sticky left-0 top-0 bg-slate-50 z-30 border-r border-slate-200 flex items-center">Unit Armada</div>
                          <div className="flex flex-1">
                              {getDaysInMonth(timelineDate).map(d => (
                                  <div key={d.getDate()} className={`flex-1 min-w-[30px] text-center border-r border-slate-100 py-2 text-xs font-medium ${d.getDay() === 0 ? 'bg-red-50 text-red-600' : ''}`}>{d.getDate()}</div>
                              ))}
                          </div>
                      </div>
                      {filteredTimelineCars.map(car => (
                          <div key={car.id} className="flex border-b border-slate-100 hover:bg-slate-50/50 relative h-16 group">
                              <div className="w-48 p-3 flex items-center gap-3 border-r border-slate-200 bg-white flex-shrink-0 sticky left-0 z-10 group-hover:bg-slate-50 transition-colors">
                                  {car.image ? <img src={car.image} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><CarIcon size={16} className="text-slate-400"/></div>}
                                  <div><p className="text-xs font-bold text-slate-800 truncate w-24">{car.name}</p><p className="text-[10px] text-slate-500">{car.plate}</p></div>
                              </div>
                              <div className="flex flex-1 relative">
                                  {getDaysInMonth(timelineDate).map(d => (
                                      <div key={d.getDate()} className={`flex-1 min-w-[30px] border-r border-slate-100 h-full ${d.getDay() === 0 ? 'bg-red-50/30' : ''} hover:bg-indigo-50 cursor-pointer transition-colors`} onClick={() => handleTimelineCellClick(car.id, d)}></div>
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
                                      const colorClass = b.status === 'Active' ? 'bg-green-500' : b.status === 'Completed' ? 'bg-slate-400' : 'bg-blue-500';
                                      return (
                                          <div key={b.id} className={`absolute top-3 bottom-3 rounded-md shadow-sm text-[10px] text-white flex items-center justify-center font-bold px-1 overflow-hidden whitespace-nowrap cursor-pointer z-0 hover:z-20 hover:scale-105 transition-transform ${colorClass}`} style={{ left: `${leftPos}%`, width: `${width}%` }} onClick={(e) => { e.stopPropagation(); handleEdit(b); }}>{b.customerName}</div>
                                      );
                                  })}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-visible">
             <form onSubmit={handleCreateBooking} className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] min-h-[600px]">
                <div className="bg-slate-50/50 p-6 border-r border-slate-100 space-y-6">
                    <section className="space-y-4">
                        <h4 className="font-black text-slate-800 flex items-center gap-2 border-b pb-3 uppercase tracking-widest text-[10px]"><ClockIcon size={16} className="text-indigo-600"/> Waktu & Unit</h4>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Mulai Sewa</label>
                                <div className="flex gap-1">
                                    <input required type="date" className={`w-full border rounded-lg p-2.5 text-sm font-bold ${carError ? 'border-red-500 bg-red-50 text-red-700' : ''}`} value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    <input type="time" className={`w-24 border rounded-lg p-2.5 text-sm font-bold ${carError ? 'border-red-500 bg-red-50 text-red-700' : ''}`} value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Selesai Sewa</label>
                                <div className="flex gap-1">
                                    <input required type="date" className={`w-full border rounded-lg p-2.5 text-sm font-bold ${carError ? 'border-red-500 bg-red-50 text-red-700' : ''}`} value={endDate} onChange={e => setEndDate(e.target.value)} />
                                    <input type="time" className={`w-24 border rounded-lg p-2.5 text-sm font-bold ${carError ? 'border-red-500 bg-red-50 text-red-700' : ''}`} value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 text-yellow-600 rounded-md border-slate-300" checked={isRentToRent} onChange={e => setIsRentToRent(e.target.checked)} />
                                <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><Building size={16}/> Unit Luar (Vendor)</span>
                            </label>
                        </div>

                        {isRentToRent ? (
                            <div className="space-y-3 animate-fade-in">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Vendor</label>
                                    <select required className="w-full border rounded-lg p-2.5 text-sm font-bold bg-white" value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)}>
                                        <option value="">-- Pilih Vendor --</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Nama Mobil (External)</label>
                                    <input required type="text" className="w-full border rounded-lg p-2.5 text-sm font-bold" value={externalCarName} onChange={e => setExternalCarName(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Plat Nomor</label>
                                    <input required type="text" className="w-full border rounded-lg p-2.5 text-sm font-bold uppercase" value={externalCarPlate} onChange={e => setExternalCarPlate(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-red-500 uppercase">HPP Vendor (Rp)</label>
                                    <input required type="number" className="w-full border rounded-lg p-2.5 text-sm font-bold border-red-200 bg-red-50" value={vendorFee} onChange={e => setVendorFee(Number(e.target.value))} />
                                </div>
                            </div>
                        ) : (
                            <div className="relative" ref={dropdownRef}>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Unit Armada</label>
                                <div onClick={() => setIsCarDropdownOpen(!isCarDropdownOpen)} className={`w-full border rounded-xl p-3 cursor-pointer flex items-center justify-between transition-all ${carError ? 'border-red-500 bg-red-50 ring-2 ring-red-100' : 'bg-white hover:border-indigo-400 shadow-sm'}`}>
                                    {selectedCarData ? (
                                        <div className="flex items-center gap-3">
                                            <img src={selectedCarData.image} className="w-10 h-7 object-cover rounded shadow-sm" />
                                            <div><p className="font-bold text-xs">{selectedCarData.name}</p><p className="text-[9px] text-slate-500 font-mono">{selectedCarData.plate}</p></div>
                                        </div>
                                    ) : <span className="text-xs text-slate-400">Pilih unit...</span>}
                                    <ChevronDown size={18} className="text-slate-400"/>
                                </div>
                                {isCarDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                                        {cars.map(car => {
                                            const isAvailable = (!startDate || !endDate) ? true : checkAvailability(bookings, car.id, new Date(`${startDate}T${startTime}`), new Date(`${endDate}T${endTime}`), 'car', editingBookingId || undefined);
                                            return (
                                                <div key={car.id} onClick={() => isAvailable && (setSelectedCarId(car.id), setIsCarDropdownOpen(false))} className={`p-3 border-b last:border-0 flex items-center gap-4 transition-colors ${!isAvailable ? 'bg-slate-100 opacity-40 cursor-not-allowed' : 'hover:bg-indigo-50 cursor-pointer'}`}>
                                                    <img src={car.image} className="w-12 h-8 object-cover rounded shadow-sm" />
                                                    <div className="flex-1"><p className="font-bold text-xs text-slate-800">{car.name}</p><p className="text-[9px] text-slate-500">{car.plate}</p></div>
                                                    {!isAvailable && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black uppercase">Bentrok</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {carError && conflictingBooking && (
                                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-red-700 text-[10px] font-bold flex items-center gap-1 mb-1"><AlertTriangle size={12}/> JADWAL BENTROK!</p>
                                        <div className="text-[10px] text-slate-600"><p>Oleh: <span className="font-bold">{conflictingBooking.customerName}</span></p></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                    <section className="space-y-4 pt-4 border-t">
                        <h4 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-[10px]"><UserIcon size={16} className="text-indigo-600"/> Supir</h4>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
                             <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded-md border-slate-300" checked={useDriver} onChange={e => setUseDriver(e.target.checked)} />
                                <span className="text-sm font-bold text-slate-700">Pakai Jasa Driver</span>
                             </label>
                             {useDriver && (
                                <div className="space-y-3 animate-fade-in">
                                    <select required className="w-full border rounded-lg p-2.5 text-sm font-bold bg-slate-50" value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}>
                                        <option value="">-- Pilih Driver --</option>
                                        {drivers.map(d => {
                                             const isAvail = (!startDate || !endDate) ? true : checkAvailability(bookings, d.id, new Date(`${startDate}T${startTime}`), new Date(`${endDate}T${endTime}`), 'driver', editingBookingId || undefined);
                                             const carSalary = selectedCarData?.driverSalary || 0;
                                             return <option key={d.id} value={d.id} disabled={!isAvail}>{d.name} {!isAvail ? '(Sibuk)' : `(Gaji: Rp ${carSalary.toLocaleString()}/hr)`}</option>
                                        })}
                                    </select>
                                    <textarea className="w-full border rounded-lg p-3 text-xs" rows={2} placeholder="Catatan driver..." value={driverNote} onChange={e => setDriverNote(e.target.value)} />
                                </div>
                             )}
                        </div>
                    </section>
                </div>
                <div className="p-8 space-y-8 overflow-y-auto">
                    <section className="space-y-5">
                        <h4 className="font-black text-slate-800 flex items-center gap-2 border-b pb-3 uppercase tracking-widest text-xs"><UserIcon size={18} className="text-indigo-600"/> 1. Data Pelanggan</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Database Pelanggan</label>
                                <select className="w-full border rounded-xl p-2.5 text-sm bg-slate-50 font-bold" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                                    <option value="">-- Pelanggan Baru --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Nama Lengkap</label>
                                <input required type="text" className="w-full border rounded-xl p-2.5 text-sm font-bold" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">WA Pelanggan</label>
                                <input required type="tel" className="w-full border rounded-xl p-2.5 text-sm font-bold" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Paket Sewa</label>
                                <select className="w-full border rounded-xl p-2.5 text-sm font-bold" value={packageType} onChange={e => setPackageType(e.target.value)}>
                                    {settings.rentalPackages.map((p: string) => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>
                    <section className="space-y-5">
                        <h4 className="font-black text-slate-800 flex items-center gap-2 border-b pb-3 uppercase tracking-widest text-xs"><Zap size={18} className="text-indigo-600"/> 2. Rincian & Biaya</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Harga Unit / Hari</label>
                                    <input type="number" className="w-full border rounded-xl p-2.5 text-sm font-black text-indigo-700 bg-indigo-50/30" value={customBasePrice} onChange={e => setCustomBasePrice(Number(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Biaya Antar</label>
                                    <input type="number" className="w-full border rounded-xl p-2.5 text-sm font-bold" value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Diskon</label>
                                    <input type="number" className="w-full border rounded-xl p-2.5 text-sm font-bold text-green-600 bg-green-50" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-3 shadow-2xl">
                                <h5 className="font-black text-[10px] uppercase tracking-widest text-indigo-400">Ringkasan Biaya</h5>
                                <div className="space-y-1 text-xs font-medium border-b border-white/10 pb-3">
                                    <div className="flex justify-between text-slate-400"><span>Sewa Unit ({durationDays} hr)</span><span>Rp {pricing.basePrice.toLocaleString()}</span></div>
                                    {pricing.driverFee > 0 && <div className="flex justify-between text-slate-400"><span>Driver ({durationDays} hr)</span><span>Rp {pricing.driverFee.toLocaleString()}</span></div>}
                                    {pricing.highSeasonFee > 0 && <div className="flex justify-between text-orange-400"><span>High Season</span><span>Rp {pricing.highSeasonFee.toLocaleString()}</span></div>}
                                    {pricing.deliveryFee > 0 && <div className="flex justify-between text-slate-400"><span>Antar/Jemput</span><span>Rp {pricing.deliveryFee.toLocaleString()}</span></div>}
                                    {overtimeFee > 0 && <div className="flex justify-between text-red-400"><span>Overtime</span><span>Rp {overtimeFee.toLocaleString()}</span></div>}
                                    {extraCost > 0 && <div className="flex justify-between text-orange-300"><span>Biaya Extra</span><span>Rp {extraCost.toLocaleString()}</span></div>}
                                    {discount > 0 && <div className="flex justify-between text-green-400"><span>Diskon</span><span>- Rp {discount.toLocaleString()}</span></div>}
                                </div>
                                <div className="flex justify-between font-black text-lg text-indigo-300"><span>TOTAL</span><span>Rp {pricing.totalPrice.toLocaleString()}</span></div>
                            </div>
                        </div>
                    </section>
                    <section className="space-y-5">
                        <h4 className="font-black text-slate-800 flex items-center gap-2 border-b pb-3 uppercase tracking-widest text-xs"><Wallet size={18} className="text-indigo-600"/> 3. Pembayaran</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">DP / Pelunasan (Masuk)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-4 text-lg font-black text-green-700/50">Rp</span>
                                    <input type="number" className="w-full border-2 border-green-500 bg-green-50 rounded-2xl p-5 pl-12 text-2xl font-black text-green-700 outline-none" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                                </div>
                            </div>
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Status Nota</p>
                                <span className={`text-xl font-black uppercase tracking-tighter px-6 py-2 rounded-full shadow-sm ${parseInt(amountPaid) >= pricing.totalPrice && pricing.totalPrice > 0 ? 'bg-green-600 text-white' : parseInt(amountPaid) > 0 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {parseInt(amountPaid) >= pricing.totalPrice && pricing.totalPrice > 0 ? 'LUNAS' : parseInt(amountPaid) > 0 ? 'D P' : 'BELUM BAYAR'}
                                </span>
                            </div>
                        </div>
                    </section>
                    <div className="pt-6 border-t">
                        <button type="submit" disabled={!isRentToRent && (!!carError || !selectedCarId)} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-2xl active:scale-95 flex items-center justify-center gap-3 transition-all">
                            <Plus size={24}/> Simpan & Kunci Jadwal
                        </button>
                    </div>
                </div>
             </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="space-y-4">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-wrap gap-4 items-center shadow-sm">
                <span className="text-sm font-black text-slate-700 flex items-center gap-2 uppercase tracking-tighter"><Filter size={18} className="text-indigo-600"/> Filter:</span>
                <input type="date" className="border rounded-xl px-4 py-2 text-sm font-bold text-slate-600 bg-slate-50 outline-none" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                <span className="text-slate-400 font-bold">-</span>
                <input type="date" className="border rounded-xl px-4 py-2 text-sm font-bold text-slate-600 bg-slate-50 outline-none" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                <select className="border rounded-xl px-4 py-2 text-sm font-bold text-slate-600 bg-slate-50 outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="All">SEMUA STATUS</option>
                    <option value="Active">ACTIVE</option>
                    <option value="Booked">BOOKED</option>
                    <option value="Completed">COMPLETED</option>
                    <option value="Cancelled">CANCELLED</option>
                </select>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {bookings.filter(b => {
                    const bDate = b.startDate.split('T')[0];
                    const start = filterStartDate || '0000-00-00';
                    const end = filterEndDate || '9999-12-31';
                    const matchesDate = bDate >= start && bDate <= end;
                    const matchesStatus = filterStatus === 'All' || b.status === filterStatus;
                    return matchesDate && matchesStatus;
                }).sort((a, b) => (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99) || b.createdAt - a.createdAt).map(b => {
                    let carName = b.isRentToRent ? b.externalCarName : cars.find(c => c.id === b.carId)?.name || 'Unknown';
                    let carPlate = b.isRentToRent ? b.externalCarPlate : cars.find(c => c.id === b.carId)?.plate || '-';
                    let carImage = b.isRentToRent ? null : cars.find(c => c.id === b.carId)?.image;
                    const isDue = b.totalPrice > b.amountPaid;
                    const diffDays = Math.max(1, Math.ceil((new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24)));
                    return (
                        <div key={b.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-6 relative overflow-hidden">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 w-full">
                                <div className="flex items-center gap-5 w-full">
                                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200">
                                        {carImage ? <img src={carImage} className="w-full h-full object-cover" /> : <CarIcon size={32} className="text-slate-400"/>}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight">{carName} <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black border border-slate-200 ml-2">{carPlate}</span></h4>
                                            {b.isRentToRent && <span className="bg-yellow-100 text-yellow-700 text-[9px] font-bold px-2 py-0.5 rounded border border-yellow-200 uppercase">Unit Vendor</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                                            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-indigo-600"/> {new Date(b.startDate).toLocaleDateString('id-ID')}</span>
                                            <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md"><ClockIcon size={14}/> {diffDays} HR</span>
                                            <span className="flex items-center gap-1.5 text-red-600 uppercase"><UserIcon size={14}/> {b.customerName}</span>
                                            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${isDue ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                <Wallet size={14}/> Rp {b.totalPrice.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="hidden lg:block text-right">
                                        <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${b.status === 'Active' ? 'bg-green-600 text-white' : b.status === 'Booked' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{b.status}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 w-full justify-start border-t pt-4">
                                {isDue && b.status !== BookingStatus.CANCELLED && <button onClick={() => handleLunasiAction(b)} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-colors active:scale-95 shadow-lg shadow-green-100"><CheckCircle size={16}/> Lunasi</button>}
                                {b.status === BookingStatus.ACTIVE && <button onClick={() => handleSelesaiAction(b)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors active:scale-95 shadow-lg shadow-indigo-100"><History size={16}/> Selesai</button>}
                                <div className="h-8 w-px bg-slate-100 mx-2 hidden md:block"></div>
                                <button onClick={() => { const c = cars.find(car=>car.id===b.carId); if(c || b.isRentToRent) window.open(generateWhatsAppLink(b, c || {name: b.externalCarName || '', plate: b.externalCarPlate || ''} as any), '_blank') }} className="px-3 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 border border-green-100 flex items-center gap-2 text-xs font-bold"><MessageCircle size={16}/> Kirim WA</button>
                                <button onClick={() => { const c = cars.find(car=>car.id===b.carId); if(c || b.isRentToRent) generateInvoicePDF(b, c || {name: b.externalCarName || '', plate: b.externalCarPlate || ''} as any) }} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 border border-blue-100 flex items-center gap-2 text-xs font-bold"><Printer size={16}/> Nota</button>
                                <button onClick={() => handleEdit(b)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-50 border border-slate-100"><Edit2 size={20}/></button>
                                {b.status !== BookingStatus.CANCELLED && <button onClick={() => openChecklistModal(b)} className={`p-2.5 rounded-xl border ${b.checklist ? 'bg-green-600 text-white border-green-700' : 'bg-yellow-50 text-yellow-600 border-yellow-100'}`}><ClipboardCheck size={20}/></button>}
                                {isSuperAdmin && <button onClick={() => handleDelete(b.id)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 border border-slate-100"><Trash2 size={20}/></button>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}
      
      {isChecklistModalOpen && checklistBooking && (
          <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
             <div className="bg-white rounded-3xl w-full max-w-4xl p-8 shadow-2xl max-h-[95vh] overflow-y-auto border-t-8 border-indigo-600">
                 <div className="flex justify-between items-center mb-8 border-b pb-6">
                     <div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Checklist Serah Terima</h3><p className="text-slate-500 font-bold">ID Transaksi: <span className="font-mono text-indigo-600">#{checklistBooking.id.slice(0,8)}</span></p></div>
                     <button onClick={() => setIsChecklistModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-red-600 transition-colors"><X size={28} /></button>
                 </div>
                 <form onSubmit={saveChecklist} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <h4 className="font-black text-slate-900 flex items-center gap-2 border-b pb-2 uppercase tracking-widest text-[10px]"><Gauge size={20} className="text-indigo-600" /> Indikator</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">KM (Odometer)</label><input required type="number" className="w-full border-2 rounded-xl p-3 text-lg font-black focus:border-indigo-500 outline-none" value={checkOdometer} onChange={e => setCheckOdometer(e.target.value)} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Posisi BBM</label><select className="w-full border-2 rounded-xl p-3 text-sm font-bold bg-white focus:border-indigo-500 outline-none" value={checkFuel} onChange={e => setCheckFuel(e.target.value)}><option value="Full">FULL</option><option value="3/4">3/4</option><option value="1/2">1/2</option><option value="1/4">1/4</option><option value="Empty">RESERVE</option></select></div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Foto Dashboard (Wajib)</label>
                                <div className="border-4 border-dashed border-slate-200 rounded-3xl p-6 text-center hover:bg-slate-50 relative h-56 flex flex-col items-center justify-center overflow-hidden">
                                    {checkSpeedometerImg ? <img src={checkSpeedometerImg} className="absolute inset-0 w-full h-full object-cover" /> : <div className="text-slate-400 opacity-50"><Gauge size={48} className="mx-auto mb-3" /><span className="text-xs font-black uppercase">Klik Untuk Upload</span></div>}
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleChecklistImageUpload('speedometer', e)} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="font-black text-slate-900 flex items-center gap-2 border-b pb-2 uppercase tracking-widest text-[10px]"><CarIcon size={20} className="text-indigo-600" /> Foto Fisik</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {['front', 'back', 'left', 'right'].map((k) => {
                                    const imageSrc = k === 'front' ? checkFrontImg : k === 'back' ? checkBackImg : k === 'left' ? checkLeftImg : checkRightImg;
                                    return (
                                        <div key={k} className="border-2 border-slate-100 rounded-2xl h-32 relative bg-slate-50 flex items-center justify-center overflow-hidden">
                                            { imageSrc ? <img src={imageSrc} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-slate-400 uppercase">{k}</span>}
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleChecklistImageUpload(k as any, e)} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="pt-6 border-t flex justify-end gap-3">
                        <button type="button" onClick={() => setIsChecklistModalOpen(false)} className="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-black uppercase tracking-widest text-xs">Batal</button>
                        <button type="submit" className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform">Simpan & Aktifkan Sewa</button>
                    </div>
                 </form>
             </div>
          </div>
      )}
    </div>
  );
};

export default BookingPage;