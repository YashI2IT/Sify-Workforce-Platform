import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  useGetOrganizationSettingsQuery, 
  useUpdateOrganizationSettingsMutation 
} from '../../store/apiSlice';
import { 
  Clock, ShieldCheck, Users, Briefcase, Save, 
  Edit2, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { Select } from '../../components/ui/Select';

export const OrganizationSettings = () => {
  const { data: settings, isLoading, error } = useGetOrganizationSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateOrganizationSettingsMutation();
  
  const [formData, setFormData] = useState({
    weekStartsOn: 1,
    timeZone: 'UTC',
    defaultEmployeeRole: 'EMPLOYEE',
    projectCreationPermission: 'ADMIN',
    projectAssignmentPermission: 'MANAGER',
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        weekStartsOn: settings.weekStartsOn ?? 1,
        timeZone: settings.timeZone || 'UTC',
        defaultEmployeeRole: settings.defaultEmployeeRole || 'EMPLOYEE',
        projectCreationPermission: settings.projectCreationPermission || 'ADMIN',
        projectAssignmentPermission: settings.projectAssignmentPermission || 'MANAGER',
      });
      setIsDirty(false);
    }
  }, [settings]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      checkDirty(next);
      return next;
    });
    setSaveMessage(null);
  };

  const checkDirty = (currentData: typeof formData) => {
    if (!settings) return;
    const hasChanges = 
      currentData.weekStartsOn !== settings.weekStartsOn ||
      currentData.timeZone !== settings.timeZone ||
      currentData.defaultEmployeeRole !== settings.defaultEmployeeRole ||
      currentData.projectCreationPermission !== settings.projectCreationPermission ||
      currentData.projectAssignmentPermission !== settings.projectAssignmentPermission;
    setIsDirty(hasChanges);
  };

  const handleCancel = () => {
    if (settings) {
      setFormData({
        weekStartsOn: settings.weekStartsOn ?? 1,
        timeZone: settings.timeZone || 'UTC',
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
      setSaveMessage({ type: 'success', text: 'Organization settings updated successfully.' });
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
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
    { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
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
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div className="animate-slideUpFade bg-white/95 border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden p-16">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
            <span className="text-sm text-slate-500 font-medium">Loading organization settings…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-[14px] flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>Failed to load organization settings. Please refresh or try again later.</span>
        </div>
      </div>
    );
  }

  const SelectInput = ({ label, description, options, value, onChange, placeholder = 'Select...', placement = 'auto' }: any) => {
    return (
      <div className="space-y-1.5">
        <div className="space-y-0.5 mb-2">
          <label className="block text-[13px] font-bold text-slate-800 tracking-wide">
            {label}
          </label>
          {description && <p className="text-xs text-slate-500">{description}</p>}
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 pb-36 relative">
      {/* 1. Header with Slide-up Animation */}
      <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Organization Settings
          </h1>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
            Configure organization-wide operational rules, time standards, and workforce policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/organization/profile"
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            title="Edit Organization Profile"
          >
            <Edit2 className="w-4 h-4 text-slate-500" strokeWidth={2.2} />
            <span>Edit Profile</span>
          </Link>
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
            >
              {isUpdating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" strokeWidth={2.2} />
              )}
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>

      {/* Save / Error Feedback Alert */}
      {saveMessage && (
        <div className={`animate-successPop p-4 rounded-xl flex items-center gap-3 text-sm shadow-2xs border ${
          saveMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {saveMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{saveMessage.text}</span>
        </div>
      )}

      {/* Section 1: Time & Timesheet */}
      <div className="animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] transition-shadow duration-300 hover:shadow-md">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
                Time & Timesheet Standards
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">Weekly schedule cycles and operational timezone</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 px-3 py-1 rounded-full bg-white border border-slate-200/70 font-sans">
            Scheduling
          </span>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <SelectInput 
              label="Work Week Starts On"
              description="Defines the first day of the weekly timesheet period."
              options={weekDayOptions}
              value={String(formData.weekStartsOn)}
              onChange={(val: string) => handleChange('weekStartsOn', parseInt(val, 10))}
            />
            
            <SelectInput 
              label="Organization Time Zone"
              description="Default time zone for operational scheduling."
              options={timeZoneOptions}
              value={formData.timeZone}
              onChange={(val: string) => handleChange('timeZone', val)}
            />
          </div>

          <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <label className="block text-[13px] font-bold text-slate-800 tracking-wide">Timesheet Approval Flow</label>
              <p className="text-xs text-slate-500 max-w-md">Timesheets must be reviewed and approved by a Manager or Administrator after submission.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0 self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              Required (Enforced)
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Workforce Access */}
      <div className="animate-slideUpFade-d2 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] transition-shadow duration-300 hover:shadow-md">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
                Workforce Access & Provisioning
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">Default onboarding role and membership policies</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 px-3 py-1 rounded-full bg-white border border-slate-200/70 font-sans">
            Governance
          </span>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <SelectInput 
              label="Default Employee Role"
              description="The role assigned to newly invited users by default."
              options={roleOptions}
              value={formData.defaultEmployeeRole}
              onChange={(val: string) => handleChange('defaultEmployeeRole', val)}
            />
          </div>

          <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <label className="block text-[13px] font-bold text-slate-800 tracking-wide">Employee Join Policy</label>
              <p className="text-xs text-slate-500 max-w-md">Determines how new members can join this organization. Currently restricted to direct invitations.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0 self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              Invitation Only
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Project Management */}
      <div className="animate-slideUpFade-d3 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] transition-shadow duration-300 hover:shadow-md">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/80 shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
                Project Management & Authorization
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">Control who can create projects and allocate workforce</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 px-3 py-1 rounded-full bg-white border border-slate-200/70 font-sans">
            Permissions
          </span>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <SelectInput 
              label="Project Creation Permission"
              description="Minimum role required to create new projects."
              options={permOptions}
              value={formData.projectCreationPermission}
              onChange={(val: string) => handleChange('projectCreationPermission', val)}
              placement="top"
            />
            
            <SelectInput 
              label="Project Assignment Permission"
              description="Minimum role required to assign employees to projects."
              options={permOptions}
              value={formData.projectAssignmentPermission}
              onChange={(val: string) => handleChange('projectAssignmentPermission', val)}
              placement="top"
            />
          </div>
        </div>
      </div>

      {/* Modern Floating Action Dock when isDirty */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 sm:right-10 z-40 bg-[#12161F] text-white rounded-full p-2 pl-5 shadow-2xl flex items-center gap-3 border border-slate-800 animate-slideUpFade">
          <span className="text-xs sm:text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Unsaved changes
          </span>
          <button 
            onClick={handleCancel}
            disabled={isUpdating}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            Discard
          </button>
          <button 
            onClick={handleSave} 
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-slate-950 hover:bg-slate-100 rounded-full text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-[0.97] cursor-pointer"
          >
            {isUpdating ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save</span>
          </button>
        </div>
      )}
    </div>
  );
};
