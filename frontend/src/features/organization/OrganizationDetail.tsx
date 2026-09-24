import { useEffect, useState, useRef } from 'react';
import { 
  CheckCircle2, AlertCircle, Save, Users, UsersRound, 
  Shield, ChevronRight, UserCircle2, RefreshCw, ArrowUpRight, 
  ChevronDown, Check, Sparkles
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { authService } from '../../services/authService';
import { OrganizationOverview } from './OrganizationOverview';

export const OrganizationDetail = () => {
  const location = useLocation();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Admin check
  const [isAdmin, setIsAdmin] = useState(false);

  // Setup Progress
  const [hasEmployees, setHasEmployees] = useState(false);
  const [hasTeams, setHasTeams] = useState(false);
  const [hasNonAdminRoles, setHasNonAdminRoles] = useState(false);
  const [hasManagers, setHasManagers] = useState(false);
  
  // Editable Profile state
  const [name, setName] = useState('');
  const [organizationType, setOrganizationType] = useState('TECHNOLOGY');
  const [description, setDescription] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = async () => {
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
      setOrganizationType(orgData.organizationType || 'TECHNOLOGY');
      setDescription(orgData.description || '');

      // Fetch stats using setup-status endpoint
      try {
        const setupStats = await apiClient('/organizations/current/setup-status');
        setHasEmployees(setupStats.data.hasEmployees);
        setHasTeams(setupStats.data.hasTeams);
        setHasNonAdminRoles(setupStats.data.hasRoles);
        setHasManagers(setupStats.data.hasManagers);
      } catch (err) {
        // Fallback or ignore for non-admins if it fails
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load organization dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Close custom dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const payload: any = { name, organizationType };
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

  if (location.pathname.includes('/overview')) {
    return <OrganizationOverview />;
  }

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
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-display">Failed to Load Organization</h2>
        <p className="text-xs sm:text-sm text-slate-500">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const steps = [
    { title: 'Organization Profile', description: 'Core identity, name, and industry classification', isComplete: !!org?.name, link: null },
    { title: 'Add Employees', description: 'Invite organizational workforce members and assign codes', isComplete: hasEmployees, link: '/employees' },
    { title: 'Create Teams', description: 'Establish functional departments and project groups', isComplete: hasTeams, link: '/teams' },
    { title: 'Assign Roles', description: 'Configure ADMIN, MANAGER, and EMPLOYEE permissions', isComplete: hasNonAdminRoles, link: '/employees' },
    { title: 'Assign Managers', description: 'Designate team supervisors for timesheet approval flows', isComplete: hasManagers, link: '/teams' },
  ];

  const completedCount = steps.filter(s => s.isComplete).length;
  const completionPct = Math.round((completedCount / steps.length) * 100);
  const ringRadius = 24;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (ringCircumference * (completionPct / 100));

  const orgInitials = (org?.name || 'SW')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 pb-20 animate-fadeIn">
      {/* Executive Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-4">
          {/* Custom Vector SVG Tenant Squircle Emblem */}
          <div className="w-13 h-13 rounded-2xl bg-slate-950 flex items-center justify-center text-white font-black text-lg shadow-sm border border-slate-800 shrink-0 font-display">
            {orgInitials}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                {org.name}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wider uppercase bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Tenant
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-mono">
              {orgTypes.find(t => t.value === org.organizationType)?.label || org.organizationType}
              {org.description ? ` • ${org.description.substring(0, 60)}${org.description.length > 60 ? '...' : ''}` : ''}
            </p>
          </div>
        </div>

        {/* Admin Badge & Action Dock */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {isAdmin && (
            <div className="flex items-center gap-2 bg-slate-100 text-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs font-mono text-xs font-semibold">
              <Shield className="w-4 h-4 text-slate-700" />
              <span>You are the Organization Admin</span>
            </div>
          )}

          <button
            onClick={fetchDashboardData}
            className="p-2.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-950 transition-all shadow-2xs cursor-pointer"
            title="Refresh organization metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-slate-950' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50/80 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-3 text-xs sm:text-sm shadow-2xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-3 text-xs sm:text-sm shadow-2xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <p className="font-medium">{success}</p>
        </div>
      )}

      {/* High-Density Readiness Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Setup Readiness with Vector SVG Ring */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all relative group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Setup Readiness
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70">
              {completedCount} / {steps.length} Steps
            </span>
          </div>

          <div className="my-3 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                  {completionPct}%
                </span>
                <span className="text-xs text-slate-400 font-mono font-semibold">ready</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {completionPct === 100 ? 'Fully configured' : 'Configuration in progress'}
              </p>
            </div>

            {/* SVG Circular Ring Gauge */}
            <div className="shrink-0 w-13 h-13 relative flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                <circle
                  cx="30"
                  cy="30"
                  r={ringRadius}
                  stroke="#E2E8F0"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="30"
                  cy="30"
                  r={ringRadius}
                  stroke={completionPct === 100 ? "#059669" : "#0F172A"}
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute text-[11px] font-mono font-bold text-slate-800">
                {completionPct}%
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${completionPct === 100 ? 'bg-emerald-600' : 'bg-slate-900'}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>

        {/* Card 2: Employees Status */}
        <Link
          to="/employees"
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all relative group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Workforce Roster
            </span>
            <span className="text-slate-400 group-hover:text-slate-900 transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${hasEmployees ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasEmployees ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {hasEmployees ? 'Active Members' : 'Roster Empty'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-2">
              {hasEmployees ? 'Employees provisioned' : 'Invite employees to begin'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Employee directory</span>
            <span className="font-semibold text-slate-800">Manage →</span>
          </div>
        </Link>

        {/* Card 3: Teams Status */}
        <Link
          to="/teams"
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all relative group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Operational Teams
            </span>
            <span className="text-slate-400 group-hover:text-slate-900 transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${hasTeams ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasTeams ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {hasTeams ? 'Teams Configured' : 'No Teams Yet'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-2">
              {hasManagers ? 'Supervisors assigned' : 'Manager mapping required'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Team rosters</span>
            <span className="font-semibold text-slate-800">Manage →</span>
          </div>
        </Link>

        {/* Card 4: Governance / Setup Flow */}
        <Link
          to="/setup"
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all relative group flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Setup Wizard
            </span>
            <span className="text-slate-400 group-hover:text-slate-900 transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-slate-900 text-white">
                <Sparkles className="w-3 h-3 text-[#27F087]" />
                Interactive Wizard
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-2">
              Step-by-step onboarding walkthrough
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Walkthrough mode</span>
            <span className="font-semibold text-slate-800">Launch →</span>
          </div>
        </Link>
      </div>

      {/* Main Grid: 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-start">
        
        {/* Left Column: Setup Checklist & Setup Actions (7 Cols) */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-7">
          
          {/* Setup Readiness Checklist Ledger */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-950" />
                <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
                  Organization Setup
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                {completedCount} / {steps.length} Complete
              </span>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {steps.map((step, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {step.isComplete ? (
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80 shrink-0">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 shrink-0 font-mono text-xs font-bold">
                          {idx + 1}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs sm:text-sm font-bold tracking-tight ${step.isComplete ? 'text-slate-900' : 'text-slate-700'}`}>
                          {step.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-3">
                      {step.isComplete ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200">
                          Complete
                        </span>
                      ) : step.link ? (
                        <Link
                          to={step.link}
                          className="inline-flex items-center gap-1 text-xs font-semibold font-mono text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-all"
                        >
                          <span>Configure</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Admin Setup Actions Hub */}
          {isAdmin && (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
                    Setup Actions
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Fast Workflows</span>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Link 
                  to="/employees" 
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-colors shrink-0">
                      <UserCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm block group-hover:text-slate-950">Add Employees</span>
                      <span className="text-[11px] text-slate-400 block">Invite team members</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>

                <Link 
                  to="/teams" 
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-colors shrink-0">
                      <UsersRound className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm block group-hover:text-slate-950">Create Teams</span>
                      <span className="text-[11px] text-slate-400 block">Organize departments</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>

                <Link 
                  to="/employees" 
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-colors shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm block group-hover:text-slate-950">Assign Roles</span>
                      <span className="text-[11px] text-slate-400 block">Admin, Manager, Employee</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>

                <Link 
                  to="/teams" 
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-colors shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm block group-hover:text-slate-950">Assign Managers</span>
                      <span className="text-[11px] text-slate-400 block">Approval routing</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Organization Profile Configuration Form (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-950" />
                <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
                  Organization Profile
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Settings</span>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-xs sm:text-[13px] font-semibold text-slate-700">
                  Organization Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                  required
                  disabled={!isAdmin || saving}
                />
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="organizationType" className="block text-xs sm:text-[13px] font-semibold text-slate-700">
                  Industry Classification *
                </label>
                
                <div className="relative" ref={dropdownRef}>
                  {/* Native select for accessibility & automated tests */}
                  <select
                    id="organizationType"
                    value={organizationType}
                    onChange={(e) => setOrganizationType(e.target.value)}
                    className="sr-only"
                    tabIndex={-1}
                    disabled={!isAdmin || saving}
                  >
                    {orgTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  {/* Professional Custom Popover Trigger */}
                  <button
                    type="button"
                    onClick={() => isAdmin && !saving && setDropdownOpen(!dropdownOpen)}
                    disabled={!isAdmin || saving}
                    className={`w-full h-11 rounded-xl border bg-white px-3.5 text-xs sm:text-sm text-slate-900 flex items-center justify-between transition-all shadow-2xs ${
                      !isAdmin || saving ? 'opacity-60 bg-slate-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      dropdownOpen
                        ? 'border-slate-900 ring-2 ring-slate-950/15'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                    aria-haspopup="listbox"
                    aria-expanded={dropdownOpen}
                  >
                    <span className="font-medium text-slate-900 truncate">
                      {orgTypes.find((t) => t.value === organizationType)?.label || 'Select Industry'}
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
                      className="absolute top-full left-0 right-0 z-30 mt-1 max-h-[220px] overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 p-1 space-y-0.5 animate-fadeIn"
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
                            }}
                            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-slate-100 text-slate-950 font-bold'
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
              </div>

              <div className="space-y-1.5">
                <label htmlFor="description" className="block text-xs sm:text-[13px] font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/90 bg-white p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs resize-none disabled:bg-slate-50 disabled:text-slate-500 font-medium"
                  placeholder="Brief summary of organizational purpose & activities..."
                  disabled={!isAdmin || saving}
                />
              </div>

              {isAdmin && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving || (name === org?.name && organizationType === org?.organizationType && description === (org?.description || ''))}
                    className="w-full inline-flex justify-center items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs disabled:opacity-40 cursor-pointer active:scale-[0.98]"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
