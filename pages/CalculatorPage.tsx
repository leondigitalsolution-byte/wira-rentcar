
import React, { useState, useEffect } from 'react';
import { Car, HighSeason, AppSettings } from '../types';
import { getStoredData, DEFAULT_SETTINGS } from '../services/dataService';
import { Calendar, Clock, Car as CarIcon, Calculator, CheckCircle, Copy, RefreshCw, Zap, Tag, DollarSign, User, Fuel, Map, Bed } from 'lucide-react';

const CalculatorPage = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [highSeasons, setHighSeasons] = useState<HighSeason[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Inputs
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('08:00');
  const [selectedCarId, setSelectedCarId] = useState('');
  const [packageType, setPackageType] = useState('');
  
  // Options
  const [useDriver, setUseDriver] = useState(false);
  const [driverFeePerDay, setDriverFeePerDay] = useState(150000);
  const [driverOvernightFee, setDriverOvernightFee] = useState(0); // New: Biaya Inap
  
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [includeHighSeason, setIncludeHighSeason] = useState(true);

  // New: Operational & Fuel
  const [coverageFee, setCoverageFee] = useState(0);
  const [includeFuel, setIncludeFuel] = useState(false);
  const [distance, setDistance] = useState(0);
  const [fuelRatio, setFuelRatio] = useState(10); // 1:10
  const [fuelPrice, setFuelPrice] = useState(13250); // Default Pertamax approx

  // Results
  const [result, setResult] = useState({
      durationDays: 0,
      baseTotal: 0,
      driverTotal: 0,
      driverOvernightTotal: 0,
      highSeasonTotal: 0,
      coverageTotal: 0,
      fuelTotal: 0,
      subTotal: 0,
      grandTotal: 0
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadedCars = getStoredData<Car[]>('cars', []);
    setCars(loadedCars);
    setHighSeasons(getStoredData<HighSeason[]>('highSeasons', []));
    
    const loadedSettings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    setSettings(loadedSettings);
    
    if (loadedCars.length > 0) setSelectedCarId(loadedCars[0].id);
    if (loadedSettings.rentalPackages.length > 0) setPackageType(loadedSettings.rentalPackages[0]);
  }, []);

  useEffect(() => {
      calculateEstimate();
  }, [
      startDate, startTime, endDate, endTime, selectedCarId, packageType, 
      useDriver, driverFeePerDay, driverOvernightFee,
      deliveryFee, discount, includeHighSeason, 
      coverageFee, includeFuel, distance, fuelRatio, fuelPrice,
      cars, highSeasons
  ]);

  const calculateEstimate = () => {
      if (!startDate || !endDate || !selectedCarId) return;

      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);

      if (end <= start) {
          setResult({ 
              durationDays: 0, baseTotal: 0, driverTotal: 0, driverOvernightTotal: 0,
              highSeasonTotal: 0, coverageTotal: 0, fuelTotal: 0, subTotal: 0, grandTotal: 0 
          });
          return;
      }

      // Duration
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const days = Math.max(1, Math.ceil(diffHours / 24));

      // Car Price
      const car = cars.find(c => c.id === selectedCarId);
      let dailyPrice = 0;
      if (car) {
          dailyPrice = (car.pricing && car.pricing[packageType]) ? car.pricing[packageType] : (car.price24h || 0);
      }
      
      const baseTotal = dailyPrice * days;

      // Driver
      const driverTotal = useDriver ? (driverFeePerDay * days) : 0;
      const driverOvernightTotal = useDriver ? Number(driverOvernightFee) : 0;

      // High Season
      let hsTotal = 0;
      if (includeHighSeason) {
          highSeasons.forEach(hs => {
              const hsStart = new Date(hs.startDate);
              const hsEnd = new Date(hs.endDate);
              // Check overlap
              if (start < hsEnd && end > hsStart) {
                  hsTotal += hs.priceIncrease * days;
              }
          });
      }

      // Fuel Calculation
      let fuelTotal = 0;
      if (includeFuel && distance > 0 && fuelRatio > 0) {
          fuelTotal = (distance / fuelRatio) * fuelPrice;
      }

      // Coverage
      const coverageTotal = Number(coverageFee);

      const subTotal = baseTotal + driverTotal + driverOvernightTotal + hsTotal + deliveryFee + coverageTotal + fuelTotal;
      const grandTotal = subTotal - discount;

      setResult({
          durationDays: days,
          baseTotal,
          driverTotal,
          driverOvernightTotal,
          highSeasonTotal: hsTotal,
          coverageTotal,
          fuelTotal,
          subTotal,
          grandTotal
      });
  };

  const handleCopy = () => {
      const car = cars.find(c => c.id === selectedCarId);
      const fuelLiters = (distance > 0 && fuelRatio > 0) ? (distance / fuelRatio).toFixed(1) : '0';

      const text = `*Estimasi Harga Sewa - ${settings.companyName}*
---------------------------
🚗 *Unit:* ${car?.name}
📅 *Tgl:* ${new Date(startDate).toLocaleDateString('id-ID')} s/d ${new Date(endDate).toLocaleDateString('id-ID')}
⏱ *Durasi:* ${result.durationDays} Hari
📦 *Paket:* ${packageType}

Rincian:
- Sewa Unit: Rp ${result.baseTotal.toLocaleString('id-ID')}
${result.driverTotal > 0 ? `- Jasa Driver: Rp ${result.driverTotal.toLocaleString('id-ID')}` : ''}
${result.driverOvernightTotal > 0 ? `- Inap Driver: Rp ${result.driverOvernightTotal.toLocaleString('id-ID')}` : ''}
${result.highSeasonTotal > 0 ? `- High Season: Rp ${result.highSeasonTotal.toLocaleString('id-ID')}` : ''}
${result.coverageTotal > 0 ? `- Coverage Area: Rp ${result.coverageTotal.toLocaleString('id-ID')}` : ''}
${result.fuelTotal > 0 ? `- Est. BBM (${distance}km, ${fuelLiters}L): Rp ${result.fuelTotal.toLocaleString('id-ID')}` : ''}
${deliveryFee > 0 ? `- Antar/Jemput: Rp ${deliveryFee.toLocaleString('id-ID')}` : ''}
${discount > 0 ? `- Diskon: (Rp ${discount.toLocaleString('id-ID')})` : ''}

*TOTAL EST.: Rp ${result.grandTotal.toLocaleString('id-ID')}*
---------------------------
_Harga dapat berubah sewaktu-waktu._`;

      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const selectedCar = cars.find(c => c.id === selectedCarId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Kalkulator Estimasi</h2>
          <p className="text-slate-500">Hitung cepat biaya sewa, BBM, dan operasional.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* INPUT FORM */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              
              {/* SECTION 1: UNIT & TIME */}
              <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><CarIcon size={18} className="text-indigo-600"/> Kendaraan & Waktu</h3>
                  
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit Mobil</label>
                      <select className="w-full border rounded-xl p-3 font-bold text-slate-700 bg-slate-50" value={selectedCarId} onChange={e => setSelectedCarId(e.target.value)}>
                          {cars.map(c => (
                              <option key={c.id} value={c.id}>{c.name} - {c.plate}</option>
                          ))}
                      </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mulai</label>
                          <div className="flex flex-col gap-2">
                              <input type="date" className="w-full border rounded-lg p-2 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                              <input type="time" className="w-full border rounded-lg p-2 text-sm" value={startTime} onChange={e => setStartTime(e.target.value)} />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selesai</label>
                          <div className="flex flex-col gap-2">
                              <input type="date" className="w-full border rounded-lg p-2 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                              <input type="time" className="w-full border rounded-lg p-2 text-sm" value={endTime} onChange={e => setEndTime(e.target.value)} />
                          </div>
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Paket Sewa</label>
                      <select className="w-full border rounded-lg p-2.5 text-sm font-medium" value={packageType} onChange={e => setPackageType(e.target.value)}>
                          {settings.rentalPackages.map(pkg => (
                              <option key={pkg} value={pkg}>{pkg}</option>
                          ))}
                      </select>
                  </div>
              </div>

              {/* SECTION 2: ADDONS */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><Tag size={18} className="text-indigo-600"/> Tambahan & Biaya Lain</h3>
                  
                  {/* Driver Config */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <input type="checkbox" id="useDriver" className="w-5 h-5 rounded text-indigo-600" checked={useDriver} onChange={e => setUseDriver(e.target.checked)} />
                              <label htmlFor="useDriver" className="text-sm font-bold text-slate-700 cursor-pointer">Pakai Driver?</label>
                          </div>
                          {useDriver && (
                              <div className="w-32 relative">
                                  <span className="absolute left-2 top-1.5 text-xs text-slate-400">Rp/Hari</span>
                                  <input type="number" className="w-full border rounded p-1.5 pl-14 text-sm text-right font-bold" value={driverFeePerDay} onChange={e => setDriverFeePerDay(Number(e.target.value))} />
                              </div>
                          )}
                      </div>
                      {useDriver && (
                          <div className="flex items-center justify-between pl-7 border-t border-slate-200 pt-2 animate-fade-in">
                              <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Bed size={14}/> Biaya Inap (Total)</label>
                              <div className="w-32 relative">
                                  <span className="absolute left-2 top-1.5 text-xs text-slate-400">Rp</span>
                                  <input type="number" className="w-full border rounded p-1.5 pl-10 text-sm text-right font-bold" value={driverOvernightFee} onChange={e => setDriverOvernightFee(Number(e.target.value))} />
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Antar/Jemput (Rp)</label>
                          <input type="number" className="w-full border rounded-lg p-2 text-sm" value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value))} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Diskon (Rp)</label>
                          <input type="number" className="w-full border rounded-lg p-2 text-sm" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                      </div>
                  </div>

                  <div className="flex items-center gap-2">
                      <input type="checkbox" id="hs" className="w-4 h-4 rounded text-orange-500" checked={includeHighSeason} onChange={e => setIncludeHighSeason(e.target.checked)} />
                      <label htmlFor="hs" className="text-xs text-slate-600 cursor-pointer">Hitung High Season Otomatis (Jika tanggal masuk range)</label>
                  </div>
              </div>

              {/* SECTION 3: FUEL & COVERAGE */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><Fuel size={18} className="text-indigo-600"/> Operasional & BBM</h3>
                  
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Map size={14}/> Biaya Coverage Area / Luar Kota</label>
                      <div className="relative">
                          <span className="absolute left-3 top-2 text-sm text-slate-400 font-bold">Rp</span>
                          <input type="number" className="w-full border rounded-lg p-2 pl-10 text-sm font-bold" value={coverageFee} onChange={e => setCoverageFee(Number(e.target.value))} placeholder="0" />
                      </div>
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 space-y-3">
                      <div className="flex items-center gap-2">
                          <input type="checkbox" id="fuel" className="w-5 h-5 rounded text-orange-600" checked={includeFuel} onChange={e => setIncludeFuel(e.target.checked)} />
                          <label htmlFor="fuel" className="text-sm font-bold text-slate-700 cursor-pointer">Hitung Estimasi BBM?</label>
                      </div>
                      
                      {includeFuel && (
                          <div className="grid grid-cols-3 gap-3 animate-fade-in">
                              <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jarak (KM)</label>
                                  <input type="number" className="w-full border rounded p-1.5 text-sm" value={distance} onChange={e => setDistance(Number(e.target.value))} placeholder="0" />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ratio (1:X)</label>
                                  <input type="number" className="w-full border rounded p-1.5 text-sm" value={fuelRatio} onChange={e => setFuelRatio(Number(e.target.value))} placeholder="10" />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Harga/Liter</label>
                                  <input type="number" className="w-full border rounded p-1.5 text-sm" value={fuelPrice} onChange={e => setFuelPrice(Number(e.target.value))} placeholder="13500" />
                              </div>
                              <div className="col-span-3 text-right">
                                  <p className="text-xs text-orange-700 font-bold">
                                      Est. Konsumsi: {(distance && fuelRatio) ? (distance/fuelRatio).toFixed(1) : 0} Liter
                                  </p>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* RESULT CARD */}
          <div className="flex flex-col gap-6">
              <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden flex-1">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-20 transform translate-x-20 -translate-y-20"></div>
                  
                  <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                          <h4 className="text-indigo-300 font-bold tracking-widest text-xs uppercase mb-6">Rincian Estimasi Biaya</h4>
                          
                          <div className="flex items-center gap-4 mb-6">
                              <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                                  {selectedCar ? <img src={selectedCar.image} className="w-full h-full object-cover rounded-xl opacity-90" /> : <CarIcon size={32} />}
                              </div>
                              <div>
                                  <h2 className="text-2xl font-bold">{selectedCar?.name || 'Pilih Mobil'}</h2>
                                  <p className="text-slate-400 text-sm">{selectedCar?.plate} • {result.durationDays} Hari</p>
                              </div>
                          </div>

                          <div className="space-y-3 text-sm border-t border-white/10 pt-4 mb-6">
                              <div className="flex justify-between text-slate-300">
                                  <span>Sewa Unit</span>
                                  <span>Rp {result.baseTotal.toLocaleString('id-ID')}</span>
                              </div>
                              {result.driverTotal > 0 && (
                                  <div className="flex justify-between text-slate-300">
                                      <span>Jasa Driver</span>
                                      <span>Rp {result.driverTotal.toLocaleString('id-ID')}</span>
                                  </div>
                              )}
                              {result.driverOvernightTotal > 0 && (
                                  <div className="flex justify-between text-slate-300">
                                      <span>Biaya Inap Driver</span>
                                      <span>Rp {result.driverOvernightTotal.toLocaleString('id-ID')}</span>
                                  </div>
                              )}
                              {result.highSeasonTotal > 0 && (
                                  <div className="flex justify-between text-orange-300">
                                      <span>Surcharge High Season</span>
                                      <span>Rp {result.highSeasonTotal.toLocaleString('id-ID')}</span>
                                  </div>
                              )}
                              {result.coverageTotal > 0 && (
                                  <div className="flex justify-between text-slate-300">
                                      <span>Coverage Area</span>
                                      <span>Rp {result.coverageTotal.toLocaleString('id-ID')}</span>
                                  </div>
                              )}
                              {result.fuelTotal > 0 && (
                                  <div className="flex justify-between text-orange-300">
                                      <span>Estimasi BBM</span>
                                      <span>Rp {result.fuelTotal.toLocaleString('id-ID')}</span>
                                  </div>
                              )}
                              {deliveryFee > 0 && (
                                  <div className="flex justify-between text-slate-300">
                                      <span>Biaya Antar/Jemput</span>
                                      <span>Rp {deliveryFee.toLocaleString('id-ID')}</span>
                                  </div>
                              )}
                              {discount > 0 && (
                                  <div className="flex justify-between text-green-400 font-bold">
                                      <span>Potongan / Diskon</span>
                                      <span>- Rp {discount.toLocaleString('id-ID')}</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div>
                          <div className="flex justify-between items-end border-t-2 border-white/20 pt-4">
                              <span className="text-sm font-bold text-slate-400">TOTAL ESTIMASI</span>
                              <span className="text-3xl font-black text-white">Rp {result.grandTotal.toLocaleString('id-ID')}</span>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-3">
                  <button onClick={handleCopy} className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${copied ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      {copied ? <CheckCircle size={20}/> : <Copy size={20}/>}
                      {copied ? 'Tersalin!' : 'Copy Ringkasan WA'}
                  </button>
                  <button onClick={() => window.location.reload()} className="px-6 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                      <RefreshCw size={20} />
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default CalculatorPage;
