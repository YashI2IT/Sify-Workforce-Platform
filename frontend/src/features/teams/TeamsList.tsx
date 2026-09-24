import { useState, useRef, useEffect } from 'react';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  useGetTeamsQuery,
  useGetEmployeesQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation
} from '../../store/apiSlice';
import { 
  UsersRound, 
  Plus, 
  Edit2, 
  Users, 
  Search, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck,
  ChevronDown,
  Check,
  X,
  Briefcase,
  UserCheck,
  Filter
} from 'lucide-react';

interface Team {
  id: string;
  organizationId: string;
  name: string;
  managerId: string | null;
  createdAt?: string;
}

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  teamId: string | null;
  isActive: boolean;
  role?: string;
}

export interface TeamsListProps {
  isSetupWizard?: boolean;
}

const managerFilterOptions = [
  { value: 'all', label: 'All Squads' },
  { value: 'managed', label: 'Managed Only' },
  { value: 'unmanaged', label: 'No Manager (Open)' },
];

export const TeamsList = ({ isSetupWizard = false }: TeamsListProps = {}) => {
  const { employee: currentAuthEmp } = useCurrentEmployee();
  const { showToast } = useToast();
  
  const { data: teamsRes, isLoading: teamsLoading, error: teamsError, refetch: refetchTeams } = useGetTeamsQuery({ limit: 100 });
  const { data: empsRes, isLoading: empsLoading, error: empsError, refetch: refetchEmployees } = useGetEmployeesQuery({ limit: 100 });

  const [createTeam] = useCreateTeamMutation();
  const [updateTeamM] = useUpdateTeamMutation();

  const loading = teamsLoading || empsLoading;
  const error = (teamsError || empsError) ? 'Failed to load teams' : '';

  const teams: Team[] = Array.isArray(teamsRes) ? teamsRes : (teamsRes?.data ?? []);
  const employees: Employee[] = Array.isArray(empsRes) ? empsRes : (empsRes?.data ?? []);

  const [searchQuery, setSearchQuery] = useState('');
  const [managerFilter, setManagerFilter] = useState<string>('all');

  // Custom Dropdown state
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);
  const managerDropdownRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewingMembersTeam, setViewingMembersTeam] = useState<Team | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
  const [teamName, setTeamName] = useState('');
  const [managerId, setManagerId] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(event.target as Node)) {
        setManagerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = () => {
    refetchTeams();
    refetchEmployees();
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setTeamName('');
    setManagerId('');
    setFormError('');
    setIsCreateOpen(true);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setManagerId(team.managerId || '');
    setFormError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    const orgId = currentAuthEmp?.organizationId || sessionStorage.getItem('dev_org_id') || '';
    if (!orgId) {
      setFormError('No organization context available. Select a dev user first.');
      setFormSubmitting(false);
      return;
    }

    try {
      await createTeam({
        organizationId: orgId,
        name: teamName.trim(),
        managerId: managerId ? managerId : null,
      }).unwrap();

      setIsCreateOpen(false);
      showToast('Team created successfully', 'success');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create team');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setFormSubmitting(true);
    setFormError('');

    try {
      await updateTeamM({
        id: editingTeam.id,
        data: {
          name: teamName.trim(),
          managerId: managerId ? managerId : null,
        }
      }).unwrap();

      setEditingTeam(null);
      showToast('Team updated successfully', 'success');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update team');
    } finally {
      setFormSubmitting(false);
    }
  };

  const getManager = (mgrId: string | null) => {
    if (!mgrId) return null;
    return employees.find(e => e.id === mgrId) || null;
  };

  const getTeamMembers = (teamId: string) => {
    return employees.filter(e => e.teamId === teamId);
  };

  const filteredTeams = teams.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesManager = true;
    if (managerFilter === 'managed') {
      matchesManager = !!t.managerId;
    } else if (managerFilter === 'unmanaged') {
      matchesManager = !t.managerId;
    }
    return matchesSearch && matchesManager;
  });

  const isAdmin = Boolean(isSetupWizard || currentAuthEmp?.role === 'ADMIN' || (currentAuthEmp as any)?.roles?.includes('ADMIN'));

  // Executive Metrics
  const managedCount = teams.filter(t => !!t.managerId).length;
  const unmanagedCount = teams.filter(t => !t.managerId).length;
  const assignedEmployeesCount = employees.filter(e => !!e.teamId).length;
  const leadershipCoverage = teams.length > 0 ? Math.round((managedCount / teams.length) * 100) : 0;
  const avgTeamSize = teams.length > 0 ? (assignedEmployeesCount / teams.length).toFixed(1) : '0';

  const getTeamInitials = (name: string) => {
    if (!name) return 'TM';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className={isSetupWizard ? "divide-y divide-slate-100" : "p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6"}>
      {/* Executive Command Header */}
      <div className={isSetupWizard ? "p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4" : "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1"}>
        <div className={isSetupWizard ? "space-y-1" : ""}>
          <div className="flex items-center gap-3">
            {isSetupWizard ? (
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-2xs">
                <UsersRound className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white shadow-xs border border-slate-800 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className={`${isSetupWizard ? 'text-lg font-bold text-slate-900 font-display' : 'text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display'}`}>
                  {isSetupWizard ? 'Teams & Managers' : 'Teams'}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                  {teams.length} {teams.length === 1 ? 'squad' : 'squads'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isSetupWizard
                  ? 'Create operational teams and assign lead managers. Managers approve weekly timesheets for their team members.'
                  : isAdmin 
                    ? 'Manage operational squads, assigned lead managers, and department workforce rosters.' 
                    : 'View operational team rosters, lead assignments, and member allocations.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={loadData}
            className="p-2.5 border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Refresh teams"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className={isSetupWizard
                ? "inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white font-medium px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99]"
                : "inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99]"
              }
            >
              <Plus className="w-4 h-4" />
              Create Team
            </button>
          )}
        </div>
      </div>

      {/* Executive Telemetry Strip (Shown in full page view) */}
      {!isSetupWizard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Operational Squads */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Active Squads
              </span>
              <Briefcase className="w-4 h-4 text-slate-400" />
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                  {loading ? '—' : teams.length}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">
                  operational teams
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
                <div 
                  className="bg-slate-900 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${teams.length > 0 ? 100 : 0}%` }} 
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Department units</span>
              <span className="font-mono text-slate-700">{teams.length}</span>
            </div>
          </div>

          {/* Card 2: Leadership Coverage */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Leadership Ratio
              </span>
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                  {loading ? '—' : `${leadershipCoverage}%`}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">
                  managed ({managedCount}/{teams.length})
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${leadershipCoverage}%` }} 
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Open lead positions</span>
              <span className="font-mono text-slate-700">{unmanagedCount}</span>
            </div>
          </div>

          {/* Card 3: Assigned Workforce */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Workforce in Squads
              </span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                  {loading ? '—' : assignedEmployeesCount}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">
                  members allocated
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${employees.length > 0 ? (assignedEmployeesCount / employees.length) * 100 : 0}%` }} 
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Total employees</span>
              <span className="font-mono text-slate-700">{employees.length}</span>
            </div>
          </div>

          {/* Card 4: Density & Pacing */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Squad Density
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                  {loading ? '—' : avgTeamSize}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">
                  avg members / squad
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Structured for agile timesheet review
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Unassigned pool</span>
              <span className="font-mono text-slate-700">{employees.length - assignedEmployeesCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Container / Filter Bar & Ledger */}
      <div className={isSetupWizard ? "p-6 sm:p-7 space-y-5" : "space-y-4"}>
        {/* Filter & Search Toolbar */}
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search teams by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50/50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Custom Modern Dropdown: Manager Status Filter */}
            <div className="relative" ref={managerDropdownRef}>
              <button
                type="button"
                onClick={() => setManagerDropdownOpen(!managerDropdownOpen)}
                className={`h-9 sm:h-10 rounded-xl border bg-slate-50/50 hover:bg-white px-3 text-xs sm:text-sm text-slate-800 flex items-center justify-between gap-2.5 transition-all shadow-2xs cursor-pointer min-w-[150px] sm:min-w-[170px] ${
                  managerDropdownOpen
                    ? 'border-slate-900 ring-2 ring-slate-950/15 bg-white'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
                aria-label="Filter by Manager"
              >
                <span className="font-medium truncate">
                  {managerFilterOptions.find(o => o.value === managerFilter)?.label || 'All Squads'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    managerDropdownOpen ? 'rotate-180 text-slate-800' : ''
                  }`}
                />
              </button>

              {managerDropdownOpen && (
                <div 
                  className="absolute right-0 top-full mt-1.5 z-30 min-w-[190px] rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 p-1 space-y-0.5 animate-fadeIn"
                >
                  {managerFilterOptions.map(opt => {
                    const isSelected = managerFilter === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => {
                          setManagerFilter(opt.value);
                          setManagerDropdownOpen(false);
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100 text-slate-950 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Filter Tag Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-medium text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Quick:
              </span>
              <button
                onClick={() => setManagerFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  managerFilter === 'all'
                    ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                All ({teams.length})
              </button>
              <button
                onClick={() => setManagerFilter('managed')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  managerFilter === 'managed'
                    ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                Managed ({managedCount})
              </button>
              <button
                onClick={() => setManagerFilter('unmanaged')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  managerFilter === 'unmanaged'
                    ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                Open Lead ({unmanagedCount})
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500">
              Showing <span className="font-semibold text-slate-900">{filteredTeams.length}</span> of {teams.length} squads
            </div>
          </div>
        </div>

        {/* Enterprise Teams Ledger Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
          {loading ? (
            <div className="py-20 text-center text-slate-500 space-y-3">
              <LoadingSpinner size="md" />
              <p className="text-xs font-mono font-medium text-slate-500">Loading squad directory...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="font-semibold text-slate-800">Error loading teams</p>
              <p className="text-sm text-rose-600">{error}</p>
              <button
                onClick={loadData}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="py-16 px-4 text-center">
              {/* Handcrafted Architectural Vector SVG Empty State */}
              <svg className="w-24 h-24 mx-auto text-slate-300 mb-3" viewBox="0 0 120 120" fill="none">
                <rect x="20" y="24" width="80" height="72" rx="12" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="46" cy="52" r="12" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="2" />
                <circle cx="74" cy="52" r="12" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="2" />
                <path d="M34 76C34 70 40 68 46 68C52 68 58 70 58 76" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                <path d="M62 76C62 70 68 68 74 68C80 68 86 70 86 76" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                <circle cx="92" cy="36" r="10" fill="#0F172A" />
                <path d="M92 32V40M88 36H96" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-base font-bold text-slate-900 font-display">No teams found</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || managerFilter !== 'all'
                  ? 'No squads matched your filter criteria. Try resetting search parameters.'
                  : 'Teams group employees under managers for streamlined timesheet approval and workload reporting.'}
              </p>
              {(searchQuery || managerFilter !== 'all') ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setManagerFilter('all');
                  }}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear All Filters
                </button>
              ) : isAdmin && (
                <button
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create First Team
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  <tr>
                    <th scope="col" className="px-6 py-4">Team Name</th>
                    <th scope="col" className="px-5 py-4">Assigned Manager</th>
                    <th scope="col" className="px-5 py-4">Members</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeams.map(team => {
                    const manager = getManager(team.managerId);
                    const members = getTeamMembers(team.id);
                    const memberCount = (team as any).memberCount ?? members.length;

                    return (
                      <tr 
                        key={team.id} 
                        className="hover:bg-slate-50/70 transition-colors duration-150"
                      >
                        {/* Team Name */}
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-slate-800">
                              {getTeamInitials(team.name)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 text-sm block truncate">
                                {team.name}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                Functional Squad
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Manager */}
                        <td className="px-5 py-4.5">
                          {manager ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center shrink-0 font-bold text-xs font-mono">
                                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 text-sm truncate">
                                  {manager.name}
                                </div>
                                <div className="text-xs text-slate-500 font-mono truncate">
                                  {manager.email}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              No manager assigned
                            </span>
                          )}
                        </td>

                        {/* Members Counter Button */}
                        <td className="px-5 py-4.5">
                          <button
                            onClick={() => setViewingMembersTeam(team)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold font-mono bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 transition-all shadow-2xs cursor-pointer group"
                            title="View roster members"
                          >
                            <Users className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-colors" />
                            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4.5 text-right">
                          {isAdmin ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditModal(team)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit team"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono font-medium">Read Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      <Modal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        title="Create New Team"
        maxWidth="md"
      >
        {formError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Team Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Infrastructure Team"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Manager Assignment
            </label>
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            >
              <option value="">No Manager (Optional)</option>
              {employees.filter(e => e.isActive && (e as any).role === 'MANAGER').map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 font-mono mt-1">
              Managers can approve weekly timesheets for members of this team.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {formSubmitting ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Team Modal */}
      <Modal 
        isOpen={!!editingTeam} 
        onClose={() => setEditingTeam(null)} 
        title="Edit Team"
        maxWidth="md"
      >
        {formError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Team Name *
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Manager Assignment
            </label>
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            >
              <option value="">No Manager</option>
              {employees.filter(e => e.isActive && (e as any).role === 'MANAGER').map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingTeam(null)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Team Members Modal */}
      <Modal 
        isOpen={!!viewingMembersTeam} 
        onClose={() => setViewingMembersTeam(null)} 
        title={viewingMembersTeam ? `${viewingMembersTeam.name} Members` : 'Team Members'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">Appointed Manager:</span>
            <span className="font-semibold text-slate-900">
              {viewingMembersTeam && getManager(viewingMembersTeam.managerId)?.name || 'Unassigned'}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {viewingMembersTeam && getTeamMembers(viewingMembersTeam.id).length === 0 ? (
              <div className="py-10 text-center text-slate-500 space-y-1.5">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-800">No members assigned</p>
                <p className="text-xs text-slate-400">Assign members to this squad from the Employees directory.</p>
              </div>
            ) : (
              viewingMembersTeam && getTeamMembers(viewingMembersTeam.id).map(member => (
                <div key={member.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{member.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{member.email} • {member.employeeCode}</div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono ${
                    member.isActive 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                  }`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setViewingMembersTeam(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl text-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
