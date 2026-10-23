import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useToast } from '../../context/ToastContext';
import {
  useGetTeamsQuery,
  useGetEmployeesQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation
} from '../../store/apiSlice';
import { 
  Plus, 
  Pencil, 
  Trash2,
  Users, 
  Search, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck,
  X,
  Briefcase,
  UserX,
  ChevronDown
} from 'lucide-react';

interface Team {
  id: string;
  organizationId: string;
  name: string;
  managerId: string | null;
  createdAt?: string;
  memberCount?: number;
}

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  teamId: string | null;
  isActive: boolean;
  role?: string;
  roles?: string[];
  organizationId?: string;
}

export interface TeamsListProps {
  isSetupWizard?: boolean;
}

export const TeamsList = ({ isSetupWizard = false }: TeamsListProps = {}) => {
  const { employee: currentAuthEmp } = useCurrentEmployee();
  const { showToast } = useToast();
  
  const { data: teamsRes, isLoading: teamsLoading, error: teamsError, refetch: refetchTeams } = useGetTeamsQuery({ limit: 100 });
  const { data: empsRes, isLoading: empsLoading, error: empsError, refetch: refetchEmployees } = useGetEmployeesQuery({ limit: 100 });

  const [createTeam] = useCreateTeamMutation();
  const [updateTeamM] = useUpdateTeamMutation();
  const [deleteTeam] = useDeleteTeamMutation();

  const loading = teamsLoading || empsLoading;
  const error = (teamsError || empsError) ? 'Failed to load teams' : '';

  const teams: Team[] = Array.isArray(teamsRes) ? teamsRes : (teamsRes?.data ?? []);
  const employees: Employee[] = Array.isArray(empsRes) ? empsRes : (empsRes?.data ?? []);

  const [searchQuery, setSearchQuery] = useState('');
  const [managerFilter, setManagerFilter] = useState<'all' | 'managed' | 'unmanaged'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewingMembersTeam, setViewingMembersTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
  const [teamName, setTeamName] = useState('');
  const [managerId, setManagerId] = useState('');

  const loadData = () => {
    refetchTeams();
    refetchEmployees();
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setTeamName('');
    const isManagerRole = currentAuthEmp?.role === 'MANAGER' || (currentAuthEmp as any)?.roles?.includes('MANAGER');
    setManagerId(isManagerRole && currentAuthEmp?.id ? currentAuthEmp.id : '');
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
    if (!teamName.trim()) {
      setFormError('Team name is required');
      return;
    }
    setFormSubmitting(true);
    setFormError('');

    const orgId = currentAuthEmp?.organizationId || sessionStorage.getItem('dev_org_id') || '';
    if (!orgId) {
      setFormError('No organization context available. Please select an organization or login again.');
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
      setFormError(err?.data?.message || err?.message || 'Failed to create team');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    if (!teamName.trim()) {
      setFormError('Team name is required');
      return;
    }
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
      setFormError(err?.data?.message || err?.message || 'Failed to update team');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return;
    setFormSubmitting(true);
    try {
      await deleteTeam(deletingTeam.id).unwrap();
      showToast('Team deleted successfully', 'success');
      setDeletingTeam(null);
      loadData();
    } catch (err: any) {
      showToast(err?.data?.message || err?.message || 'Failed to delete team', 'error');
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

  // Searching and filtering working together
  const filteredTeams = teams.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    let matchesManager = true;
    if (managerFilter === 'managed') {
      matchesManager = Boolean(t.managerId);
    } else if (managerFilter === 'unmanaged') {
      matchesManager = !t.managerId;
    }
    return matchesSearch && matchesManager;
  });

  const isAdmin = Boolean(
    isSetupWizard || 
    currentAuthEmp?.role === 'ADMIN' || 
    (currentAuthEmp as any)?.roles?.includes('ADMIN') || 
    currentAuthEmp?.role === 'MANAGER' || 
    (currentAuthEmp as any)?.roles?.includes('MANAGER')
  );

  // Distinct KPI calculations
  const totalTeams = teams.length;

  // Distinct active employees assigned to teams within scope
  const distinctMembersCount = new Set(
    employees
      .filter(e => Boolean(e.teamId) && e.isActive !== false)
      .map(e => e.id)
  ).size;

  // Distinct active employees currently assigned as team managers
  const assignedLeadIds = new Set(
    teams
      .map(t => t.managerId)
      .filter((id): id is string => Boolean(id) && employees.some(e => e.id === id && e.isActive !== false))
  );
  const distinctLeadsCount = assignedLeadIds.size;

  // Teams without an assigned manager
  const unmanagedTeamsCount = teams.filter(t => !t.managerId).length;
  const managedTeamsCount = totalTeams - unmanagedTeamsCount;

  const getTeamInitials = (name: string) => {
    if (!name) return 'TM';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Eligible active managers in the organization
  const availableManagers = employees.filter(e => {
    const isManagerRole = (e as any).role === 'MANAGER' || (e as any).roles?.includes('MANAGER');
    return isManagerRole && e.isActive !== false;
  });

  const managerOptions = [
    { value: '', label: 'No team lead (unassigned)' },
    ...availableManagers.map(emp => ({
      value: emp.id,
      label: `${emp.name} (${emp.employeeCode})`
    }))
  ];

  return (
    <div className={isSetupWizard ? "divide-y divide-slate-100" : "p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 pb-20"}>
      
      {/* 1. Page Heading */}
      <div className={isSetupWizard 
        ? "p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4" 
        : "animate-slideUpFade flex items-center justify-between flex-wrap gap-4"
      }>
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight">
            Teams
          </h1>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1">
            Manage teams, team leads, and members.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98] cursor-pointer"
            title="Refresh teams"
            aria-label="Refresh teams"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-[#121f47] text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              aria-label="Create Team"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>Create Team</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Summary Cards (4 compact cards in a single row) */}
      {!isSetupWizard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Teams */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Total Teams
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : totalTeams}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {totalTeams} {totalTeams === 1 ? 'team' : 'teams'} in organization
              </p>
            </div>
          </div>

          {/* Card 2: Team Members */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Team Members
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : distinctMembersCount}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {distinctMembersCount} distinct active {distinctMembersCount === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>

          {/* Card 3: Team Leads */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Team Leads
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : distinctLeadsCount}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {distinctLeadsCount} active {distinctLeadsCount === 1 ? 'lead' : 'leads'} managing teams
              </p>
            </div>
          </div>

          {/* Card 4: Teams Without a Lead (Clickable to filter) */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => setManagerFilter(prev => prev === 'unmanaged' ? 'all' : 'unmanaged')}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setManagerFilter(prev => prev === 'unmanaged' ? 'all' : 'unmanaged');
              }
            }}
            title="Click to filter teams without a lead"
            aria-label="Filter teams without a lead"
            className={`bg-white/95 backdrop-blur-md border shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200 cursor-pointer text-left select-none ${
              managerFilter === 'unmanaged'
                ? 'border-[#0B1738] ring-2 ring-[#0B1738]/15 bg-slate-50/60'
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Teams Without a Lead
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                unmanagedTeamsCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
              }`}>
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : unmanagedTeamsCount}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium flex items-center justify-between">
                <span>
                  {unmanagedTeamsCount === 0
                    ? 'All teams have an assigned lead'
                    : `${unmanagedTeamsCount} ${unmanagedTeamsCount === 1 ? 'team requires' : 'teams require'} a lead`}
                </span>
                {managerFilter === 'unmanaged' && (
                  <span className="text-[11px] font-semibold text-[#0B1738] underline ml-1">Filtered</span>
                )}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 3. Search and Filtering Toolbar & 4. Teams Table */}
      <div className={isSetupWizard ? "p-6 sm:p-7 space-y-5" : "space-y-4"}>
        
        {/* Search & Filter Controls */}
        <div className="animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50/50 border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setManagerFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                managerFilter === 'all'
                  ? 'bg-[#0B1738] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              All Teams ({totalTeams})
            </button>
            <button
              type="button"
              onClick={() => setManagerFilter('managed')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                managerFilter === 'managed'
                  ? 'bg-[#0B1738] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              With Team Lead ({managedTeamsCount})
            </button>
            <button
              type="button"
              onClick={() => setManagerFilter('unmanaged')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                managerFilter === 'unmanaged'
                  ? 'bg-[#0B1738] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              Without Team Lead ({unmanagedTeamsCount})
            </button>
          </div>
        </div>

        {/* Teams Table */}
        <div className="animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-300 hover:shadow-md">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
              <span className="text-sm text-slate-500 font-medium">Loading teams…</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="font-semibold text-slate-800">Error loading teams</p>
              <p className="text-sm text-rose-600">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B1738] text-white rounded-full text-xs font-bold hover:bg-[#121f47] transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No teams found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || managerFilter !== 'all'
                  ? 'No teams match your search and filter criteria.'
                  : 'Get started by creating your first team to organize employees and assign leads.'}
              </p>
              {(searchQuery || managerFilter !== 'all') ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setManagerFilter('all');
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Filters
                </button>
              ) : isAdmin && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center gap-1.5 bg-[#0B1738] hover:bg-[#121f47] text-white font-semibold px-4 py-2 rounded-[10px] text-xs transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create Team
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80">
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Team</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Team Lead</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Members</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Status</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200/80 bg-slate-50/50">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeams.map(team => {
                    const manager = getManager(team.managerId);
                    const members = getTeamMembers(team.id);
                    const memberCount = (team as any).memberCount ?? members.length;
                    const isAssigned = Boolean(team.managerId);

                    return (
                      <tr 
                        key={team.id} 
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        {/* 1. Team */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#0B1738] text-[#C8DB00] font-bold text-xs flex items-center justify-center shrink-0 border border-slate-800">
                              {getTeamInitials(team.name)}
                            </div>
                            <span className="font-semibold text-slate-900 text-sm block truncate">
                              {team.name}
                            </span>
                          </div>
                        </td>

                        {/* 2. Team Lead */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {manager ? (
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 text-sm truncate">
                                {manager.name}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {manager.email}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              No team lead
                            </span>
                          )}
                        </td>

                        {/* 3. Members */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          <button
                            type="button"
                            onClick={() => setViewingMembersTeam(team)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer group"
                            title={`View members of ${team.name}`}
                            aria-label={`View roster for ${team.name}`}
                          >
                            <Users className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-colors" />
                            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                          </button>
                        </td>

                        {/* 4. Status */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {isAssigned ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              Assigned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* 5. Actions */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100 text-right">
                          {isAdmin ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(team)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit team"
                                aria-label={`Edit ${team.name}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTeam(team)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete team"
                                aria-label={`Delete ${team.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Read Only</span>
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

      {/* 5. Create Team Modal */}
      {isCreateOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-slideUpFade">
          <div className="bg-white rounded-[14px] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200/90 animate-successPop flex flex-col">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Create Team</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Add a new team and assign an eligible team lead.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="m-6 mb-0 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="create-team-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="create-team-name"
                  type="text"
                  required
                  placeholder="e.g. Infrastructure Engineering"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs"
                />
              </div>

              <div>
                <label htmlFor="create-team-lead" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Team Lead
                </label>
                <div className="relative">
                  <select
                    id="create-team-lead"
                    value={managerId}
                    onChange={e => setManagerId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs font-medium cursor-pointer appearance-none"
                  >
                    {managerOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Team leads must have the Manager role to approve timesheets and review workloads.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-[10px] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-[#121f47] text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Team Modal */}
      {Boolean(editingTeam) && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-slideUpFade">
          <div className="bg-white rounded-[14px] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200/90 animate-successPop flex flex-col">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Edit Team</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Update team name and lead manager assignment.</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingTeam(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="m-6 mb-0 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-team-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="edit-team-name"
                  type="text"
                  required
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs"
                />
              </div>

              <div>
                <label htmlFor="edit-team-lead" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Team Lead
                </label>
                <div className="relative">
                  <select
                    id="edit-team-lead"
                    value={managerId}
                    onChange={e => setManagerId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs font-medium cursor-pointer appearance-none"
                  >
                    {managerOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Team leads must have the Manager role to approve timesheets and review workloads.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-[10px] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-[#121f47] text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* View Team Members Modal */}
      {Boolean(viewingMembersTeam) && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[14px] shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-slideUpFade">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {viewingMembersTeam?.name} Members
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Roster of all employees assigned to this team.</p>
              </div>
              <button 
                type="button"
                onClick={() => setViewingMembersTeam(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition-colors cursor-pointer"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Team Lead:</span>
                <span className="font-bold text-slate-900">
                  {viewingMembersTeam && getManager(viewingMembersTeam.managerId)?.name || 'No team lead assigned'}
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {viewingMembersTeam && getTeamMembers(viewingMembersTeam.id).length === 0 ? (
                  <div className="py-10 text-center text-slate-500 space-y-1.5">
                    <Users className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold text-slate-800">No members assigned</p>
                    <p className="text-xs text-slate-400">Assign members to this team from the Employees directory.</p>
                  </div>
                ) : (
                  viewingMembersTeam && getTeamMembers(viewingMembersTeam.id).map(member => (
                    <div key={member.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{member.name}</div>
                        <div className="text-xs text-slate-500">{member.email} • {member.employeeCode}</div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-[10px] text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {Boolean(deletingTeam) && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[14px] shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-slideUpFade">
            <div className="p-6">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Team</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-900">{deletingTeam?.name}</strong>? Any assigned employees will become unassigned. This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingTeam(null)}
                  className="px-4 py-2 border border-slate-200 rounded-[10px] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTeam}
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-[10px] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Deleting...' : 'Delete Team'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
