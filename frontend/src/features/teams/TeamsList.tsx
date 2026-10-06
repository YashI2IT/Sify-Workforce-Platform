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
  UserCheck,
  UserX,
  ChevronDown
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
  roles?: string[];
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

  const filteredTeams = teams.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesManager = true;
    if (managerFilter === 'managed') {
      matchesManager = Boolean(t.managerId);
    } else if (managerFilter === 'unmanaged') {
      matchesManager = !t.managerId;
    }
    return matchesSearch && matchesManager;
  });

  const isAdmin = Boolean(isSetupWizard || currentAuthEmp?.role === 'ADMIN' || (currentAuthEmp as any)?.roles?.includes('ADMIN') || currentAuthEmp?.role === 'MANAGER' || (currentAuthEmp as any)?.roles?.includes('MANAGER'));

  // Metrics
  const managedCount = teams.filter(t => Boolean(t.managerId)).length;
  const unmanagedCount = teams.filter(t => !t.managerId).length;
  const assignedEmployeesCount = employees.filter(e => Boolean(e.teamId)).length;
  const unassignedEmployeesCount = Math.max(0, employees.length - assignedEmployeesCount);

  const getTeamInitials = (name: string) => {
    if (!name) return 'TM';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Filter manager options (active managers only, exclude employees and admins)
  const availableManagers = employees.filter(e => {
    const isManagerRole = (e as any).role === 'MANAGER' || (e as any).roles?.includes('MANAGER');
    return isManagerRole && e.isActive !== false;
  });

  const managerOptions = [
    { value: '', label: 'No Manager' },
    ...availableManagers.map(emp => ({
      value: emp.id,
      label: `${emp.name} (${emp.employeeCode})`
    }))
  ];

  return (
    <div className={isSetupWizard ? "divide-y divide-slate-100" : "p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 pb-20"}>
      
      {/* Header — Public Holidays Style */}
      <div className={isSetupWizard 
        ? "p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4" 
        : "animate-slideUpFade flex items-center justify-between flex-wrap gap-4"
      }>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {isSetupWizard ? 'Teams & Managers' : 'Teams'}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {teams.length} {teams.length === 1 ? 'Team' : 'Teams'}
            </span>
          </div>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
            {isSetupWizard
              ? 'Create organization teams and assign lead managers who approve weekly timesheets.'
              : 'Manage organization teams, assign team managers, and view member rosters.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            title="Refresh teams"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh</span>
          </button>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>Create Team</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary Metric Cards (Hidden in setup wizard mode) */}
      {!isSetupWizard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Teams */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Total Teams
              </span>
              <Briefcase className="w-4 h-4 text-slate-900" />
            </div>
            <div className="mt-3">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : teams.length}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {unmanagedCount > 0
                  ? `${managedCount} of ${teams.length} teams have an assigned manager`
                  : 'All teams currently have an assigned manager'}
              </p>
            </div>
          </div>

          {/* Card 2: Team Members */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Team Members
              </span>
              <UserCheck className="w-4 h-4 text-slate-900" />
            </div>
            <div className="mt-3">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : assignedEmployeesCount}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {assignedEmployeesCount} employees assigned across your teams
              </p>
            </div>
          </div>

          {/* Card 3: Total Managers */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Total Managers
              </span>
              <ShieldCheck className="w-4 h-4 text-slate-900" />
            </div>
            <div className="mt-3">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : availableManagers.length}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {managedCount > 0
                  ? `${managedCount} managers currently leading teams`
                  : 'Active managers in the organization'}
              </p>
            </div>
          </div>

          {/* Card 4: Unassigned Pool */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Unassigned Pool
              </span>
              <UserX className="w-4 h-4 text-slate-900" />
            </div>
            <div className="mt-3">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : unassignedEmployeesCount}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {unassignedEmployeesCount > 0
                  ? `${unassignedEmployeesCount} employees not yet assigned to any team`
                  : 'All employees are assigned to a team'}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Main Container / Filter Bar & Table */}
      <div className={isSetupWizard ? "p-6 sm:p-7 space-y-5" : "space-y-4"}>
        
        {/* Search & Quick Filter Toolbar */}
        <div className="animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
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

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1.5">Filter:</span>
            <button
              type="button"
              onClick={() => setManagerFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                managerFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              All Teams ({teams.length})
            </button>
            <button
              type="button"
              onClick={() => setManagerFilter('managed')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                managerFilter === 'managed'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              With Manager ({managedCount})
            </button>
            <button
              type="button"
              onClick={() => setManagerFilter('unmanaged')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                managerFilter === 'unmanaged'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              Needs Manager ({unmanagedCount})
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
                onClick={loadData}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-950 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No teams found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || managerFilter !== 'all'
                  ? 'No teams matched your filter criteria. Try clearing search or filter parameters.'
                  : 'Teams group employees under managers for timesheet approval and workload reporting.'}
              </p>
              {(searchQuery || managerFilter !== 'all') ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setManagerFilter('all');
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear All Filters
                </button>
              ) : isAdmin && (
                <button
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center gap-1.5 bg-[#12161F] hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-full text-xs transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create First Team
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80">
                    <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Team Name</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Assigned Manager</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Members</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Actions</th>
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
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Team Name */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-slate-800">
                              {getTeamInitials(team.name)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 text-sm block truncate">
                                {team.name}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                Operational Team
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Manager */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {manager ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 text-sm truncate">
                                  {manager.name}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {manager.email}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              No manager assigned
                            </span>
                          )}
                        </td>

                        {/* Members Button */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          <button
                            onClick={() => setViewingMembersTeam(team)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 transition-all shadow-2xs cursor-pointer group"
                            title="View roster members"
                          >
                            <Users className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-colors" />
                            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {isAdmin ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(team)}
                                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit team"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingTeam(team)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete team"
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

      {/* Portaled Create Team Modal */}
      {isCreateOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-slideUpFade">
          <div className="bg-white rounded-[14px] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200/90 animate-successPop flex flex-col">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight font-sans">Create New Team</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium font-sans">Set up a new team and assign a lead manager.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="m-6 mb-0 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium font-sans">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Infrastructure Engineering"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans"
                />
              </div>

              <div>
                <label htmlFor="create-team-manager" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                  Manager Assignment
                </label>
                <div className="relative">
                  <select
                    id="create-team-manager"
                    value={managerId}
                    onChange={e => setManagerId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans font-medium cursor-pointer appearance-none"
                  >
                    {managerOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium font-sans">
                  Team managers can review and approve weekly timesheets for their team members.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-full text-sm font-bold shadow-2xs transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
                >
                  {formSubmitting ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Portaled Edit Team Modal */}
      {Boolean(editingTeam) && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-slideUpFade">
          <div className="bg-white rounded-[14px] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200/90 animate-successPop flex flex-col">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight font-sans">Edit Team</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium font-sans">Update team name and manager assignment.</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingTeam(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="m-6 mb-0 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium font-sans">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans"
                />
              </div>

              <div>
                <label htmlFor="edit-team-manager" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                  Manager Assignment
                </label>
                <div className="relative">
                  <select
                    id="edit-team-manager"
                    value={managerId}
                    onChange={e => setManagerId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans font-medium cursor-pointer appearance-none"
                  >
                    {managerOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium font-sans">
                  Leave as "No Manager" if this team is temporarily unassigned.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-full text-sm font-bold shadow-2xs transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Portaled View Team Members Modal */}
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
                onClick={() => setViewingMembersTeam(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Appointed Manager:</span>
                <span className="font-bold text-slate-900">
                  {viewingMembersTeam && getManager(viewingMembersTeam.managerId)?.name || 'No manager assigned'}
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
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Portaled Delete Confirmation Modal */}
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
                  className="px-5 py-2.5 border border-slate-200 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTeam}
                  disabled={formSubmitting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
