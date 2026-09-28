import { useState, useRef, useEffect } from 'react';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
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
  Edit2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  Trash2, 
  ShieldCheck, 
  Briefcase, 
  Clock, 
  X, 
  Filter,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound
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

export interface EmployeesListProps {
  isSetupWizard?: boolean;
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active Employees' },
  { value: 'inactive', label: 'Inactive Employees' },
  { value: 'invited', label: 'Pending Invitations' },
  { value: 'managers', label: 'Managers Only' },
];

export const EmployeesList = ({ isSetupWizard = false }: EmployeesListProps = {}) => {
  const { employee: currentAuthEmp } = useCurrentEmployee();
  const { showToast } = useToast();
  
  const isAdmin = Boolean(isSetupWizard || currentAuthEmp?.roles?.includes('ADMIN') || currentAuthEmp?.role === 'ADMIN');
  
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

  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Custom Dropdown Open States & Refs
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

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

  // Handle outside clicks for custom dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
        setTeamDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      showToast('User record provisioned in UMS & credentials email sent', 'success');
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
      setFormError(err.message || 'Failed to update employee');
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
  
  const allItems: UnifiedItem[] = [
    ...employees.map(e => ({ type: 'employee' as const, data: e })),
    ...invitations.filter(i => i.status === 'PENDING').map(i => ({ type: 'invitation' as const, data: i }))
  ];

  const filteredItems = allItems.filter(item => {
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
  });

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

  const getAvatarStyle = (role: string) => {
    if (role === 'ADMIN') return 'bg-slate-950 text-white ring-1 ring-slate-800';
    if (role === 'MANAGER') return 'bg-indigo-600 text-white ring-1 ring-indigo-400/60';
    return 'bg-slate-100 text-slate-700 ring-1 ring-slate-300';
  };

  // Executive Metric Calculations
  const activeCount = employees.filter(e => e.isActive).length;
  const inactiveCount = employees.filter(e => !e.isActive).length;
  const pendingCount = invitations.filter(i => i.status === 'PENDING').length;
  const adminCount = employees.filter(e => e.role === 'ADMIN').length;
  const managerCount = employees.filter(e => e.role === 'MANAGER').length;
  const staffCount = employees.filter(e => e.role === 'EMPLOYEE').length;
  const assignedCount = employees.filter(e => !!e.teamId || (e.managedTeams && e.managedTeams.length > 0)).length;
  const assignmentRate = employees.length > 0 ? Math.round((assignedCount / employees.length) * 100) : 0;
  const activeRate = employees.length > 0 ? Math.round((activeCount / employees.length) * 100) : 0;

  return (
    <div className={isSetupWizard ? "divide-y divide-slate-100" : "p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6"}>
      {/* Executive Command Header */}
      <div className={isSetupWizard ? "p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4" : "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1"}>
        <div className={isSetupWizard ? "space-y-1" : ""}>
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className={`${isSetupWizard ? 'text-lg font-bold text-slate-900' : 'text-2xl font-bold text-slate-900 tracking-tight'}`}>
                  {isSetupWizard ? 'Employees & Roles' : 'Employees'}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                  {employees.length} {employees.length === 1 ? 'member' : 'members'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isSetupWizard 
                  ? 'Manage active employees, pending invitations, and assign roles (ADMIN, MANAGER, EMPLOYEE).' 
                  : 'Workforce directory, access governance, organizational roles, and invitation lifecycle.'}
              </p>
            </div>
          </div>
        </div>

        {/* Operational Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={loadData}
            className="p-2.5 border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Refresh employees"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={openInviteModal}
                className={isSetupWizard
                  ? "inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white font-medium px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99]"
                  : "inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99]"
                }
              >
                <UserPlus className="w-4 h-4" />
                Invite Employee
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Executive Telemetry Strip (Shown in full page view) */}
      {!isSetupWizard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Workforce */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Workforce Capacity
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                  {loading ? '—' : activeCount}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">
                  / {employees.length} active ({activeRate}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${activeRate}%` }} 
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Inactive personnel</span>
              <span className="font-mono text-slate-700">{inactiveCount}</span>
            </div>
          </div>

          {/* Card 2: Role Governance */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Role Governance
              </span>
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                  {loading ? '—' : managerCount}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">
                  managers & {adminCount} admin
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2 gap-0.5">
                <div 
                  className="bg-slate-950 h-full transition-all" 
                  style={{ width: `${employees.length > 0 ? (adminCount / employees.length) * 100 : 0}%` }} 
                  title={`${adminCount} Admins`}
                />
                <div 
                  className="bg-indigo-600 h-full transition-all" 
                  style={{ width: `${employees.length > 0 ? (managerCount / employees.length) * 100 : 0}%` }} 
                  title={`${managerCount} Managers`}
                />
                <div 
                  className="bg-slate-300 h-full transition-all" 
                  style={{ width: `${employees.length > 0 ? (staffCount / employees.length) * 100 : 0}%` }} 
                  title={`${staffCount} Employees`}
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Individual staff</span>
              <span className="font-mono text-slate-700">{staffCount}</span>
            </div>
          </div>

          {/* Card 3: Department Coverage */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Squad Assignment
              </span>
              <Briefcase className="w-4 h-4 text-slate-400" />
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                  {loading ? '—' : `${assignmentRate}%`}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">
                  assigned ({assignedCount}/{employees.length})
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
                <div 
                  className="bg-slate-900 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${assignmentRate}%` }} 
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Unassigned pool</span>
              <span className="font-mono text-slate-700">{employees.length - assignedCount}</span>
            </div>
          </div>

          {/* Card 4: Onboarding Pipeline */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Invites Pipeline
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                  {loading ? '—' : pendingCount}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">pending invites</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {pendingCount > 0 ? 'Awaiting employee registration' : 'All dispatched invitations claimed'}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Total invited</span>
              <span className="font-mono text-slate-700">{invitations.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Container / Filters & Ledger */}
      <div className={isSetupWizard ? "p-6 sm:p-7 space-y-5" : "space-y-4"}>
        {/* Executive Filter & Search Toolbar */}
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by name, code, or email..."
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

            {/* Custom Modern Dropdowns */}
            <div className="flex items-center gap-2">
              {/* Custom Team Dropdown */}
              <div className="relative" ref={teamDropdownRef}>
                {/* Native select for accessibility & testing tools */}
                <select
                  value={teamFilter}
                  onChange={e => setTeamFilter(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Filter by Team"
                >
                  <option value="">All Teams</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setTeamDropdownOpen(!teamDropdownOpen);
                    setStatusDropdownOpen(false);
                  }}
                  className={`h-9 sm:h-10 rounded-xl border bg-slate-50/50 hover:bg-white px-3 text-xs sm:text-sm text-slate-800 flex items-center justify-between gap-2.5 transition-all shadow-2xs cursor-pointer min-w-[130px] sm:min-w-[150px] ${
                    teamDropdownOpen
                      ? 'border-slate-900 ring-2 ring-slate-950/15 bg-white'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={teamDropdownOpen}
                >
                  <span className="font-medium truncate">
                    {teamFilter ? (teams.find(t => t.id === teamFilter)?.name || 'Unknown Team') : 'All Teams'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      teamDropdownOpen ? 'rotate-180 text-slate-800' : ''
                    }`}
                  />
                </button>

                {teamDropdownOpen && (
                  <div 
                    className="absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 z-30 min-w-[190px] max-h-[260px] overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 p-1 space-y-0.5 animate-fadeIn"
                    role="listbox"
                  >
                    <div
                      role="option"
                      aria-selected={teamFilter === ''}
                      onClick={() => {
                        setTeamFilter('');
                        setTeamDropdownOpen(false);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        teamFilter === ''
                          ? 'bg-slate-100 text-slate-950 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>All Teams</span>
                      {teamFilter === '' && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />}
                    </div>
                    {teams.map(t => {
                      const isSelected = teamFilter === t.id;
                      return (
                        <div
                          key={t.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setTeamFilter(t.id);
                            setTeamDropdownOpen(false);
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-100 text-slate-950 font-bold'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span className="truncate">{t.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Custom Status Dropdown */}
              <div className="relative" ref={statusDropdownRef}>
                {/* Native select for accessibility & testing tools */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Filter by Status"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setStatusDropdownOpen(!statusDropdownOpen);
                    setTeamDropdownOpen(false);
                  }}
                  className={`h-9 sm:h-10 rounded-xl border bg-slate-50/50 hover:bg-white px-3 text-xs sm:text-sm text-slate-800 flex items-center justify-between gap-2.5 transition-all shadow-2xs cursor-pointer min-w-[140px] sm:min-w-[165px] ${
                    statusDropdownOpen
                      ? 'border-slate-900 ring-2 ring-slate-950/15 bg-white'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={statusDropdownOpen}
                >
                  <span className="font-medium truncate">
                    {statusOptions.find(o => o.value === statusFilter)?.label || 'All Statuses'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      statusDropdownOpen ? 'rotate-180 text-slate-800' : ''
                    }`}
                  />
                </button>

                {statusDropdownOpen && (
                  <div 
                    className="absolute right-0 top-full mt-1.5 z-30 min-w-[200px] max-h-[260px] overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 p-1 space-y-0.5 animate-fadeIn"
                    role="listbox"
                  >
                    {statusOptions.map(opt => {
                      const isSelected = statusFilter === opt.value;
                      return (
                        <div
                          key={opt.value}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setStatusFilter(opt.value);
                            setStatusDropdownOpen(false);
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
          </div>

          {/* Quick Filter Tag Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-medium text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Quick:
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                All ({allItems.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('managers')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  statusFilter === 'managers'
                    ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                Managers ({managerCount})
              </button>
              <button
                onClick={() => setStatusFilter('invited')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  statusFilter === 'invited'
                    ? 'bg-slate-950 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                Invited ({pendingCount})
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500">
              Showing <span className="font-semibold text-slate-900">{filteredItems.length}</span> of {allItems.length} records
            </div>
          </div>
        </div>

        {/* Enterprise Workforce Ledger Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
          {loading ? (
            <div className="py-20 text-center text-slate-500 space-y-3">
              <LoadingSpinner size="md" />
              <p className="text-xs font-mono font-medium text-slate-500">Loading workforce directory...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="font-semibold text-slate-800">Error loading employees</p>
              <p className="text-sm text-rose-600">{error}</p>
              <button
                onClick={loadData}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 px-4 text-center">
              {/* Handcrafted Architectural Vector SVG Empty State */}
              <svg className="w-24 h-24 mx-auto text-slate-300 mb-3" viewBox="0 0 120 120" fill="none">
                <rect x="24" y="28" width="72" height="64" rx="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="60" cy="52" r="14" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="2" />
                <path d="M42 76C42 68 50 66 60 66C70 66 78 68 78 76" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                <circle cx="88" cy="36" r="10" fill="#0F172A" />
                <path d="M88 32V40M84 36H92" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-base font-bold text-slate-900 font-display">No employees found</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || teamFilter || statusFilter !== 'all'
                  ? 'No personnel records matched your filter criteria. Try resetting search parameters.'
                  : 'Get started by inviting your first team member to join your organization.'}
              </p>
              {(searchQuery || teamFilter || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTeamFilter('');
                    setStatusFilter('all');
                  }}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  <tr>
                    <th scope="col" className="px-6 py-4">Employee</th>
                    <th scope="col" className="px-5 py-4">Code</th>
                    <th scope="col" className="px-5 py-4">Role</th>
                    <th scope="col" className="px-5 py-4">Team</th>
                    <th scope="col" className="px-5 py-4">Status</th>
                    {isAdmin && <th scope="col" className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map(item => {
                    const isInv = item.type === 'invitation';
                    const data = item.data;
                    const emp = !isInv ? data as Employee : null;
                    const inv = isInv ? data as Invitation : null;

                    return (
                      <tr 
                        key={data.id} 
                        className={`hover:bg-slate-50/70 transition-colors duration-150 ${isInv ? 'bg-amber-50/20' : ''}`}
                      >
                        {/* Member Identity */}
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold font-mono shrink-0 shadow-2xs ${getAvatarStyle(data.role)}`}>
                              {getInitials(data.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                                <span className="truncate">{data.name}</span>
                                {currentAuthEmp?.id === data.id && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 font-mono truncate">{data.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Employee Code */}
                        <td className="px-5 py-4.5 font-mono text-xs">
                          {isInv ? (
                            <span className="text-amber-600 italic font-medium">Pending...</span>
                          ) : (
                            <span className="inline-block font-mono text-xs text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200/80 font-medium">
                              {emp?.employeeCode}
                            </span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4.5">
                          {data.role === 'ADMIN' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-900 text-white border border-slate-800 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              ADMIN
                            </span>
                          )}
                          {data.role === 'MANAGER' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              MANAGER
                            </span>
                          )}
                          {data.role === 'EMPLOYEE' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              EMPLOYEE
                            </span>
                          )}
                        </td>

                        {/* Team Assignment */}
                        <td className="px-5 py-4.5">
                          {data.teamId ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100/90 text-slate-800 border border-slate-200/80 shadow-2xs">
                              {getTeamName(data.teamId)}
                            </span>
                          ) : (emp?.managedTeams && emp.managedTeams.length > 0) ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                              Manages: {emp.managedTeams.map(t => t.name).join(', ')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-400 italic border border-slate-200/60">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4.5">
                          {isInv ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Invited
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs ${
                                emp?.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${emp?.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {emp?.isActive ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>

                        {/* Actions (Admin Only) */}
                        {isAdmin && (
                          <td className="px-6 py-4.5 text-right">
                            {isInv ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleResendInvitation(inv!.id)}
                                  disabled={resendingId === inv!.id}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                  title="Resend invitation email"
                                >
                                  <Send className={`w-4 h-4 ${resendingId === inv!.id ? 'animate-pulse' : ''}`} />
                                </button>
                                <button
                                  onClick={() => setCancelInvitation(inv)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Cancel invitation"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditModal(emp!)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit employee"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setStatusToggleEmployee(emp!)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    emp?.isActive
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

      {/* Status Toggle Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!statusToggleEmployee}
        onClose={() => setStatusToggleEmployee(null)}
        onConfirm={confirmToggleStatus}
        title={statusToggleEmployee?.isActive ? 'Deactivate Employee' : 'Activate Employee'}
        message={statusToggleEmployee?.isActive 
          ? `Are you sure you want to deactivate ${statusToggleEmployee.name}? They will no longer be able to log in or be assigned to projects.`
          : `Are you sure you want to activate ${statusToggleEmployee?.name}?`
        }
        confirmText={statusToggleEmployee?.isActive ? 'Deactivate' : 'Activate'}
        isDestructive={statusToggleEmployee?.isActive}
        isLoading={isStatusToggling}
      />

      {/* Cancel Invitation Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!cancelInvitation}
        onClose={() => setCancelInvitation(null)}
        onConfirm={confirmCancelInvitation}
        title="Cancel Invitation"
        message={`Are you sure you want to cancel the invitation for ${cancelInvitation?.name}? They will not be able to join the organization using this invitation link.`}
        confirmText="Cancel Invitation"
        isDestructive={true}
        isLoading={isCancelling}
      />

      {/* Invite Employee Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Employee"
        maxWidth="lg"
      >
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
          <KeyRound className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-slate-900">Direct UMS Provisioning:</span> This form creates a real user account in the UMS backend and dispatches an automated email with their temporary credentials and prompt to change their password.
          </div>
        </div>

        {formError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Full Name *
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
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. johndoe"
                value={inviteFormData.username}
                onChange={e => setInviteFormData({ ...inviteFormData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Unique UMS login identifier</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Email Address *
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
                className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">Credentials recipient</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Initial Password *
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Auto-generate</span>
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
                className="w-full border border-slate-200/90 rounded-xl pl-3.5 pr-10 py-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowInvitePassword(!showInvitePassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                title={showInvitePassword ? 'Hide password' : 'Show password'}
              >
                {showInvitePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Emailed to user with instructions to log in and change immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="invite-role" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Role *
              </label>
              <select
                id="invite-role"
                value={inviteFormData.role}
                onChange={e => setInviteFormData({ ...inviteFormData, role: e.target.value as 'ADMIN' | 'MANAGER' | 'EMPLOYEE' })}
                className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs cursor-pointer"
              >
                <option value="EMPLOYEE">EMPLOYEE (Standard)</option>
                <option value="MANAGER">MANAGER (Squad Approver)</option>
                <option value="ADMIN">ADMIN (Full Governance)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Team Assignment
              </label>
              <select
                value={inviteFormData.teamId}
                onChange={e => setInviteFormData({ ...inviteFormData, teamId: e.target.value })}
                className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs cursor-pointer"
              >
                <option value="">No Team Assigned</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
            >
              {formSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#27F087]" />
                  <span>Provisioning & Inviting...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-[#27F087]" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        title="Edit Employee"
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
              Employee Code *
            </label>
            <input
              type="text"
              required
              value={editFormData.employeeCode}
              onChange={e => setEditFormData({ ...editFormData, employeeCode: e.target.value })}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={editFormData.email}
              onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Team Assignment
            </label>
            <select
              value={editFormData.teamId}
              onChange={e => setEditFormData({ ...editFormData, teamId: e.target.value })}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            >
              <option value="">No Team Assigned</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-role" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Role *
            </label>
            <select
              id="edit-role"
              value={editFormData.role}
              onChange={e => setEditFormData({ ...editFormData, role: e.target.value as 'ADMIN' | 'MANAGER' | 'EMPLOYEE' })}
              disabled={editingEmployee?.id === currentAuthEmp?.id}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 transition-all shadow-2xs"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
            </select>
            {editingEmployee?.id === currentAuthEmp?.id && (
              <p className="mt-1 text-xs text-slate-500">You cannot change your own role.</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-is-active"
              checked={editFormData.isActive}
              onChange={e => setEditFormData({ ...editFormData, isActive: e.target.checked })}
              className="rounded border-slate-300 text-slate-950 focus:ring-slate-950 h-4 w-4"
            />
            <label htmlFor="edit-is-active" className="text-sm font-medium text-slate-700">
              Active Employee
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingEmployee(null)}
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
    </div>
  );
};


