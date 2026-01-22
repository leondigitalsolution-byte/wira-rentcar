import React, { useState, useEffect } from 'react';
import { Transaction, Booking } from '../types';
import { getStoredData, setStoredData } from '../services/dataService';
import { ArrowDownLeft, ArrowUpRight, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

const FinancesPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    // In a real app, transactions would be derived from Bookings + Manual Expenses
    // Here we sync initial transaction load or mock it
    setTransactions(getStoredData<Transaction[]>('transactions', []));
  }, []);

  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const downloadReport = () => {
      // Basic PDF report generation
      const doc = new jsPDF();
      doc.text("Laporan Arus Kas - RentCar Pro", 14, 20);
      doc.text(`Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}`, 14, 30);
      doc.text(`Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}`, 14, 38);
      doc.text(`Profit Bersih: Rp ${netProfit.toLocaleString('id-ID')}`, 14, 46);
      
      let y = 60;
      doc.setFontSize(10);
      doc.text("Tanggal", 14, y);
      doc.text("Keterangan", 50, y);
      doc.text("Tipe", 140, y);
      doc.text("Jumlah", 170, y);
      
      doc.line(14, y+2, 196, y+2);
      y += 8;

      transactions.forEach(t => {
          if (y > 270) { doc.addPage(); y = 20; }
          const date = new Date(t.date).toLocaleDateString('id-ID');
          doc.text(date, 14, y);
          doc.text(t.description.substring(0, 40), 50, y);
          doc.text(t.type, 140, y);
          doc.text(t.amount.toLocaleString('id-ID'), 170, y);
          y += 6;
      });

      doc.save('Laporan_Keuangan.pdf');
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Laporan Keuangan</h2>
          <p className="text-slate-500">Analisis arus kas masuk dan keluar.</p>
        </div>
        <button onClick={downloadReport} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Download size={18} /> Download PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg"><ArrowDownLeft size={20} /></div>
                  <span className="text-sm font-medium text-slate-500">Pemasukan</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">Rp {totalIncome.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg"><ArrowUpRight size={20} /></div>
                  <span className="text-sm font-medium text-slate-500">Pengeluaran</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">Rp {totalExpense.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Download size={20} /></div>
                  <span className="text-sm font-medium text-slate-500">Profit Bersih</span>
              </div>
              <p className="text-2xl font-bold text-indigo-700">Rp {netProfit.toLocaleString('id-ID')}</p>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-lg">Riwayat Transaksi</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tanggal</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Keterangan</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Kategori</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Jumlah</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                      {transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                          <tr key={t.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {new Date(t.date).toLocaleDateString('id-ID')}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-900">
                                  {t.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.type === 'Income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {t.type}
                                  </span>
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                  {t.type === 'Income' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                              </td>
                          </tr>
                      ))}
                      {transactions.length === 0 && (
                          <tr><td colSpan={4} className="text-center py-8 text-slate-500">Belum ada transaksi.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default FinancesPage;