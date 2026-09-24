import { useState, useEffect } from 'react';
import { useGetOrganizationSettingsQuery, useUpdateOrganizationSettingsMutation } from '../../store/apiSlice';
import { Clock, ShieldCheck, Users, Briefcase, Info, Save, X, ChevronDown, Check, Settings2 } from 'lucide-react';

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

  // Custom Dropdown State
  const [dropdowns, setDropdowns] = useState<Record<string, boolean>>({
    weekStartsOn: false,
    timeZone: false,
    defaultEmployeeRole: false,
    projectCreationPermission: false,
    projectAssignmentPermission: false,
  });

  const toggleDropdown = (field: string) => {
    setDropdowns(prev => ({
      weekStartsOn: false,
      timeZone: false,
      defaultEmployeeRole: false,
      projectCreationPermission: false,
      projectAssignmentPermission: false,
      [field]: !prev[field],
    }));
  };

  const closeDropdowns = () => {
    setDropdowns({
      weekStartsOn: false,
      timeZone: false,
      defaultEmployeeRole: false,
      projectCreationPermission: false,
      projectAssignmentPermission: false,
    });
  };

  useEffect(() => {
    const handleClickOutside = () => closeDropdowns();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' },
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 pb-20 animate-fadeIn">
        <div className="h-12 w-64 bg-slate-200 animate-pulse rounded-lg" />
        <div className="h-48 bg-slate-200 animate-pulse rounded-2xl" />
        <div className="h-48 bg-slate-200 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <Info className="w-5 h-5" />
          Failed to load organization settings.
        </div>
      </div>
    );
  }

  const SelectInput = ({ field, label, description, options, value, type = 'string' }: any) => {
    const selectedOption = options.find((o: any) => o.value === value);
    const isOpen = dropdowns[field];

    return (
      <div className="space-y-1.5 relative">
        <div className="space-y-0.5 mb-2">
          <label className="block text-xs sm:text-[13px] font-semibold text-slate-700">
            {label}
          </label>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
        
        {/* Native Select for accessibility */}
        <select
          value={value}
          onChange={(e) => handleChange(field, type === 'number' ? parseInt(e.target.value) : e.target.value)}
          className="sr-only"
          tabIndex={-1}
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Custom Styled Trigger Button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleDropdown(field); }}
          className={`w-full h-11 rounded-xl border bg-white px-3.5 text-sm text-slate-900 flex items-center justify-between transition-all shadow-2xs cursor-pointer ${
            isOpen
              ? 'border-slate-900 ring-2 ring-slate-950/15'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="font-medium text-slate-900 truncate">
            {selectedOption?.label || 'Select...'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
              isOpen ? 'rotate-180 text-slate-700' : ''
            }`}
          />
        </button>

        {/* Custom Dropdown Popover */}
        {isOpen && (
          <div
            className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[195px] overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 p-1 space-y-0.5 animate-fadeIn"
            role="listbox"
          >
            {options.map((opt: any) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChange(field, type === 'number' ? parseInt(opt.value) : opt.value);
                    closeDropdowns();
                  }}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100 text-slate-950 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 pb-20 animate-fadeIn relative">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display">
              Organization Settings
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
            <Settings2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Configure organization-wide operating rules.</span>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <Info className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{saveMessage.text}</span>
        </div>
      )}

      {/* Time & Timesheet */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Clock className="w-3 h-3" />
          </div>
          <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
            Time & Timesheet
          </h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SelectInput 
              field="weekStartsOn"
              label="Work Week Starts On"
              description="Defines the first day of the weekly timesheet period."
              options={weekDayOptions}
              value={formData.weekStartsOn}
              type="number"
            />
            
            <SelectInput 
              field="timeZone"
              label="Organization Time Zone"
              description="Default time zone for operational scheduling."
              options={timeZoneOptions}
              value={formData.timeZone}
            />
          </div>

          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700">Timesheet Approval</label>
                <p className="text-xs text-slate-500 max-w-md">Timesheets must be reviewed and approved by a Manager or Administrator after submission.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                Required (Enforced)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Workforce Access */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Users className="w-3 h-3" />
          </div>
          <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
            Workforce Access
          </h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SelectInput 
              field="defaultEmployeeRole"
              label="Default Employee Role"
              description="The role assigned to newly invited users by default."
              options={roleOptions}
              value={formData.defaultEmployeeRole}
            />
          </div>

          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700">Employee Join Policy</label>
                <p className="text-xs text-slate-500 max-w-md">Determines how new members can join this organization. Currently restricted to direct invitations.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                Invitation Only
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Management */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <Briefcase className="w-3 h-3" />
          </div>
          <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
            Project Management
          </h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SelectInput 
              field="projectCreationPermission"
              label="Project Creation Permission"
              description="Minimum role required to create new projects."
              options={permOptions}
              value={formData.projectCreationPermission}
            />
            
            <SelectInput 
              field="projectAssignmentPermission"
              label="Project Assignment Permission"
              description="Minimum role required to assign employees to projects."
              options={permOptions}
              value={formData.projectAssignmentPermission}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className={`fixed bottom-0 inset-x-0 lg:left-64 p-4 bg-white border-t border-slate-200/80 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] flex items-center justify-end gap-3 transition-transform duration-300 z-40 ${isDirty ? 'translate-y-0' : 'translate-y-full'}`}>
        <button 
          onClick={handleCancel}
          disabled={isUpdating}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4 text-slate-400" />
          Discard Changes
        </button>
        <button 
          onClick={handleSave} 
          disabled={!isDirty || isUpdating}
          className="inline-flex items-center gap-2 bg-slate-950 text-white hover:bg-slate-800 text-sm font-medium px-5 py-2.5 rounded-xl shadow-md shadow-slate-900/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isUpdating ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </button>
      </div>

    </div>
  );
};
