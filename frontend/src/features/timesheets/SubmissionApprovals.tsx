import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useGetPendingSubmissionsQuery,
  useApproveSubmissionMutation,
  useRejectSubmissionMutation,
} from '../../store/apiSlice';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import {
  CheckCircle2, XCircle, Clock, Calendar,
  ChevronDown, ChevronUp, AlertCircle, RefreshCw
} from 'lucide-react';

interface Submission {
  id: string;
  employeeId: string;
  submissionType: 'DAILY' | 'WEEKLY';
  submittedDate?: string;
  weekStart?: string;
  weekEnd?: string;
  status: string;
  submittedAt: string;
  entryCount: number;
  totalHours: number;
  entries: any[];
  employee: {
    id: string;
    name: string;
    email: string;
  };
}

export const SubmissionApprovals: React.FC = () => {
  const { data: submissions, isLoading, refetch, isFetching } = useGetPendingSubmissionsQuery();
  const [approveM, { isLoading: approving }] = useApproveSubmissionMutation();
  const [rejectM, { isLoading: rejecting }] = useRejectSubmissionMutation();

  const [searchParams, setSearchParams] = useSearchParams();
  const submissionIdFromUrl = searchParams.get('submissionId');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ submissionId: string; employeeName: string } | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  const submissionList: Submission[] = Array.isArray(submissions) ? submissions : [];

  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setFeedbackMsg(msg);
    setFeedbackType(type);
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  useEffect(() => {
    if (submissionIdFromUrl && !isLoading) {
      const match = submissionList.find((s) => s.id === submissionIdFromUrl);
      if (match) {
        setExpandedId(submissionIdFromUrl);
        searchParams.delete('submissionId');
        setSearchParams(searchParams, { replace: true });
      } else if (submissionList.length > 0 || !isFetching) {
        showFeedback('The requested submission has already been reviewed or is no longer pending.', 'error');
        searchParams.delete('submissionId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [submissionIdFromUrl, isLoading, isFetching, submissionList, searchParams, setSearchParams]);

  const handleApprove = async (id: string, empName: string) => {
    try {
      await approveM(id).unwrap();
      showFeedback(`Approved time entries for ${empName}.`, 'success');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Approval failed';
      showFeedback(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    if (!rejectComment.trim()) {
      setRejectError('Rejection remark is required');
      return;
    }
    setRejectError('');
    try {
      await rejectM({ id: rejectModal.submissionId, comment: rejectComment.trim() }).unwrap();
      showFeedback(`Rejected time entries for ${rejectModal.employeeName}. Employee has been notified.`, 'success');
      setRejectModal(null);
      setRejectComment('');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Rejection failed';
      setRejectError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight">Timesheet Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">Review and approve employee time entry submissions.</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${isFetching ? 'animate-spin text-slate-900' : 'text-slate-500'}`} />
        </button>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div className={`p-3.5 border rounded-xl text-xs flex items-center gap-2 ${feedbackType === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {feedbackType === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {feedbackMsg}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center bg-white border border-slate-200/80 rounded-[14px]">
          <LoadingSpinner size="md" />
        </div>
      ) : submissionList.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center bg-white border border-slate-200/80 rounded-[14px] gap-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          <p className="text-slate-600 font-semibold">All clear! No pending submissions.</p>
          <p className="text-sm text-slate-400">Submissions from your team members will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissionList.map((sub) => {
            const isExpanded = expandedId === sub.id;
            const periodLabel = sub.submissionType === 'DAILY'
              ? sub.submittedDate
              : `${sub.weekStart} – ${sub.weekEnd}`;

            return (
              <div key={sub.id} className="bg-white border border-slate-200/80 rounded-[14px] shadow-2xs overflow-hidden">
                {/* Card header */}
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-700 font-bold text-sm uppercase">
                      {sub.employee?.name?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 text-sm">{sub.employee?.name ?? 'Unknown'}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${sub.submissionType === 'DAILY' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                          {sub.submissionType}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{periodLabel}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{sub.totalHours?.toFixed(1) ?? 0}h logged</span>
                        <span>{sub.entryCount} entries</span>
                        <span className="text-slate-400">Submitted {new Date(sub.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setRejectModal({ submissionId: sub.id, employeeName: sub.employee?.name ?? 'Employee' })}
                      disabled={approving || rejecting}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />Reject
                    </button>
                    <button
                      onClick={() => handleApprove(sub.id, sub.employee?.name ?? 'Employee')}
                      disabled={approving || rejecting}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />Approve
                    </button>
                  </div>
                </div>

                {/* Expanded entry list */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Submitted Entries</p>
                    <div className="space-y-2">
                      {sub.entries.map((entry: any, i: number) => (
                        <div key={entry.id ?? i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-slate-700 shrink-0">{entry.date}</span>
                            <span className="text-slate-500 truncate">{entry.projectId ?? '—'}</span>
                          </div>
                          <span className="font-bold font-mono text-slate-800 shrink-0">{entry.hours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => { setRejectModal(null); setRejectComment(''); setRejectError(''); }} title="Reject Submission" maxWidth="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please provide a reason for rejecting <strong>{rejectModal?.employeeName}</strong>'s time entries.
            They will be notified by email and can edit and resubmit.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Rejection Remark *</label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
              placeholder="E.g. Missing task breakdown for Tuesday, please correct and resubmit..."
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs outline-none resize-none"
            />
            {rejectError && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {rejectError}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { setRejectModal(null); setRejectComment(''); setRejectError(''); }} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
            <button
              type="button"
              onClick={handleRejectSubmit}
              disabled={rejecting}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              {rejecting ? 'Rejecting...' : 'Reject & Notify Employee'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SubmissionApprovals;
