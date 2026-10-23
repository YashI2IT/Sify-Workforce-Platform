import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  useGetOrgWorkingTimeQuery,
  useUpdateOrgWorkingTimeMutation,
  useGetWorkingTimeOverridesQuery,
  useUpsertEmployeeWorkingTimeMutation,
  useDeleteEmployeeWorkingTimeMutation,
  useGetEmployeesQuery,
  useGetPublicHolidaysQuery,
  useCreatePublicHolidayMutation,
  useUpdatePublicHolidayMutation,
  useDeletePublicHolidayMutation,
  useImportPublicHolidaysMutation,
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
  AlertTriangle,
  Clock,
  CalendarDays,
  Upload,
  FileText,
  XCircle,
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { DatePicker } from '../../components/ui/DatePicker';
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

/** Format a YYYY-MM-DD string as "Jan 1, 2026 (Monday)" using native Intl */
const formatHolidayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const clean = String(dateStr).split('T')[0];
  const [year, month, day] = clean.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  const datePart = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'long' });
  return `${datePart} (${weekday})`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Standard Working Hours
// ─────────────────────────────────────────────────────────────────────────────
const OrgDefaultScheduleSection: React.FC = () => {
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
      showToast('Standard working hours updated successfully', 'success');
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      const msg = err?.data?.message || 'Failed to update standard working hours';
      setFormError(msg);
      showToast(msg, 'error');
    }
  };

  const currentTotal = calculateTotalHours(currentSchedule);
  const currentWorkdays = countWorkingDays(currentSchedule);
  const currentRestDays = 7 - currentWorkdays;

  const formTotal = calculateTotalHours(formData);
  const formWorkdays = countWorkingDays(formData);
  const formRestDays = 7 - formWorkdays;

  if (isLoading && !orgWT) {
    return (
      <div className="animate-slideUpFade-d1 bg-white border border-slate-200/80 shadow-xs rounded-[14px] p-12">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0B1738] rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading standard working hours…</span>
        </div>
      </div>
    );
  }

  return (
    <section
      id="standard-working-hours"
      aria-labelledby="standard-working-hours-heading"
      className="animate-slideUpFade-d1 bg-white border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-200 hover:shadow-sm"
    >
      {/* Section Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-[#F7F8FA] flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0B1738] text-white flex items-center justify-center shadow-2xs shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 id="standard-working-hours-heading" className="text-base font-bold text-[#0B1738] font-sans tracking-tight">
              Standard Working Hours
            </h2>
            <p className="text-xs text-slate-500 font-normal font-sans mt-0.5">
              Applies to employees without an individual schedule.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Summary Badges */}
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white text-[#0B1738] border border-slate-200 shadow-2xs font-sans">
            {currentTotal} hours/week
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {currentWorkdays} workdays
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/80 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {currentRestDays} rest days
          </span>

          {!isEditing && (
            <button
              onClick={openEdit}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20 font-sans ml-1"
              title="Edit Schedule"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* Section Content */}
      {isEditing ? (
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium font-sans">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Quick Preset Selector */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 font-sans">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0B1738]">
              <Sparkles className="w-3.5 h-3.5 text-[#0B1738]" />
              <span>Quick Presets:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Standard (40h Mon-Fri)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('45h')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                45h (9h Mon-Fri)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('48h')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                48h (8h Mon-Sat)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('reset')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
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
                      ? 'bg-white border-slate-200 shadow-2xs'
                      : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                      {day.short}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 font-sans">
                      {day.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={val}
                      onChange={(e) => handleDayChange(day.key, parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-[#F9FBFC] border border-slate-200 rounded-lg text-sm font-bold text-[#0B1738] font-sans text-center focus:ring-2 focus:ring-[#0B1738]/10 focus:border-[#0B1738] outline-none transition-all"
                    />
                    <span className="text-xs font-medium text-slate-500 font-sans">hrs</span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-1 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleDayChange(day.key, 0)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        val === 0 ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      Off
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDayChange(day.key, 8)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
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
          <div className="px-6 py-4 bg-[#F7F8FA] -mx-6 -mb-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 font-sans">
                Total Target:{' '}
                <span className="text-[#0B1738] text-sm font-bold font-sans">
                  {formTotal} hours/week
                </span>
              </span>
              <span className="text-xs text-slate-500 font-sans">
                ({formWorkdays} workdays, {formRestDays} rest days)
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isUpdating}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/70 rounded-[10px] transition-colors cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="inline-flex items-center justify-center gap-2 h-9 px-5 py-2 bg-[#0B1738] hover:bg-slate-800 text-white rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer font-sans"
              >
                {isUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Schedule</span>
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
                      ? 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                      : 'bg-[#F7F8FA] border-dashed border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0B1738] font-sans">
                      {day.short}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 font-sans">
                      {day.label}
                    </span>
                  </div>

                  <div className="my-2.5">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-2xl font-bold tracking-tight font-sans ${
                          isWorkday ? 'text-[#0B1738]' : 'text-slate-300'
                        }`}
                      >
                        {hours > 0 ? hours : 0}
                      </span>
                      <span className="text-xs font-medium text-slate-500 font-sans">hrs</span>
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
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        Rest day
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Employee Work Schedules
// ─────────────────────────────────────────────────────────────────────────────
const EmployeeOverridesSection: React.FC = () => {
  const { data: overridesData = [] } = useGetWorkingTimeOverridesQuery();
  const { data: employeesData } = useGetEmployeesQuery({ limit: 100 });
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

  const filteredOverrides = useMemo(() => {
    if (!searchQuery.trim()) return overrides;
    const q = searchQuery.toLowerCase().trim();
    return overrides.filter((ov: any) => {
      const name = getEmployeeDisplayName(ov.employeeId).toLowerCase();
      const emp = getEmployee(ov.employeeId);
      const email = (emp?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
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

  const handleModalDayChange = (day: DayKey, value: number) => {
    const clamped = Math.max(0, Math.min(24, Math.round(value * 2) / 2));
    setModalForm((prev) => ({ ...prev, [day]: clamped }));
    setModalError(null);
  };

  const applyModalPreset = (preset: 'standard' | '45h' | '48h' | 'org') => {
    if (preset === 'standard') {
      setModalForm({ monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0 });
    } else if (preset === '45h') {
      setModalForm({ monday: 9, tuesday: 9, wednesday: 9, thursday: 9, friday: 9, saturday: 0, sunday: 0 });
    } else if (preset === '48h') {
      setModalForm({ monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 8, sunday: 0 });
    } else if (preset === 'org') {
      setModalForm({ ...orgSchedule });
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEmployeeId) {
      setModalError('Please select an employee.');
      return;
    }

    try {
      await upsertOverride({
        employeeId: modalEmployeeId,
        data: modalForm,
      }).unwrap();

      showToast(`Individual schedule saved for ${getEmployeeDisplayName(modalEmployeeId)}`, 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      const msg = err?.data?.message || 'Failed to save employee schedule';
      setModalError(msg);
      showToast(msg, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOverride(deleteTarget.employeeId).unwrap();
      showToast(`Removed individual schedule for ${getEmployeeDisplayName(deleteTarget.employeeId)}`, 'success');
      setDeleteTarget(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.data?.message || 'Failed to remove employee schedule';
      showToast(msg, 'error');
    }
  };

  const availableEmployees = useMemo(() => {
    return employees.filter((emp: any) => {
      if (emp.id === modalEmployeeId) return true;
      return !overrides.some((ov: any) => ov.employeeId === emp.id);
    });
  }, [employees, overrides, modalEmployeeId]);

  const modalTotal = calculateTotalHours(modalForm);
  const modalWorkdays = countWorkingDays(modalForm);
  const modalVariance = modalTotal - orgTotal;

  const isEditing = Boolean(overrides.some((ov: any) => ov.employeeId === modalEmployeeId));

  // Count label: "0 custom schedules" when empty
  const countLabel =
    filteredOverrides.length === 0
      ? '0 custom schedules'
      : `${filteredOverrides.length} custom schedule${filteredOverrides.length === 1 ? '' : 's'}`;

  return (
    <section
      id="employee-schedules"
      aria-labelledby="employee-schedules-heading"
      className="animate-slideUpFade-d2 bg-white border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-200 hover:shadow-sm"
    >
      {/* Section Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-[#F7F8FA] flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0B1738] text-white flex items-center justify-center shadow-2xs shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 id="employee-schedules-heading" className="text-base font-bold text-[#0B1738] font-sans tracking-tight">
              Employee Work Schedules
            </h2>
            <p className="text-xs text-slate-500 font-normal font-sans mt-0.5">
              Set different working hours for individual employees.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employees..."
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-[10px] text-xs font-sans text-[#0B1738] placeholder:text-slate-400 focus:ring-2 focus:ring-[#0B1738]/10 focus:border-[#0B1738] outline-none transition-all w-52 sm:w-64"
            />
          </div>

          <span className="text-xs font-semibold text-slate-700 px-3 py-1 rounded-full bg-white border border-slate-200/80 shadow-2xs font-sans">
            {countLabel}
          </span>

          <button
            onClick={openNewOverride}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-slate-800 text-white rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20 font-sans"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Employee Schedule</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200/80">
              <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider font-sans">
                Employee
              </th>
              {DAYS.map((d) => (
                <th key={d.key} className="px-3 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center font-sans">
                  {d.short}
                </th>
              ))}
              <th className="px-4 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center font-sans">
                Weekly Total
              </th>
              <th className="px-4 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center font-sans">
                Difference
              </th>
              <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right font-sans">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOverrides.map((ov: any) => {
              const emp = getEmployee(ov.employeeId);
              const displayName = getEmployeeDisplayName(ov.employeeId);
              const initials = getEmployeeInitials(ov.employeeId);
              const total = calculateTotalHours(ov);
              const difference = total - orgTotal;

              return (
                <tr key={ov.employeeId || ov.id} className="hover:bg-slate-50/60 transition-colors duration-150 group">
                  <td className="px-6 py-3.5 text-[13px] leading-[20px] text-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#0B1738] text-white flex items-center justify-center font-bold text-xs font-sans shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0B1738] font-sans">{displayName}</p>
                        {emp?.email && <p className="text-xs text-slate-500 font-sans">{emp.email}</p>}
                      </div>
                    </div>
                  </td>

                  {DAYS.map((d) => {
                    const hours = Number(ov[d.key] ?? 0);
                    return (
                      <td key={d.key} className="px-3 py-3.5 text-[13px] text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${
                            hours > 0 ? 'bg-slate-100 text-slate-800' : 'text-slate-300'
                          }`}
                        >
                          {hours > 0 ? `${hours}h` : '—'}
                        </span>
                      </td>
                    );
                  })}

                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-[#0B1738] font-mono">
                      {total} hrs
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-center font-sans">
                    {difference === 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        Equal
                      </span>
                    ) : difference > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                        +{difference}h
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                        {difference}h
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditOverride(ov)}
                        className="p-1.5 text-slate-400 hover:text-[#0B1738] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit employee schedule"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(ov)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove employee schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!filteredOverrides.length && overrides.length === 0 && (
              <tr>
                <td colSpan={11} className="px-6 py-14 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                      <Users className="w-5 h-5 strokeWidth={1.8}" />
                    </div>
                    <p className="text-sm font-semibold text-[#0B1738] font-sans">
                      No individual schedules yet
                    </p>
                    <p className="text-xs text-slate-500 font-sans max-w-md">
                      Everyone follows the standard working hours.
                    </p>
                    <button
                      onClick={openNewOverride}
                      className="mt-3 inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-slate-800 text-white rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer font-sans"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Employee Schedule</span>
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {!filteredOverrides.length && overrides.length > 0 && (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Search className="w-6 h-6 text-slate-300 strokeWidth={1.8}" />
                    <p className="text-sm font-semibold text-[#0B1738] font-sans">
                      No matching employees found
                    </p>
                    <p className="text-xs text-slate-500 font-sans max-w-md">
                      No custom schedule matches &ldquo;{searchQuery}&rdquo;. Try another search term or clear the filter.
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-xs font-semibold text-[#0B1738] hover:underline cursor-pointer font-sans"
                    >
                      Clear search filter
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Portaled Modal */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-slideUpFade">
            <div className="animate-successPop bg-white rounded-[16px] shadow-2xl w-full max-w-2xl border border-slate-200/80 flex flex-col max-h-[90vh] overflow-hidden font-sans">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-[#F7F8FA]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0B1738] text-white flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0B1738] tracking-tight">
                      {isEditing ? 'Edit Employee Schedule' : 'Add Employee Schedule'}
                    </h3>
                    <p className="text-xs text-slate-500 font-normal">
                      Set different working hours for an individual employee.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Employee Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Select Employee <span className="text-rose-500">*</span>
                  </label>
                  {isEditing ? (
                    <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-[#0B1738]">
                      {getEmployeeDisplayName(modalEmployeeId)}
                    </div>
                  ) : (
                    <Select
                      options={availableEmployees.map((e: any) => ({
                        value: e.id,
                        label: `${e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email} (${e.email || 'No email'})`,
                      }))}
                      value={modalEmployeeId}
                      onChange={(val: string) => setModalEmployeeId(val)}
                      placeholder="Select an employee..."
                      size="md"
                    />
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B1738]">
                    <Sparkles className="w-3.5 h-3.5 text-[#0B1738]" />
                    <span>Quick Presets:</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyModalPreset('standard')}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      40h (Mon-Fri)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyModalPreset('45h')}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      45h (9h Mon-Fri)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyModalPreset('48h')}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      48h (8h Mon-Sat)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyModalPreset('org')}
                      className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      Copy Standard Hours
                    </button>
                  </div>
                </div>

                {/* 7 Days Grid */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Daily Schedule Hours
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {DAYS.map((day) => {
                      const val = modalForm[day.key];
                      const isWorkday = val > 0;

                      return (
                        <div
                          key={day.key}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isWorkday
                              ? 'bg-white border-slate-200 shadow-2xs'
                              : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                              {day.short}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={val}
                              onChange={(e) => handleModalDayChange(day.key, parseFloat(e.target.value) || 0)}
                              className="w-full px-1.5 py-1 bg-[#F9FBFC] border border-slate-200 rounded text-sm font-bold text-[#0B1738] text-center focus:ring-2 focus:ring-[#0B1738]/10 focus:border-[#0B1738] outline-none"
                            />
                            <span className="text-[10px] font-medium text-slate-400">h</span>
                          </div>

                          <div className="mt-1.5 flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleModalDayChange(day.key, 0)}
                              className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              Off
                            </button>
                            <button
                              type="button"
                              onClick={() => handleModalDayChange(day.key, 8)}
                              className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer"
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
                <div className="p-3.5 bg-[#F7F8FA] border border-slate-200/80 rounded-xl flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-700">
                      Target: <span className="text-[#0B1738] text-sm font-bold">{modalTotal} hours/week</span>
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({modalWorkdays} workdays, {7 - modalWorkdays} rest days)
                    </span>
                  </div>
                  <div>
                    {modalVariance === 0 ? (
                      <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                        Equal to standard
                      </span>
                    ) : modalVariance > 0 ? (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                        +{modalVariance}h vs standard
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">
                        {modalVariance}h vs standard
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-[#F7F8FA]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSavingOverride}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/70 rounded-[10px] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={isSavingOverride || !modalEmployeeId}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#0B1738] hover:bg-slate-800 text-white text-xs font-semibold rounded-[10px] shadow-2xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isSavingOverride && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Schedule</span>
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
            <div className="animate-successPop bg-white rounded-[16px] shadow-2xl w-full max-w-md border border-slate-200/80 p-6 flex flex-col font-sans">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-[#0B1738] text-center tracking-tight">
                Remove Employee Schedule?
              </h3>
              <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
                Are you sure you want to remove the individual schedule for{' '}
                <strong className="text-[#0B1738] font-semibold">{getEmployeeDisplayName(deleteTarget.employeeId)}</strong>?
                Their schedule will immediately revert to the standard working hours ({orgTotal} hours/week).
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeletingOverride}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-[10px] border border-slate-200 transition-colors cursor-pointer"
                >
                  Keep Schedule
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeletingOverride}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-[10px] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeletingOverride && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Remove Schedule</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Company Holidays
// ─────────────────────────────────────────────────────────────────────────────
const PublicHolidaysSection: React.FC = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const { data: holidays, isLoading } = useGetPublicHolidaysQuery({ year: currentYear });

  const [createHoliday] = useCreatePublicHolidayMutation();
  const [updateHoliday] = useUpdatePublicHolidayMutation();
  const [deleteHoliday] = useDeletePublicHolidayMutation();
  const [importHolidays] = useImportPublicHolidaysMutation();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        date: formData.date,
        isActive: formData.isActive,
      };

      if (editItem) {
        await updateHoliday({ id: editItem.id, data: payload }).unwrap();
        showToast('Company holiday updated successfully', 'success');
      } else {
        await createHoliday(payload).unwrap();
        showToast('Company holiday created successfully', 'success');
      }
      setIsModalOpen(false);
      setEditItem(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.data?.message || 'Failed to save company holiday';
      showToast(msg, 'error');
    }
  };

  const openNew = () => {
    setEditItem(null);
    setFormData({
      name: '',
      date: new Date().toISOString().split('T')[0],
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (holiday: any) => {
    setEditItem(holiday);
    setFormData({
      name: holiday.name,
      date: new Date(holiday.date).toISOString().split('T')[0],
      isActive: holiday.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete company holiday "${name}"?`)) {
      try {
        await deleteHoliday(id).unwrap();
        showToast(`Deleted company holiday "${name}"`, 'success');
      } catch (err: any) {
        console.error(err);
        showToast(err?.data?.message || 'Failed to delete company holiday', 'error');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const fd = new FormData();
    fd.append('file', file);

    try {
      const result = await importHolidays(fd).unwrap();
      setImportResult(result);
      showToast(`Imported ${result.success || 0} holidays successfully`, 'success');
    } catch (err: any) {
      setImportResult({
        total: 0,
        success: 0,
        skipped: 0,
        failed: 1,
        errors: [{ row: 0, reason: err?.data?.message || err?.message || 'Failed to import' }],
      });
      showToast('Company holiday import failed', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <section
      id="company-holidays"
      aria-labelledby="company-holidays-heading"
      className="animate-slideUpFade-d3 bg-white border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-200 hover:shadow-sm"
    >
      {/* Section Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-[#F7F8FA] flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0B1738] text-white flex items-center justify-center shadow-2xs shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h2 id="company-holidays-heading" className="text-base font-bold text-[#0B1738] font-sans tracking-tight">
              Company Holidays
            </h2>
            <p className="text-xs text-slate-500 font-normal font-sans mt-0.5">
              Company holidays excluded from scheduled working hours.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Year navigator */}
          <div className="flex items-center gap-1 bg-white border border-slate-200/80 p-0.5 rounded-[10px] shadow-2xs font-sans">
            <button
              onClick={() => setCurrentYear((prev) => prev - 1)}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer text-xs font-bold"
              title="Previous Year"
              aria-label="Previous Year"
            >
              &larr;
            </button>
            <span className="px-3 py-1 text-xs font-bold text-[#0B1738]">
              {currentYear}
            </span>
            <button
              onClick={() => setCurrentYear((prev) => prev + 1)}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer text-xs font-bold"
              title="Next Year"
              aria-label="Next Year"
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
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20 font-sans"
            title="Import holidays from CSV"
          >
            <Upload className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>{isImporting ? 'Importing…' : 'Import Holidays'}</span>
          </button>

          <button
            onClick={openNew}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-slate-800 text-white rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20 font-sans"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0B1738] rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium font-sans">Loading holidays…</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80">
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider font-sans">
                  Date
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider font-sans">
                  Holiday
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center font-sans">
                  Status
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right font-sans">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holidays?.map((holiday: any, index: number) => (
                <tr
                  key={holiday.id || index}
                  className="hover:bg-slate-50/60 transition-colors duration-150 group"
                >
                  <td className="px-6 py-3.5 text-[13px] leading-[20px] text-[#0B1738] font-medium font-sans">
                    {formatHolidayDate(holiday.date)}
                  </td>
                  <td className="px-6 py-3.5 text-[13px] leading-[20px] text-[#0B1738] font-semibold font-sans">
                    {holiday.name}
                  </td>
                  <td className="px-6 py-3.5 text-[13px] leading-[20px] text-center font-sans">
                    {holiday.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/80">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-[13px] leading-[20px] text-right font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(holiday)}
                        className="p-1.5 text-slate-400 hover:text-[#0B1738] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit holiday"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(holiday.id, holiday.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete holiday"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!holidays?.length && (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <CalendarDays className="w-5 h-5 strokeWidth={1.8}" />
                      </div>
                      <p className="text-sm font-semibold text-[#0B1738] font-sans">
                        No holidays configured for {currentYear}
                      </p>
                      <p className="text-xs text-slate-500 font-sans max-w-md">
                        Click &ldquo;Add Holiday&rdquo; or &ldquo;Import Holidays&rdquo; to add company holidays for this year.
                      </p>
                      <button
                        onClick={openNew}
                        className="mt-3 inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-slate-800 text-white rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer font-sans"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Holiday</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Holiday Modal */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-slideUpFade">
            <div className="animate-successPop bg-white rounded-[16px] shadow-2xl w-full max-w-[400px] border border-slate-200/80 flex flex-col font-sans">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-[#F7F8FA]">
                <h3 className="text-base font-bold text-[#0B1738] tracking-tight">
                  {editItem ? 'Edit Holiday' : 'Add Holiday'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                <form id="holidayForm" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Holiday Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Independence Day"
                      className="w-full px-3 py-2 bg-[#F9FBFC] border border-slate-200 rounded-[10px] text-sm text-[#0B1738] focus:ring-2 focus:ring-[#0B1738]/10 focus:border-[#0B1738] outline-none transition-all font-medium placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Date <span className="text-rose-500">*</span>
                    </label>
                    <DatePicker
                      value={formData.date}
                      onChange={(val) => setFormData({ ...formData, date: val })}
                      className="w-full"
                      buttonClassName="w-full flex items-center justify-between h-[38px] px-3 py-2 bg-[#F9FBFC] border border-slate-200 rounded-[10px] text-sm text-[#0B1738] focus:ring-2 focus:ring-[#0B1738]/10 focus:border-[#0B1738] outline-none transition-all font-medium"
                      openUpward={true}
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-[6px] checked:bg-[#0B1738] checked:border-[#0B1738] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0B1738]/20"
                        />
                        <svg
                          className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                        Active (excluded from scheduled working hours)
                      </span>
                    </label>
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-[#F7F8FA]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/70 rounded-[10px] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="holidayForm"
                  className="px-5 py-2 bg-[#0B1738] hover:bg-slate-800 text-white text-xs font-semibold rounded-[10px] shadow-2xs transition-colors cursor-pointer"
                >
                  Save Holiday
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Import Result Modal */}
      {importResult &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-slideUpFade">
            <div className="animate-successPop bg-white rounded-[16px] shadow-xl w-full max-w-md overflow-hidden border border-slate-200/60 font-sans">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#F7F8FA]">
                <h3 className="text-sm font-bold text-[#0B1738] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Holiday Import Results
                </h3>
                <button
                  onClick={() => setImportResult(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center divide-x divide-slate-100 border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                  <div className="flex-1 p-3.5 flex flex-col items-center justify-center bg-slate-50/50">
                    <div className="text-2xl font-bold text-[#0B1738]">{importResult.total || 0}</div>
                    <div className="text-[10px] font-bold text-slate-500 tracking-wider mt-0.5 uppercase">Total</div>
                  </div>
                  <div className="flex-1 p-3.5 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-emerald-600">{importResult.success || 0}</div>
                    <div className="text-[10px] font-bold text-slate-500 tracking-wider mt-0.5 uppercase">Imported</div>
                  </div>
                  <div className="flex-1 p-3.5 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-amber-600">{importResult.skipped || 0}</div>
                    <div className="text-[10px] font-bold text-slate-500 tracking-wider mt-0.5 uppercase">Skipped</div>
                  </div>
                  <div className="flex-1 p-3.5 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-rose-600">{importResult.failed || 0}</div>
                    <div className="text-[10px] font-bold text-slate-500 tracking-wider mt-0.5 uppercase">Failed</div>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      Row Issues ({importResult.errors.length})
                    </div>
                    <div className="max-h-36 overflow-y-auto border border-rose-100 rounded-xl bg-rose-50/40 p-2.5 text-xs space-y-1">
                      {importResult.errors.map((err: any, idx: number) => (
                        <div key={idx} className="text-rose-700">
                          Row {err.row}: {err.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setImportResult(null)}
                    className="px-5 py-2 bg-[#0B1738] hover:bg-slate-800 text-white text-xs font-semibold rounded-[10px] shadow-2xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Combined Page Root: Work Calendar
// ─────────────────────────────────────────────────────────────────────────────
export const WorkCalendar: React.FC = () => {
  const location = useLocation();
  const { refetch: refetchOrg, isFetching: orgFetching } = useGetOrgWorkingTimeQuery();
  const { refetch: refetchOverrides, isFetching: overridesFetching } = useGetWorkingTimeOverridesQuery();
  const { refetch: refetchEmp, isFetching: empFetching } = useGetEmployeesQuery({ limit: 100 });
  const { refetch: refetchHolidays, isFetching: holidaysFetching } = useGetPublicHolidaysQuery();

  const isRefreshing = orgFetching || overridesFetching || empFetching || holidaysFetching;

  const handleRefresh = () => {
    refetchOrg();
    refetchOverrides();
    refetchEmp();
    refetchHolidays();
  };

  // Support smooth hash scrolling (e.g. /admin/work-calendar#company-holidays)
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* 1. Page Header with Slide-up Animation */}
      <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-[#0B1738] tracking-tight">
            Work Calendar
          </h1>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
            Manage standard working hours, individual employee schedules, and company holidays.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20 font-sans"
            title="Refresh work calendar data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-500 ${
                isRefreshing ? 'animate-spin text-[#0B1738]' : ''
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Section 1: Standard Working Hours */}
      <OrgDefaultScheduleSection />

      {/* 3. Section 2: Employee Work Schedules */}
      <EmployeeOverridesSection />

      {/* 4. Section 3: Company Holidays */}
      <PublicHolidaysSection />
    </div>
  );
};
