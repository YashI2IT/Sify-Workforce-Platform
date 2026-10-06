import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  useGetOrgWorkingTimeQuery,
  useUpdateOrgWorkingTimeMutation,
  useGetWorkingTimeOverridesQuery,
  useUpsertEmployeeWorkingTimeMutation,
  useDeleteEmployeeWorkingTimeMutation,
  useGetEmployeesQuery,
} from '../../store/apiSlice';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Search,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  Sparkles,
  SlidersHorizontal,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';

export const DAYS = [
  { key: 'monday', short: 'Mon', label: 'Monday', isWeekend: false },
  { key: 'tuesday', short: 'Tue', label: 'Tuesday', isWeekend: false },
  { key: 'wednesday', short: 'Wed', label: 'Wednesday', isWeekend: false },
  { key: 'thursday', short: 'Thu', label: 'Thursday', isWeekend: false },
  { key: 'friday', short: 'Fri', label: 'Friday', isWeekend: false },
  { key: 'saturday', short: 'Sat', label: 'Saturday', isWeekend: true },
  { key: 'sunday', short: 'Sun', label: 'Sunday', isWeekend: true },
] as const;

export type DayKey = typeof DAYS[number]['key'];

export const DEFAULT_SCHEDULE: Record<DayKey, number> = {
  monday: 8,
  tuesday: 8,
  wednesday: 8,
  thursday: 8,
  friday: 8,
  saturday: 0,
  sunday: 0,
};

export const calculateTotalHours = (schedule: Record<DayKey, number> | undefined | null): number => {
  if (!schedule) return 0;
  return DAYS.reduce((sum, d) => sum + (Number(schedule[d.key]) || 0), 0);
};

export const countWorkingDays = (schedule: Record<DayKey, number> | undefined | null): number => {
  if (!schedule) return 0;
  return DAYS.reduce((count, d) => count + (Number(schedule[d.key]) > 0 ? 1 : 0), 0);
};

// ─────────────────────────────────────────────────────────────────────────────
// Organization Default Baseline Card
// ─────────────────────────────────────────────────────────────────────────────
interface OrgDefaultCardProps {
  onAddOverrideClick: () => void;
}

