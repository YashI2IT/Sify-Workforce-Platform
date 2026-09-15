import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Briefcase, FileText, CheckCircle2, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

function getThisMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export const Dashboard = () => {
  const { employee, isLoading: empLoading } = useCurrentEmployee();
  const [projectCount, setProjectCount] = useState(0);
  const [timesheetCount, setTimesheetCount] = useState(0);
  const [approvalsCount, setApprovalsCount] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [recentTimesheets, setRecentTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (empLoading || !employee) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [projects, timesheets, approvals, entries] = await Promise.all([
          apiClient(`/employees/${employee.id}/projects`).catch(() => []),
          apiClient(`/timesheets/my-timesheets`).catch(() => []),
          apiClient(`/timesheets/approvals`).catch(() => []),
          apiClient(`/employees/${employee.id}/time-entries?limit=200`).catch(() => []),
        ]);

        const projectArr = Array.isArray(projects) ? projects : (projects?.data ?? []);
        const tsArr: any[] = Array.isArray(timesheets) ? timesheets : (timesheets?.data ?? []);
        const appArr = Array.isArray(approvals) ? approvals : (approvals?.data ?? []);
        const entryArr: any[] = Array.isArray(entries) ? entries : (entries?.data ?? []);

        setProjectCount(projectArr.length);
        setTimesheetCount(tsArr.length);
        setApprovalsCount(appArr.length);

        // Calculate hours logged this week
        const thisWeekStart = getThisMonday();
        const thisWeekHours = entryArr
          .filter((e: any) => e.date >= thisWeekStart)
          .reduce((sum: number, e: any) => sum + (Number(e.hours) || 0), 0);
        setWeeklyHours(thisWeekHours);

        // Show the 3 most recent timesheets
        setRecentTimesheets(tsArr.slice(0, 3));
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [employee, empLoading]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SUBMITTED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatWeekRange = (startStr: string) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  if (!employee && !empLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-amber-800">No User Selected</h2>
          <p className="text-sm text-amber-700 max-w-sm mx-auto">
            Select a development user from the left sidebar to view your dashboard and data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {employee && (
            <p className="text-sm text-gray-500 mt-0.5">
              Welcome back, <span className="font-semibold text-gray-800">{employee.name}</span> ({employee.employeeCode})
            </p>
          )}
        </div>
        <Link
          to="/time-entries"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors shadow-sm self-start sm:self-auto"
        >
          <Clock className="w-4 h-4" />
          Log Time
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* This Week Hours */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">This Week</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-gray-900">
              {loading ? <span className="text-gray-300">—</span> : `${weeklyHours}h`}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Hours logged</p>
          </div>
        </div>

        {/* Active Projects */}
        <Link to="/projects" className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3 hover:border-indigo-300 transition-colors block">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Projects</p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-gray-900">
              {loading ? <span className="text-gray-300">—</span> : projectCount}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Assigned projects</p>
          </div>
        </Link>

        {/* My Timesheets */}
        <Link to="/timesheets" className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3 hover:border-orange-300 transition-colors block">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timesheets</p>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-gray-900">
              {loading ? <span className="text-gray-300">—</span> : timesheetCount}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Total timesheets</p>
          </div>
        </Link>

        {/* Pending Approvals */}
        <Link
          to="/approvals"
          className={`p-5 rounded-xl border shadow-xs space-y-3 transition-colors block ${
            !loading && approvalsCount > 0
              ? 'bg-red-50 border-red-200 hover:border-red-400'
              : 'bg-white border-gray-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold uppercase tracking-wide ${
              !loading && approvalsCount > 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              Approvals
            </p>
            <div className={`p-2 rounded-lg ${
              !loading && approvalsCount > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className={`text-3xl font-bold ${
              !loading && approvalsCount > 0 ? 'text-red-700' : 'text-gray-900'
            }`}>
              {loading ? <span className="text-gray-300">—</span> : approvalsCount}
            </h3>
            <p className={`text-xs mt-0.5 ${
              !loading && approvalsCount > 0 ? 'text-red-500' : 'text-gray-400'
            }`}>
              {!loading && approvalsCount > 0 ? 'Pending review' : 'No pending approvals'}
            </p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Timesheets */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-sm font-bold text-gray-900">Recent Timesheets</h2>
            <Link to="/timesheets" className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="py-10 text-center">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : recentTimesheets.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              <FileText className="w-8 h-8 mx-auto text-gray-200 mb-2" />
              No timesheets yet
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTimesheets.map((ts) => (
                <Link
                  key={ts.id}
                  to={`/timesheets/${ts.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatWeekRange(ts.startDate)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(ts.status)}`}>
                    {ts.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-sm font-bold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-5 space-y-3">
            <Link
              to="/time-entries"
              className="flex items-center gap-3 p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
            >
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Log Time Entry</p>
                <p className="text-xs text-gray-500">Record hours against a project task</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-blue-400 transition-colors" />
            </Link>

            <Link
              to="/timesheets"
              className="flex items-center gap-3 p-3 rounded-lg border hover:border-orange-300 hover:bg-orange-50/50 transition-colors group"
            >
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">View Timesheets</p>
                <p className="text-xs text-gray-500">Review and submit weekly timesheets</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-orange-400 transition-colors" />
            </Link>

            <Link
              to="/projects"
              className="flex items-center gap-3 p-3 rounded-lg border hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group"
            >
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">My Projects</p>
                <p className="text-xs text-gray-500">View your assigned projects and tasks</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-indigo-400 transition-colors" />
            </Link>

            {approvalsCount > 0 && (
              <Link
                to="/approvals"
                className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors group"
              >
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    {approvalsCount} Pending Approval{approvalsCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-red-500">Review timesheets awaiting your action</p>
                </div>
                <ArrowRight className="w-4 h-4 text-red-300 ml-auto group-hover:text-red-500 transition-colors" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
