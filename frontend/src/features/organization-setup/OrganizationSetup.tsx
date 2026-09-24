import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  UsersRound, 
  AlertCircle, 
  Save, 
  LogOut, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  ChevronDown,
  Sparkles,
  Lock,
  Loader2
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { useToast } from '../../context/ToastContext';
import { 
  useGetCurrentOrganizationQuery, 
  useUpdateCurrentOrganizationMutation,
  useGetOrganizationSetupStatusQuery,
  useCompleteOrganizationSetupMutation
} from '../../store/apiSlice';
import { authService } from '../../services/authService';
import { orgProfileSchema } from './schemas/orgProfileSchema';
import { EmployeesList } from '../employees/EmployeesList';
import { TeamsList } from '../teams/TeamsList';

export const OrganizationSetup: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'EMPLOYEES' | 'TEAMS'>('PROFILE');
  
  // RTK Query hooks
  const { 
    data: orgData, 
    isLoading: loadingOrg, 
    error: orgFetchError,
    refetch: refetchOrg 
  } = useGetCurrentOrganizationQuery();

  const {
    data: setupStatusData,
    refetch: refetchSetupStatus
  } = useGetOrganizationSetupStatusQuery();

  const [updateCurrentOrg, { isLoading: isSavingProfile }] = useUpdateCurrentOrganizationMutation();
  const [completeSetupM, { isLoading: isCompleting }] = useCompleteOrganizationSetupMutation();

  // Form State
  const [name, setName] = useState('');
  const [organizationType, setOrganizationType] = useState('TECHNOLOGY');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; organizationType?: string; description?: string }>({});
  const [error, setError] = useState('');

  // Step Locking / Completion State
  const [step1Saved, setStep1Saved] = useState<boolean>(false);
  const [step2Saved, setStep2Saved] = useState<boolean>(false);

  // Custom Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Populate form and determine persistent completion on data load
  useEffect(() => {
    if (orgData) {
      setName(orgData.name || '');
      setOrganizationType(orgData.organizationType || 'TECHNOLOGY');
      setDescription(orgData.description || '');

      // Check state persistence across refresh
      const orgId = orgData.id;
      const localStep1 = orgId ? localStorage.getItem(`setup_step1_saved_${orgId}`) === 'true' : false;
      const localStep2 = orgId ? localStorage.getItem(`setup_step2_saved_${orgId}`) === 'true' : false;
      const backendSaved = !!setupStatusData?.data?.isProfileSaved || 
        (orgData.updatedAt && orgData.createdAt && new Date(orgData.updatedAt).getTime() > new Date(orgData.createdAt).getTime());

      if (localStep1 || backendSaved) {
        setStep1Saved(true);
      }
      if (localStep2 || setupStatusData?.data?.hasEmployees) {
        setStep2Saved(true);
      }
    }
  }, [orgData, setupStatusData]);

  // Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSignOut = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;

    setError('');
    setFieldErrors({});

    const validation = orgProfileSchema.safeParse({
      name,
      organizationType,
      description: description || undefined,
    });

    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        name: formatted.name?._errors[0],
        organizationType: formatted.organizationType?._errors[0],
        description: formatted.description?._errors[0],
      });
      setError('Please correct the highlighted errors before saving.');
      return;
    }

    try {
      await updateCurrentOrg({
        name: name.trim(),
        organizationType,
        description: description?.trim() || undefined,
      }).unwrap();

      setStep1Saved(true);
      if (orgData?.id) {
        localStorage.setItem(`setup_step1_saved_${orgData.id}`, 'true');
      }
      showToast('Profile updated', 'success');
      refetchSetupStatus();
      refetchOrg();
    } catch (err: any) {
      const errMsg = typeof err?.data === 'string' 
        ? err.data 
        : err?.data?.message || err?.message || 'Failed to update profile';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleCompleteSetup = async () => {
    try {
      await completeSetupM().unwrap();
      showToast('Setup Complete! Redirecting...', 'success');
      await authService.bootstrap();
      window.location.href = '/dashboard';
    } catch (err: any) {
      const msg = typeof err?.data === 'string' ? err.data : err?.data?.message || err?.message || 'Failed to complete setup';
      showToast(msg, 'error');
    }
  };

  const handleStepClick = (stepId: 'PROFILE' | 'EMPLOYEES' | 'TEAMS') => {
    if (stepId === 'PROFILE') {
      setActiveTab('PROFILE');
      return;
    }
    if (stepId === 'EMPLOYEES') {
      if (!step1Saved) {
        showToast('Complete the previous step first.', 'info');
        return;
      }
      setActiveTab('EMPLOYEES');
      return;
    }
    if (stepId === 'TEAMS') {
      if (!step2Saved) {
        showToast('Complete the previous step first.', 'info');
        return;
      }
      setActiveTab('TEAMS');
      return;
    }
  };

  const orgTypes = [
    { value: 'TECHNOLOGY', label: 'Technology' },
    { value: 'EDUCATION', label: 'Education' },
    { value: 'HEALTHCARE', label: 'Healthcare / Medical' },
    { value: 'FINANCE', label: 'Finance' },
    { value: 'MANUFACTURING', label: 'Manufacturing' },
    { value: 'RETAIL', label: 'Retail' },
    { value: 'NGO', label: 'Non-Profit / NGO' },
    { value: 'GOVERNMENT', label: 'Government' },
    { value: 'OTHER', label: 'Other' },
  ];

  const steps = [
    { 
      id: 'PROFILE' as const, 
      stepNumber: 1,
      label: 'Organization Profile', 
      subtitle: 'Core information', 
      icon: Building2,
      isLocked: false,
      isCompleted: step1Saved,
    },
    { 
      id: 'EMPLOYEES' as const, 
      stepNumber: 2,
      label: 'Employees & Roles', 
      subtitle: 'Team members & access', 
      icon: Users,
      isLocked: !step1Saved,
      isCompleted: step2Saved,
    },
    { 
      id: 'TEAMS' as const, 
      stepNumber: 3,
      label: 'Teams & Managers', 
      subtitle: 'Departments & leads', 
      icon: UsersRound,
      isLocked: !step2Saved,
      isCompleted: false,
    },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === activeTab);
  const currentStepNumber = currentStepIndex + 1;

  if (loadingOrg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F3F4F6] text-slate-600 gap-3">
        <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading setup wizard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 flex flex-col selection:bg-[#27F087] selection:text-slate-950">
      {/* Wizard Header Bar */}
      <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-xs">
              <span className="w-4 h-4 rounded bg-[#27F087] flex items-center justify-center text-slate-950 font-black text-[10px]">
                SW
              </span>
            </div>
            <div>
              <h1 className="font-semibold text-base sm:text-lg leading-tight tracking-tight text-slate-900">
                Sify Workforce
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Organization Setup
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-medium text-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Wizard Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error Alert */}
        {(error || orgFetchError) && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2.5 text-sm animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error || 'Failed to load organization data.'}</span>
          </div>
        )}

        {/* Wizard Overview & Step Indicator */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200/80 text-slate-800 mb-1.5">
                <Sparkles className="w-3 h-3 text-slate-600" />
                <span>Step {currentStepNumber} of 3</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Configure your organization before you start working.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Complete these three setup steps to establish your company profile, personnel, and operational teams.
              </p>
            </div>

            {/* Quick Completion Button - LOCKED until Step 1 and Step 2 are completed */}
            <div className="relative group">
              <button
                type="button"
                disabled={!step1Saved || !step2Saved}
                onClick={handleCompleteSetup}
                title={!step1Saved || !step2Saved ? "Complete all setup steps to continue" : "Complete setup and continue to Workforce"}
                className={`inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm transition-all shrink-0 ${
                  step1Saved && step2Saved
                    ? 'bg-[#1E232E] hover:bg-[#151821] text-white cursor-pointer'
                    : 'bg-[#1E232E] text-white opacity-40 cursor-not-allowed'
                }`}
              >
                {!step1Saved || !step2Saved ? (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                ) : null}
                <span>{isCompleting ? 'Completing...' : 'Continue to Workforce'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = activeTab === step.id;
              const isLocked = step.isLocked;
              const isCompleted = step.isCompleted;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  aria-disabled={isLocked}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative flex items-center gap-3.5 ${
                    isLocked
                      ? 'bg-slate-100/60 border-slate-200/60 text-slate-400 cursor-not-allowed opacity-75'
                      : isActive
                      ? 'bg-white border-slate-900 ring-2 ring-slate-950/10 shadow-sm cursor-pointer'
                      : isCompleted
                      ? 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white text-slate-700 cursor-pointer'
                      : 'bg-white/50 border-slate-200/70 hover:border-slate-300 text-slate-500 cursor-pointer'
                  }`}
                >
                  {/* Step Number or Status Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
                      isLocked
                        ? 'bg-slate-200 text-slate-400'
                        : isCompleted
                        ? 'bg-[#27F087] text-slate-950 font-black'
                        : isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : isLocked ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      step.stepNumber
                    )}
                  </div>

                  <div className="truncate flex-1">
                    <p className={`text-xs sm:text-sm font-semibold truncate ${
                      isActive ? 'text-slate-900' : isLocked ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                      {step.label}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {isLocked ? 'Complete previous step' : isCompleted ? 'Completed' : step.subtitle}
                    </p>
                  </div>

                  <Icon className={`w-4 h-4 ml-auto shrink-0 hidden sm:block ${
                    isActive ? 'text-slate-900' : isLocked ? 'text-slate-300' : 'text-slate-400'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Card Container */}
        <div className="bg-white rounded-[22px] border border-slate-200/80 shadow-md overflow-hidden transition-all">
          {/* Step 1: Organization Profile */}
          {activeTab === 'PROFILE' && (
            <div className="divide-y divide-slate-100 animate-fadeIn">
              <div className="p-6 sm:p-7 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Organization Profile</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Configure your organization's core details and identity.
                  </p>
                </div>

                {step1Saved && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </span>
                )}
              </div>

              <div className="p-6 sm:p-7">
                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
                  {/* Organization Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="orgName" className="block text-xs sm:text-[13px] font-medium text-slate-700">
                      Organization Name *
                    </label>
                    <input
                      id="orgName"
                      type="text"
                      placeholder="e.g. Sify Technologies"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                      }}
                      className={`w-full h-11 rounded-xl border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs ${
                        fieldErrors.name 
                          ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20' 
                          : 'border-slate-200/90 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900'
                      }`}
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-rose-600 font-medium">{fieldErrors.name}</p>
                    )}
                  </div>

                  {/* Industry / Organization Type */}
                  <div className="space-y-1.5">
                    <label htmlFor="industryType" className="block text-xs sm:text-[13px] font-medium text-slate-700">
                      Industry Type *
                    </label>
                    <div className="relative" ref={dropdownRef}>
                      {/* Native select for accessibility & automated tests */}
                      <select
                        id="industryType"
                        value={organizationType}
                        onChange={(e) => {
                          setOrganizationType(e.target.value);
                          if (fieldErrors.organizationType) setFieldErrors(prev => ({ ...prev, organizationType: undefined }));
                        }}
                        className="sr-only"
                        tabIndex={-1}
                      >
                        {orgTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>

                      {/* Custom Styled Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className={`w-full h-11 rounded-xl border bg-white px-3.5 text-sm text-slate-900 flex items-center justify-between transition-all shadow-2xs cursor-pointer ${
                          dropdownOpen
                            ? 'border-slate-900 ring-2 ring-slate-950/15'
                            : fieldErrors.organizationType
                            ? 'border-rose-400'
                            : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                        aria-haspopup="listbox"
                        aria-expanded={dropdownOpen}
                      >
                        <span className="font-normal text-slate-900 truncate">
                          {orgTypes.find((t) => t.value === organizationType)?.label || 'Select Industry Type'}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                            dropdownOpen ? 'rotate-180 text-slate-700' : ''
                          }`}
                        />
                      </button>

                      {/* Custom Dropdown Popover */}
                      {dropdownOpen && (
                        <div
                          className="absolute top-full left-0 right-0 z-30 mt-1 max-h-[195px] overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 p-1 space-y-0.5 animate-fadeIn"
                          role="listbox"
                        >
                          {orgTypes.map((type) => {
                            const isSelected = type.value === organizationType;
                            return (
                              <div
                                key={type.value}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setOrganizationType(type.value);
                                  setDropdownOpen(false);
                                  if (fieldErrors.organizationType) setFieldErrors(prev => ({ ...prev, organizationType: undefined }));
                                }}
                                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-slate-100 text-slate-950 font-semibold'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                              >
                                <span>{type.label}</span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {fieldErrors.organizationType && (
                      <p className="text-xs text-rose-600 font-medium">{fieldErrors.organizationType}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label htmlFor="orgDescription" className="block text-xs sm:text-[13px] font-medium text-slate-700">
                      Description (Optional)
                    </label>
                    <textarea
                      id="orgDescription"
                      rows={3}
                      maxLength={500}
                      placeholder="Tell us a bit about your organization..."
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: undefined }));
                      }}
                      className={`w-full rounded-xl border bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs resize-none ${
                        fieldErrors.description
                          ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-200/90 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900'
                      }`}
                    />
                    {fieldErrors.description && (
                      <p className="text-xs text-rose-600 font-medium">{fieldErrors.description}</p>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="inline-flex items-center justify-center gap-2 bg-[#1E232E] hover:bg-[#151821] text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{isSavingProfile ? 'Saving...' : 'Save Profile'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Step 2: Employees & Roles */}
          {activeTab === 'EMPLOYEES' && (
            <div className="animate-fadeIn" data-testid="employees-list">
              <EmployeesList isSetupWizard={true} />
            </div>
          )}

          {/* Step 3: Teams & Managers */}
          {activeTab === 'TEAMS' && (
            <div className="animate-fadeIn" data-testid="teams-list">
              <TeamsList isSetupWizard={true} />
            </div>
          )}

          {/* Bottom Step Actions Bar */}
          <div className="bg-slate-50/90 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              {currentStepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(steps[currentStepIndex - 1].id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-medium text-slate-700 transition-all shadow-2xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                  <span>Back to {steps[currentStepIndex - 1].label}</span>
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium">
                  Step 1 of 3: Organization Profile
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {currentStepIndex === 0 && (
                <button
                  type="button"
                  disabled={!step1Saved}
                  onClick={() => setActiveTab('EMPLOYEES')}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium shadow-xs transition-all ${
                    step1Saved
                      ? 'bg-[#1E232E] hover:bg-[#151821] text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>Next: Employees & Roles</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {currentStepIndex === 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setStep2Saved(true);
                    if (orgData?.id) {
                      localStorage.setItem(`setup_step2_saved_${orgData.id}`, 'true');
                    }
                    setActiveTab('TEAMS');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium shadow-xs transition-all bg-[#1E232E] hover:bg-[#151821] text-white cursor-pointer"
                >
                  <span>Next: Teams & Managers</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {currentStepIndex === 2 && (
                <button
                  type="button"
                  disabled={isCompleting}
                  onClick={handleCompleteSetup}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium shadow-xs transition-all bg-slate-950 hover:bg-black text-white cursor-pointer disabled:opacity-50"
                >
                  <span>{isCompleting ? 'Completing Setup...' : 'Complete Setup & Continue to Workforce'}</span>
                  <ChevronRight className="w-4 h-4 text-[#27F087]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Wizard Trust Footer */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>Sify Workforce Organization Setup</span>
            <span>•</span>
            <span>Step {currentStepNumber} of 3: {steps[currentStepIndex].label}</span>
          </div>
        </div>
      </main>
    </div>
  );
};