const OrgDefaultCard: React.FC<OrgDefaultCardProps> = () => {
  const { data: orgWT, isLoading } = useGetOrgWorkingTimeQuery();
  const [updateOrg, { isLoading: isUpdating }] = useUpdateOrgWorkingTimeMutation();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<DayKey, number>>(DEFAULT_SCHEDULE);
  const [formError, setFormError] = useState<string | null>(null);

  const currentSchedule: Record<DayKey, number> = useMemo(() => {
    return {
      monday: Number(orgWT?.monday ?? 8),
      tuesday: Number(orgWT?.tuesday ?? 8),
      wednesday: Number(orgWT?.wednesday ?? 8),
      thursday: Number(orgWT?.thursday ?? 8),
      friday: Number(orgWT?.friday ?? 8),
      saturday: Number(orgWT?.saturday ?? 0),
      sunday: Number(orgWT?.sunday ?? 0),
    };
  }, [orgWT]);

  const openEdit = () => {
    setFormData({ ...currentSchedule });
    setFormError(null);
    setIsEditing(true);
  };

  const handleDayChange = (day: DayKey, value: number) => {
    const clamped = Math.max(0, Math.min(24, Math.round(value * 2) / 2));
    setFormData((prev) => ({ ...prev, [day]: clamped }));
    setFormError(null);
  };

  const applyPreset = (preset: 'standard' | '45h' | '48h' | 'reset') => {
    if (preset === 'standard') {
      setFormData({ monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0 });
    } else if (preset === '45h') {
      setFormData({ monday: 9, tuesday: 9, wednesday: 9, thursday: 9, friday: 9, saturday: 0, sunday: 0 });
    } else if (preset === '48h') {
      setFormData({ monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 8, sunday: 0 });
    } else if (preset === 'reset') {
      setFormData({ ...currentSchedule });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await updateOrg(formData).unwrap();
      showToast('Organization baseline schedule updated successfully', 'success');
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      const msg = err?.data?.message || 'Failed to update organization schedule';
      setFormError(msg);
      showToast(msg, 'error');
    }
  };

  const currentTotal = calculateTotalHours(currentSchedule);
  const currentWorkdays = countWorkingDays(currentSchedule);
  const formTotal = calculateTotalHours(formData);
  const formWorkdays = countWorkingDays(formData);

  if (isLoading && !orgWT) {
    return (
      <div className="animate-slideUpFade-d1 bg-white/95 border border-slate-200/80 shadow-xs rounded-[14px] p-12">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          <span className="text-sm text-slate-500 font-medium">Loading organization baseline…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-300 hover:shadow-md">
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
              Organization Default Schedule
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Applied automatically to all employees unless superseded by a custom override
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
            {currentTotal} hrs / week
          </span>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {currentWorkdays} Workdays • {7 - currentWorkdays} Off
          </span>

          {!isEditing && (
            <button
              onClick={openEdit}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Baseline</span>
            </button>
          )}
        </div>
      </div>

      {/* Card Body */}
      {isEditing ? (
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Quick Preset Selector */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Sparkles className="w-3.5 h-3.5 text-slate-900" />
              <span>Quick Presets:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Standard (40h Mon-Fri)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('45h')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                45h (9h Mon-Fri)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('48h')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                48h (8h Mon-Sat)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('reset')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* 7 Days Input Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {DAYS.map((day) => {
              const val = formData[day.key];
              const isWorkday = val > 0;

              return (
                <div
                  key={day.key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isWorkday
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-slate-50/70 border-dashed border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                      {day.short}
                    </span>
                    {day.isWeekend && (
                      <span className="text-[10px] font-semibold text-slate-400 uppercase font-sans">
                        Weekend
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={val}
                      onChange={(e) => handleDayChange(day.key, parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-[#F9FBFC] border border-slate-200 rounded-lg text-base font-bold text-slate-900 font-sans text-center focus:ring-2 focus:ring-slate-950/10 focus:border-slate-900 outline-none transition-all"
                    />
                    <span className="text-xs font-medium text-slate-500 font-sans">h</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleDayChange(day.key, 0)}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                        val === 0 ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      Off
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDayChange(day.key, 8)}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                        val === 8 ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      8h
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Actions Footer */}
          <div className="px-5 py-4 bg-slate-50/70 -mx-6 -mb-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 font-sans">
                Total Target: <span className="text-slate-950 text-sm font-bold font-sans">{formTotal} hrs / week</span>
              </span>
              <span className="text-xs text-slate-400">
                ({formWorkdays} working days • {7 - formWorkdays} off)
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isUpdating}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
              >
                {isUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Baseline</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {DAYS.map((day) => {
              const hours = currentSchedule[day.key];
              const isWorkday = hours > 0;
              const barPercentage = Math.min(100, Math.round((hours / 8) * 100));

              return (
                <div
                  key={day.key}
                  className={`p-4 rounded-xl border transition-all ${
                    isWorkday
                      ? 'bg-slate-50/40 border-slate-200/80 hover:bg-white hover:shadow-xs'
                      : 'bg-slate-50/20 border-dashed border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-sans">
                      {day.short}
                    </span>
                    {day.isWeekend ? (
                      <span className="text-[11px] font-medium text-slate-400 font-sans">Weekend</span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 font-sans">Weekday</span>
                    )}
                  </div>

                  <div className="my-2.5">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-semibold tracking-tight font-sans ${
                        isWorkday ? 'text-slate-900' : 'text-slate-300'
                      }`}>
                        {hours > 0 ? hours : 0}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 font-sans">hrs</span>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden my-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isWorkday ? 'bg-emerald-500' : 'bg-transparent'
                      }`}
                      style={{ width: `${barPercentage}%` }}
                    />
                  </div>

                  <div>
                    {isWorkday ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Workday
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        Rest Day
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Employee Overrides Table & Modals
// ─────────────────────────────────────────────────────────────────────────────
const OverridesTable: React.FC = () => {
  const { data: overridesData = [], isLoading: overridesLoading } = useGetWorkingTimeOverridesQuery();
  const { data: employeesData, isLoading: employeesLoading } = useGetEmployeesQuery({ limit: 100 });
  const { data: orgWT } = useGetOrgWorkingTimeQuery();
  const [upsertOverride, { isLoading: isSavingOverride }] = useUpsertEmployeeWorkingTimeMutation();
  const [deleteOverride, { isLoading: isDeletingOverride }] = useDeleteEmployeeWorkingTimeMutation();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEmployeeId, setModalEmployeeId] = useState('');
  const [modalForm, setModalForm] = useState<Record<DayKey, number>>(DEFAULT_SCHEDULE);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const orgSchedule: Record<DayKey, number> = useMemo(() => {
    return {
      monday: Number(orgWT?.monday ?? 8),
      tuesday: Number(orgWT?.tuesday ?? 8),
      wednesday: Number(orgWT?.wednesday ?? 8),
      thursday: Number(orgWT?.thursday ?? 8),
      friday: Number(orgWT?.friday ?? 8),
      saturday: Number(orgWT?.saturday ?? 0),
      sunday: Number(orgWT?.sunday ?? 0),
    };
  }, [orgWT]);

  const orgTotal = calculateTotalHours(orgSchedule);

  const employees: any[] = useMemo(() => {
    return Array.isArray(employeesData) ? employeesData : (employeesData?.data ?? employeesData?.items ?? []);
  }, [employeesData]);

  const overrides: any[] = useMemo(() => {
    return Array.isArray(overridesData) ? overridesData : [];
  }, [overridesData]);

  const getEmployee = (empId: string) => {
    return employees.find((e: any) => e.id === empId);
  };

  const getEmployeeDisplayName = (empId: string) => {
    const emp = getEmployee(empId);
    if (!emp) return empId;
    return emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email;
  };

  const getEmployeeInitials = (empId: string) => {
    const name = getEmployeeDisplayName(empId);
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join('');
  };

  // Filtered overrides list based on search query
  const filteredOverrides = useMemo(() => {
    if (!searchQuery.trim()) return overrides;
    const q = searchQuery.toLowerCase();
    return overrides.filter((ov: any) => {
      const emp = getEmployee(ov.employeeId);
      const name = (emp?.name || `${emp?.firstName || ''} ${emp?.lastName || ''}`).toLowerCase();
      const email = (emp?.email || '').toLowerCase();
      const code = (emp?.employeeCode || '').toLowerCase();
      return name.includes(q) || email.includes(q) || code.includes(q);
    });
  }, [overrides, searchQuery, employees]);

  const openNewOverride = () => {
    setModalEmployeeId('');
    setModalForm({ ...orgSchedule });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditOverride = (ov: any) => {
    setModalEmployeeId(ov.employeeId);
    setModalForm({
      monday: Number(ov.monday ?? 8),
      tuesday: Number(ov.tuesday ?? 8),
      wednesday: Number(ov.wednesday ?? 8),
      thursday: Number(ov.thursday ?? 8),
      friday: Number(ov.friday ?? 8),
      saturday: Number(ov.saturday ?? 0),
      sunday: Number(ov.sunday ?? 0),
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleModalDayChange = (day: DayKey, val: number) => {
    const clamped = Math.max(0, Math.min(24, Math.round(val * 2) / 2));
    setModalForm((prev) => ({ ...prev, [day]: clamped }));
    setModalError(null);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEmployeeId) {
      setModalError('Please select an employee for this override');
      return;
    }

    try {
      await upsertOverride({ employeeId: modalEmployeeId, data: modalForm }).unwrap();
      showToast(`Schedule override saved for ${getEmployeeDisplayName(modalEmployeeId)}`, 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      const msg = err?.data?.message || 'Failed to save employee override';
      setModalError(msg);
      showToast(msg, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOverride(deleteTarget.employeeId).unwrap();
      showToast(`Override removed. Employee reverted to organization baseline.`, 'success');
      setDeleteTarget(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.data?.message || 'Failed to remove employee override';
      showToast(msg, 'error');
    }
  };

  // Employee options for select dropdown
  const employeeOptions = useMemo(() => {
    return employees.map((emp: any) => {
      const name = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email;
      const hasExisting = overrides.some((o: any) => o.employeeId === emp.id);
      return {
        value: emp.id,
        label: `${name} (${emp.email})${hasExisting ? ' • Has override' : ''}`,
      };
    });
  }, [employees, overrides]);

  const modalTotal = calculateTotalHours(modalForm);
  const modalWorkdays = countWorkingDays(modalForm);
  const modalVariance = modalTotal - orgTotal;

  return (
    <div className="animate-slideUpFade-d2 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-300 hover:shadow-md">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100/80 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
              Employee Overrides
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Custom individual schedules that supersede the organization baseline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter overrides…"
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/10 focus:border-slate-900 outline-none w-44 sm:w-56 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <span className="text-xs font-semibold text-slate-600 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80">
            {overrides.length} Overrides
          </span>

          <button
            onClick={openNewOverride}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Add Override</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      {overridesLoading || employeesLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          <span className="text-sm text-slate-500 font-medium">Loading employee overrides…</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80">
                <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Employee</th>
                {DAYS.map((d) => (
                  <th key={d.key} className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">
                    {d.short}
                  </th>
                ))}
                <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Weekly</th>
                <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Variance</th>
                <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOverrides.map((ov: any) => {
                const emp = getEmployee(ov.employeeId);
                const name = getEmployeeDisplayName(ov.employeeId);
                const initials = getEmployeeInitials(ov.employeeId);
                const total = calculateTotalHours(ov);
                const variance = total - orgTotal;

                return (
                  <tr
                    key={ov.id || ov.employeeId}
                    className="hover:bg-slate-50/60 transition-colors duration-150 group"
                  >
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center font-sans shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{name}</div>
                          <div className="text-xs text-slate-500 font-sans">
                            {emp?.email || 'No email registered'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {DAYS.map((d) => {
                      const h = Number(ov[d.key] ?? 0);
                      return (
                        <td key={d.key} className="px-3 py-4 text-center">
                          {h > 0 ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/60 min-w-[32px] font-sans">
                              {h}h
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs font-sans">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-white font-sans">
                        {total}h
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      {variance === 0 ? (
                        <span className="text-xs font-medium text-slate-400 font-sans">Baseline</span>
                      ) : variance > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans">
                          +{variance}h
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 font-sans">
                          {variance}h
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => openEditOverride(ov)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Override"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(ov)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Override"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredOverrides.length && (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-slate-400 text-sm">
                    {searchQuery ? (
                      <div className="space-y-2">
                        <p>No employee overrides match &ldquo;{searchQuery}&rdquo;</p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-xs font-bold text-slate-900 underline cursor-pointer"
                        >
                          Clear search filter
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-9 rounded-[14px] bg-slate-100 flex items-center justify-center text-slate-400">
                          <SlidersHorizontal className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700">No Custom Overrides Configured</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            All employees are actively running on the organization default schedule ({orgTotal} hrs / week).
                          </p>
                        </div>
                        <button
                          onClick={openNewOverride}
                          className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
                        >
                          <Plus className="w-3.5 h-3.5 text-slate-500" />
                          <span>Configure Individual Override</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Portaled Modal */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-slideUpFade">
            <div className="animate-successPop bg-white rounded-[20px] shadow-2xl w-full max-w-xl border border-slate-200/80 flex flex-col overflow-hidden max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div>
                  <h2 className="text-[17px] font-bold text-[#12161F] font-sans tracking-tight">
                    {modalEmployeeId && overrides.some((o: any) => o.employeeId === modalEmployeeId)
                      ? 'Edit Employee Override'
                      : 'Add Employee Override'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure custom daily operational hours for this employee
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto p-6 space-y-5">
                {modalError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Employee Selector */}
                <div>
                  <label className="block text-[13px] font-bold text-[#1e3a5f] mb-1.5 font-sans tracking-wide">
                    Employee
                  </label>
                  {modalEmployeeId && overrides.some((o: any) => o.employeeId === modalEmployeeId) ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center font-sans shrink-0">
                        {getEmployeeInitials(modalEmployeeId)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {getEmployeeDisplayName(modalEmployeeId)}
                        </div>
                        <div className="text-xs text-slate-500 font-sans">
                          {getEmployee(modalEmployeeId)?.email}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Select
                      value={modalEmployeeId}
                      onChange={(val) => {
                        setModalEmployeeId(val);
                        setModalError(null);
                      }}
                      options={employeeOptions}
                      placeholder="Select an employee…"
                      className="w-full"
                    />
                  )}
                </div>

                {/* Presets */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                    <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                    Presets:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setModalForm({ ...orgSchedule })}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors font-sans"
                    >
                      Copy Baseline ({orgTotal}h)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModalForm({ monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0 })
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors font-sans"
                    >
                      Standard (40h)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModalForm({ monday: 4, tuesday: 4, wednesday: 4, thursday: 4, friday: 4, saturday: 0, sunday: 0 })
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors font-sans"
                    >
                      Part-time (20h)
                    </button>
                  </div>
                </div>

                {/* Daily Hours Inputs */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-[#1e3a5f] font-sans tracking-wide">
                    Daily Schedule Hours
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {DAYS.map((day) => {
                      const val = modalForm[day.key];
                      const isWorkday = val > 0;

                      return (
                        <div
                          key={day.key}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isWorkday ? 'bg-white border-slate-200' : 'bg-slate-50 border-dashed border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                              {day.short}
                            </span>
                            {day.isWeekend && (
                              <span className="text-[10px] font-semibold text-slate-400 font-sans">Wknd</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={val}
                              onChange={(e) => handleModalDayChange(day.key, parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 bg-[#F9FBFC] border border-slate-200 rounded-lg text-sm font-bold text-slate-900 font-sans text-center focus:ring-2 focus:ring-slate-950/10 focus:border-slate-900 outline-none transition-all"
                            />
                            <span className="text-xs font-medium text-slate-400 font-sans">h</span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleModalDayChange(day.key, 0)}
                              className="text-[10px] text-slate-400 hover:text-slate-700 font-sans"
                            >
                              Off
                            </button>
                            <button
                              type="button"
                              onClick={() => handleModalDayChange(day.key, 8)}
                              className="text-[10px] text-slate-400 hover:text-slate-700 font-sans"
                            >
                              8h
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calculation Summary Bar */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-700 font-sans">
                      Target: <span className="text-slate-900 text-sm font-bold font-sans">{modalTotal} hrs / week</span>
                    </span>
                    <span className="text-xs text-slate-500 ml-2 font-sans">
                      ({modalWorkdays} workdays, {7 - modalWorkdays} off)
                    </span>
                  </div>
                  <div>
                    {modalVariance === 0 ? (
                      <span className="text-xs font-semibold text-slate-500 font-sans">
                        Matches Org Baseline
                      </span>
                    ) : modalVariance > 0 ? (
                      <span className="text-xs font-semibold text-emerald-700 font-sans">
                        +{modalVariance}h vs Baseline
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 font-sans">
                        {modalVariance}h vs Baseline
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/50 rounded-b-[20px]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSavingOverride}
                  className="px-4 py-2 text-[14px] font-bold text-slate-700 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={isSavingOverride || !modalEmployeeId}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-[#12161F] hover:bg-slate-800 text-white text-[14px] font-bold rounded-full shadow-xs transition-all duration-200 active:scale-[0.97] cursor-pointer disabled:opacity-50 font-sans"
                >
                  {isSavingOverride && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Override</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Portaled Confirmation Dialog */}
      {deleteTarget &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-slideUpFade">
            <div className="animate-successPop bg-white rounded-[20px] shadow-2xl w-full max-w-md border border-slate-200/80 p-6 flex flex-col">
              <div className="w-12 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 text-center font-sans">
                Remove Working Time Override?
              </h3>
              <p className="text-xs text-slate-500 text-center mt-1 leading-relaxed font-sans">
                Are you sure you want to remove the custom schedule override for{' '}
                <strong className="text-slate-800 font-semibold">{getEmployeeDisplayName(deleteTarget.employeeId)}</strong>?
                Their schedule will immediately revert to the organization baseline ({orgTotal} hrs / week).
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeletingOverride}
                  className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-full border border-slate-200 transition-colors cursor-pointer font-sans"
                >
                  Keep Override
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeletingOverride}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full shadow-xs transition-colors cursor-pointer disabled:opacity-50 font-sans"
                >
                  {isDeletingOverride && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Remove Override</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Page Root
// ─────────────────────────────────────────────────────────────────────────────
export const WorkingTimesConfig: React.FC = () => {
  const { refetch: refetchOrg, isFetching: orgFetching } = useGetOrgWorkingTimeQuery();
  const { refetch: refetchOverrides, isFetching: overridesFetching } = useGetWorkingTimeOverridesQuery();
  const { refetch: refetchEmp, isFetching: empFetching } = useGetEmployeesQuery({ limit: 100 });

  const isRefreshing = orgFetching || overridesFetching || empFetching;

  const handleRefresh = () => {
    refetchOrg();
    refetchOverrides();
    refetchEmp();
  };

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* 1. Header with Slide-up Animation (Clean text without SVG box) */}
      <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight">
            Working Times Configuration
          </h1>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
            Define standard operational working hours baseline and manage individual employee overrides.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            title="Refresh working times data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${isRefreshing ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh Working Times</span>
          </button>
        </div>
      </div>

      {/* 2. Organization Default Card */}
      <OrgDefaultCard onAddOverrideClick={() => {}} />

      {/* 3. Employee Overrides Table */}
      <OverridesTable />
    </div>
  );
};
