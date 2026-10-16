import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useGetTeamTimesheetsQuery } from '../../store/apiSlice';
import {
  CalendarDays,
  AlertCircle,
  RefreshCw,
  Search,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  ShieldAlert,
  X,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDateRange } from '../../utils/date';

interface EmployeeMeta {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
}

interface TeamTimesheet {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionComment?: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: EmployeeMeta | null;
  timeEntries?: { hours: number }[];
  summary?: {
    expectedHours: number;
    loggedHours: number;
    approvedHours: number;
    variance: number;
  };
}

export const TeamTimesheets = () => {
  const { employee, isLoading: empLoading } = useCurrentEmployee();

  const isAuthorized = Boolean(
    employee?.roles?.includes('MANAGER') ||
    employee?.roles?.includes('ADMIN') ||
    employee?.role === 'MANAGER' ||
    employee?.role === 'ADMIN'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const {
    data: teamData,
    isLoading: timesheetsLoading,
    error: fetchError,
    refetch,
  } = useGetTeamTimesheetsQuery(
    {
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      employeeId: employeeFilter !== 'ALL' ? employeeFilter : undefined,
      startDate: startDateFilter || undefined,
      endDate: endDateFilter || undefined,
      search: searchQuery.trim() || undefined,
      limit: 100,
    },
    { skip: !isAuthorized }
  );

  const loading = empLoading || timesheetsLoading;
  const error = fetchError ? 'Failed to load team timesheets' : '';
  const timesheets: TeamTimesheet[] = Array.isArray(teamData) ? teamData : (teamData?.data ?? []);

  // Format week range nicely: e.g. "28 Sep – 04 Oct 2026"
  const formatWeekRange = (startStr: string) => {
    try {
      const start = new Date(startStr);
      const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
      return formatDateRange(start, end);
    } catch {
      return startStr;
    }
  };

  // Extract unique team members for the dropdown filter
  const uniqueEmployees = useMemo(() => {
    const map = new Map<string, EmployeeMeta>();
    timesheets.forEach((ts) => {
      if (ts.employee) {
        map.set(ts.employee.id, ts.employee);
      } else if (ts.employeeId) {
        map.set(ts.employeeId, {
          id: ts.employeeId,
          name: `Employee ${ts.employeeId.slice(0, 8)}`,
          employeeCode: ts.employeeId.slice(0, 6).toUpperCase(),
          email: '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [timesheets]);

  // Client-side instant filter refinement for immediate responsiveness
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      if (statusFilter !== 'ALL' && ts.status !== statusFilter) return false;
      if (employeeFilter !== 'ALL' && ts.employeeId !== employeeFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const empName = ts.employee?.name?.toLowerCase() || '';
        const empCode = ts.employee?.employeeCode?.toLowerCase() || '';
        const empEmail = ts.employee?.email?.toLowerCase() || '';
        const matches =
          empName.includes(query) ||
          empCode.includes(query) ||
          empEmail.includes(query) ||
          ts.id.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [timesheets, statusFilter, employeeFilter, searchQuery]);

  // Executive Metric Calculations
  const submittedCount = timesheets.filter((t) => t.status === 'SUBMITTED').length;
  const approvedCount = timesheets.filter((t) => t.status === 'APPROVED').length;
  const rejectedCount = timesheets.filter((t) => t.status === 'REJECTED').length;
  const draftCount = timesheets.filter((t) => t.status === 'DRAFT').length;

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    employeeFilter !== 'ALL' ||
    Boolean(searchQuery.trim()) ||
    Boolean(startDateFilter) ||
    Boolean(endDateFilter);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setEmployeeFilter('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            APPROVED
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            SUBMITTED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            DRAFT
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  // If user is not manager/admin, show permission alert
  if (!empLoading && !isAuthorized) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 font-display">Access Restricted</h2>
        <p className="text-sm text-slate-600">
          Team timesheet management is restricted to authorized Managers and Administrators.
        </p>
        <Link
          to="/timesheets"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-sm font-medium hover:bg-slate-800 shadow-2xs transition-colors"
        >
          Go to My Timesheets
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight">
                  Team Timesheets
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                  {filteredTimesheets.length} {filteredTimesheets.length === 1 ? 'timesheet' : 'timesheets'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Browse, audit, and inspect weekly timesheets submitted by your authorized team members.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98] cursor-pointer"
            title="Refresh team timesheets"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/approvals"
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <Clock className="w-4 h-4" />
            <span>Pending Approvals</span>
            {submittedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-500 text-white rounded-full text-[10px] font-mono font-bold">
                {submittedCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-[14px] p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase font-mono tracking-wider">
              Total Recorded
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {timesheets.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across all team cycles</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-[14px] p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 uppercase font-mono tracking-wider">
              Pending Review
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-2">
            {submittedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting your approval</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-[14px] p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase font-mono tracking-wider">
              Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
            {approvedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Verified and locked</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-[14px] p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase font-mono tracking-wider">
              Rejected / Drafts
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {rejectedCount + draftCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {rejectedCount} rejected · {draftCount} in draft
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-[14px] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team member name, code, or email..."
              aria-label="Search timesheets"
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0 overflow-x-auto">
            {['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED', 'DRAFT'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'SUBMITTED' ? 'Submitted' : st === 'APPROVED' ? 'Approved' : st === 'REJECTED' ? 'Rejected' : 'Draft'}
              </button>
            ))}
          </div>

          {/* Employee Filter */}
          {uniqueEmployees.length > 0 && (
            <div className="shrink-0">
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                aria-label="Filter by Employee"
                className="w-full md:w-auto px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all shadow-2xs"
              >
                <option value="ALL">All Team Members</option>
                {uniqueEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200/80 transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table Ledger */}
      <div className="bg-white border border-slate-200/90 rounded-[14px] overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 text-center text-slate-500 space-y-3">
            <LoadingSpinner size="md" />
            <p className="text-xs font-mono font-medium text-slate-500">Loading team timesheets...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
            <p className="font-semibold text-slate-800">Error loading team timesheets</p>
            <p className="text-sm text-rose-600">{error}</p>
            <button
              onClick={() => refetch()}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        ) : filteredTimesheets.length === 0 ? (
          <div className="py-16 px-4 text-center text-slate-500">
            <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-900 font-display">
              {hasActiveFilters ? 'No matching timesheets found' : 'No team timesheets available'}
            </p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search query, status, or employee filters to view more records.'
                : 'Your team members have not created or submitted any timesheets yet.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-4 px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm text-left min-w-[960px] border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Employee</th>
                  <th scope="col" className="px-5 py-3.5">Reporting Week</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Expected</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Logged</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Variance</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTimesheets.map((ts) => {
                  const emp = ts.employee;
                  const logged = ts.summary?.loggedHours ?? (ts.timeEntries ? ts.timeEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0) : 0);
                  const expected = ts.summary?.expectedHours ?? 40;
                  const variance = ts.summary ? ts.summary.variance : logged - expected;

                  return (
                    <tr key={ts.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                      {/* Employee Column */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-950 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-800 shadow-2xs">
                            {getInitials(emp?.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {emp?.name || <span className="text-slate-400 font-mono text-xs">{ts.employeeId.slice(0, 8)}…</span>}
                            </div>
                            {emp && (
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                <span className="font-semibold text-slate-600">{emp.employeeCode}</span>
                                {emp.email && ` · ${emp.email}`}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Reporting Week */}
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm whitespace-nowrap">
                          <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                          {formatWeekRange(ts.startDate)}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          ID: {ts.id.slice(0, 8)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 align-middle">
                        {renderStatusBadge(ts.status)}
                      </td>

                      {/* Expected */}
                      <td className="px-4 py-4 text-right align-middle">
                        <span className="font-mono text-xs sm:text-sm text-slate-600 font-semibold whitespace-nowrap">
                          {expected}h
                        </span>
                      </td>

                      {/* Logged */}
                      <td className="px-4 py-4 text-right align-middle">
                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
                          {logged}h
                        </span>
                      </td>

                      {/* Variance */}
                      <td className="px-4 py-4 text-right align-middle">
                        <span
                          className={`font-mono text-xs sm:text-sm font-bold whitespace-nowrap ${
                            variance > 0
                              ? 'text-emerald-600'
                              : variance < 0
                              ? 'text-rose-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {variance > 0 ? `+${variance}` : variance}h
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right align-middle">
                        <Link
                          to={`/approvals/timesheets/${ts.id}`}
                          state={{ from: '/team-timesheets' }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs active:scale-[0.98] ${
                            ts.status === 'SUBMITTED'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90'
                          }`}
                        >
                          <span>{ts.status === 'SUBMITTED' ? 'Review & Approve' : 'View Entries'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
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
  );
};
