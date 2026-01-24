
import React, { useState, useEffect, useRef } from 'react';
import { Vendor, Booking, Transaction } from '../types';
import { getStoredData, setStoredData, exportToCSV, processCSVImport, mergeData, compressImage } from '../services/dataService';
import { generateMonthlyReportPDF } from '../services/pdfService';
import { Plus, Trash2, Phone, Edit2, X, Image as ImageIcon, History, Calendar, CheckCircle, Wallet, Download, Upload, Filter, Building, MapPin, DollarSign, FileText } from 'lucide-react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

const VendorsPage = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [historyVendor, setHistoryVendor] = useState<Vendor | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'bookings' | 'payments'>('bookings');

  // History Filter State
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVendors(getStoredData<Vendor[]>('vendors', []));
    setBookings(getStoredData<Booking[]>('bookings', []));
    setTransactions(getStoredData<Transaction[]>('transactions', []));
  }, []);

  const openModal = (vendor?: Vendor) => {
    if (vendor) {
        setEditingVendor(vendor);
        setName(vendor.name);
        setPhone(vendor.phone);
        setAddress(vendor.address);
        setImagePreview(vendor.image || null);
    } else {
        setEditingVendor(null);
        setName('');
        setPhone('');
        setAddress('');
        setImagePreview(null);
    }
    setIsModalOpen(true);
  };

  const openHistoryModal = (vendor: Vendor) => {
      setHistoryVendor(vendor);
      setActiveHistoryTab('bookings');

      // Default Filter: Current Month
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      setHistoryStartDate(firstDay);
      setHistoryEndDate(lastDay);

      setIsHistoryModalOpen(true);
  }

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

    const newVendor: Vendor = {
        id: editingVendor ? editingVendor.id : Date.now().toString(),
        name,
        phone,
        address,
        image: finalImage
    };

    let updatedVendors;
    if (editingVendor) {
        updatedVendors = vendors.map(v => v.id === editingVendor.id ? newVendor : v);
    } else {
        updatedVendors = [...vendors, newVendor];
    }

    setVendors(updatedVendors);
    setStoredData('vendors', updatedVendors);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Hapus data vendor ini secara permanen?')) {
          setVendors(prev => {
              const updated = prev.filter(v => v.id !== id);
              setStoredData('vendors', updated);
              return updated;
          });
      }
  };

  // Get bookings where we rented from this vendor
  const getVendorBookings = () => {
      if(!historyVendor) return [];
      
      let filtered = bookings.filter(b => b.isRentToRent && b.vendorId === historyVendor.id);

      // Apply Date Filter
      if (historyStartDate || historyEndDate) {
          filtered = filtered.filter(b => {
              const date = b.startDate.split('T')[0];
              const start = historyStartDate || '0000-00-00';
              const end = historyEndDate || '9999-12-31';
              return date >= start && date <= end;
          });
      }

      return filtered.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  };

  // Get expense transactions paid to this vendor
  const getVendorPayments = () => {
      if(!historyVendor) return [];
      let filtered = transactions.filter(t => (t.category === 'Sewa Vendor' || (t.category === 'Setor Mitra' && t.relatedId === historyVendor.id)) && t.relatedId === historyVendor.id);

      // Apply Date Filter
      if (historyStartDate || historyEndDate) {
          filtered = filtered.filter(t => {
              const date = t.date.split('T')[0];
              const start = historyStartDate || '0000-00-00';
              const end = historyEndDate || '9999-12-31';
              return date >= start && date <= end;
          });
      }

      return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Redirect to Expenses Page with state to trigger modal opening for payment
  const handlePayTransaction = (id: string) => {
      navigate('/expenses', { state: { action: 'pay', transactionId: id } });
  };

  const handleDownloadReport = () => {
      if (!historyVendor) return;
      // Use the start date's month for the PDF header, or current month if filter is cleared
      const month = historyStartDate ? historyStartDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
      
      generateMonthlyReportPDF(
          'Vendor',
          historyVendor,
          month,
          getVendorPayments(),
          getVendorBookings()
      );
  };

  const handleExport = () => exportToCSV(vendors, 'Data_Vendor_BRC');
  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          processCSVImport(file, (data) => {
              const imported: Vendor[] = data.map((d: any) => d as Vendor);
              const merged = mergeData(vendors, imported);
              
              setVendors(merged);
              setStoredData('vendors', merged);
              alert('Data vendor berhasil diproses!');
          });
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Manajemen Vendor</h2>
          <p className="text-slate-500">Kelola data rental rekanan (Vendor) untuk unit eksternal.</p>
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
            <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Plus size={18} /> Tambah Vendor
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map(vendor => {
              const activeRents = bookings.filter(b => b.isRentToRent && b.vendorId === vendor.id && b.status === 'Active').length;

              return (
                <div key={vendor.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <img src={vendor.image || `https://i.pravatar.cc/150?u=${vendor.id}`} alt={vendor.name} className="w-14 h-14 rounded-full bg-slate-100 object-cover border border-slate-200" />
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{vendor.name}</h3>
                                <div className="flex items-center text-slate-500 text-sm mt-1 gap-1">
                                    <Phone size={14} /> {vendor.phone}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-1">
                                <button onClick={() => openModal(vendor)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded border hover:text-indigo-600"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(vendor.id)} className="p-1.5 text-slate-500 hover:bg-red-50 rounded border hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Unit Sedang Dipinjam</p>
                                <p className="font-bold text-xl">{activeRents}</p>
                            </div>
                            <Building size={24} className="text-slate-300" />
                        </div>
                        {vendor.address && (
                            <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600 flex items-start gap-1">
                                <MapPin size={12} className="mt-0.5 flex-shrink-0" /> {vendor.address}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <button onClick={() => openHistoryModal(vendor)} className="w-full py-2 text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium">
                            <History size={16} /> Riwayat & Tagihan
                        </button>
                    </div>
                </div>
              );
          })}
      </div>

       {/* Modal Create/Edit */}
       {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">{editingVendor ? 'Edit Vendor' : 'Tambah Vendor Baru'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-6">
                      <div className="flex flex-col items-center mb-4">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Foto / Logo {isUploading && '(Mengompres...)'}</label>
                          <div className="relative w-28 h-28 bg-slate-100 rounded-full border-4 border-slate-50 flex items-center justify-center overflow-hidden group">
                              {imagePreview ? (
                                  <>
                                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                      <button 
                                          type="button"
                                          onClick={handleRemoveImage}
                                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                          title="Hapus Foto"
                                      >
                                          <X size={20} />
                                      </button>
                                  </>
                              ) : (
                                  <div className="text-center text-slate-400">
                                      <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                                      <span className="text-[10px]">Foto</span>
                                  </div>
                              )}
                              <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  onChange={handleImageUpload}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700">Nama Rental (Vendor)</label>
                          <input required type="text" className="w-full border rounded-lg p-2.5 mt-1" value={name} onChange={e => setName(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700">No. Telepon / WA</label>
                          <input required type="tel" className="w-full border rounded-lg p-2.5 mt-1" value={phone} onChange={e => setPhone(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Alamat</label>
                          <textarea className="w-full border rounded-lg p-2.5 mt-1" value={address} onChange={e => setAddress(e.target.value)} rows={2} />
                      </div>

                      <div className="flex gap-3 mt-6 pt-4 border-t">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium">Batal</button>
                          <button disabled={isUploading} type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 disabled:opacity-50">
                            {isUploading ? 'Memproses...' : 'Simpan'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* HISTORY MODAL */}
      {isHistoryModalOpen && historyVendor && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl w-full max-w-3xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-start mb-6">
                         <div className="flex items-center gap-4">
                            <img src={historyVendor.image} alt={historyVendor.name} className="w-14 h-14 rounded-full bg-slate-200 object-cover border-2 border-slate-100" />
                            <div>
                                <h3 className="font-bold text-xl text-slate-800">{historyVendor.name}</h3>
                                <p className="text-sm text-slate-500">Detail Riwayat Pinjaman</p>
                            </div>
                         </div>
                         <div className="flex gap-2">
                             <button onClick={handleDownloadReport} className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-slate-900">
                                 <FileText size={16}/> Download Laporan
                             </button>
                             <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                         </div>
                    </div>

                    <div className="flex gap-2 border-b border-slate-100 mb-4">
                        <button 
                            onClick={() => setActiveHistoryTab('bookings')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeHistoryTab === 'bookings' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Unit Dipinjam
                        </button>
                        <button 
                            onClick={() => setActiveHistoryTab('payments')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeHistoryTab === 'payments' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Riwayat Pembayaran
                        </button>
                    </div>
                    
                    {/* Filter Tanggal */}
                    <div className="flex items-center gap-2 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <Filter size={14} className="text-slate-500 ml-1" />
                        <span className="text-xs font-bold text-slate-700">Filter Tanggal:</span>
                        <input 
                            type="date" 
                            className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                            value={historyStartDate} 
                            onChange={e => setHistoryStartDate(e.target.value)} 
                        />
                        <span className="text-xs text-slate-400">-</span>
                        <input 
                            type="date" 
                            className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                            value={historyEndDate} 
                            onChange={e => setHistoryEndDate(e.target.value)} 
                        />
                        {(historyStartDate || historyEndDate) && (
                            <button onClick={() => {setHistoryStartDate(''); setHistoryEndDate('')}} className="text-xs text-red-500 hover:underline ml-auto mr-2">Reset</button>
                        )}
                    </div>

                    <div className="min-h-[300px]">
                        {activeHistoryTab === 'bookings' && (
                            <div className="space-y-3">
                                {getVendorBookings().length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 italic">Belum ada riwayat peminjaman unit dari vendor ini.</div>
                                ) : (
                                    getVendorBookings().map(booking => {
                                        return (
                                            <div key={booking.id} className="p-3 border rounded-lg bg-slate-50 flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold bg-white border px-1.5 py-0.5 rounded text-slate-700">{booking.id.slice(0,6)}</span>
                                                        <span className="text-sm font-bold text-slate-800">{booking.customerName}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-600 flex items-center gap-2">
                                                        <span className="flex items-center gap-1"><Calendar size={10}/> {new Date(booking.startDate).toLocaleDateString('id-ID')}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Unit Luar: {booking.externalCarName} ({booking.externalCarPlate})
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-slate-500 mb-1">Fee Vendor</div>
                                                    <div className="font-bold text-red-600 text-sm">Rp {booking.vendorFee?.toLocaleString('id-ID') || 0}</div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 inline-block ${booking.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}

                        {activeHistoryTab === 'payments' && (
                            <div className="space-y-3">
                                {getVendorPayments().length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 italic">Belum ada riwayat pembayaran ke vendor ini.</div>
                                ) : (
                                    getVendorPayments().map(tx => (
                                        <div key={tx.id} className="p-3 border rounded-lg bg-white flex justify-between items-center">
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{tx.description}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                                    <span>{new Date(tx.date).toLocaleDateString('id-ID')}</span>
                                                    <span className="px-1.5 py-0.5 bg-slate-100 rounded">{tx.category}</span>
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
                                                        <button 
                                                            onClick={() => handlePayTransaction(tx.id)}
                                                            className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-[10px] hover:bg-green-700 transition-colors cursor-pointer"
                                                        >
                                                            <Wallet size={10}/> Bayar Sekarang
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

export default VendorsPage;
