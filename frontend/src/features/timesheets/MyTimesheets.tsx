import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { CalendarDays, AlertCircle, RefreshCw, ChevronRight, Clock } from 'lucide-react';

interface Timesheet {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionComment?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const MyTimesheets = () => {
  const { employee, isLoading: empLoading } = useCurrentEmployee();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchTimesheets = useCallback(async () => {
    if (!employee) return;
    try {
      setLoading(true);
      setError('');
      const data = await apiClient(`/timesheets/my-timesheets?limit=100`);
      setTimesheets(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (err: any) {
      setError(err.message || 'Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    if (!empLoading) {
      fetchTimesheets();
    }
  }, [fetchTimesheets, empLoading]);

  const formatWeekRange = (startStr: string) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SUBMITTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'DRAFT':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            My Timesheets
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Weekly timesheet summaries, approval states, and review submissions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTimesheets}
            className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            title="Refresh timesheets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/time-entries')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            <Clock className="w-4 h-4" />
            Log Time
          </button>
        </div>
      </div>

      {/* Timesheets List Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-gray-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading timesheets...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="font-semibold text-gray-800">Error loading timesheets</p>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={fetchTimesheets}
              className="mt-2 text-sm text-blue-600 hover:underline font-medium"
            >
              Try Again
            </button>
          </div>
        ) : timesheets.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <CalendarDays className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-base font-medium text-gray-700">No timesheets recorded yet</p>
            <p className="text-sm text-gray-400 mt-1">Timesheets are automatically generated when you log daily work hours</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/75 border-b text-gray-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Timesheet Week</th>
                  <th className="px-5 py-3.5">Submission Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {timesheets.map(ts => (
                  <tr key={ts.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">
                        {formatWeekRange(ts.startDate)}
                      </div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">
                        Starts: {new Date(ts.startDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(ts.status)}`}>
                        {ts.status}
                      </span>
                      {ts.status === 'REJECTED' && ts.rejectionComment && (
                        <div className="text-xs text-red-600 mt-1 font-medium truncate max-w-xs">
                          Reason: {ts.rejectionComment}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => navigate(`/timesheets/${ts.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium rounded-lg text-xs transition-colors"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

