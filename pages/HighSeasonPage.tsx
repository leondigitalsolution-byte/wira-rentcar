
import React, { useState, useEffect } from 'react';
import { HighSeason, User } from '../types';
import { getStoredData, setStoredData } from '../services/dataService';
import { Plus, Trash2, Calendar } from 'lucide-react';

interface Props {
    currentUser: User;
}

const HighSeasonPage: React.FC<Props> = ({ currentUser }) => {
  const [highSeasons, setHighSeasons] = useState<HighSeason[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priceIncrease, setPriceIncrease] = useState(50000);

  const isSuperAdmin = currentUser.role === 'superadmin';

  useEffect(() => {
    setHighSeasons(getStoredData<HighSeason[]>('highSeasons', []));
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (new Date(endDate) < new Date(startDate)) {
        alert("Tanggal selesai harus setelah tanggal mulai");
        return;
    }

    const newSeason: HighSeason = {
        id: Date.now().toString(),
        name,
        startDate,
        endDate,
        priceIncrease: Number(priceIncrease)
    };

    const updated = [...highSeasons, newSeason];
    setHighSeasons(updated);
    setStoredData('highSeasons', updated);
    setIsModalOpen(false);
    
    // Reset
    setName(''); setStartDate(''); setEndDate(''); setPriceIncrease(50000);
  };

  const handleDelete = (id: string) => {
      if(confirm('Konfirmasi Persetujuan: Apakah Anda yakin ingin menghapus data High Season ini? Tindakan ini hanya dapat dilakukan dengan wewenang Superadmin.')) {
          setHighSeasons(prev => {
              const updated = prev.filter(h => h.id !== id);
              setStoredData('highSeasons', updated);
              return updated;
          });
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">High Season</h2>
          <p className="text-slate-500">Atur kenaikan harga otomatis pada tanggal tertentu.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus size={18} /> Buat Event Baru
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nama Event</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Periode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Kenaikan Harga (Per Hari)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Aksi</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                  {highSeasons.map(hs => (
                      <tr key={hs.id}>
                          <td className="px-6 py-4 font-medium text-slate-900">{hs.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                  <Calendar size={14} />
                                  {new Date(hs.startDate).toLocaleDateString('id-ID')} - {new Date(hs.endDate).toLocaleDateString('id-ID')}
                              </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-orange-600">
                              + Rp {hs.priceIncrease.toLocaleString('id-ID')}
                          </td>
                          <td className="px-6 py-4 text-right">
                              {isSuperAdmin && (
                                  <button onClick={() => handleDelete(hs.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                              )}
                          </td>
                      </tr>
                  ))}
                  {highSeasons.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-slate-500">Belum ada event High Season aktif.</td></tr>
                  )}
              </tbody>
          </table>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-md p-6">
                  <h3 className="text-xl font-bold mb-4">Tambah High Season</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Nama Event</label>
                          <input required type="text" className="w-full border rounded p-2 mt-1" placeholder="Misal: Lebaran 2024" value={name} onChange={e => setName(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Mulai</label>
                            <input required type="date" className="w-full border rounded p-2 mt-1" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Selesai</label>
                            <input required type="date" className="w-full border rounded p-2 mt-1" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700">Surcharge (Kenaikan per Hari)</label>
                          <input required type="number" className="w-full border rounded p-2 mt-1" value={priceIncrease} onChange={e => setPriceIncrease(Number(e.target.value))} />
                      </div>

                      <div className="flex gap-3 mt-6">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg">Batal</button>
                          <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Simpan</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default HighSeasonPage;
