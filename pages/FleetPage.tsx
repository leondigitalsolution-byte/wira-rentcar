import React, { useState, useEffect, useRef } from 'react';
import { Car, Partner, User, AppSettings } from '../types';
import { getStoredData, setStoredData, DEFAULT_SETTINGS, exportToCSV, processCSVImport, mergeData, compressImage } from '../services/dataService';
import { Plus, Trash2, Edit2, User as UserIcon, Upload, X, Download, FileSpreadsheet, MapPin, Camera, DollarSign, List, Info } from 'lucide-react';

interface Props {
    currentUser: User;
}

const FleetPage: React.FC<Props> = ({ currentUser }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modalTab, setModalTab] = useState<'umum' | 'harga'>('umum');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [type, setType] = useState('MPV');
  const [prices, setPrices] = useState<{[key: string]: number}>({});
  const [investorSetoran, setInvestorSetoran] = useState(0);
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
  }, []);

  const openModal = (car?: Car) => {
    setModalTab('umum');
    if (car) {
        setEditingCar(car);
        setName(car.name);
        setPlate(car.plate);
        setType(car.type);
        setPartnerId(car.partnerId || '');
        setImagePreview(car.image);
        setInvestorSetoran(car.investorSetoran || 0);
        setDriverSalary(car.driverSalary || 0);
        if (car.pricing) {
            setPrices(car.pricing);
        } else {
             setPrices({
                 '12 Jam (Dalam Kota)': car.price12h || 0,
                 '24 Jam (Dalam Kota)': car.price24h || 0,
             });
        }
    } else {
        setEditingCar(null);
        setName('');
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
      setPrices(prev => ({
          ...prev,
          [pkg]: value
      }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const compressed = await compressImage(file);
        setImagePreview(compressed);
      } catch (err) {
        alert("Gagal memproses gambar. Coba gunakan foto lain.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveImage = () => setImagePreview(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalImage = imagePreview || `https://picsum.photos/300/200?random=${Date.now()}`;

    const newCar: Car = {
        id: editingCar ? editingCar.id : Date.now().toString(),
        name,
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
        updatedCars = [...cars, newCar];
    }

    setCars(updatedCars);
    setStoredData('cars', updatedCars);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Hapus data armada mobil ini secara permanen?')) {
          setCars(prev => {
              const updated = prev.filter(c => c.id !== id);
              setStoredData('cars', updated);
              return updated;
          });
      }
  };

  const getDisplayPrice = (car: Car) => {
      if (car.pricing) {
          if (car.pricing['24 Jam (Dalam Kota)']) return car.pricing['24 Jam (Dalam Kota)'];
          const keys = Object.keys(car.pricing);
          if (keys.length > 0) return car.pricing[keys[0]];
      }
      return car.price24h || 0;
  };

  const displayedCars = isPartnerView 
      ? cars.filter(c => c.partnerId === currentUser.linkedPartnerId) 
      : cars;

  const handleExport = () => exportToCSV(displayedCars, 'Data_Armada_WiraRentCar');
  
  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          processCSVImport(file, (data) => {
              const importedCars: Car[] = data.map((d: any) => ({
                  ...d,
                  pricing: d.pricing ? (typeof d.pricing === 'string' ? JSON.parse(d.pricing) : d.pricing) : {}
              }));
              
              const merged = mergeData(cars, importedCars);
              setCars(merged);
              setStoredData('cars', merged);
              alert(`${importedCars.length} data mobil berhasil diproses!`);
          });
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{isPartnerView ? 'Unit Mobil Saya' : 'Armada Mobil'}</h2>
          <p className="text-slate-500">Kelola ketersediaan, foto, dan struktur biaya unit.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <div className="hidden md:flex gap-2 mr-2">
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportFile} />
                <button onClick={handleImportClick} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                    <Upload size={16} /> Import
                </button>
                <button onClick={handleExport} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                    <Download size={16} /> Export
                </button>
            </div>
            {!isPartnerView && (
                <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Plus size={18} /> Tambah Mobil
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedCars.map(car => (
            <div key={car.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                <div className="h-48 bg-slate-200 relative overflow-hidden">
                    <img src={car.image} alt={car.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {car.partnerId && !isPartnerView && (
                        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
                            <UserIcon size={12} /> Investor
                        </div>
                    )}
                </div>
                <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{car.name}</h3>
                            <p className="text-sm text-slate-500 font-mono bg-slate-100 inline-block px-2 py-0.5 rounded mt-1 border border-slate-200">{car.plate}</p>
                        </div>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-medium border border-indigo-100">{car.type}</span>
                    </div>
                    
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Harga Sewa</span>
                            <span className="font-bold text-indigo-600">Rp {getDisplayPrice(car).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Gaji Driver / hari</span>
                            <span className="font-bold text-slate-600">Rp {car.driverSalary?.toLocaleString('id-ID') || 0}</span>
                        </div>
                    </div>

                    {!isPartnerView && (
                        <div className="mt-6 flex gap-2">
                            <button onClick={() => openModal(car)} className="flex-1 py-2 text-sm text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                <Edit2 size={16} /> Edit
                            </button>
                            {isSuperAdmin && (
                                <button onClick={() => handleDelete(car.id)} className="flex-1 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                    <Trash2 size={16} /> Hapus
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        ))}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-800">{editingCar ? 'Edit Data Mobil' : 'Tambah Mobil Baru'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>

                  {/* TABS SELECTOR */}
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
                      <button onClick={() => setModalTab('umum')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${modalTab === 'umum' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                          <Info size={16}/> Umum
                      </button>
                      <button onClick={() => setModalTab('harga')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${modalTab === 'harga' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                          <DollarSign size={16}/> Harga & Skema
                      </button>
                  </div>
                  
                  <form onSubmit={handleSave} className="space-y-6 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                      {modalTab === 'umum' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-2">
                              <div className="space-y-4">
                                  <label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Foto Kendaraan</label>
                                  <div className="relative w-full aspect-video bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden hover:bg-slate-50 transition-colors group">
                                      {imagePreview ? (
                                          <>
                                              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                              <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><X size={16} /></button>
                                          </>
                                      ) : (
                                          <div className="text-center p-4 pointer-events-none">
                                              <Camera className="mx-auto h-10 w-10 text-slate-400 mb-2" />
                                              <p className="text-xs text-slate-500 font-bold uppercase">Klik Upload</p>
                                          </div>
                                      )}
                                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                                  </div>
                              </div>

                              <div className="space-y-4">
                                  <div>
                                      <label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Nama Mobil</label>
                                      <input required type="text" placeholder="Toyota Avanza" className="w-full border rounded-xl p-2.5 mt-1 font-bold" value={name} onChange={e => setName(e.target.value)} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Plat Nomor</label>
                                        <input required type="text" placeholder="B 1234 XX" className="w-full border rounded-xl p-2.5 mt-1 font-bold font-mono" value={plate} onChange={e => setPlate(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Kategori</label>
                                        <select className="w-full border rounded-xl p-2.5 mt-1 font-bold" value={type} onChange={e => setType(e.target.value)}>
                                            {settings.carCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                  </div>
                                  
                                  <div>
                                      <label className="block text-xs font-black uppercase text-slate-400 tracking-widest">Pemilik Unit</label>
                                      <select disabled={isPartnerView} className="w-full border rounded-xl p-2.5 mt-1 font-bold bg-slate-50" value={partnerId} onChange={e => setPartnerId(e.target.value)}>
                                          <option value="">INTERNAL KANTOR</option>
                                          {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </select>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                              {/* FIXED COSTS */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                                      <label className="block text-[10px] font-black uppercase text-purple-600 mb-1">Setoran ke Investor / hari</label>
                                      <div className="relative">
                                          <span className="absolute left-3 top-2 text-sm font-bold text-purple-400">Rp</span>
                                          <input type="number" className="w-full border-none bg-white rounded-xl p-2 pl-10 font-black text-purple-700" value={investorSetoran} onChange={e => setInvestorSetoran(Number(e.target.value))} placeholder="0" />
                                      </div>
                                      <p className="text-[9px] text-purple-500 mt-2 italic font-medium">*Nilai flat yang akan disetor ke mitra setiap hari unit tersewa.</p>
                                  </div>
                                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                                      <label className="block text-[10px] font-black uppercase text-orange-600 mb-1">Gaji Driver / hari</label>
                                      <div className="relative">
                                          <span className="absolute left-3 top-2 text-sm font-bold text-orange-400">Rp</span>
                                          <input type="number" className="w-full border-none bg-white rounded-xl p-2 pl-10 font-black text-orange-700" value={driverSalary} onChange={e => setDriverSalary(Number(e.target.value))} placeholder="150000" />
                                      </div>
                                      <p className="text-[9px] text-orange-500 mt-2 italic font-medium">*Gaji driver otomatis jika menggunakan jasa supir untuk unit ini.</p>
                                  </div>
                              </div>

                              {/* RENTAL PRICES */}
                              <div className="space-y-4">
                                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2"><List size={14}/> Harga Paket Sewa (Jual)</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    {settings.rentalPackages.map(pkg => (
                                        <div key={pkg}>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">{pkg}</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">Rp</span>
                                                <input type="number" className="w-full border rounded-xl p-2 pl-10 font-bold focus:ring-2 ring-indigo-100 outline-none" value={prices[pkg] || ''} onChange={e => handlePriceChange(pkg, Number(e.target.value))} placeholder="0" />
                                            </div>
                                        </div>
                                    ))}
                                  </div>
                              </div>
                          </div>
                      )}

                      <div className="flex gap-3 pt-6 border-t mt-auto">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
                          <button disabled={isUploading} type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-xl disabled:opacity-50 active:scale-95 transition-transform">
                              {isUploading ? 'Proses...' : 'Simpan Data'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default FleetPage;