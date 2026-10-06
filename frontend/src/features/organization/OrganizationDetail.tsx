import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Save, RefreshCw } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { authService } from '../../services/authService';
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
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Admin check
  const [isAdmin, setIsAdmin] = useState(false);

  // Editable Profile state
  const [name, setName] = useState('');
  const [organizationType, setOrganizationType] = useState('TECHNOLOGY');
  const [customIndustry, setCustomIndustry] = useState('');
  const [description, setDescription] = useState('');

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError('');

      // Determine roles
      const authState = await authService.bootstrap();
      const adminRole = authState.roles?.includes('ADMIN') || authState.employee?.role === 'ADMIN';
      setIsAdmin(!!adminRole);

      // Fetch org profile
      const orgData = await apiClient('/organizations/current');
      setOrg(orgData);
      setName(orgData.name || '');
      
      const isStandardType = orgTypes.some(t => t.value === orgData.organizationType);
      if (isStandardType) {
        setOrganizationType(orgData.organizationType || 'TECHNOLOGY');
        setCustomIndustry('');
      } else {
        setOrganizationType('OTHER');
        setCustomIndustry(orgData.organizationType || '');
      }
      
      setDescription(orgData.description || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load organization profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);



  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const payload: any = { 
        name, 
        organizationType: organizationType === 'OTHER' && customIndustry.trim() !== '' ? customIndustry.trim() : organizationType 
      };
      if (description !== undefined) {
        payload.description = description;
      }
      
      const updated = await apiClient(`/organizations/current`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      
      setOrg(updated);
      setSuccess('Organization details updated successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update organization details');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="py-28 text-center text-slate-500 space-y-4 animate-fadeIn">
        <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-700 font-mono">Loading organization...</p>
      </div>
    );
  }

  if (error && !org) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 animate-fadeIn">
        <div className="w-14 h-9 rounded-[14px] bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-display">Failed to Load Organization</h2>
        <p className="text-xs sm:text-sm text-slate-500">{error}</p>
        <button
          onClick={fetchProfileData}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-20 animate-slideUpFade">
      {/* Page header */}
      <div className="animate-slideUpFade">
        <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight">
          Edit Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-medium">
          Update your organization's name, industry, and description.
        </p>
      </div>

      {/* Inline feedback banners */}
      {error && (
        <div className="animate-successPop p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-3 text-sm shadow-2xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="animate-successPop p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-3 text-sm shadow-2xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <p className="font-medium">{success}</p>
        </div>
      )}

      {/* Profile form card */}
      <div className="animate-slideUpFade-d1 bg-white border border-slate-200/90 rounded-[14px] shadow-xs transition-shadow duration-300 hover:shadow-md">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-950" />
          <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
            Organization Profile
          </h2>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Organization Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-[13px] font-semibold text-slate-700">
              Organization Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200/90 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs disabled:bg-slate-50 disabled:text-slate-500 font-medium"
              placeholder="e.g. Sify Technologies Limited"
              required
              disabled={!isAdmin || saving}
            />
          </div>

          {/* Industry Classification */}
          <div className="space-y-1.5">
            <label htmlFor="organizationType" className="block text-[13px] font-semibold text-slate-700">
              Industry Classification <span className="text-rose-500">*</span>
            </label>

            <Select
              id="organizationType"
              ariaLabel="Industry Classification"
              value={organizationType}
              onChange={setOrganizationType}
              options={orgTypes}
              size="md"
              disabled={!isAdmin || saving}
            />

            {organizationType === 'OTHER' && (
              <div className="pt-2 animate-slideDownFade">
                <input
                  type="text"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200/90 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                  placeholder="Please specify your industry..."
                  required
                  disabled={!isAdmin || saving}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-[13px] font-semibold text-slate-700">
              Description
              <span className="ml-2 text-[11px] font-normal text-slate-400 normal-case">Optional · max 500 chars</span>
            </label>
            <textarea
              id="description"
              rows={4}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200/90 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs resize-none disabled:bg-slate-50 disabled:text-slate-500 font-medium"
              placeholder="Brief summary of organizational purpose & activities…"
              disabled={!isAdmin || saving}
            />
            <p className="text-[11px] text-slate-400 text-right font-mono">{description.length} / 500</p>
          </div>

          {/* Save button */}
          {isAdmin && (
            <div className="pt-1">
              <button
                type="submit"
                disabled={saving || (name === org?.name && (organizationType === 'OTHER' ? customIndustry.trim() === org?.organizationType : organizationType === org?.organizationType) && description === (org?.description || ''))}
                className="w-full inline-flex justify-center items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-semibold px-4 py-2.5 rounded-full text-sm transition-all shadow-xs disabled:opacity-40 cursor-pointer active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving…' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
