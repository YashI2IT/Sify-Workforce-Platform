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
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'managers' | 'invited'>('all');

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
    let derivedUsername = inviteFormData.username.trim();
    if (derivedUsername.length < 3) {
      if (inviteFormData.name.trim().length >= 3) {
        derivedUsername = inviteFormData.name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');
      } else if (inviteFormData.email.includes('@')) {
        derivedUsername = inviteFormData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
      }
    }
    if (!derivedUsername) derivedUsername = 'user';

    if (derivedUsername.length < 3) {
      setFormError('Username must be at least 3 characters long.');
      setFormSubmitting(false);
      return;
    }

    const derivedPassword = inviteFormData.password.trim() || createRandomPassword();

    if (derivedPassword.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      setFormSubmitting(false);
      return;
    }

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
      let msg = 'Failed to send invitation';
      if (Array.isArray(err?.data?.errors) && err.data.errors.length > 0) {
        msg = err.data.errors.map((e: any) => e.message || e).join(', ');
      } else if (typeof err?.data === 'string') {
        msg = err.data;
      } else if (err?.data?.message) {
        msg = err.data.message;
      } else if (err?.message) {
        msg = err.message;
      }
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
    const searchLower = searchQuery.trim().toLowerCase();
    
    // Search across name, employee code/ID, and email
    const matchesSearch = !searchLower || (
      d.name.toLowerCase().includes(searchLower) ||
      d.email.toLowerCase().includes(searchLower) ||
      (item.type === 'employee' && (d as Employee).employeeCode.toLowerCase().includes(searchLower))
    );

    // Team filtering
    const matchesTeam = teamFilter ? d.teamId === teamFilter : true;

    // Status / Role filtering
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = item.type === 'employee' && (d as Employee).isActive !== false;
    } else if (statusFilter === 'managers') {
      matchesStatus = item.type === 'employee' && (
        (d as Employee).role === 'MANAGER' || (d as any).roles?.includes('MANAGER')
      );
    } else if (statusFilter === 'invited') {
      matchesStatus = item.type === 'invitation';
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

  // 2. Accurate KPI Metric Calculations
  const {
    activeEmployeesCount,
    assignedToTeamsCount,
    assignmentPercentage,
    distinctLeadershipCount,
    activeManagersCount,
    activeAdminsCount,
    pendingInvitationsCount
  } = React.useMemo(() => {
    // 1. Total Employees: actual workforce records
    const activeEmployees = employees.filter(e => e.isActive !== false);
    const activeEmployeesCount = activeEmployees.length;

    // 2. Assigned to Teams: distinct active employees assigned to at least one team
    const assignedToTeamsCount = activeEmployees.filter(e => Boolean(e.teamId)).length;
    const assignmentPercentage = activeEmployeesCount > 0
      ? Math.round((assignedToTeamsCount / activeEmployeesCount) * 100)
      : 0;

    // 3. Leadership: distinct active admins and managers without double-counting
    const activeLeaders = activeEmployees.filter(e => {
      const r = e.role;
      const roles = (e as any).roles || [];
      return r === 'ADMIN' || r === 'MANAGER' || roles.includes('ADMIN') || roles.includes('MANAGER');
    });
    const distinctLeadershipCount = activeLeaders.length;

    const activeAdminsCount = activeEmployees.filter(e => {
      const r = e.role;
      const roles = (e as any).roles || [];
      return r === 'ADMIN' || roles.includes('ADMIN');
    }).length;

    const activeManagersCount = activeEmployees.filter(e => {
      const r = e.role;
      const roles = (e as any).roles || [];
      const isManager = r === 'MANAGER' || roles.includes('MANAGER');
      const isAdminRole = r === 'ADMIN' || roles.includes('ADMIN');
      return isManager && !isAdminRole;
    }).length;

    // 4. Pending Invitations: outstanding invitations awaiting acceptance
    const pendingInvitationsCount = invitations.filter(i => i.status === 'PENDING').length;

    return {
      activeEmployeesCount,
      assignedToTeamsCount,
      assignmentPercentage,
      distinctLeadershipCount,
      activeManagersCount,
      activeAdminsCount,
      pendingInvitationsCount
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
      
      {/* 1. Page Heading */}
      <div className={isSetupWizard 
        ? "p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4" 
        : "animate-slideUpFade flex items-center justify-between flex-wrap gap-4"
      }>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight">
              {isSetupWizard ? 'Employees & Roles' : 'Employees'}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {loading ? '—' : `${employees.length} ${employees.length === 1 ? 'employee' : 'employees'}`}
            </span>
          </div>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1">
            Manage employees, roles, and team assignments.
          </p>
        </div>

        {/* Operational Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98] cursor-pointer"
            title="Refresh employees"
            aria-label="Refresh employees"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={openInviteModal}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-[#121f47] text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              aria-label="Invite Employee"
            >
              <UserPlus className="w-4 h-4" strokeWidth={2.5} />
              <span>Invite Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Summary Cards (4 Compact, Meaningful Cards) */}
      {!isSetupWizard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slideUpFade">
          
          {/* Card 1: Total Employees */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Total Employees</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : employees.length}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Across the organization · Excludes pending invites
              </p>
            </div>
          </div>

          {/* Card 2: Assigned to Teams */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Assigned to Teams</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                  {loading ? '—' : assignedToTeamsCount}
                </span>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {assignmentPercentage}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {assignedToTeamsCount} of {activeEmployeesCount} active employees assigned
              </p>
            </div>
          </div>

          {/* Card 3: Leadership */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Leadership</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : distinctLeadershipCount}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {activeManagersCount} {activeManagersCount === 1 ? 'manager' : 'managers'} · {activeAdminsCount} {activeAdminsCount === 1 ? 'admin' : 'admins'}
              </p>
            </div>
          </div>

          {/* Card 4: Pending Invitations */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Pending Invitations</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-[28px] font-bold text-slate-900 tracking-tight">
                {loading ? '—' : pendingInvitationsCount}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {pendingInvitationsCount === 0 
                  ? 'No pending invitations' 
                  : `${pendingInvitationsCount} awaiting response`}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 3. Search and Filters Toolbar & 4. Employee Table */}
      <div className="space-y-4">
        
        {/* Search & Filter Controls */}
        <div className="animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by name, employee ID, or email..."
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

            {/* Team Dropdown Filter */}
            <div className="sm:w-56 shrink-0">
              <Select
                value={teamFilter}
                onChange={setTeamFilter}
                options={teamFilterOptions}
                ariaLabel="Filter by Team"
                size="md"
                className="w-full font-sans"
                triggerClassName="!h-9 !rounded-xl !bg-slate-50/50 hover:!bg-white !border-slate-200/90 !text-slate-800 !text-xs !font-medium !px-3 shadow-2xs"
              />
            </div>
          </div>

          {/* Simplified Status / Role Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-[#0B1738] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All ({allItems.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-[#0B1738] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Active ({activeEmployeesCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('managers')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'managers'
                    ? 'bg-[#0B1738] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Managers ({activeManagersCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('invited')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'invited'
                    ? 'bg-[#0B1738] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Invited ({pendingInvitationsCount})
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{filteredItems.length}</span> of {allItems.length} records
            </div>
          </div>
        </div>

        {/* 4. Employee Table */}
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
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1738] text-white rounded-full text-xs font-bold hover:bg-[#121f47] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-slate-900">No employees found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || teamFilter || statusFilter !== 'all'
                  ? 'No employees match your search and filter criteria.'
                  : 'Get started by inviting your first employee to join your organization.'}
              </p>
              {(searchQuery || teamFilter || statusFilter !== 'all') ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setTeamFilter('');
                    setStatusFilter('all');
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Filters
                </button>
              ) : isAdmin ? (
                <button
                  type="button"
                  onClick={openInviteModal}
                  className="mt-4 inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-[#121f47] text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite Employee</span>
                </button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80">
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Employee</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Employee ID</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Role</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Team</th>
                    <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">Status</th>
                    {isAdmin && (
                      <th scope="col" className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200/80 bg-slate-50/50">Actions</th>
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
                        className={`hover:bg-slate-50/60 transition-colors duration-150 ${isInv ? 'bg-amber-50/20' : ''}`}
                      >
                        {/* 1. Employee */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#0B1738] text-[#C8DB00] flex items-center justify-center text-xs font-bold font-mono shrink-0 border border-slate-800">
                              {getInitials(data.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                <span className="truncate">{data.name}</span>
                                {currentAuthEmp?.id === data.id && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 font-medium truncate">{data.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Employee ID */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {isInv ? (
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 border border-dashed border-slate-200 whitespace-nowrap">
                              Pending
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 whitespace-nowrap">
                              {emp?.employeeCode || '—'}
                            </span>
                          )}
                        </td>

                        {/* 3. Role */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {data.role === 'ADMIN' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0B1738] text-white whitespace-nowrap">
                              Admin
                            </span>
                          )}
                          {data.role === 'MANAGER' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 whitespace-nowrap">
                              Manager
                            </span>
                          )}
                          {data.role === 'EMPLOYEE' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap">
                              Employee
                            </span>
                          )}
                        </td>

                        {/* 4. Team */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {data.teamId ? (
                            <span className="font-medium text-slate-800 text-sm whitespace-nowrap">
                              {getTeamName(data.teamId)}
                            </span>
                          ) : (emp?.managedTeams && emp.managedTeams.length > 0) ? (
                            <span className="font-medium text-purple-700 text-sm whitespace-nowrap">
                              Manages: {emp.managedTeams.map(t => t.name).join(', ')}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* 5. Status */}
                        <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                          {isInv ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/70 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              Invited
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${emp?.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200/70'
                                }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${emp?.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {emp?.isActive ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>

                        {/* 6. Actions */}
                        {isAdmin && (
                          <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100 text-right">
                            {isInv ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleResendInvitation(inv!.id)}
                                  disabled={resendingId === inv!.id}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                  title="Resend invitation email"
                                  aria-label={`Resend invitation to ${inv!.email}`}
                                >
                                  <Send className={`w-4 h-4 ${resendingId === inv!.id ? 'animate-pulse text-slate-900' : ''}`} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCancelInvitation(inv)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Cancel invitation"
                                  aria-label={`Cancel invitation for ${inv!.email}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(emp!)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit employee"
                                  aria-label={`Edit ${emp!.name}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStatusToggleEmployee(emp!)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${emp?.isActive
                                      ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                      : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                  title={emp?.isActive ? 'Deactivate employee' : 'Activate employee'}
                                  aria-label={emp?.isActive ? `Deactivate ${emp!.name}` : `Activate ${emp!.name}`}
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

      {/* 5. Invite Employee Modal */}
      {isInviteOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-slideUpFade">
          <div className="animate-successPop bg-white rounded-[14px] shadow-2xl w-full max-w-[540px] border border-slate-200/90 flex flex-col overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Invite Employee
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Send an invitation email to provision a new team member.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[85vh]">
              {/* Callout Notice */}
              <div className="mb-5 p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-[14px] flex items-start gap-3 text-xs text-slate-600 leading-relaxed font-sans">
                <div className="w-6 h-6 rounded-lg bg-[#0B1738] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8DB00]" />
                </div>
                <div>
                  <strong className="text-slate-900 font-semibold">Direct UMS Provisioning:</strong> This will create an employee account and send an email with login details so they can join right away.
                </div>
              </div>

              {formError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label htmlFor="invite-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="invite-name"
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={inviteFormData.name}
                    onChange={e => {
                      const newName = e.target.value;
                      const derived = newName.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');
                      setInviteFormData(prev => ({
                        ...prev,
                        name: newName,
                        username: derived,
                      }));
                    }}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="invite-username" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="invite-username"
                      type="text"
                      required
                      minLength={3}
                      placeholder="e.g. johndoe"
                      value={inviteFormData.username}
                      onChange={e => setInviteFormData({ ...inviteFormData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="invite-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="invite-email"
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
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="invite-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                      Auto-generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="invite-password"
                      type={showInvitePassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Temporary initial password (min 6 chars)"
                      value={inviteFormData.password}
                      onChange={e => setInviteFormData({ ...inviteFormData, password: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInvitePassword(!showInvitePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                      title={showInvitePassword ? 'Hide password' : 'Show password'}
                      aria-label={showInvitePassword ? 'Hide password' : 'Show password'}
                    >
                      {showInvitePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="invite-role" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Role <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      id="invite-role"
                      value={inviteFormData.role}
                      onChange={val => setInviteFormData({ ...inviteFormData, role: val as any })}
                      options={roleInviteOptions}
                      size="md"
                      className="w-full font-sans"
                      triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="invite-team" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Team Assignment
                    </label>
                    <Select
                      id="invite-team"
                      value={inviteFormData.teamId || ''}
                      onChange={val => setInviteFormData({ ...inviteFormData, teamId: val })}
                      options={teamFormOptions}
                      size="md"
                      className="w-full font-sans"
                      triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-[10px] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-[#121f47] text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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

      {/* Edit Employee Modal */}
      {editingEmployee && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-slideUpFade">
          <div className="animate-successPop bg-white rounded-[14px] shadow-2xl w-full max-w-[540px] border border-slate-200/90 flex flex-col overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Edit Employee
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Update member details, team placement, and account role.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[85vh]">
              {formError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="edit-emp-code" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Employee Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="edit-emp-code"
                      type="text"
                      required
                      value={editFormData.employeeCode}
                      onChange={e => setEditFormData({ ...editFormData, employeeCode: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-emp-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="edit-emp-name"
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-emp-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="edit-emp-email"
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:ring-2 focus:ring-[#0B1738]/15 focus:border-[#0B1738] focus:outline-none transition-all shadow-2xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="edit-team" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Team Assignment
                    </label>
                    <Select
                      id="edit-team"
                      value={editFormData.teamId || ''}
                      onChange={val => setEditFormData({ ...editFormData, teamId: val })}
                      options={teamFormOptions}
                      size="md"
                      className="w-full font-sans"
                      triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-role" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
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
                      triggerClassName="!bg-slate-50/50 hover:!bg-white !rounded-xl !border-slate-200 !text-slate-900 font-medium disabled:opacity-60 disabled:bg-slate-100"
                    />
                    {editingEmployee?.id === currentAuthEmp?.id && (
                      <p className="mt-1.5 text-xs text-slate-500 font-medium">You cannot change your own role.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div>
                    <label htmlFor="edit-is-active" className="text-xs font-semibold text-slate-800 uppercase tracking-wider block cursor-pointer">
                      Active Employee
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {editFormData.isActive
                        ? 'Employee account is active and able to log in and record time.'
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
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B1738]"></div>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
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
          </div>
        </div>,
        document.body
      )}

      {/* Deactivate / Activate Confirm Modal */}
      {statusToggleEmployee && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-slideUpFade">
          <div className="animate-successPop bg-white rounded-[14px] shadow-2xl w-full max-w-[420px] border border-slate-200/80 p-6 flex flex-col text-center">
            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 ${
              statusToggleEmployee.isActive ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {statusToggleEmployee.isActive ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {statusToggleEmployee.isActive ? 'Deactivate Employee' : 'Activate Employee'}
            </h3>
            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
              {statusToggleEmployee.isActive
                ? `Are you sure you want to deactivate ${statusToggleEmployee.name}? They will not be able to log in or be assigned to projects.`
                : `Are you sure you want to activate ${statusToggleEmployee.name}?`}
            </p>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatusToggleEmployee(null)}
                disabled={isStatusToggling}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmToggleStatus}
                disabled={isStatusToggling}
                className={`flex-1 py-2 text-white rounded-[10px] text-xs font-semibold shadow-xs transition-all active:scale-[0.97] cursor-pointer ${
                  statusToggleEmployee.isActive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#0B1738] hover:bg-[#121f47]'
                }`}
              >
                {isStatusToggling ? 'Processing...' : (statusToggleEmployee.isActive ? 'Deactivate' : 'Activate')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cancel Invitation Confirm Modal */}
      {cancelInvitation && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-slideUpFade">
          <div className="animate-successPop bg-white rounded-[14px] shadow-2xl w-full max-w-[420px] border border-slate-200/80 p-6 flex flex-col text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 bg-rose-50 text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Cancel Invitation
            </h3>
            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
              Are you sure you want to cancel the invitation for <strong className="text-slate-900">{cancelInvitation.name}</strong>? They will not be able to join using this invitation.
            </p>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelInvitation(null)}
                disabled={isCancelling}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold transition-all cursor-pointer"
              >
                Keep Invitation
              </button>
              <button
                type="button"
                onClick={confirmCancelInvitation}
                disabled={isCancelling}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-[10px] text-xs font-semibold shadow-xs transition-all active:scale-[0.97] cursor-pointer"
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
