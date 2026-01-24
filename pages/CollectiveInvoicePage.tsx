
import React, { useState, useEffect } from 'react';
import { Booking, Customer, Car, AppSettings } from '../types';
import { getStoredData, DEFAULT_SETTINGS } from '../services/dataService';
import { generateCollectiveInvoicePDF } from '../services/pdfService';
import { FileText, Search, Calendar, Car as CarIcon, CheckSquare, Square, Printer, Filter } from 'lucide-react';

const CollectiveInvoicePage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setCustomers(getStoredData<Customer[]>('customers', []));
    setBookings(getStoredData<Booking[]>('bookings', []));
    setCars(getStoredData<Car[]>('cars', []));
  }, []);

  // Filter bookings based on selected customer
  const customerBookings = bookings.filter(b => 
      b.customerId === selectedCustomerId && 
      b.status !== 'Cancelled'
  ).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // Filter Customer Dropdown
  const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
  );

  const handleToggleBooking = (id: string) => {
      setSelectedBookingIds(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const handleSelectAll = () => {
      if (selectedBookingIds.length === customerBookings.length) {
          setSelectedBookingIds([]);
      } else {
          setSelectedBookingIds(customerBookings.map(b => b.id));
      }
  };

  const handleGeneratePDF = () => {
      if (!selectedCustomerId || selectedBookingIds.length === 0) return;
      
      const customer = customers.find(c => c.id === selectedCustomerId);
      const selectedBookings = bookings.filter(b => selectedBookingIds.includes(b.id));
      
      if (customer && selectedBookings.length > 0) {
          generateCollectiveInvoicePDF(customer, selectedBookings, cars);
      }
  };

  const selectedTotal = bookings
      .filter(b => selectedBookingIds.includes(b.id))
      .reduce((sum, b) => sum + b.totalPrice, 0);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Invoice Kolektif</h2>
          <p className="text-slate-500">Gabungkan beberapa transaksi sewa menjadi satu tagihan (Invoice).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Customer Selection */}
          <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Search size={18} className="text-indigo-600"/> Pilih Pelanggan
                  </h3>
                  
                  <div className="relative mb-3">
                      <input 
                          type="text" 
                          placeholder="Cari nama pelanggan..." 
                          className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                      />
                      <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  </div>

                  <div className="max-h-[400px] overflow-y-auto space-y-2 custom-scrollbar">
                      {filteredCustomers.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Tidak ada data.</p>}
                      {filteredCustomers.map(c => (
                          <div 
                              key={c.id}
                              onClick={() => { setSelectedCustomerId(c.id); setSelectedBookingIds([]); }}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedCustomerId === c.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-50 border-slate-200 hover:bg-white'}`}
                          >
                              <p className="font-bold text-sm text-slate-800">{c.name}</p>
                              <p className="text-xs text-slate-500">{c.phone}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* RIGHT: Booking List */}
          <div className="lg:col-span-2">
              {selectedCustomerId ? (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                          <h3 className="font-bold text-slate-700 flex items-center gap-2">
                              <FileText size={18} className="text-indigo-600"/> Daftar Transaksi
                          </h3>
                          <button 
                              onClick={handleSelectAll}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                          >
                              {selectedBookingIds.length === customerBookings.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                          </button>
                      </div>
                      
                      {customerBookings.length === 0 ? (
                          <div className="p-8 text-center text-slate-500">Pelanggan ini belum memiliki transaksi aktif.</div>
                      ) : (
                          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                              {customerBookings.map(b => {
                                  const car = cars.find(c => c.id === b.carId);
                                  const isSelected = selectedBookingIds.includes(b.id);
                                  const carName = b.isRentToRent ? b.externalCarName : car?.name;
                                  const carPlate = b.isRentToRent ? b.externalCarPlate : car?.plate;

                                  return (
                                      <div 
                                          key={b.id} 
                                          onClick={() => handleToggleBooking(b.id)}
                                          className={`p-4 flex items-center gap-4 cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/30' : ''}`}
                                      >
                                          <div className={`text-indigo-600`}>
                                              {isSelected ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-300" />}
                                          </div>
                                          <div className="flex-1">
                                              <div className="flex justify-between">
                                                  <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                                      <CarIcon size={14}/> {carName} <span className="text-xs font-mono bg-slate-100 px-1 rounded text-slate-500">{carPlate}</span>
                                                  </span>
                                                  <span className="font-bold text-sm text-slate-800">Rp {b.totalPrice.toLocaleString('id-ID')}</span>
                                              </div>
                                              <div className="flex justify-between mt-1 text-xs text-slate-500">
                                                  <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(b.startDate).toLocaleDateString('id-ID')} s/d {new Date(b.endDate).toLocaleDateString('id-ID')}</span>
                                                  <span className={`px-2 py-0.5 rounded ${b.paymentStatus === 'Lunas' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.paymentStatus}</span>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-300 p-10 text-slate-400">
                      <Filter size={48} className="mb-4 opacity-50"/>
                      <p>Silakan pilih pelanggan di sebelah kiri untuk menampilkan daftar transaksi.</p>
                  </div>
              )}
          </div>
      </div>

      {/* Floating Action Bar */}
      {selectedBookingIds.length > 0 && (
          <div className="fixed bottom-6 left-4 right-4 md:left-72 md:right-8 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between z-40 animate-in slide-in-from-bottom-4">
              <div>
                  <p className="text-xs text-slate-400 uppercase font-bold">Total Terpilih</p>
                  <p className="text-xl font-bold">{selectedBookingIds.length} Transaksi • Rp {selectedTotal.toLocaleString('id-ID')}</p>
              </div>
              <button 
                  onClick={handleGeneratePDF}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                  <Printer size={20} /> Cetak Invoice Gabungan
              </button>
          </div>
      )}
    </div>
  );
};

export default CollectiveInvoicePage;
