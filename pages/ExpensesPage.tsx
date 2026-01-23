
import React, { useState, useEffect } from 'react';
import { Transaction, Driver, User, Partner } from '../types';
import { getStoredData, setStoredData, exportToCSV } from '../services/dataService';
import { Plus, Image as ImageIcon, X, CheckCircle, Clock, User as UserIcon, Users, Download, Filter, Edit2, Trash2, Camera } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
// @ts-ignore
import { useLocation } from 'react-router-dom';

interface Props {
    isDriverView?: boolean;
    isPartnerView?: boolean;
}

const ExpensesPage: React.FC<Props> = ({ isDriverView = false, isPartnerView = false }) => {
  const location = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  // Filter State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterTxStatus, setFilterTxStatus] = useState('All');

  // Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Operasional');
  const [status, setStatus] = useState<'Paid' | 'Pending'>('Paid'); // New State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');

  useEffect(() => {
    const allTx = getStoredData<Transaction[]>('transactions', []);
    setTransactions(allTx.filter((t: Transaction) => t.type === 'Expense'));
    setDrivers(getStoredData<Driver[]>('drivers', []));
    setPartners(getStoredData<Partner[]>('partners', []));
    
    if (isDriverView) setCategory('Reimbursement');
    if (isPartnerView) setCategory('Setor Investor');
  }, [isDriverView, isPartnerView]);

  // Handle incoming navigation state (e.g. "Pay this transaction")
  useEffect(() => {
    if (location.state?.action === 'pay' && location.state?.transactionId && transactions.length > 0) {
        const txToPay = transactions.find(t => t.id === location.state.transactionId);
        if (txToPay) {
            handlePay(txToPay);
            // Clear location state to prevent reopening on reload/re-render
            window.history.replaceState({}, document.title);
        }
    }
  }, [location.state, transactions]);

  // Auto-set status based on category for new entries
  useEffect(() => {
      if (!editingId && !isDriverView && !isPartnerView) {
          if (['Setor Investor', 'Setor Mitra', 'Gaji', 'Reimbursement'].includes(category)) {
              setStatus('Pending');
          } else {
              setStatus('Paid');
          }
      }
  }, [category, editingId, isDriverView, isPartnerView]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1000000) { 
        alert("Ukuran gambar terlalu besar (Maks 1MB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isPartnerDeposit = category === 'Setor Investor' || category === 'Setor Mitra';
    
    let relatedId = undefined;
    if (isDriverView && currentUser?.linkedDriverId) {
        relatedId = currentUser.linkedDriverId;
    } else if (isPartnerDeposit) {
        relatedId = selectedPartnerId;
    } else if (selectedDriverId) {
        relatedId = selectedDriverId;
    }
    
    // Logic Status:
    // 1. Driver View always Pending initially
    // 2. Admin View uses the 'status' state (which might be changed by handlePay or manual select)
    const finalStatus = isDriverView ? 'Pending' : status;

    const newTx: Transaction = {
        id: editingId || `exp-${Date.now()}`,
        date: date,
        amount: Number(amount),
        type: 'Expense',
        category: category,
        description: description,
        receiptImage: receiptImage || undefined,
        status: finalStatus, 
        relatedId: relatedId
    };

    const allTx = getStoredData<Transaction[]>('transactions', []);
    let updated;
    
    if (editingId) {
        updated = allTx.map((t: Transaction) => t.id === editingId ? newTx : t);
    } else {
        updated = [newTx, ...allTx];
    }
    
    setStoredData('transactions', updated);
    setTransactions(updated.filter((t: Transaction) => t.type === 'Expense'));
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (t: Transaction) => {
      setEditingId(t.id);
      setDate(t.date);
      setCategory(t.category);
      setDescription(t.description);
      setAmount(t.amount.toString());
      setStatus(t.status || 'Paid'); // Load existing status
      setReceiptImage(t.receiptImage || null);
      
      setSelectedPartnerId('');
      setSelectedDriverId('');

      if (t.relatedId) {
          if (partners.find(p => p.id === t.relatedId)) setSelectedPartnerId(t.relatedId);
          if (drivers.find(d => d.id === t.relatedId)) setSelectedDriverId(t.relatedId);
      }
      setIsModalOpen(true);
  };

  const handlePay = (t: Transaction) => {
      // Sama seperti edit, tapi status dipaksa menjadi Paid
      setEditingId(t.id);
      setDate(t.date);
      setCategory(t.category);
      setDescription(t.description);
      setAmount(t.amount.toString());
      
      setStatus('Paid'); // FORCE STATUS TO PAID
      
      setReceiptImage(t.receiptImage || null);
      
      setSelectedPartnerId('');
      setSelectedDriverId('');

      if (t.relatedId) {
          if (partners.find(p => p.id === t.relatedId)) setSelectedPartnerId(t.relatedId);
          if (drivers.find(d => d.id === t.relatedId)) setSelectedDriverId(t.relatedId);
      }
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if (window.confirm('Apakah Anda yakin ingin menghapus data transaksi ini?')) {
          const allTx = getStoredData<Transaction[]>('transactions', []);
          const updatedStorage = allTx.filter((t: Transaction) => t.id !== id);
          setStoredData('transactions', updatedStorage);
          setTransactions(updatedStorage.filter((t: Transaction) => t.type === 'Expense'));
      }
  };

  const resetForm = () => {
      setEditingId(null);
      setDescription('');
      setAmount('');
      setCategory(isDriverView ? 'Reimbursement' : isPartnerView ? 'Setor Investor' : 'Operasional');
      setStatus('Paid');
      setReceiptImage(null);
      setSelectedPartnerId('');
      setSelectedDriverId('');
  };

  // Filter View
  let displayedTransactions = transactions;
  
  if (filterStartDate || filterEndDate) {
      displayedTransactions = displayedTransactions.filter((t: Transaction) => {
          const start = filterStartDate || '0000-00-00';
          const end = filterEndDate || '9999-12-31';
          return t.date >= start && t.date <= end;
      });
  }

  if (filterCategory !== 'All') {
      displayedTransactions = displayedTransactions.filter((t: Transaction) => t.category === filterCategory);
  }

  if (filterTxStatus !== 'All') {
      displayedTransactions = displayedTransactions.filter((t: Transaction) => t.status === filterTxStatus);
  }
  
  if (isDriverView) {
      if (currentUser?.linkedDriverId) {
          displayedTransactions = displayedTransactions.filter((t: Transaction) => t.relatedId === currentUser.linkedDriverId);
      } else {
           displayedTransactions = displayedTransactions.filter((t: Transaction) => t.category === 'Reimbursement' || t.category === 'BBM' || t.category === 'Tol/Parkir');
      }
  } else if (isPartnerView) {
      if (currentUser?.linkedPartnerId) {
          // Filter for both old "Setor Mitra" and new "Setor Investor"
          displayedTransactions = displayedTransactions.filter((t: Transaction) => (t.category === 'Setor Investor' || t.category === 'Setor Mitra') && t.relatedId === currentUser.linkedPartnerId);
      }
  }

  const getEntityName = (relatedId?: string) => {
      if (!relatedId) return null;
      const d = drivers.find(d => d.id === relatedId);
      if (d) return d.name;
      const p = partners.find(p => p.id === relatedId);
      if (p) return p.name;
      return null;
  }

  const handleExportCSV = () => {
      if (displayedTransactions.length === 0) {
          alert('Tidak ada data untuk diexport');
          return;
      }
      exportToCSV(displayedTransactions, 'Data_Pengeluaran_BRC');
  };

  const isDriverCategory = ['Gaji', 'Reimbursement', 'BBM', 'Tol/Parkir'].includes(category);
  const showStatusInput = !isDriverView && !isPartnerView; // Only admin sees manual status input

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">
              {isDriverView ? 'Reimbursement Saya' : isPartnerView ? 'Riwayat Setoran' : 'Pengeluaran & Setoran'}
          </h2>
          <p className="text-slate-500">
              {isDriverView ? 'Ajukan klaim biaya perjalanan.' : isPartnerView ? 'Riwayat setoran bagi hasil dari rental.' : 'Kelola operasional, reimbursement, dan setoran investor.'}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
            {!isDriverView && !isPartnerView && (
                <div className="hidden md:flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    <span className="text-sm font-bold text-slate-700 px-2 flex items-center gap-1"><Filter size={14}/> Filter:</span>
                    <input type="date" className="border rounded px-2 py-1 text-sm text-slate-600" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                    <span className="text-slate-400">-</span>
                    <input type="date" className="border rounded px-2 py-1 text-sm text-slate-600" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                    
                    <select 
                        className="border rounded px-2 py-1 text-sm text-slate-600 max-w-[120px]" 
                        value={filterCategory} 
                        onChange={e => setFilterCategory(e.target.value)}
                    >
                        <option value="All">Semua Kategori</option>
                        <option value="Operasional">Operasional</option>
                        <option value="Setor Investor">Setor Investor</option>
                        <option value="Gaji">Gaji</option>
                        <option value="BBM">BBM</option>
                        <option value="Tol/Parkir">Tol/Parkir</option>
                        <option value="Service">Service</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Reimbursement">Reimbursement</option>
                        <option value="Lainnya">Lainnya</option>
                    </select>

                    <select 
                        className="border rounded px-2 py-1 text-sm text-slate-600" 
                        value={filterTxStatus} 
                        onChange={e => setFilterTxStatus(e.target.value)}
                    >
                        <option value="All">Semua Status</option>
                        <option value="Paid">Lunas (Paid)</option>
                        <option value="Pending">Menunggu (Pending)</option>
                    </select>

                    <button onClick={handleExportCSV} className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1">
                        <Download size={14} /> CSV
                    </button>
                    {(filterStartDate || filterEndDate || filterCategory !== 'All' || filterTxStatus !== 'All') && (
                        <button onClick={() => {setFilterStartDate(''); setFilterEndDate(''); setFilterCategory('All'); setFilterTxStatus('All');}} className="text-red-500 hover:underline text-xs px-2">Reset</button>
                    )}
                </div>
            )}

            {!isPartnerView && (
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <Plus size={18} /> {isDriverView ? 'Ajukan Klaim' : 'Catat Pengeluaran'}
                </button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tanggal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Kategori</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Keterangan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Jumlah</th>
                        {(!isDriverView && !isPartnerView) && <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Aksi</th>}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {displayedTransactions.length === 0 ? (
                         <tr><td colSpan={6} className="text-center py-8 text-slate-500 italic">Belum ada data.</td></tr>
                    ) : (
                        displayedTransactions.map((t: Transaction) => {
                            const entityName = getEntityName(t.relatedId);
                            const isDeposit = t.category === 'Setor Investor' || t.category === 'Setor Mitra';
                            return (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isDeposit ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {t.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-800">
                                        <div>{t.description}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {entityName && (
                                                <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                                                    {isDeposit ? <Users size={10}/> : <UserIcon size={10} />} {entityName}
                                                </span>
                                            )}
                                            {t.receiptImage && (
                                                <a href={t.receiptImage} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 text-xs"><ImageIcon size={12}/> Nota</a>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {t.status === 'Paid' ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                                                <CheckCircle size={12} /> {isDeposit ? 'Disetor' : 'Dibayar'}
                                            </span>
                                        ) : t.status === 'Pending' ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full w-fit">
                                                <Clock size={12} /> Menunggu
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-600">
                                        Rp {t.amount.toLocaleString('id-ID')}
                                    </td>
                                    {(!isDriverView && !isPartnerView) && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {t.status === 'Pending' && (
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePay(t);
                                                        }}
                                                        className="relative z-10 text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-1 active:scale-95 cursor-pointer"
                                                        title="Upload Bukti & Lunasi"
                                                    >
                                                        {isDeposit ? 'Setor' : 'Bayar'}
                                                    </button>
                                                )}
                                                <button onClick={() => handleEdit(t)} className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100" title="Edit">
                                                    <Edit2 size={16}/>
                                                </button>
                                                <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-100" title="Hapus">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Transaksi' : (isDriverView ? 'Form Reimbursement' : 'Input Pengeluaran / Setoran')}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Tanggal</label>
                          <input required type="date" className="w-full border rounded-lg p-2.5 mt-1" value={date} onChange={e => setDate(e.target.value)} />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Kategori</label>
                          <select className="w-full border rounded-lg p-2.5 mt-1" value={category} onChange={e => setCategory(e.target.value)}>
                              {isDriverView ? (
                                  <>
                                    <option value="BBM">BBM / Bensin</option>
                                    <option value="Tol/Parkir">Tol & Parkir</option>
                                    <option value="Reimbursement">Reimbursement Lainnya</option>
                                  </>
                              ) : (
                                  <>
                                    <option value="Operasional">Operasional Kantor</option>
                                    <option value="Setor Investor">Setor Investor</option>
                                    <option value="Gaji">Gaji Driver / Karyawan</option>
                                    <option value="BBM">BBM / Bensin</option>
                                    <option value="Tol/Parkir">Tol & Parkir</option>
                                    <option value="Service">Service Mobil</option>
                                    <option value="Marketing">Marketing / Iklan</option>
                                    <option value="Reimbursement">Reimbursement</option>
                                    <option value="Lainnya">Lainnya</option>
                                  </>
                              )}
                          </select>
                      </div>

                      {showStatusInput && (
                          <div>
                              <label className="block text-sm font-medium text-slate-700">Status Pembayaran</label>
                              <div className="flex gap-2 mt-1">
                                  <select className="w-full border rounded-lg p-2.5" value={status} onChange={(e: any) => setStatus(e.target.value)}>
                                      <option value="Paid">Lunas (Paid)</option>
                                      <option value="Pending">Menunggu (Pending)</option>
                                  </select>
                              </div>
                              {status === 'Pending' && (
                                <p className="text-[10px] text-orange-600 mt-1">Status <strong>Pending</strong> akan muncul sebagai hutang/tunggakan.</p>
                              )}
                          </div>
                      )}

                      {(category === 'Setor Investor' || category === 'Setor Mitra') && (
                          <div>
                              <label className="block text-sm font-medium text-slate-700">Pilih Investor</label>
                              <select required className="w-full border rounded-lg p-2.5 mt-1" value={selectedPartnerId} onChange={e => setSelectedPartnerId(e.target.value)}>
                                  <option value="">-- Pilih Investor --</option>
                                  {partners.map(p => (
                                      <option key={p.id} value={p.id}>{p.name} (Split: {p.splitPercentage}%)</option>
                                  ))}
                              </select>
                          </div>
                      )}

                      {/* Driver Selector for Salary/Reimbursement */}
                      {isDriverCategory && !isDriverView && (
                          <div>
                               <label className="block text-sm font-medium text-slate-700">Pilih Driver (Opsional)</label>
                               <select className="w-full border rounded-lg p-2.5 mt-1" value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}>
                                    <option value="">-- Tidak Terkait Driver --</option>
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                               </select>
                               <p className="text-[10px] text-slate-500 mt-1">Pilih driver agar tercatat di laporan bulanan driver.</p>
                          </div>
                      )}

                      <div>
                          <label className="block text-sm font-medium text-slate-700">Nominal (Rp)</label>
                          <input required type="number" className="w-full border rounded-lg p-2.5 mt-1" value={amount} onChange={e => setAmount(e.target.value)} />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700">Keterangan</label>
                          <textarea required className="w-full border rounded-lg p-2.5 mt-1" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Contoh: Gaji Trip Luar Kota / Klaim E-Toll" />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Foto Nota / Bukti Transfer</label>
                          <div className="flex items-center gap-4">
                                <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
                                    {receiptImage ? (
                                        <img src={receiptImage} className="w-full h-full object-cover" />
                                    ) : <Camera className="text-slate-400" />}
                                </div>
                                <div className="flex-1">
                                    <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 text-slate-700">
                                        <Camera size={16} /> {receiptImage ? 'Ganti Foto' : 'Ambil Foto / Upload'}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                          </div>
                      </div>

                      <div className="flex gap-3 mt-6 pt-4 border-t">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium">Batal</button>
                          <button type="submit" className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">
                              {editingId ? 'Simpan Perubahan' : 'Simpan'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ExpensesPage;
