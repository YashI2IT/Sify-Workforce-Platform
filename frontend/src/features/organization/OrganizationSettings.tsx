import { useState, useEffect } from 'react';
import {
  useGetOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
} from '../../store/apiSlice';
import {
  Clock,
  ShieldCheck,
  Users,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Bell,
  Check,
} from 'lucide-react';
import { Select } from '../../components/ui/Select';

export const OrganizationSettings = () => {
  const { data: settings, isLoading, error } = useGetOrganizationSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateOrganizationSettingsMutation();

  const [formData, setFormData] = useState({
    weekStartsOn: 1,
    timeZone: 'UTC',
    dateFormat: 'DD/MM/YYYY',
    emailNotifications: true,
    defaultEmployeeRole: 'EMPLOYEE',
    projectCreationPermission: 'ADMIN',
    projectAssignmentPermission: 'MANAGER',
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        weekStartsOn: settings.weekStartsOn ?? 1,
        timeZone: settings.timeZone || 'UTC',
        dateFormat: settings.dateFormat || 'DD/MM/YYYY',
        emailNotifications: settings.emailNotifications ?? true,
        defaultEmployeeRole: settings.defaultEmployeeRole || 'EMPLOYEE',
        projectCreationPermission: settings.projectCreationPermission || 'ADMIN',
        projectAssignmentPermission: settings.projectAssignmentPermission || 'MANAGER',
      });
      setIsDirty(false);
    }
  }, [settings]);

  // Prevent accidental data loss on navigation away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      checkDirty(next);
      return next;
    });
    setSaveMessage(null);
  };

  const checkDirty = (currentData: typeof formData) => {
    if (!settings) return;
    const hasChanges =
      currentData.weekStartsOn !== (settings.weekStartsOn ?? 1) ||
      currentData.timeZone !== (settings.timeZone || 'UTC') ||
      currentData.dateFormat !== (settings.dateFormat || 'DD/MM/YYYY') ||
      currentData.emailNotifications !== (settings.emailNotifications ?? true) ||
      currentData.defaultEmployeeRole !== (settings.defaultEmployeeRole || 'EMPLOYEE') ||
      currentData.projectCreationPermission !== (settings.projectCreationPermission || 'ADMIN') ||
      currentData.projectAssignmentPermission !== (settings.projectAssignmentPermission || 'MANAGER');
    setIsDirty(hasChanges);
  };

  const handleCancel = () => {
    if (settings) {
      setFormData({
        weekStartsOn: settings.weekStartsOn ?? 1,
        timeZone: settings.timeZone || 'UTC',
        dateFormat: settings.dateFormat || 'DD/MM/YYYY',
        emailNotifications: settings.emailNotifications ?? true,
        defaultEmployeeRole: settings.defaultEmployeeRole || 'EMPLOYEE',
        projectCreationPermission: settings.projectCreationPermission || 'ADMIN',
        projectAssignmentPermission: settings.projectAssignmentPermission || 'MANAGER',
      });
      setIsDirty(false);
      setSaveMessage(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaveMessage(null);
      await updateSettings(formData).unwrap();
      setIsDirty(false);
      setSaveMessage({ type: 'success', text: 'Company settings updated successfully.' });
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err?.data?.message || 'Failed to update settings.' });
    }
  };

  // Options Definitions
  const weekDayOptions = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '7', label: 'Sunday' },
  ];

  const timeZoneOptions = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
    { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
    { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
  ];

  const dateFormatOptions = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 31/12/2026)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 12/31/2026)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2026-12-31)' },
  ];

  const roleOptions = [
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'ADMIN', label: 'Administrator' },
  ];

  const permOptions = [
    { value: 'ADMIN', label: 'Administrators Only' },
    { value: 'MANAGER', label: 'Managers and above' },
    { value: 'EMPLOYEE', label: 'Everyone' },
  ];

  if (isLoading) {
    return (
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 font-sans">
        <div className="animate-slideUpFade bg-white border border-slate-200/80 shadow-xs rounded-[14px] p-16">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0B1738] rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading company settings…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 font-sans">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-[14px] flex items-center gap-3 text-xs font-medium max-w-lg mx-auto">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>Failed to load company settings. Please refresh or try again later.</span>
        </div>
      </div>
    );
  }

  const SelectInput = ({ label, description, options, value, onChange, placeholder = 'Select...', placement = 'auto' }: any) => {
    return (
      <div className="space-y-1.5">
        <div className="space-y-0.5 mb-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            {label}
          </label>
          {description && <p className="text-xs text-slate-500 font-normal">{description}</p>}
        </div>
        <Select
          options={options}
          value={value}
          onChange={onChange}
          size="md"
          placeholder={placeholder}
          placement={placement}
        />
      </div>
    );
  };

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 pb-28 font-sans">
      {/* 1. Header */}
      <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-[#0B1738] tracking-tight">
            Company Settings
          </h1>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
            Manage schedules, preferences, and access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-slate-800 text-white rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20"
            >
              {isUpdating ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>

      {/* Save / Error Feedback Alert */}
      {saveMessage && (
        <div
          className={`animate-successPop p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium border shadow-2xs ${
            saveMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {saveMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{saveMessage.text}</span>
        </div>
      )}

      {/* Section A: Work Schedule */}
      <section
        aria-labelledby="work-schedule-heading"
        className="animate-slideUpFade-d1 bg-white border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-200 hover:shadow-sm"
      >
        <div className="px-6 py-4 border-b border-slate-100 bg-[#F7F8FA] flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B1738] text-white flex items-center justify-center shadow-2xs shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 id="work-schedule-heading" className="text-base font-bold text-[#0B1738] tracking-tight">
                Work Schedule
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Set your weekly schedule and timesheet rules.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectInput
              label="Work Week Starts On"
              description="First day of the weekly timesheet."
              options={weekDayOptions}
              value={String(formData.weekStartsOn)}
              onChange={(val: string) => handleChange('weekStartsOn', parseInt(val, 10))}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Timesheet Approval
              </label>
              <p className="text-xs text-slate-500 font-normal">
                Weekly timesheet approval.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0 self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Required
            </span>
          </div>
        </div>
      </section>

      {/* Section B: Company Preferences */}
      <section
        aria-labelledby="company-preferences-heading"
        className="animate-slideUpFade-d2 bg-white border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-200 hover:shadow-sm"
      >
        <div className="px-6 py-4 border-b border-slate-100 bg-[#F7F8FA] flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B1738] text-white flex items-center justify-center shadow-2xs shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 id="company-preferences-heading" className="text-base font-bold text-[#0B1738] tracking-tight">
                Company Preferences
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Set your time zone, date format, and email alerts.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectInput
              label="Time Zone"
              description="Used for company scheduling and dates."
              options={timeZoneOptions}
              value={formData.timeZone}
              onChange={(val: string) => handleChange('timeZone', val)}
            />

            <SelectInput
              label="Date Format"
              description="Choose how dates appear."
              options={dateFormatOptions}
              value={formData.dateFormat}
              onChange={(val: string) => handleChange('dateFormat', val)}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-slate-500" />
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email Notifications
                </label>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Send supported alerts by email.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.emailNotifications}
              aria-label="Toggle email notifications"
              onClick={() => handleChange('emailNotifications', !formData.emailNotifications)}
              className={`${
                formData.emailNotifications ? 'bg-[#0B1738]' : 'bg-slate-200'
              } relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20 self-start sm:self-auto`}
            >
              <span
                className={`${
                  formData.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Section C: Employee Access */}
      <section
        aria-labelledby="employee-access-heading"
        className="animate-slideUpFade-d3 bg-white border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-200 hover:shadow-sm"
      >
        <div className="px-6 py-4 border-b border-slate-100 bg-[#F7F8FA] flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B1738] text-white flex items-center justify-center shadow-2xs shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 id="employee-access-heading" className="text-base font-bold text-[#0B1738] tracking-tight">
                Employee Access
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Set default access for new employees.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectInput
              label="Default Employee Role"
              description="Role assigned to new employees."
              options={roleOptions}
              value={formData.defaultEmployeeRole}
              onChange={(val: string) => handleChange('defaultEmployeeRole', val)}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Employee Join Policy
              </label>
              <p className="text-xs text-slate-500 font-normal">
                Who can join the company?
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0 self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              Invitation Only
            </span>
          </div>
        </div>
      </section>

      {/* Section D: Project Permissions */}
      <section
        aria-labelledby="project-permissions-heading"
        className="animate-slideUpFade bg-white border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-200 hover:shadow-sm"
      >
        <div className="px-6 py-4 border-b border-slate-100 bg-[#F7F8FA] flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B1738] text-white flex items-center justify-center shadow-2xs shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 id="project-permissions-heading" className="text-base font-bold text-[#0B1738] tracking-tight">
                Project Permissions
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Control who can create and assign projects.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectInput
              label="Project Creation Permission"
              description="Who can create projects?"
              options={permOptions}
              value={formData.projectCreationPermission}
              onChange={(val: string) => handleChange('projectCreationPermission', val)}
              placement="top"
            />

            <SelectInput
              label="Project Assignment Permission"
              description="Who can assign employees to projects?"
              options={permOptions}
              value={formData.projectAssignmentPermission}
              onChange={(val: string) => handleChange('projectAssignmentPermission', val)}
              placement="top"
            />
          </div>
        </div>
      </section>

      {/* Floating Action Dock when isDirty */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 sm:right-10 z-40 bg-[#0B1738] text-white rounded-full p-2 pl-5 shadow-2xl flex items-center gap-3 border border-slate-800 animate-slideUpFade">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Unsaved changes
          </span>
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-[#0B1738] hover:bg-slate-100 rounded-full text-xs font-bold shadow-xs transition-all active:scale-[0.97] cursor-pointer"
          >
            {isUpdating ? (
              <div className="w-3.5 h-3.5 border-2 border-[#0B1738]/30 border-t-[#0B1738] rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      )}
    </div>
  );
};
