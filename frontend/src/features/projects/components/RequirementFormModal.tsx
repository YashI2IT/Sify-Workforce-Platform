import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { useCreateProjectRequirementMutation, useUpdateProjectRequirementMutation } from '../../../store/apiSlice';

interface Requirement {
  id: string;
  title: string;
  description?: string | null;
  isMandatory: boolean;
  status: string;
}

const reqSchema = z.object({
  title: z.string().min(1, 'Requirement title is required'),
  description: z.string().optional(),
  isMandatory: z.boolean(),
  status: z.string(),
});

interface RequirementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  editingReq: Requirement | null;
}

export const RequirementFormModal = ({
  isOpen,
  onClose,
  projectId,
  editingReq
}: RequirementFormModalProps) => {
  const { showToast } = useToast();
  const [createReqM] = useCreateProjectRequirementMutation();
  const [updateReqM] = useUpdateProjectRequirementMutation();

  const [form, setForm] = useState({
    title: '',
    description: '',
    isMandatory: false,
    status: 'ACTIVE'
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingReq) {
      setForm({
        title: editingReq.title,
        description: editingReq.description || '',
        isMandatory: editingReq.isMandatory,
        status: editingReq.status || 'ACTIVE',
      });
    } else {
      setForm({ title: '', description: '', isMandatory: false, status: 'ACTIVE' });
    }
    setError('');
  }, [editingReq, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      reqSchema.parse(form);
      setSubmitting(true);
      setError('');
      
      if (editingReq) {
        await updateReqM({
          projectId,
          reqId: editingReq.id,
          data: form
        }).unwrap();
        showToast('Requirement updated successfully', 'success');
      } else {
        await createReqM({
          projectId,
          data: form
        }).unwrap();
        showToast('Requirement added successfully', 'success');
      }
      onClose();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0].message);
      } else {
        setError(err.message || 'Failed to save requirement');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingReq ? 'Edit Requirement' : 'Add Project Requirement'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-mono">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 tracking-tight font-sans">
            Requirement Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. SOC2 Type II Compliance"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white shadow-2xs transition-all font-sans text-slate-900 placeholder:text-slate-400 font-medium"
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 tracking-tight font-sans">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Detailed scope and acceptance criteria..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white shadow-2xs transition-all font-sans text-slate-900 placeholder:text-slate-400 font-medium resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 tracking-tight font-sans">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white shadow-2xs transition-all font-sans text-slate-900 font-medium"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <label htmlFor="reqIsMandatory" className="group flex items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-400 hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)] transition-all duration-300 cursor-pointer select-none">
          <div className="space-y-1">
            <span className="text-[13px] font-bold text-slate-900 font-sans block group-hover:text-blue-700 transition-colors">Mandatory Requirement</span>
            <span className="text-[11px] text-slate-500 font-sans block">Required for final project milestone sign-off</span>
          </div>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              id="reqIsMandatory"
              checked={form.isMandatory}
              onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
              className="peer sr-only"
            />
            <div className={`w-10 h-5 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${form.isMandatory ? 'bg-[#12161F]' : 'bg-slate-200'}`}>
              <div
                className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${form.isMandatory ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </div>
          </div>
        </label>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 cursor-pointer shadow-xs transition-all active:scale-[0.97] font-sans"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#12161F] hover:bg-slate-800 rounded-full disabled:opacity-50 cursor-pointer shadow-xs transition-all active:scale-[0.97] font-sans"
          >
            {submitting ? 'Saving...' : 'Save Requirement'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
