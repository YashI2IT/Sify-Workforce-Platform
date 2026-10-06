import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Select } from '../../components/ui/Select';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useToast } from '../../context/ToastContext';
import {
  useGetEmployeesQuery,
  useGetTeamsQuery,
  useGetEmployeeInvitationsQuery,
  useCreateEmployeeInvitationMutation,
  useUpdateEmployeeMutation,
  useCancelEmployeeInvitationMutation,
  useResendEmployeeInvitationMutation
} from '../../store/apiSlice';
import {
  UserPlus,
  Pencil,
  CheckCircle2,
  XCircle,
  Search,
  AlertCircle,
  RefreshCw,
  Send,
  Trash2,
  ShieldCheck,
  Users,
  Clock,
  X,
  Sparkles,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';

interface Employee {
  id: string;
  organizationId: string;
  employeeCode: string;
  name: string;
  email: string;
  teamId: string | null;
  isActive: boolean;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  createdAt?: string;
  managedTeams?: { id: string; name: string }[];
}

interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  teamId: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
}

const roleInviteOptions = [
  { value: 'EMPLOYEE', label: 'EMPLOYEE (Standard Member)' },
  { value: 'MANAGER', label: 'MANAGER (Team Approver)' },
  { value: 'ADMIN', label: 'ADMIN (Full Admin Access)' },
];

export interface EmployeesListProps {
  isSetupWizard?: boolean;
}

