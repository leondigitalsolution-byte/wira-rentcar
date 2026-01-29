// Added React to imports to fix 'Cannot find namespace React' errors
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Car, Partner, User, AppSettings } from '../types';
import { getStoredData, setStoredData, DEFAULT_SETTINGS, exportToExcel, importFromExcel, mergeData, compressImage, downloadTemplateExcel } from '../services/dataService';
import { Plus, Trash2, Edit2, User as UserIcon, Car as CarIcon, Upload, X, Download, FileSpreadsheet, MapPin, Camera, DollarSign, List, Info, Search, Filter, ChevronDown } from 'lucide-react';

interface Props {
    currentUser: User;
}

// Added React.FC to define the functional component type
const FleetPage: React.FC<Props> = ({ currentUser }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Added isSaving state
  const [modalTab, setModalTab] = useState<'umum' | 'harga'>('umum');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterBrand, setFilterBrand] = useState('All');
  const [filterOwner, setFilterOwner] = useState('All');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [plate, setPlate] = useState('');
  const [type, setType] = useState('MPV');
  const [prices, setPrices] = useState<{[key: string]: number}>({});
  const [investorSetoran, setInvestorSetoran, ] = useState(0);
  const [driverSalary, setDriverSalary] = useState(0);
  const [partnerId, setPartnerId] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const isSuperAdmin = currentUser.role === 'superadmin';
  const isPartnerView = currentUser.role === 'partner';

  useEffect(() => {
    setCars(getStoredData<Car[]>('cars', []));
    setPartners(getStoredData<Partner[]>('partners', []));
    const loadedSettings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    setSettings(loadedSettings);

    const handleClickOutside = (event: MouseEvent) => {
        if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
            setIsActionMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openModal = (car?: Car) => {
    setModalTab('umum');
    setIsSaving(false); // Reset saving state
    if (car) {
        setEditingCar(car);
        setName(car.name);
        setBrand(car.brand || '');
        setPlate(car.plate);
        setType(car.type);
        setPartnerId(car.partnerId || '');
        setImagePreview(car.image);
        setInvestorSetoran(car.investorSetoran || 0);
        setDriverSalary(car.driverSalary || 0);
        if (car.pricing) {
            setPrices(car.pricing);
        } else {
             // Fallback for legacy data
             setPrices({
                 '12 Jam (Dalam Kota)': car.price12h || 0,
                 '24 Jam (Dalam Kota)': car.price24h || 0,
             });
        }
    } else {
        setEditingCar(null);
        setName('');
        setBrand('');
        setPlate('');
        setType(settings.carCategories[0] || 'MPV');
        setPartnerId(isPartnerView ? (currentUser.linkedPartnerId || '') : ''); 
        setImagePreview(null);
        setPrices({});
        setInvestorSetoran(0);
        setDriverSalary(150000);
    }
    setIsModalOpen(true);
  };

  const handlePriceChange = (pkg: string, value: number) => {
      setPrices(prev => ({ ...prev, [pkg]: value }));
  };

  // Added React.ChangeEvent type for image upload event
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const compressed = await compressImage(file);
        setImagePreview(compressed);
      } catch (err) {
        alert("Gagal memproses gambar.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveImage = () => setImagePreview(null);

  // Added React.FormEvent type for form submit event
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return; // Prevent double submission
    
    setIsSaving(true); // Start saving
    
    const finalImage = imagePreview || `https://picsum.photos/300/200?random=${Date.now()}`;

    const newCar: Car = {
        id: editingCar ? editingCar.id : Date.now().toString(),
        name,
        brand,
        plate,
        type,
        pricing: prices,
        investorSetoran: Number(investorSetoran),
        driverSalary: Number(driverSalary),
        price12h: prices['12 Jam (Dalam Kota)'] || 0,
        price24h: prices['24 Jam (Dalam Kota)'] || 0,
        partnerId: partnerId || null,
        status: 'Available',
        image: finalImage,
    };

    let updatedCars;
    if (editingCar) {
        updatedCars = cars.map(c => c.id === editingCar.id ? newCar : c);
    } else {
        updatedCars = [newCar, ...cars];
    }

    setCars(updatedCars);
    
    // Close modal and cleanup BEFORE long-running async tasks to ensure UI remains responsive
    setIsModalOpen(false);
    setEditingCar(null);
    setName('');
    setBrand('');
    setPlate('');
    setImagePreview(null);
    setPrices({});

    try {
        await setStoredData('cars', updatedCars);
    } catch (error) {
        console.error("Failed to save fleet data:", error);
        alert("Data tersimpan lokal namun gagal sinkron ke cloud. Cek koneksi Anda.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
      if(window.confirm('Hapus data armada mobil ini secara permanen?')) {
          const updated = cars.filter(c => c.id !== id);
          setCars(updated);
          await setStoredData('cars', updated);
      }
  };

  const brands = useMemo(() => {
    const b = new Set<string>();
    cars.forEach(c => c.brand && b.add(c.brand));
    return Array.from(b).sort();
  }, [cars]);

  const filteredCarsList = useMemo(() => {
    let result = isPartnerView 
        ? cars.filter(c => c.partnerId === currentUser.linkedPartnerId) 
        : cars;

    if (searchTerm) {
        const low = searchTerm.toLowerCase();
        result = result.filter(c => c.name.toLowerCase().includes(low) || c.plate.toLowerCase().includes(low));
    }

    if (filterCategory !== 'All') result = result.filter(c => c.type === filterCategory);
    if (filterBrand !== 'All') result = result.filter(c => c.brand === filterBrand);

    if (filterOwner !== 'All') {
        if (filterOwner === 'Office') result = result.filter(c => !c.partnerId);
        else result = result.filter(c => c.partnerId === filterOwner);
    }

    return result;
  }, [cars, isPartnerView, currentUser, searchTerm, filterCategory, filterBrand, filterOwner]);

  const getDisplayPrice = (car: Car) => {
      if (car.pricing) {
          if (car.pricing['24 Jam (Dalam Kota)']) return car.pricing['24 Jam (Dalam Kota)'];
          const keys = Object.keys(car.pricing);
          if (keys.length > 0) return car.pricing[keys[0]];
      }
      return car.price24h || 0;
  };

  const handleExport = () => {
    const dataToExport = filteredCarsList.map(c => {
        const row: any = {
            ID: c.id,
            Nama: c.name,
            Merek: c.brand,
            Plat: c.plate,
            Kategori: c.type,
            Setoran_Investor: c.investorSetoran,
            Gaji_Driver: c.driverSalary,
            Status: c.status
        };
        // Add all active packages to export columns
        settings.rentalPackages.forEach(pkg => {
            row[pkg] = c.pricing?.[pkg] || 0;
        });
        return row;
    });
    exportToExcel(dataToExport, `Data_Armada_${new Date().toISOString().split('T')[0]}`);
  };
  
  // Added React.ChangeEvent type for file input event
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          importFromExcel(file, async (data) => {
              const imported: Car[] = data.map((d: any) => {
                  const dynamicPricing: {[key: string]: number} = {};
                  // Dynamically map Excel columns to pricing packages
                  settings.rentalPackages.forEach(pkg => {
                      if (d[pkg] !== undefined) {
                          dynamicPricing[pkg] = Number(d[pkg]);
                      }
                  });

                  return {
                      id: d.ID || d.id || `imp-${Date.now()}-${Math.random()}`,
                      name: d.Nama || d.nama_mobil || d.nama || 'Tanpa Nama',
                      brand: d.Merek || d.merek || '',
                      plate: d.Plat || d.plat_nomor || d.plat || '-',
                      type: d.Kategori || d.kategori || 'MPV',
                      investorSetoran: Number(d.Setoran_Investor || d.setoran_investor || 0),
                      driverSalary: Number(d.Gaji_Driver || d.gaji_driver || 150000),
                      pricing: dynamicPricing,
                      status: 'Available',
                      image: `https://picsum.photos/300/200?random=${Math.random()}`
                  };
              });
              
              const merged = mergeData(cars, imported);
              setCars(merged);
              await setStoredData('cars', merged);
              alert(`${imported.length} unit berhasil diimpor!`);
          });
      }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">{isPartnerView ? 'Unit Mobil Saya' : 'Armada Mobil'}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Kelola ketersediaan, foto, dan struktur biaya unit.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] md:w-64">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Cari unit atau plat..." 
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    {!isPartnerView && (
                        <div className="relative" ref={actionMenuRef}>
                            <button 
                                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                                className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 font-bold text-sm"
                            >
                                <FileSpreadsheet size={20} className="text-green-600" /> 
                                <span className="hidden sm:inline">Aksi Data</span>
                                <ChevronDown size={16} />
                            </button>
                            
                            {isActionMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 py-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                                    <button onClick={handleExport} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                        <Download size={16} /> Ekspor Excel
                                    </button>
                                    <label className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer">
                                        <Upload size={16} /> Impor Excel
                                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportFile} />
                                    </label>
                                    <div className="border-t dark:border-slate-700 my-1"></div>
                                    <button onClick={() => downloadTemplateExcel('armada')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-indigo-600 font-medium">
                                        <Info size={16} /> Unduh Template
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {!isPartnerView && (
                        <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95">
                            <Plus size={20} /> <span className="hidden sm:inline">Tambah Mobil</span>
                        </button>
                    )}
                </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                    <Filter size={14} /> Filter:
                </div>
                <select className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                    <option value="All">Semua Kategori</option>
                    {settings.carCategories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                </select>
                <select className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none" value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
                    <option value="All">Semua Merek</option>
                    {brands.map(b => <option key={b} value={b}>{b.toUpperCase()}</option>)}
                </select>
                {!isPartnerView && (
                    <select className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none" value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
                        <option value="All">Semua Pemilik</option>
                        <option value="Office">KANTOR</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                    </select>
                )}
                {(filterCategory !== 'All' || filterBrand !== 'All' || filterOwner !== 'All' || searchTerm !== '') && (
                    <button onClick={() => { setFilterCategory('All'); setFilterBrand('All'); setFilterOwner('All'); setSearchTerm(''); }} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
                        <X size={14}/> Reset
                    </button>
                )}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCarsList.map(car => (
            <div key={car.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all group animate-in fade-in zoom-in-95 duration-200">
                <div className="h-52 bg-slate-200 dark:bg-slate-900 relative overflow-hidden">
                    <img src={car.image} alt={car.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <span className="bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 shadow-sm">{car.type}</span>
                        {car.brand && <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg">{car.brand}</span>}
                    </div>
                    {car.partnerId && !isPartnerView && (
                        <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-md z-10 uppercase">
                            <UserIcon size={12} /> {partners.find(p => p.id === car.partnerId)?.name.split(' ')[0] || 'Investor'}
                        </div>
                    )}
                </div>
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tight">{car.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-900 inline-block px-2 py-0.5 rounded mt-1 border border-slate-200 dark:border-slate-700">{car.plate}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mulai Dari</p>
                            <p className="font-black text-lg text-indigo-600 dark:text-indigo-400 leading-none">Rp {getDisplayPrice(car).toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    
                    <div className="mt-4 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                        <div className="flex justify-between text-xs items-center">
                            <span className="text-slate-400 font-bold uppercase tracking-tighter">Gaji Driver / hari</span>
                            <span className="font-black text-slate-700 dark:text-slate-300">Rp {car.driverSalary?.toLocaleString('id-ID') || 0}</span>
                        </div>
                        {!isPartnerView && car.partnerId && (
                             <div className="flex justify-between text-xs items-center">
                                <span className="text-slate-400 font-bold uppercase tracking-tighter">Setoran Investor</span>
                                <span className="font-black text-purple-600 dark:text-purple-400">Rp {car.investorSetoran?.toLocaleString('id-ID') || 0}</span>
                            </div>
                        )}
                    </div>

                    {!isPartnerView && (
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => openModal(car)} className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 transition-all">
                                <Edit2 size={14} /> Edit
                            </button>
                            {isSuperAdmin && (
                                <button onClick={() => handleDelete(car.id)} className="p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-xl transition-all">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        ))}
      </div>

      {filteredCarsList.length === 0 && (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
              <CarIcon size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4 opacity-50" />
              <p className="text-slate-500 dark:text-slate-400 font-bold">Armada tidak ditemukan dengan kriteria tersebut.</p>
              <button onClick={() => { setFilterCategory('All'); setFilterBrand('All'); setFilterOwner('All'); setSearchTerm(''); }} className="mt-4 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline">Reset Semua Filter</button>
          </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingCar ? 'Edit Data Mobil' : 'Tambah Mobil Baru'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-slate-700 p-1 rounded-full"><X size={24} /></button>
                  </div>

                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-6">
                      <button onClick={() => setModalTab('umum')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${modalTab === 'umum' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}><Info size={16}/> Umum</button>
                      <button onClick={() => setModalTab('harga')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${modalTab === 'harga' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}><DollarSign size={16}/> Harga & Skema</button>
                  </div>
                  
                  <form onSubmit={handleSave} className="space-y-6 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                      {modalTab === 'umum' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-2">
                              <div className="space-y-4">
                                  <label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Foto Kendaraan</label>
                                  <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                      {imagePreview ? (
                                          <><img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /><button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><X size={16} /></button></>
                                      ) : (
                                          <div className="text-center p-4 pointer-events-none"><Camera className="mx-auto h-10 w-10 text-slate-400 mb-2" /><p className="text-xs text-slate-500 font-bold uppercase">Klik Upload</p></div>
                                      )}
                                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                                  </div>
                              </div>
                              <div className="space-y-4">
                                  <div><label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Nama Mobil</label><input required type="text" placeholder="Veloz" className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-2.5 mt-1 font-bold" value={name} onChange={e => setName(e.target.value)} /></div>
                                  <div><label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Merek Mobil</label><input required type="text" placeholder="Toyota" className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-2.5 mt-1 font-bold uppercase" value={brand} onChange={e => setBrand(e.target.value)} /></div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Plat Nomor</label><input required type="text" placeholder="B 1234 XX" className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-2.5 mt-1 font-bold font-mono uppercase" value={plate} onChange={e => setPlate(e.target.value)} /></div>
                                    <div><label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Kategori</label><select className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-2.5 mt-1 font-bold" value={type} onChange={e => setType(e.target.value)}>{settings.carCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                                  </div>
                                  <div><label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Pemilik Unit</label><select disabled={isPartnerView} className="w-full border dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl p-2.5 mt-1 font-bold" value={partnerId} onChange={e => setPartnerId(e.target.value)}><option value="">INTERNAL KANTOR</option>{partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl"><label className="block text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 mb-1">Setoran ke Investor / hari</label><div className="relative"><span className="absolute left-3 top-2 text-sm font-bold text-purple-400">Rp</span><input type="number" className="w-full border-none bg-white dark:bg-slate-900 dark:text-white rounded-xl p-2 pl-10 font-black text-purple-700 dark:text-purple-300" value={investorSetoran} onChange={e => setInvestorSetoran(Number(e.target.value))} placeholder="0" /></div></div>
                                  <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl"><label className="block text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 mb-1">Gaji Driver / hari</label><div className="relative"><span className="absolute left-3 top-2 text-sm font-bold text-orange-400">Rp</span><input type="number" className="w-full border-none bg-white dark:bg-slate-900 dark:text-white rounded-xl p-2 pl-10 font-black text-orange-700 dark:text-orange-300" value={driverSalary} onChange={e => setDriverSalary(Number(e.target.value))} placeholder="150000" /></div></div>
                              </div>
                              <div className="space-y-4"><h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2"><List size={14}/> Harga Paket Sewa (Jual)</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">{settings.rentalPackages.map(pkg => (<div key={pkg}><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{pkg}</label><div className="relative"><span className="absolute left-3 top-2 text-sm font-bold text-slate-400">Rp</span><input type="number" className="w-full border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl p-2 pl-10 font-bold" value={prices[pkg] || ''} onChange={e => handlePriceChange(pkg, Number(e.target.value))} placeholder="0" /></div></div>))}</div></div>
                          </div>
                      )}
                      <div className="flex gap-3 pt-6 border-t dark:border-slate-700 mt-auto"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Batal</button><button disabled={isUploading || isSaving} type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-xl disabled:opacity-50 active:scale-95 transition-transform">{isSaving ? 'Menyimpan...' : isUploading ? 'Proses...' : 'Simpan Data'}</button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default FleetPage;