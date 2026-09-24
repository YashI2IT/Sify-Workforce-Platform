import React, { useState } from 'react';
import { 
  useGetPublicHolidaysQuery,
  useCreatePublicHolidayMutation,
  useUpdatePublicHolidayMutation,
  useDeletePublicHolidayMutation
} from '../../store/apiSlice';
import { Calendar, Plus, Pencil, Trash2 } from 'lucide-react';

/** Format a YYYY-MM-DD string as "Jan 1, 2026 (Monday)" using native Intl — no external dep needed */
const formatHolidayDate = (dateStr: string): string => {
  // Parse as local date to avoid UTC offset shifting the day
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const datePart = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'long' });
  return `${datePart} (${weekday})`;
};

export const PublicHolidaysConfig = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const { data: holidays, isLoading } = useGetPublicHolidaysQuery({ year: currentYear });
  
  const [createHoliday] = useCreatePublicHolidayMutation();
  const [updateHoliday] = useUpdatePublicHolidayMutation();
  const [deleteHoliday] = useDeletePublicHolidayMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    isActive: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        date: new Date(formData.date).toISOString(),
        isActive: formData.isActive
      };

      if (editItem) {
        await updateHoliday({ id: editItem.id, data: payload }).unwrap();
      } else {
        await createHoliday(payload).unwrap();
      }
      setIsModalOpen(false);
      setEditItem(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save public holiday');
    }
  };

  const openNew = () => {
    setEditItem(null);
    setFormData({
      name: '',
      date: new Date().toISOString().split('T')[0],
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEdit = (holiday: any) => {
    setEditItem(holiday);
    setFormData({
      name: holiday.name,
      date: new Date(holiday.date).toISOString().split('T')[0],
      isActive: holiday.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this public holiday?')) {
      await deleteHoliday(id);
    }
  };

  return (
    <div className="flex-1 p-8 min-h-0 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-500" />
              Public Holidays
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Manage organization-wide public holidays which offset expected working hours.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setCurrentYear(prev => prev - 1)}
                className="px-2 py-1 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              >
                &larr;
              </button>
              <span className="px-4 py-1 text-sm font-bold text-slate-900">
                {currentYear}
              </span>
              <button
                onClick={() => setCurrentYear(prev => prev + 1)}
                className="px-2 py-1 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              >
                &rarr;
              </button>
            </div>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Holiday
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : (
          <div className="bg-white border border-slate-200/60 shadow-xs rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80">
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holidays?.map((holiday: any) => (
                  <tr key={holiday.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatHolidayDate(holiday.date)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700">{holiday.name}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        holiday.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {holiday.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(holiday)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(holiday.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!holidays?.length && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">
                      No public holidays configured for {currentYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200/60 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                {editItem ? 'Edit Public Holiday' : 'Add Public Holiday'}
              </h2>
            </div>
            
            <div className="p-6">
              <form id="holidayForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Holiday Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. New Year's Day"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e => setFormData({...formData, isActive: e.target.checked})}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">Active (offsets expected hours)</span>
                  </label>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="holidayForm"
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors"
              >
                Save Holiday
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
