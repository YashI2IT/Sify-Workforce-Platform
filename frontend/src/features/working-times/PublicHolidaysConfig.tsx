import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  useGetPublicHolidaysQuery,
  useCreatePublicHolidayMutation,
  useUpdatePublicHolidayMutation,
  useDeletePublicHolidayMutation,
  useImportPublicHolidaysMutation
} from '../../store/apiSlice';
import { Plus, Pencil, Trash2, Upload, FileText, AlertCircle, XCircle } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';

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
  const [importHolidays] = useImportPublicHolidaysMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

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
        date: formData.date,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const result = await importHolidays(formData).unwrap();
      setImportResult(result);
    } catch (err: any) {
      setImportResult({
        total: 0,
        success: 0,
        skipped: 0,
        failed: 1,
        errors: [{ row: 0, reason: err?.data?.message || err?.message || 'Failed to import' }]
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <div className="space-y-6">

        {/* Page header — first to arrive */}
        <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Public Holidays
            </h1>
            <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
              Manage organization-wide public holidays which offset expected working hours.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Year navigator */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setCurrentYear(prev => prev - 1)}
                className="px-2 py-1 text-slate-600 hover:bg-white hover:shadow-xs rounded-lg transition-all"
              >
                &larr;
              </button>
              <span className="px-4 py-1 text-sm font-bold text-slate-900">
                {currentYear}
              </span>
              <button
                onClick={() => setCurrentYear(prev => prev + 1)}
                className="px-2 py-1 text-slate-600 hover:bg-white hover:shadow-xs rounded-lg transition-all"
              >
                &rarr;
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" strokeWidth={2.5} />
              {isImporting ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={openNew}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Add Holiday
            </button>
          </div>
        </div>

        {/* Table card — slides in after header */}
        {isLoading ? (
          <div className="animate-slideUpFade-d1 bg-white/95 border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden">
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
              <span className="text-sm text-slate-500 font-medium">Loading holidays…</span>
            </div>
          </div>
        ) : (
          <div className="animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-300 hover:shadow-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80">
                  <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Date</th>
                  <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Name</th>
                  <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Status</th>
                  <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holidays?.map((holiday: any, index: number) => (
                  <tr
                    key={holiday.id}
                    className="hover:bg-slate-50/60 transition-colors duration-150 group"
                    style={{ animationDelay: `${0.08 + index * 0.03}s` }}
                  >
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatHolidayDate(holiday.date)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-700">{holiday.name}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${holiday.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {holiday.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-400 text-sm">
                      No public holidays configured for {currentYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-slideUpFade">
          <div className="animate-successPop bg-white rounded-[20px] shadow-2xl w-full max-w-[360px] border border-slate-200/80 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-[17px] font-bold text-[#12161F] font-sans tracking-tight">
                {editItem ? 'Edit Public Holiday' : 'Add Public Holiday'}
              </h2>
            </div>

            <div className="p-5">
              <form id="holidayForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-bold text-[#1e3a5f] mb-1.5 font-sans tracking-wide">Holiday Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. New Year's Day"
                    className="w-full px-3 py-2 bg-[#F9FBFC] border border-[#e2e8f0] rounded-[10px] text-[14px] text-slate-900 focus:ring-2 focus:ring-[#12161F]/10 focus:border-[#12161F] outline-none transition-all font-medium placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-[#1e3a5f] mb-1.5 font-sans tracking-wide">Date</label>
                  <DatePicker
                    value={formData.date}
                    onChange={(val) => setFormData({ ...formData, date: val })}
                    className="w-full"
                    buttonClassName="w-full flex items-center justify-between h-[38px] px-3 py-2 bg-[#F9FBFC] border border-[#e2e8f0] rounded-[10px] text-[14px] text-slate-900 focus:ring-2 focus:ring-[#12161F]/10 focus:border-[#12161F] outline-none transition-all font-medium"
                    openUpward={true}
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-[6px] checked:bg-black checked:border-black transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                      />
                      <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-[14px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Active (offsets expected hours)</span>
                  </label>
                </div>
              </form>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/50 rounded-b-[20px]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 text-[14px] font-bold text-slate-900 hover:bg-slate-200/70 rounded-[40px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="holidayForm"
                className="px-5 py-1.5 bg-black hover:bg-slate-800 text-white text-[14px] font-bold rounded-[40px] shadow-xs transition-colors"
              >
                Save Holiday
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {importResult && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-slideUpFade">
          <div className="animate-successPop bg-white rounded-[14px] shadow-xl w-full max-w-md overflow-hidden border border-slate-200/60">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Import Results
              </h2>
              <button 
                onClick={() => setImportResult(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center divide-x divide-slate-100 border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                <div className="flex-1 p-4 flex flex-col items-center justify-center bg-slate-50/30">
                  <div className="text-2xl font-black text-slate-800">{importResult.total || 0}</div>
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider mt-1 uppercase">Total</div>
                </div>
                <div className="flex-1 p-4 flex flex-col items-center justify-center">
                  <div className="text-2xl font-black text-emerald-600">{importResult.success || 0}</div>
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider mt-1 uppercase">Imported</div>
                </div>
                <div className="flex-1 p-4 flex flex-col items-center justify-center">
                  <div className="text-2xl font-black text-slate-600">{importResult.skipped || 0}</div>
                  <div className="text-[10px] font-bold text-slate-500 tracking-wider mt-1 uppercase">Skipped</div>
                </div>
                <div className="flex-1 p-4 flex flex-col items-center justify-center bg-rose-50/30">
                  <div className="text-2xl font-black text-rose-600">{importResult.failed || 0}</div>
                  <div className="text-[10px] font-bold text-rose-500 tracking-wider mt-1 uppercase">Failed</div>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    Errors found
                  </h3>
                  <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 max-h-[200px] overflow-y-auto space-y-2">
                    {importResult.errors.map((err: any, idx: number) => (
                      <div key={idx} className="text-xs text-rose-700 flex gap-2">
                        <span className="font-bold shrink-0">Row {err.row}:</span>
                        <span>{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setImportResult(null)}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

