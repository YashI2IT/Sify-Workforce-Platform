import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, RefreshCw, Building, Check } from 'lucide-react';
import {
  useGetCurrentOrganizationQuery,
  useUpdateCurrentOrganizationMutation,
} from '../../store/apiSlice';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { Select } from '../../components/ui/Select';

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

export const OrganizationDetail = () => {
  const { employee } = useCurrentEmployee();
  const isAdmin = employee?.roles?.includes('ADMIN') || employee?.role === 'ADMIN';

  const { data: org, isLoading, error: queryError, refetch } = useGetCurrentOrganizationQuery();
  const [updateOrg, { isLoading: saving }] = useUpdateCurrentOrganizationMutation();

  // Form state
  const [name, setName] = useState('');
  const [organizationType, setOrganizationType] = useState('TECHNOLOGY');
  const [customIndustry, setCustomIndustry] = useState('');
  const [description, setDescription] = useState('');

  // Validation & feedback state
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; industry?: string }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Populate form from saved org data
  useEffect(() => {
    if (org) {
      setName(org.name || '');
      const isStandardType = orgTypes.some((t) => t.value === org.organizationType);
      if (isStandardType) {
        setOrganizationType(org.organizationType || 'TECHNOLOGY');
        setCustomIndustry('');
      } else {
        setOrganizationType('OTHER');
        setCustomIndustry(org.organizationType || '');
      }
      setDescription(org.description || '');
      setFieldErrors({});
    }
  }, [org]);

  // Check if form has unsaved changes
  const hasChanges = useMemo(() => {
    if (!org) return false;
    const initialType = org.organizationType || 'TECHNOLOGY';
    const currentEffectiveType =
      organizationType === 'OTHER' && customIndustry.trim() !== ''
        ? customIndustry.trim()
        : organizationType;

    return (
      name.trim() !== (org.name || '').trim() ||
      currentEffectiveType !== initialType ||
      description.trim() !== (org.description || '').trim()
    );
  }, [org, name, organizationType, customIndustry, description]);

  // Form validity check
  const isValid = useMemo(() => {
    if (!name.trim()) return false;
    if (organizationType === 'OTHER' && !customIndustry.trim()) return false;
    return true;
  }, [name, organizationType, customIndustry]);

  // Prevent accidental loss of unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || saving || !isAdmin) return;

    // Field-specific validation
    const errors: { name?: string; industry?: string } = {};
    if (!name.trim()) {
      errors.name = 'Company name is required.';
    }
    if (organizationType === 'OTHER' && !customIndustry.trim()) {
      errors.industry = 'Please specify your industry.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setError('');
      setSuccess('');
      setFieldErrors({});

      const effectiveIndustry =
        organizationType === 'OTHER' && customIndustry.trim() !== ''
          ? customIndustry.trim()
          : organizationType;

      await updateOrg({
        name: name.trim(),
        organizationType: effectiveIndustry,
        description: description.trim(),
      }).unwrap();

      setSuccess('Company details updated successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.data?.message || err?.message || 'Failed to update company details.');
    }
  };

  if (isLoading && !org) {
    return (
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 font-sans">
        <div className="animate-slideUpFade bg-white border border-slate-200/80 shadow-xs rounded-[14px] p-16">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0B1738] rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading company details…</span>
          </div>
        </div>
      </div>
    );
  }

  if (queryError && !org) {
    return (
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 font-sans">
        <div className="p-8 max-w-md mx-auto text-center space-y-4 bg-white border border-slate-200/80 shadow-xs rounded-[14px]">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#0B1738]">Failed to Load Company</h2>
          <p className="text-xs text-slate-500">
            {queryError?.toString() || 'Could not retrieve company information.'}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#0B1738] hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 font-sans">
      {/* 1. Page Header */}
      <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-[#0B1738] tracking-tight">
            Edit Company
          </h1>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1">
            Update your company details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/organization"
            className="inline-flex items-center justify-center h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
          >
            Cancel
          </Link>
        </div>
      </div>

      {/* Inline Feedback Banners */}
      {error && (
        <div className="animate-successPop p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2.5 text-xs font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="animate-successPop p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2.5 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* 2. Company Details Form Card */}
      <div className="animate-slideUpFade-d1 bg-white border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-200 hover:shadow-sm max-w-3xl">
        <div className="px-6 py-4 border-b border-slate-100 bg-[#F7F8FA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B1738] text-white flex items-center justify-center shadow-2xs shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B1738] tracking-tight">
                Company Details
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Essential identity and industry classification.
              </p>
            </div>
          </div>
          {hasChanges && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Company Name */}
          <div className="space-y-1.5">
            <label htmlFor="companyName" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="companyName"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              placeholder="e.g. Sify Technologies Limited"
              disabled={!isAdmin || saving}
              className={`w-full px-3.5 py-2 bg-[#F9FBFC] border rounded-[10px] text-sm font-medium text-[#0B1738] placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-[#0B1738]/10 focus:border-[#0B1738] outline-none transition-all ${
                fieldErrors.name ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
              }`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-600 font-medium">{fieldErrors.name}</p>
            )}
          </div>

          {/* Industry */}
          <div className="space-y-1.5">
            <label htmlFor="industry" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Industry <span className="text-rose-500">*</span>
            </label>
            <Select
              id="industry"
              ariaLabel="Industry"
              value={organizationType}
              onChange={(val) => {
                setOrganizationType(val);
                if (fieldErrors.industry) {
                  setFieldErrors((prev) => ({ ...prev, industry: undefined }));
                }
              }}
              options={orgTypes}
              size="md"
              disabled={!isAdmin || saving}
            />

            {organizationType === 'OTHER' && (
              <div className="pt-2 animate-slideDownFade space-y-1">
                <input
                  type="text"
                  required
                  value={customIndustry}
                  onChange={(e) => {
                    setCustomIndustry(e.target.value);
                    if (fieldErrors.industry) {
                      setFieldErrors((prev) => ({ ...prev, industry: undefined }));
                    }
                  }}
                  placeholder="Please specify your industry..."
                  disabled={!isAdmin || saving}
                  className={`w-full px-3.5 py-2 bg-[#F9FBFC] border rounded-[10px] text-sm font-medium text-[#0B1738] placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-[#0B1738]/10 focus:border-[#0B1738] outline-none transition-all ${
                    fieldErrors.industry ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                  }`}
                />
                {fieldErrors.industry && (
                  <p className="text-xs text-rose-600 font-medium">{fieldErrors.industry}</p>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Description
              </label>
              <span className="text-[11px] font-normal text-slate-400">
                Optional · max 500 chars
              </span>
            </div>
            <textarea
              id="description"
              rows={4}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your company..."
              disabled={!isAdmin || saving}
              className="w-full px-3.5 py-2.5 bg-[#F9FBFC] border border-slate-200 rounded-[10px] text-sm font-medium text-[#0B1738] placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-[#0B1738]/10 focus:border-[#0B1738] outline-none transition-all resize-none"
            />
            <p className="text-[11px] text-slate-400 text-right font-mono">
              {description.length} / 500
            </p>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              to="/organization"
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-[10px] transition-colors cursor-pointer"
            >
              Cancel
            </Link>

            {isAdmin && (
              <button
                type="submit"
                disabled={saving || !hasChanges || !isValid}
                className="inline-flex items-center justify-center gap-2 h-9 px-5 py-2 bg-[#0B1738] hover:bg-slate-800 text-white rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{saving ? 'Saving…' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
