import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, User, CalendarDays } from 'lucide-react';

interface Timesheet {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
}

export const ManagerApprovals = () => {
  const { employee, isLoading: empLoading } = useCurrentEmployee();
  const { showToast } = useToast();
  
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState<{ timesheetId: string } | null>(null);
  const [rejectText, setRejectText] = useState('');

  const fetchApprovals = useCallback(async () => {
    if (!employee) return;
    try {
      setLoading(true);
      setError('');
      const data = await apiClient('/timesheets/approvals');
      const list: Timesheet[] = Array.isArray(data) ? data : (data?.data ?? []);
      setTimesheets(list);

      // Load employee details for each unique employeeId
      const uniqueIds = [...new Set(list.map((ts) => ts.employeeId))];
      const empResults = await Promise.allSettled(
        uniqueIds.map((id) => apiClient(`/employees/${id}`))
      );
      const map: Record<string, Employee> = {};
      empResults.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value) {
          map[uniqueIds[i]] = res.value;
        }
      });
      setEmployeeMap(map);
    } catch (err: any) {
      setError(err.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    if (!empLoading) {
      fetchApprovals();
    }
  }, [fetchApprovals, empLoading]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await apiClient(`/timesheets/${id}/approve`, { method: 'PATCH' });
      showToast('Timesheet approved successfully', 'success');
      fetchApprovals();
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectComment) return;
    const { timesheetId } = rejectComment;
    const comment = rejectText.trim();
    if (!comment) {
      showToast('Rejection comment is required', 'error');
      return;
    }
    try {
      setProcessingId(timesheetId);
      await apiClient(`/timesheets/${timesheetId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ comment }),
      });
      setRejectComment(null);
      setRejectText('');
      showToast('Timesheet rejected', 'success');
      fetchApprovals();
    } catch (err: any) {
      showToast(err.message || 'Rejection failed', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const formatWeekRange = (startStr: string) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
            Pending Approvals
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and approve submitted timesheets from your team members.
          </p>
        </div>
        <button
          onClick={fetchApprovals}
          className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors self-start sm:self-auto"
          title="Refresh approvals"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Reject modal */}
      <Modal 
        isOpen={!!rejectComment} 
        onClose={() => { setRejectComment(null); setRejectText(''); }}
        title="Reject Timesheet"
        maxWidth="md"
      >
        <p className="text-sm text-gray-500 mb-4">
          Provide a clear reason for rejection so the employee knows what to fix.
        </p>
        <textarea
          autoFocus
          rows={3}
          value={rejectText}
          onChange={(e) => setRejectText(e.target.value)}
          placeholder="Enter rejection reason..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
        />
        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <button
            onClick={() => { setRejectComment(null); setRejectText(''); }}
            className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRejectSubmit}
            disabled={processingId === rejectComment?.timesheetId}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {processingId === rejectComment?.timesheetId ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </Modal>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-gray-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading pending approvals...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="font-semibold text-gray-800">Error loading approvals</p>
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={fetchApprovals} className="mt-2 text-sm text-blue-600 hover:underline font-medium">
              Try Again
            </button>
          </div>
        ) : timesheets.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <CheckCircle2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-base font-medium text-gray-700">No pending approvals</p>
            <p className="text-sm text-gray-400 mt-1">All submitted timesheets from your team have been reviewed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/75 border-b text-gray-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Timesheet Week</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {timesheets.map((ts) => {
                  const emp = employeeMap[ts.employeeId];
                  const isBusy = processingId === ts.id;
                  
                  return (
                    <tr key={ts.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {emp ? emp.name : <span className="text-gray-400 text-xs font-mono">{ts.employeeId.slice(0, 8)}…</span>}
                            </div>
                            {emp && (
                              <div className="text-xs text-gray-400">{emp.employeeCode} · {emp.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          {formatWeekRange(ts.startDate)}
                        </div>
                        <Link
                          to={`/timesheets/${ts.id}`}
                          className="text-xs text-blue-600 hover:underline mt-0.5 block"
                        >
                          View entries →
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(ts.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isBusy ? 'Processing…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => { setRejectComment({ timesheetId: ts.id }); setRejectText(''); }}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
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
