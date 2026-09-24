import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { apiClient } from '../../lib/apiClient';
import { authStorage } from '../../lib/authUtils';
import { authService } from '../../services/authService';
import type { RootState } from '../../store';
import { logout, setAuth } from '../../store/slices/authSlice';
import { useToast } from '../../context/ToastContext';
import { createOrgSchema } from './schemas/createOrgSchema';
import { 
  Building2, 
  Mail, 
  AlertCircle,
  ChevronDown,
  Check,
  ArrowRight,
  Shield,
  Loader2,
  Plus
} from 'lucide-react';

export interface UserInvite {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationType: string;
  role: string;
  inviterName: string;
  teamName: string | null;
  createdAt: string;
  expiresAt: string;
}

export const Onboarding = () => {
  const [mode, setMode] = useState<'CREATE' | 'INVITES'>('CREATE');
  const [name, setName] = useState('');
  const [organizationType, setOrganizationType] = useState('TECHNOLOGY');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; organizationType?: string; description?: string }>({});

  // Invitations
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [fetchingInvites, setFetchingInvites] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const employee = useSelector((state: RootState) => state.auth.employee);
  const onboardingRequired = useSelector((state: RootState) => state.auth.onboardingRequired);
  const { showToast } = useToast();

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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (employee && !onboardingRequired) {
      navigate('/dashboard');
    } else {
      fetchInvites();
    }
  }, [isAuthenticated, employee, onboardingRequired, navigate]);

  const fetchInvites = async () => {
    try {
      setFetchingInvites(true);
      const res = await apiClient('/employee-invitations/my-invitations');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setInvites(list);
    } catch (err: any) {
      console.error('Failed to fetch user invitations:', err);
    } finally {
      setFetchingInvites(false);
    }
  };

  /**
   * Refreshes the authoritative bootstrap state from /auth/me
   * and updates Redux auth state so onboardingRequired becomes false.
   */
  const refreshAuthState = async (targetOrgId: string) => {
    authStorage.setOrgId(targetOrgId);
    try {
      const bootstrapState = await authService.bootstrap();
      dispatch(
        setAuth({
          accessToken: authStorage.getAccessToken() || '',
          refreshToken: authStorage.getRefreshToken() || '',
          orgId: targetOrgId,
          employee: bootstrapState.employee || null,
          isInitialSetup: bootstrapState.isInitialSetup || false,
          umsUserEmail: bootstrapState.umsUserEmail || null,
          onboardingRequired: false,
        })
      );
      return bootstrapState;
    } catch {
      return null;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    const validation = createOrgSchema.safeParse({
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
      setError('Please correct the highlighted errors before submitting.');
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const payload: { name: string; organizationType: string; description?: string } = {
        name: name.trim(),
        organizationType,
      };
      if (description.trim()) {
        payload.description = description.trim();
      }

      const response = await apiClient('/organizations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response?.data?.organization && response?.data?.employee) {
        const orgId = response.data.organization.id;
        showToast('Organization created successfully!', 'success');

        await refreshAuthState(orgId);
        window.location.href = '/organization';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create organization. Please try again.');
      showToast(err.message || 'Failed to create organization.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (acceptingId || decliningId) return;
    setAcceptingId(inviteId);
    setError('');

    try {
      const response = await apiClient(`/employee-invitations/${inviteId}/accept-invite`, {
        method: 'POST',
      });

      const orgId = response?.data?.organization?.id || response?.data?.employee?.organizationId;
      showToast('Joined organization successfully!', 'success');

      if (orgId) {
        await refreshAuthState(orgId);
      }
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. Please try again.');
      showToast(err.message || 'Failed to accept invitation.', 'error');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    if (decliningId || acceptingId) return;
    setDecliningId(inviteId);
    setError('');

    try {
      await apiClient(`/employee-invitations/${inviteId}/decline-invite`, {
        method: 'POST',
      });

      showToast('Invitation declined.', 'success');
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation. Please try again.');
      showToast(err.message || 'Failed to decline invitation.', 'error');
    } finally {
      setDecliningId(null);
    }
  };

  const orgTypes = [
    { value: 'TECHNOLOGY', label: 'Technology' },
    { value: 'EDUCATION', label: 'Education' },
    { value: 'HEALTHCARE', label: 'Healthcare / Medical' },
    { value: 'FINANCE', label: 'Finance / Banking' },
    { value: 'MANUFACTURING', label: 'Manufacturing' },
    { value: 'RETAIL', label: 'Retail' },
    { value: 'NGO', label: 'NGO / Non-Profit' },
    { value: 'GOVERNMENT', label: 'Government' },
    { value: 'OTHER', label: 'Other' },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#F3F4F6] py-8 sm:py-12 px-4 selection:bg-[#27F087] selection:text-slate-900">
      {/* Top spacer */}
      <div className="h-2" />

      {/* Main Container */}
      <div className="w-full max-w-[500px] my-auto">
        {/* Floating Curved Card */}
        <div className="rounded-[28px] bg-white border border-slate-200/90 shadow-2xl shadow-slate-200/70 overflow-hidden transition-all duration-300">
          <div className="p-6 sm:p-8 space-y-5">
            {/* Brand Logo Squircle */}
            <div className="w-12 h-12 rounded-[18px] bg-slate-900 border border-slate-800 flex items-center justify-center shadow-md mx-auto transition-transform hover:scale-105 duration-200">
              <span className="w-5 h-5 rounded bg-[#27F087] flex items-center justify-center text-slate-950 font-black text-xs">
                SW
              </span>
            </div>

            {/* Header Titles */}
            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Set up your Workforce account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Choose how you want to get started.
              </p>
            </div>

            {/* 2-Mode Segmented Switcher with Curve Animation */}
            <div className="relative p-1 bg-slate-100/90 rounded-2xl grid grid-cols-2 gap-1 text-xs sm:text-[13px] font-medium border border-slate-200/70 select-none">
              {/* Sliding Pill Indicator */}
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-xs ring-1 ring-slate-900/5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
                  mode === 'CREATE' ? 'left-1' : 'left-[calc(50%+2px)]'
                }`}
              />

              <button
                type="button"
                onClick={() => { setMode('CREATE'); setError(''); }}
                className={`relative z-10 py-2.5 px-3 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer text-center ${
                  mode === 'CREATE'
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 className={`w-4 h-4 transition-colors duration-200 shrink-0 ${mode === 'CREATE' ? 'text-slate-900' : 'text-slate-400'}`} />
                <span className="truncate">New Organization</span>
              </button>

              <button
                type="button"
                onClick={() => { setMode('INVITES'); setError(''); }}
                className={`relative z-10 py-2.5 px-3 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer text-center ${
                  mode === 'INVITES'
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mail className={`w-4 h-4 transition-colors duration-200 shrink-0 ${mode === 'INVITES' ? 'text-slate-900' : 'text-slate-400'}`} />
                <span className="truncate">Organization Invites</span>
                {invites.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-[#27F087] text-slate-950 rounded-full leading-none">
                    {invites.length}
                  </span>
                )}
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5 transition-all">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 text-left">{error}</div>
              </div>
            )}

            {/* Tab Content Container with stable height & smooth cross-fade */}
            <div className="min-h-[415px] flex flex-col justify-start">
              {/* 1. CREATE NEW ORGANIZATION MODE */}
              {mode === 'CREATE' && (
                <div key="create-panel" className="animate-tabFadeSlide">
                  <form onSubmit={handleCreateSubmit} className="space-y-4 pt-1" noValidate>
                    <div className="space-y-1.5 text-left">
                      <label htmlFor="org-name" className="block text-xs sm:text-[13px] font-semibold text-slate-700">
                        Organization Name *
                      </label>
                      <div className="relative">
                        <input
                          id="org-name"
                          type="text"
                          placeholder="e.g. Acme Corporation, Sify Telecom"
                          disabled={loading}
                          className={`w-full h-11 rounded-xl border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs ${
                            fieldErrors.name 
                              ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500' 
                              : 'border-slate-200/90 focus:ring-slate-950/15 focus:border-slate-900'
                          }`}
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                          }}
                        />
                      </div>
                      {fieldErrors.name && (
                        <p className="text-[11px] text-rose-600 font-medium pl-1">{fieldErrors.name}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 text-left relative" ref={dropdownRef}>
                      <label htmlFor="org-type" className="block text-xs sm:text-[13px] font-semibold text-slate-700">
                        Organization Type *
                      </label>
                      <input
                        id="org-type"
                        type="text"
                        value={organizationType}
                        onChange={(e) => setOrganizationType(e.target.value)}
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full h-11 rounded-xl border border-slate-200/90 bg-white px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all flex items-center justify-between shadow-2xs cursor-pointer hover:border-slate-300"
                      >
                        <span className="font-medium text-slate-800">{orgTypes.find(t => t.value === organizationType)?.label || organizationType}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-slate-700' : ''}`} />
                      </button>

                      {dropdownOpen && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-1.5 max-h-52 overflow-y-auto">
                          {orgTypes.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => {
                                setOrganizationType(type.value);
                                setDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-2.5 text-xs sm:text-sm text-left flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                                organizationType === type.value ? 'font-semibold text-slate-900 bg-slate-50' : 'text-slate-600'
                              }`}
                            >
                              <span>{type.label}</span>
                              {organizationType === type.value && <Check className="w-4 h-4 text-slate-900" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label htmlFor="org-desc" className="block text-xs sm:text-[13px] font-semibold text-slate-700">
                        Description (Optional)
                      </label>
                      <textarea
                        id="org-desc"
                        placeholder="Brief description of the organization, core business, and focus..."
                        disabled={loading}
                        rows={2}
                        className="w-full rounded-xl border border-slate-200/90 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all resize-none shadow-2xs"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600 text-left flex items-start gap-2.5">
                      <Shield className="w-4 h-4 shrink-0 text-slate-700 mt-0.5" />
                      <div className="leading-relaxed">
                        As the creator, you will become the primary <strong>Administrator (ADMIN)</strong> with full workspace management rights.
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-slate-950 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold px-4 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Organization...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Organization</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* 2. PENDING INVITATIONS MODE */}
              {mode === 'INVITES' && (
                <div key="invites-panel" className="animate-tabFadeSlide h-full flex flex-col justify-center flex-1">
                  <div className="space-y-3 pt-1 text-left my-auto">
                    {fetchingInvites ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
                        <span>Checking for invitations...</span>
                      </div>
                    ) : invites.length === 0 ? (
                      <div className="py-10 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl p-5 bg-slate-50/50">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center mx-auto text-slate-400">
                          <Mail className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-800">No Pending Invites</h4>
                          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                            When an organization admin invites your email to join their workspace, your invitation will appear here.
                          </p>
                        </div>

                        {/* Actionable button to guide new users to create their org */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => { setMode('CREATE'); setError(''); }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create New Organization</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {invites.map((invite) => (
                          <div
                            key={invite.id}
                            className="p-4 rounded-2xl border border-slate-200/90 bg-white space-y-3 shadow-2xs hover:border-slate-300 transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">
                                  {invite.organizationName}
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Invited by {invite.inviterName}
                                  {invite.teamName ? ` · Team: ${invite.teamName}` : ''}
                                </p>
                              </div>
                              <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                                {invite.role || 'EMPLOYEE'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleDeclineInvite(invite.id)}
                                disabled={decliningId === invite.id || acceptingId === invite.id}
                                className="flex-1 h-9 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {decliningId === invite.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Declining...</span>
                                  </>
                                ) : (
                                  <span>Decline</span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAcceptInvite(invite.id)}
                                disabled={acceptingId === invite.id || decliningId === invite.id}
                                className="flex-1 h-9 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                {acceptingId === invite.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Joining...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Accept & Join</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Card Footer */}
          <div className="bg-slate-50/90 border-t border-slate-100 px-6 sm:px-8 py-3.5 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              Sify Workforce Identity
            </span>
            <button
              type="button"
              onClick={() => {
                authStorage.clear();
                dispatch(logout());
                navigate('/login');
              }}
              className="text-slate-700 font-semibold hover:text-slate-950 hover:underline cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Outer Trust Footer */}
        <div className="mt-5 text-center space-y-1">
          <p className="text-[11px] text-slate-400">
            Organization membership defines your roles and permissions across Workforce.
          </p>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-2" />
    </div>
  );
};