export const EmployeesList = ({ isSetupWizard = false }: EmployeesListProps = {}) => {
  const { employee: currentAuthEmp } = useCurrentEmployee();
  const { showToast } = useToast();

  const isAdmin = Boolean(
    isSetupWizard ||
    currentAuthEmp?.roles?.includes('ADMIN') ||
    currentAuthEmp?.role === 'ADMIN' ||
    currentAuthEmp?.roles?.includes('MANAGER') ||
    currentAuthEmp?.role === 'MANAGER'
  );

  const { data: empRes, isLoading: employeesLoading, error: employeesError, refetch: refetchEmployees } = useGetEmployeesQuery({ limit: 100 });
  const { data: teamsRes, isLoading: teamsLoading, refetch: refetchTeams } = useGetTeamsQuery({ limit: 100 });
  const { data: invRes, isLoading: invLoading, refetch: refetchInvites } = useGetEmployeeInvitationsQuery(undefined, { skip: !isAdmin });

  const [createInvitation] = useCreateEmployeeInvitationMutation();
  const [updateEmployeeM] = useUpdateEmployeeMutation();
  const [cancelEmployeeInvitation] = useCancelEmployeeInvitationMutation();
  const [resendEmployeeInvitation] = useResendEmployeeInvitationMutation();

  const loading = employeesLoading || teamsLoading || (isAdmin && invLoading);
  const error = employeesError ? 'Failed to load employee records' : '';

  const employees: Employee[] = Array.isArray(empRes) ? empRes : (empRes?.data ?? []);
  const teams: Team[] = Array.isArray(teamsRes) ? teamsRes : (teamsRes?.data ?? []);
  const invitations: Invitation[] = isAdmin ? (Array.isArray(invRes) ? invRes : (invRes?.data ?? [])) : [];

  const teamFilterOptions = React.useMemo(() => [
    { value: '', label: 'All Teams' },
    ...teams.map(t => ({ value: t.id, label: t.name })),
  ], [teams]);

  const teamFormOptions = React.useMemo(() => [
    { value: '', label: 'No Team Assigned' },
    ...teams.map(t => ({ value: t.id, label: t.name })),
  ], [teams]);

  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [statusToggleEmployee, setStatusToggleEmployee] = useState<Employee | null>(null);
  const [isStatusToggling, setIsStatusToggling] = useState(false);

  // Invitation actions state
  const [cancelInvitation, setCancelInvitation] = useState<Invitation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Employee Form
  const [editFormData, setEditFormData] = useState({
    employeeCode: '',
    name: '',
    email: '',
    teamId: '',
    isActive: true,
    role: 'EMPLOYEE' as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
  });

  // Invite Form
  const [inviteFormData, setInviteFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    teamId: '',
    role: 'EMPLOYEE' as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
  });
  const [showInvitePassword, setShowInvitePassword] = useState(false);

  const createRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    const sets = [
      'ABCDEFGHJKLMNPQRSTUVWXYZ',
      'abcdefghijkmnpqrstuvwxyz',
      '23456789',
      '!@#$%&*'
    ];
    sets.forEach(set => {
      pwd += set.charAt(Math.floor(Math.random() * set.length));
    });
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const generatePassword = () => {
    setInviteFormData(prev => ({ ...prev, password: createRandomPassword() }));
  };

  const loadData = () => {
    refetchEmployees();
    refetchTeams();
    if (isAdmin) refetchInvites();
  };

  const openInviteModal = () => {
    setInviteFormData({
      name: '',
      username: '',
      email: '',
      password: createRandomPassword(),
      teamId: '',
      role: 'EMPLOYEE',
    });
    setShowInvitePassword(false);
    setFormError('');
    setIsInviteOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditFormData({
      employeeCode: emp.employeeCode,
      name: emp.name,
      email: emp.email,
      teamId: emp.teamId || '',
      isActive: emp.isActive,
      role: emp.role || 'EMPLOYEE',
    });
    setFormError('');
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    const derivedUsername = inviteFormData.username.trim() ||
      (inviteFormData.email.includes('@') ? inviteFormData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') : '') ||
      inviteFormData.name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '') ||
      'user';

    const derivedPassword = inviteFormData.password.trim() || createRandomPassword();

    try {
      await createInvitation({
        name: inviteFormData.name.trim(),
        username: derivedUsername,
        email: inviteFormData.email.trim(),
        password: derivedPassword,
        teamId: inviteFormData.teamId ? inviteFormData.teamId : null,
        role: inviteFormData.role,
      }).unwrap();

      setIsInviteOpen(false);
      showToast('Invitation sent successfully with login details', 'success');
      loadData();
    } catch (err: any) {
      const msg = typeof err?.data === 'string'
        ? err.data
        : err?.data?.message || err?.message || 'Failed to send invitation';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setFormSubmitting(true);
    setFormError('');

    const patchData: any = {
      employeeCode: editFormData.employeeCode.trim(),
      name: editFormData.name.trim(),
      email: editFormData.email.trim(),
      teamId: editFormData.teamId ? editFormData.teamId : null,
      isActive: editFormData.isActive,
    };

    if (editFormData.role !== editingEmployee.role) {
      patchData.role = editFormData.role;
    }

    try {
      await updateEmployeeM({
        id: editingEmployee.id,
        data: patchData,
      }).unwrap();

      setEditingEmployee(null);
      showToast('Employee updated successfully', 'success');
      loadData();
    } catch (err: any) {
      const msg = typeof err?.data === 'string'
        ? err.data
        : err?.data?.message || err?.message || 'Failed to update employee';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!statusToggleEmployee) return;

    setIsStatusToggling(true);
    try {
      await updateEmployeeM({
        id: statusToggleEmployee.id,
        data: { isActive: !statusToggleEmployee.isActive },
      }).unwrap();
      showToast(`Employee ${statusToggleEmployee.name} is now ${!statusToggleEmployee.isActive ? 'Active' : 'Inactive'}`, 'success');
      setStatusToggleEmployee(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update employee status', 'error');
    } finally {
      setIsStatusToggling(false);
    }
  };

  const confirmCancelInvitation = async () => {
    if (!cancelInvitation) return;
    setIsCancelling(true);
    try {
      await cancelEmployeeInvitation(cancelInvitation.id).unwrap();
      showToast(`Invitation for ${cancelInvitation.name} cancelled`, 'success');
      setCancelInvitation(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel invitation', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResendInvitation = async (id: string) => {
    setResendingId(id);
    try {
      await resendEmployeeInvitation(id).unwrap();
      showToast('Invitation resent successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to resend invitation', 'error');
    } finally {
      setResendingId(null);
    }
  };

  // Combine and filter list
  type UnifiedItem = { type: 'employee'; data: Employee } | { type: 'invitation'; data: Invitation };

  const allItems: UnifiedItem[] = React.useMemo(() => [
    ...employees.map(e => ({ type: 'employee' as const, data: e })),
    ...invitations.filter(i => i.status === 'PENDING').map(i => ({ type: 'invitation' as const, data: i }))
  ], [employees, invitations]);

  const filteredItems = React.useMemo(() => allItems.filter(item => {
    const d = item.data;
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.type === 'employee' && (d as Employee).employeeCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTeam = teamFilter ? d.teamId === teamFilter : true;

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'invited') {
        matchesStatus = item.type === 'invitation';
      } else if (statusFilter === 'managers') {
        matchesStatus = item.data.role === 'MANAGER';
      } else {
        if (item.type === 'invitation') {
          matchesStatus = false;
        } else {
          const emp = d as Employee;
          matchesStatus = statusFilter === 'active' ? emp.isActive : !emp.isActive;
        }
      }
    }

    return matchesSearch && matchesTeam && matchesStatus;
  }), [allItems, searchQuery, teamFilter, statusFilter]);

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'Unassigned';
    const found = teams.find(t => t.id === teamId);
    return found ? found.name : 'Unknown Team';
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Executive Metric Calculations
  const {
    activeCount,
    inactiveCount,
    pendingCount,
    adminCount,
    managerCount,
    staffCount,
    assignedToTeamsCount,
    unassignedEmployeesCount,
    teamAssignmentRate
  } = React.useMemo(() => {
    const activeCount = employees.filter(e => e.isActive).length;
    const inactiveCount = employees.filter(e => !e.isActive).length;
    const pendingCount = invitations.filter(i => i.status === 'PENDING').length;
    const adminCount = employees.filter(e => e.role === 'ADMIN').length;
    const managerCount = employees.filter(e => e.role === 'MANAGER').length;
    const staffCount = employees.filter(e => e.role === 'EMPLOYEE').length;
    const assignedToTeamsCount = employees.filter(e => Boolean(e.teamId)).length;
    const unassignedEmployeesCount = Math.max(0, employees.length - assignedToTeamsCount);
    const teamAssignmentRate = employees.length > 0 ? Math.round((assignedToTeamsCount / employees.length) * 100) : 0;
    
    return {
      activeCount, inactiveCount, pendingCount, adminCount, managerCount,
      staffCount, assignedToTeamsCount, unassignedEmployeesCount, teamAssignmentRate
    };
  }, [employees, invitations]);

  // Escape key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isInviteOpen) setIsInviteOpen(false);
        if (editingEmployee) setEditingEmployee(null);
        if (statusToggleEmployee) setStatusToggleEmployee(null);
        if (cancelInvitation) setCancelInvitation(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInviteOpen, editingEmployee, statusToggleEmployee, cancelInvitation]);

  return (
    <div className={isSetupWizard ? "divide-y divide-slate-100" : "p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 pb-20 font-sans"}>
      {/* Header section — clean, modern, slide up entrance */}
      <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {isSetupWizard ? 'Employees & Roles' : 'Employees'}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {employees.length} {employees.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
            {isSetupWizard
              ? 'Manage organization team members, roles, and pending invitations.'
              : 'View all team members, assign organizational roles, and send invitations.'}
          </p>
        </div>

        {/* Operational Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            title="Refresh employees"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh</span>
          </button>
          {isAdmin && (
            <button
              onClick={openInviteModal}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" strokeWidth={2.5} />
              <span>Invite Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Clean Metric Cards (shown in full page view) */}
      {!isSetupWizard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slideUpFade">
          {/* Card 1: Total Employees */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">Total Employees</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[28px] font-bold text-slate-900 tracking-tight">
              {loading ? '—' : employees.length}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {inactiveCount > 0 ? `${activeCount} active, ${inactiveCount} inactive` : 'All team members currently active'}
            </p>
          </div>

          {/* Card 2: Assigned to Teams */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">Assigned to Teams</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : assignedToTeamsCount}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {teamAssignmentRate}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {unassignedEmployeesCount > 0
                ? `${unassignedEmployeesCount} employees waiting to be placed in a team`
                : 'All employees assigned to a team'}
            </p>
          </div>

          {/* Card 3: Leadership */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">Leadership</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[28px] font-bold text-slate-900 tracking-tight">
              {loading ? '—' : managerCount + adminCount}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {managerCount} {managerCount === 1 ? 'manager' : 'managers'}, {adminCount} admin, {staffCount} staff
            </p>
          </div>

          {/* Card 4: Pending Invites */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">Pending Invites</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[28px] font-bold text-slate-900 tracking-tight">
              {loading ? '—' : pendingCount}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {pendingCount > 0 ? `${pendingCount} awaiting employee signup` : 'All invitations accepted'}
            </p>
          </div>
        </div>
      )}

      {/* Main Container / Filters & Table */}
      <div className="space-y-4">
        {/* Simple & Clean Filter Toolbar */}
        <div className="animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
              <input
                type="text"
                placeholder="Search by name, code, or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-slate-50/70 border border-slate-200 rounded-full text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Team Dropdown Filter */}
            <div className="sm:w-56 shrink-0">
              <Select
                value={teamFilter}
                onChange={setTeamFilter}
                options={teamFilterOptions}
                ariaLabel="Filter by Team"
                size="md"
                className="w-full font-sans"
                triggerClassName="!h-[38px] !rounded-full !bg-slate-50/70 hover:!bg-white !border-slate-200 !text-slate-800 !text-sm !font-semibold !px-4"
              />
            </div>
          </div>

          {/* Quick Filter Status Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1.5">Show:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${statusFilter === 'all'
                    ? 'bg-[#12161F] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
              >
                All ({allItems.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${statusFilter === 'active'
                    ? 'bg-[#12161F] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('managers')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${statusFilter === 'managers'
                    ? 'bg-[#12161F] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
              >
                Managers ({managerCount})
              </button>
              <button
                onClick={() => setStatusFilter('invited')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${statusFilter === 'invited'
                    ? 'bg-[#12161F] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
              >
                Invited ({pendingCount})
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{filteredItems.length}</span> of {allItems.length} members
            </div>
          </div>
        </div>

        {/* Clean Table Card inspired by Public Holidays */}
        <div className="animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-300 hover:shadow-md">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
              <span className="text-sm text-slate-500 font-medium">Loading employee records…</span>
            </div>
          ) : error ? (
            <div className="py-16 px-6 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-base font-bold text-slate-900">Failed to load employees</p>
              <p className="text-sm text-slate-500">{error}</p>
              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-9 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-slate-900">No employees found</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || teamFilter || statusFilter !== 'all'
                  ? 'No members matched your search or filter. Try clearing the filters.'
                  : 'Get started by inviting your first team member to join your organization.'}
              </p>
              {(searchQuery || teamFilter || statusFilter !== 'all') ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTeamFilter('');
                    setStatusFilter('all');
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Filters
                </button>
              ) : isAdmin ? (
                <button
                  onClick={openInviteModal}
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Employee
                </button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80">
                    <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Employee</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Code</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Role</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Team</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Status</th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map(item => {
                    const isInv = item.type === 'invitation';
                    const data = item.data;
                    const emp = !isInv ? (data as Employee) : null;
                    const inv = isInv ? (data as Invitation) : null;

                    return (
                      <tr
                        key={data.id}
                        className={`hover:bg-slate-50/60 transition-colors duration-150 group ${isInv ? 'bg-amber-50/20' : ''}`}
                      >
                        {/* Member Identity */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold font-mono shrink-0 border border-slate-200 shadow-2xs">
                              {getInitials(data.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span className="truncate">{data.name}</span>
                                {currentAuthEmp?.id === data.id && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 font-medium truncate">{data.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Code */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {isInv ? (
                            <span className="inline-flex items-center justify-center w-[92px] h-7 rounded-full text-xs font-medium font-sans bg-slate-50 text-slate-400 border border-dashed border-slate-200 whitespace-nowrap">
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-[92px] h-7 rounded-full text-xs font-bold font-sans text-slate-700 bg-slate-100 border border-slate-200/80 whitespace-nowrap">
                              {emp?.employeeCode}
                            </span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {data.role === 'ADMIN' && (
                            <span className="inline-flex items-center justify-center w-[92px] h-7 rounded-full text-xs font-bold font-sans bg-slate-900 text-white border border-slate-900 shadow-2xs whitespace-nowrap">
                              ADMIN
                            </span>
                          )}
                          {data.role === 'MANAGER' && (
                            <span className="inline-flex items-center justify-center w-[92px] h-7 rounded-full text-xs font-bold font-sans bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs whitespace-nowrap">
                              MANAGER
                            </span>
                          )}
                          {data.role === 'EMPLOYEE' && (
                            <span className="inline-flex items-center justify-center w-[92px] h-7 rounded-full text-xs font-bold font-sans bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs whitespace-nowrap">
                              EMPLOYEE
                            </span>
                          )}
                        </td>

                        {/* Team */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {data.teamId ? (
                            <span className="inline-flex items-center justify-center min-w-[92px] px-3 h-7 rounded-full text-xs font-bold font-sans bg-slate-100 text-slate-800 border border-slate-200/80 whitespace-nowrap">
                              {getTeamName(data.teamId)}
                            </span>
                          ) : (emp?.managedTeams && emp.managedTeams.length > 0) ? (
                            <span className="inline-flex items-center justify-center min-w-[92px] px-3 h-7 rounded-full text-xs font-bold font-sans bg-purple-50 text-purple-700 border border-purple-200/80 whitespace-nowrap">
                              Manages: {emp.managedTeams.map(t => t.name).join(', ')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center min-w-[92px] px-3 h-7 rounded-full text-xs font-medium font-sans bg-slate-50 text-slate-400 border border-dashed border-slate-200 whitespace-nowrap">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {isInv ? (
                            <span className="inline-flex items-center justify-center gap-1.5 w-[92px] h-7 rounded-full text-xs font-bold font-sans bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Invited
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center justify-center gap-1.5 w-[92px] h-7 rounded-full text-xs font-bold font-sans whitespace-nowrap ${emp?.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                                }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${emp?.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              {emp?.isActive ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>

                        {/* Actions (Admin Only) */}
                        {isAdmin && (
                          <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                            {isInv ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleResendInvitation(inv!.id)}
                                  disabled={resendingId === inv!.id}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Resend invitation email"
                                >
                                  <Send className={`w-4 h-4 ${resendingId === inv!.id ? 'animate-pulse' : ''}`} />
                                </button>
                                <button
                                  onClick={() => setCancelInvitation(inv)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Cancel invitation"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditModal(emp!)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Edit employee"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setStatusToggleEmployee(emp!)}
                                  className={`p-1.5 rounded-lg transition-colors ${emp?.isActive
                                      ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                      : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                  title={emp?.isActive ? 'Deactivate employee' : 'Activate employee'}
                                >
                                  {emp?.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invite Employee Modal (Portaled) */}
      {isInviteOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-slideUpFade">
          <div className="animate-successPop bg-white rounded-[14px] shadow-2xl w-full max-w-[540px] border border-slate-200/90 flex flex-col overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
                  Invite Employee
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium font-sans">
                  Send an invitation email to provision a new team member.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[85vh]">
              {/* Callout Notice */}
              <div className="mb-5 p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-[14px] flex items-start gap-3 text-xs text-slate-600 leading-relaxed font-sans">
                <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-slate-900 font-semibold">Direct UMS Provisioning:</strong> This will create an employee account and send an email with their temporary login details so they can join right away.
                </div>
              </div>

              {formError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium font-sans">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleInviteSubmit} className="space-y-4 font-sans">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={inviteFormData.name}
                    onChange={e => {
                      const newName = e.target.value;
                      setInviteFormData(prev => {
                        const updates: any = { name: newName };
                        if (!prev.username && newName.trim()) {
                          updates.username = newName.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');
                        }
                        return { ...prev, ...updates };
                      });
                    }}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. johndoe"
                      value={inviteFormData.username}
                      onChange={e => setInviteFormData({ ...inviteFormData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. john@sify.com"
                      value={inviteFormData.email}
                      onChange={e => {
                        const newEmail = e.target.value;
                        setInviteFormData(prev => {
                          const updates: any = { email: newEmail };
                          if (!prev.username && newEmail.includes('@')) {
                            const prefix = newEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
                            if (prefix) updates.username = prefix;
                          }
                          return { ...prev, ...updates };
                        });
                      }}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                      Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer font-sans"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                      Auto-generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showInvitePassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Temporary initial password (min 6 chars)"
                      value={inviteFormData.password}
                      onChange={e => setInviteFormData({ ...inviteFormData, password: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInvitePassword(!showInvitePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                      title={showInvitePassword ? 'Hide password' : 'Show password'}
                    >
                      {showInvitePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="invite-role" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                      Role <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      id="invite-role"
                      value={inviteFormData.role}
                      onChange={val => setInviteFormData({ ...inviteFormData, role: val as any })}
                      options={roleInviteOptions}
                      size="md"
                      className="w-full font-sans"
                      triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900 !font-sans font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="invite-team" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                      Team Assignment
                    </label>
                    <Select
                      id="invite-team"
                      value={inviteFormData.teamId || ''}
                      onChange={val => setInviteFormData({ ...inviteFormData, teamId: val })}
                      options={teamFormOptions}
                      size="md"
                      className="w-full font-sans"
                      triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900 !font-sans font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-full text-sm font-bold shadow-2xs transition-all cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
                  >
                    {formSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Send Invitation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Edit Employee Modal (Portaled) */}
      {editingEmployee && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-slideUpFade">
          <div className="animate-successPop bg-white rounded-[14px] shadow-2xl w-full max-w-[540px] border border-slate-200/90 flex flex-col overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
                  Edit Employee
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium font-sans">
                  Update member details, team placement, and account role.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[85vh]">
              {formError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium font-sans">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4 font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                      Employee Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.employeeCode}
                      onChange={e => setEditFormData({ ...editFormData, employeeCode: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-sans font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="edit-team" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                      Team Assignment
                    </label>
                    <Select
                      id="edit-team"
                      value={editFormData.teamId || ''}
                      onChange={val => setEditFormData({ ...editFormData, teamId: val })}
                      options={teamFormOptions}
                      size="md"
                      className="w-full font-sans"
                      triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900 !font-sans font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-role" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
                      Role <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      id="edit-role"
                      value={editFormData.role}
                      onChange={val => setEditFormData({ ...editFormData, role: val as any })}
                      options={roleInviteOptions}
                      disabled={editingEmployee?.id === currentAuthEmp?.id}
                      size="md"
                      className="w-full font-sans"
                      triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900 !font-sans font-medium disabled:opacity-60 disabled:bg-slate-100"
                    />
                    {editingEmployee?.id === currentAuthEmp?.id && (
                      <p className="mt-1.5 text-xs text-slate-500 font-medium">You cannot change your own role.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div>
                    <label htmlFor="edit-is-active" className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans block cursor-pointer">
                      Active Employee
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium font-sans">
                      {editFormData.isActive
                        ? 'Employee account is active and able to log in and log time.'
                        : 'Employee account is deactivated and cannot log in.'}
                    </p>
                  </div>
                  <label htmlFor="edit-is-active" className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="edit-is-active"
                      checked={editFormData.isActive}
                      onChange={e => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#12161F]"></div>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
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
          </div>
        </div>,
        document.body
      )}

      {/* Status Toggle Confirm Modal (Portaled) */}
      {statusToggleEmployee && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-slideUpFade">
          <div className="animate-successPop bg-white rounded-[24px] shadow-2xl w-full max-w-[420px] border border-slate-200/80 p-6 flex flex-col text-center">
            <div className={`w-12 h-9 rounded-full mx-auto flex items-center justify-center mb-4 ${statusToggleEmployee.isActive ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
              {statusToggleEmployee.isActive ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
              {statusToggleEmployee.isActive ? 'Deactivate Employee' : 'Activate Employee'}
            </h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              {statusToggleEmployee.isActive
                ? `Are you sure you want to deactivate ${statusToggleEmployee.name}? They will not be able to log in or be assigned to projects.`
                : `Are you sure you want to activate ${statusToggleEmployee.name}?`}
            </p>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatusToggleEmployee(null)}
                disabled={isStatusToggling}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmToggleStatus}
                disabled={isStatusToggling}
                className={`flex-1 py-2.5 text-white rounded-full text-sm font-bold shadow-xs transition-all active:scale-[0.97] ${statusToggleEmployee.isActive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#12161F] hover:bg-slate-800'
                  }`}
              >
                {isStatusToggling ? 'Processing...' : (statusToggleEmployee.isActive ? 'Deactivate' : 'Activate')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cancel Invitation Confirm Modal (Portaled) */}
      {cancelInvitation && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-slideUpFade">
          <div className="animate-successPop bg-white rounded-[24px] shadow-2xl w-full max-w-[420px] border border-slate-200/80 p-6 flex flex-col text-center">
            <div className="w-12 h-9 rounded-full mx-auto flex items-center justify-center mb-4 bg-rose-50 text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
              Cancel Invitation
            </h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Are you sure you want to cancel the invitation for <strong>{cancelInvitation.name}</strong>? They will not be able to join using this invitation.
            </p>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelInvitation(null)}
                disabled={isCancelling}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-semibold transition-all"
              >
                Keep Invitation
              </button>
              <button
                type="button"
                onClick={confirmCancelInvitation}
                disabled={isCancelling}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-sm font-bold shadow-xs transition-all active:scale-[0.97]"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Invitation'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
