import React, { useState, useEffect, useRef } from 'react';
import { Driver, User, Booking, Car, Transaction, BookingStatus } from '../types';
import { getStoredData, setStoredData, exportToCSV, processCSVImport, mergeData, compressImage } from '../services/dataService';
import { generateMonthlyReportPDF } from '../services/pdfService';
import { Plus, Trash2, Edit2, Phone, DollarSign, X, History, MapPin, Calendar, Clock, CheckCircle, Download, Upload, FileText, Wallet, Filter, Camera, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
    currentUser: User;
}

const DriversPage: React.FC<Props> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [historyDriver, setHistoryDriver] = useState<Driver | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'trips' | 'expenses'>('trips');
  const [isUploading, setIsUploading] = useState(false);

  // History Filter State
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isDriverView = currentUser.role === 'driver';

  useEffect(() => {
    setDrivers(getStoredData<Driver[]>('drivers', []));
    setBookings(getStoredData<Booking[]>('bookings', []));
    setCars(getStoredData<Car[]>('cars', []));
    setTransactions(getStoredData<Transaction[]>('transactions', []));
  }, []);

  const openModal = (driver?: Driver) => {
    if (driver) {
        setEditingDriver(driver);
        setName(driver.name);
        setPhone(driver.phone);
        setImagePreview(driver.image);
    } else {
        setEditingDriver(null);
        setName('');
        setPhone('');
        setImagePreview(null);
    }
    setIsModalOpen(true);
  };

  const openHistoryModal = (driver: Driver) => {
      setHistoryDriver(driver);
      setActiveHistoryTab('trips');
      
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      setHistoryStartDate(firstDay);
      setHistoryEndDate(lastDay);

      setIsHistoryModalOpen(true);
  };

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalImage = imagePreview || `https://i.pravatar.cc/150?u=${Date.now()}`;

    const newDriver: Driver = {
        id: editingDriver ? editingDriver.id : Date.now().toString(),
        name,
        phone,
        dailyRate: editingDriver ? editingDriver.dailyRate : 0, // dailyRate tetap ada di objek tapi tidak di UI
        status: 'Active',
        image: finalImage
    };

    let updatedDrivers;
    if (editingDriver) {
        updatedDrivers = drivers.map(d => d.id === editingDriver.id ? newDriver : d);
    } else {
        updatedDrivers = [...drivers, newDriver];
    }

    setDrivers(updatedDrivers);
    setStoredData('drivers', updatedDrivers);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Hapus data driver ini secara permanen?')) {
          setDrivers(prev => {
              const updated = prev.filter(d => d.id !== id);
              setStoredData('drivers', updated);
              return updated;
          });
      }
  };

  const driverBookingsRaw = historyDriver ? bookings.filter(b => b.driverId === historyDriver.id && b.status !== BookingStatus.CANCELLED).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()) : [];
  
  const driverExpensesRaw = historyDriver ? transactions.filter(t => 
      t.type === 'Expense' && 
      (t.relatedId === historyDriver.id || t.description.toLowerCase().includes(historyDriver.name.toLowerCase())) &&
      (t.category === 'Reimbursement' || t.category === 'BBM' || t.category === 'Tol/Parkir' || t.category === 'Gaji')
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  const filteredDriverBookings = driverBookingsRaw.filter(b => {
      if (!historyStartDate && !historyEndDate) return true;
      const date = b.startDate.split('T')[0];
      return date >= (historyStartDate || '0000-00-00') && date <= (historyEndDate || '9999-12-31');
  });

  const filteredDriverExpenses = driverExpensesRaw.filter(t => {
      if (!historyStartDate && !historyEndDate) return true;
      const date = t.date.split('T')[0];
      return date >= (historyStartDate || '0000-00-00') && date <= (historyEndDate || '9999-12-31');
  });

  const handlePayTransaction = (id: string) => {
      navigate('/expenses', { state: { action: 'pay', transactionId: id } });
  };

  const handleDownloadReport = () => {
      if (!historyDriver) return;
      const month = historyStartDate ? historyStartDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
      generateMonthlyReportPDF('Driver', historyDriver, month, filteredDriverExpenses, filteredDriverBookings);
  };

  const handleExportExcel = () => {
      if (!historyDriver) return;
      const data = activeHistoryTab === 'trips' ? filteredDriverBookings.map(b => ({
          ID: b.id,
          Tanggal: new Date(b.startDate).toLocaleDateString('id-ID'),
          Pelanggan: b.customerName,
          Tujuan: b.destination,
          Status: b.status
      })) : filteredDriverExpenses.map(t => ({
          Tanggal: new Date(t.date).toLocaleDateString('id-ID'),
          Kategori: t.category,
          Deskripsi: t.description,
          Nominal: t.amount,
          Status: t.status
      }));
      exportToCSV(data, `Laporan_Driver_${historyDriver.name}_${activeHistoryTab}`);
  };

  const displayedDrivers = isDriverView 
    ? drivers.filter(d => d.id === currentUser.linkedDriverId)
    : drivers;

  const handleExport = () => exportToCSV(drivers, 'Data_Driver_WiraRentCar');
  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          processCSVImport(file, (data) => {
              const imported: Driver[] = data.map((d: any) => d as Driver);
              const merged = mergeData(drivers, imported);
              setDrivers(merged);
              setStoredData('drivers', merged);
              alert('Data driver berhasil diproses!');
          });
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{isDriverView ? 'Profil Saya' : 'Manajemen Driver'}</h2>
          <p className="text-slate-500">{isDriverView ? 'Informasi profil dan statistik kinerja Anda.' : 'Kelola data supir, foto dan status driver.'}</p>
        </div>
        {!isDriverView && (
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
                <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <Plus size={18} /> Tambah Driver
                </button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedDrivers.map(driver => (
            <div key={driver.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow p-5">
                <div className="flex items-center gap-4 mb-4">
                    <img src={driver.image} alt={driver.name} className="w-16 h-16 rounded-full bg-slate-200 object-cover border-2 border-slate-100" />
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">{driver.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                             <Phone size={14} /> {driver.phone}
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2">
                    <button onClick={() => openHistoryModal(driver)} className="w-full py-2 text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium">
                        <History size={16} /> Riwayat & Detail
                    </button>
                    {!isDriverView && (
                        <div className="flex gap-2">
                            <button onClick={() => openModal(driver)} className="flex-1 py-2 text-sm text-slate-600 hover:bg-slate-50 border rounded-lg flex items-center justify-center gap-2">
                                <Edit2 size={16} /> Edit
                            </button>
                            {isSuperAdmin && (
                                <button onClick={() => handleDelete(driver.id)} className="flex-1 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-100 rounded-lg flex items-center justify-center gap-2">
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
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-slate-800">{editingDriver ? 'Edit Driver' : 'Tambah Driver Baru'}</h3>
                     <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-6">
                      <div className="flex flex-col items-center mb-6">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Foto Profil {isUploading && '(Mengompres...)'}</label>
                          <div className="relative w-32 h-32 bg-slate-100 rounded-full border-4 border-slate-50 flex items-center justify-center overflow-hidden group">
                              {imagePreview ? (
                                  <>
                                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                      <button type="button" onClick={handleRemoveImage} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white" title="Hapus Foto">
                                          <X size={24} />
                                      </button>
                                  </>
                              ) : (
                                  <div className="text-center text-slate-400">
                                      <Camera className="w-10 h-10 mx-auto mb-1" />
                                      <span className="text-[10px]">Ambil Foto</span>
                                  </div>
                              )}
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Nama Lengkap</label>
                          <input required type="text" className="w-full border rounded-lg p-2.5 mt-1" value={name} onChange={e => setName(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Nomor Telepon</label>
                          <input required type="tel" className="w-full border rounded-lg p-2.5 mt-1" value={phone} onChange={e => setPhone(e.target.value)} />
                      </div>
                      
                      <div className="flex gap-3 mt-6 pt-4 border-t">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium">Batal</button>
                          <button disabled={isUploading} type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50">
                              {isUploading ? 'Memproses...' : 'Simpan'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {isHistoryModalOpen && historyDriver && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                         <div className="flex items-center gap-4">
                            <img src={historyDriver.image} alt={historyDriver.name} className="w-14 h-14 rounded-full bg-slate-200 object-cover border-2 border-slate-100" />
                            <div>
                                <h3 className="font-bold text-xl text-slate-800">{historyDriver.name}</h3>
                                <p className="text-sm text-slate-500">Detail Riwayat & Transaksi</p>
                            </div>
                         </div>
                         <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={handleExportExcel} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700">
                                 <FileSpreadsheet size={16}/> Excel
                            </button>
                            <button onClick={handleDownloadReport} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-900">
                                 <FileText size={16}/> PDF
                            </button>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                         </div>
                    </div>

                    <div className="flex gap-2 border-b border-slate-100 mb-4">
                        <button onClick={() => setActiveHistoryTab('trips')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeHistoryTab === 'trips' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Riwayat Perjalanan</button>
                        <button onClick={() => setActiveHistoryTab('expenses')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeHistoryTab === 'expenses' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Reimbursement & Gaji</button>
                    </div>

                    <div className="flex items-center gap-2 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <Filter size={14} className="text-slate-500 ml-1" />
                        <span className="text-xs font-bold text-slate-700">Filter Tanggal:</span>
                        <input type="date" className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} />
                        <span className="text-xs text-slate-400">-</span>
                        <input type="date" className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} />
                        {(historyStartDate || historyEndDate) && (
                            <button onClick={() => {setHistoryStartDate(''); setHistoryEndDate('')}} className="text-xs text-red-500 hover:underline ml-auto mr-2">Reset</button>
                        )}
                    </div>

                    <div className="min-h-[300px]">
                        {activeHistoryTab === 'trips' && (
                            <div className="space-y-3">
                                {filteredDriverBookings.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 italic">Belum ada riwayat perjalanan pada periode ini.</div>
                                ) : (
                                    filteredDriverBookings.map(booking => {
                                        const car = cars.find(c => c.id === booking.carId);
                                        return (
                                            <div key={booking.id} className="p-3 border rounded-lg bg-slate-50 flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold bg-white border px-1.5 py-0.5 rounded text-slate-700">{booking.id.slice(0,6)}</span>
                                                        <span className="text-sm font-bold text-slate-800">{booking.customerName}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-600 flex items-center gap-2">
                                                        <span className="flex items-center gap-1"><Calendar size={10}/> {new Date(booking.startDate).toLocaleDateString('id-ID')}</span>
                                                        <span>-</span>
                                                        <span className="flex items-center gap-1"><MapPin size={10}/> {booking.destination}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">Unit: {car?.name} ({car?.plate})</div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${booking.status === BookingStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}

                        {activeHistoryTab === 'expenses' && (
                            <div className="space-y-3">
                                {filteredDriverExpenses.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 italic">Belum ada riwayat reimbursement/gaji pada periode ini.</div>
                                ) : (
                                    filteredDriverExpenses.map(tx => (
                                        <div key={tx.id} className="p-3 border rounded-lg bg-white flex justify-between items-center">
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{tx.description}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                                    <span>{new Date(tx.date).toLocaleDateString('id-ID')}</span>
                                                    <span className={`px-1.5 py-0.5 bg-slate-100 rounded ${tx.category === 'Gaji' ? 'bg-green-100 text-green-700 font-bold' : ''}`}>{tx.category}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-red-600">Rp {tx.amount.toLocaleString('id-ID')}</div>
                                                <div className="mt-1 flex justify-end gap-2 items-center">
                                                    {tx.status === 'Paid' ? (
                                                        <span className="flex items-center justify-end gap-1 text-[10px] text-green-600 font-bold">
                                                            <CheckCircle size={10}/> Sudah Dibayarkan
                                                        </span>
                                                    ) : (
                                                        <button onClick={() => handlePayTransaction(tx.id)} className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-[10px] hover:bg-green-700 transition-colors cursor-pointer">
                                                            <Wallet size={10}/> Bayar & Upload
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
               </div>
          </div>
      )}
    </div>
  );
};

export default DriversPage;